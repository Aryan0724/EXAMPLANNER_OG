
'use client';

import React, { useState, useContext } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DataContext } from '@/context/DataContext';
import { generateManualFacultyAllotment } from '@/lib/planning';
import { InvigilatorAssignment, ExamSlot } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Download, Play, FileText, AlertCircle, Package } from 'lucide-react';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';


export default function ManualAllotmentPage() {
    const { invigilators, classrooms, examSchedule: schedule } = useContext(DataContext);
    const { toast } = useToast();
    const [inputText, setInputText] = useState(`| Date | Shift | Rooms | Active | Reserved |
| :--- | :--- | :--- | :--- | :--- |
| 14 May | Shift I | 14 | 46 | 3 |
| 14 May | Shift II | 17 | 41 | 3 |
| 15 May | Shift I | 17 | 44 | 3 |
| 15 May | Shift II | 19 | 48 | 3 |`);
    const [results, setResults] = useState<InvigilatorAssignment[] | null>(null);
    const [processLog, setProcessLog] = useState<{ msg: string, type: 'info' | 'success' | 'error' | 'warning' }[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleProcess = async () => {
        if (!invigilators.length || !classrooms.length) {
            toast({
                title: "Data Missing",
                description: "Please ensure invigilators and classrooms are loaded.",
                variant: "destructive"
            });
            return;
        }

        setIsProcessing(true);
        setResults(null);
        setProcessLog([{ msg: "Starting Manual Allotment Engine...", type: 'info' }]);
        
        try {
            const lines = inputText.split('\n').filter(l => l.includes('|') && !l.includes('---') && !l.toLowerCase().includes('date'));
            if (invigilators.length === 0) {
                setProcessLog(prev => [...prev, { msg: "Critical Error: Faculty list is empty. Please wait for data to load or check data.ts.", type: 'error' }]);
                setIsProcessing(false);
                return;
            }
            let currentFacultyPool = JSON.parse(JSON.stringify(invigilators));
            const allAssignments: InvigilatorAssignment[] = [];

            // 1. Collect all sessions
            const sessionsToProcess = lines.map((line, i) => {
                const parts = line.split('|').map(p => p.trim()).filter(Boolean);
                if (parts.length < 4) return null;

                const [dateStr, shiftLabel, roomsStr, activeStr, reservedStr] = parts;
                const roomCount = roomsStr.split('+').reduce((acc, val) => acc + (parseInt(val.replace(/\D/g, '')) || 0), 0);
                const activeCount = activeStr.split('+').reduce((acc, val) => {
                    const matches = val.match(/\d+/g);
                    return acc + (matches ? parseInt(matches[matches.length - 1]) : 0);
                }, 0);
                const reservedCount = reservedStr ? (parseInt(reservedStr.replace(/\D/g, '')) || 0) : 0;
                
                const dayMatch = dateStr.match(/\d+/);
                const day = dayMatch ? parseInt(dayMatch[0]) : 1;
                const fullDate = `2026-05-${day.toString().padStart(2, '0')}`;
                const getSIndex = (s: string) => {
                    const lower = s.toLowerCase();
                    if (lower.includes('mid')) return 0;
                    if (lower.includes('iv')) return 3;
                    if (lower.includes('iii')) return 2;
                    if (lower.includes('ii')) return 1;
                    if (lower.includes('i')) return 0;
                    return 0;
                };
                const shiftIndex = getSIndex(shiftLabel);

                return {
                    dateStr, fullDate, shiftLabel, shiftIndex, roomCount, activeCount, reservedCount, index: i
                };
            }).filter(Boolean) as any[];

            // 2. Sort chronologically
            sessionsToProcess.sort((a, b) => {
                if (a.fullDate !== b.fullDate) return a.fullDate.localeCompare(b.fullDate);
                return a.shiftIndex - b.shiftIndex;
            });

            // 3. Process
            for (const session of sessionsToProcess) {
                const { dateStr, fullDate, shiftLabel, shiftIndex, roomCount, activeCount, reservedCount, index } = session;
                const totalTarget = activeCount + reservedCount;

                setProcessLog(prev => [...prev, { msg: `Processing ${dateStr} (${shiftLabel}): Target ${totalTarget} staff...`, type: 'info' }]);

                const baseExam = schedule.find(e => e.date === fullDate && (shiftIndex === 0 ? e.time.startsWith('09') : e.time.startsWith('13')));
                const isMid = shiftLabel.toLowerCase().includes('mid');
                const exam = baseExam 
                    ? { ...baseExam, id: `${baseExam.id}-${isMid ? 'Mid' : 'Reg'}`, manualShiftIndex: shiftIndex } as any
                    : { 
                        id: `MAN-${fullDate}-${shiftLabel.replace(/\s+/g, '-')}-${index}-${isMid ? 'Mid' : 'Reg'}`, 
                        date: fullDate, 
                        time: shiftIndex === 0 ? '09:30' : '13:30',
                        manualShiftIndex: shiftIndex
                      } as any;

                try {
                    const result = generateManualFacultyAllotment(
                        currentFacultyPool,
                        classrooms,
                        exam,
                        roomCount,
                        activeCount,
                        reservedCount,
                        ['D Block', 'Pharmacy Block', 'C Block', 'Nursing Block', 'B Block', 'E Block']
                    );
                    
                    if (result.assignments.length !== totalTarget) {
                        setProcessLog(prev => [...prev, { 
                            msg: `⚠️ Warning: Could only allot ${result.assignments.length}/${totalTarget} for ${dateStr} ${shiftLabel}.`, 
                            type: 'warning' 
                        }]);
                    } else {
                        setProcessLog(prev => [...prev, { 
                            msg: `✅ Success: Allotted ${result.assignments.length} staff for ${dateStr} ${shiftLabel}.`, 
                            type: 'success' 
                        }]);
                    }

                    allAssignments.push(...result.assignments);
                    currentFacultyPool = result.updatedInvigilators;
                } catch (err: any) {
                    setProcessLog(prev => [...prev, { msg: `⚠️ Alert for ${dateStr} ${shiftLabel}: ${err.message}`, type: 'warning' }]);
                }
            }

            setResults(allAssignments);
            setProcessLog(prev => [...prev, { msg: `Engine Complete. Total Assignments: ${allAssignments.length}`, type: 'success' }]);
            
            toast({
                title: "Allotment Complete",
                description: `Successfully assigned ${allAssignments.length} duties.`,
            });
        } catch (error: any) {
            console.error(error);
            setProcessLog(prev => [...prev, { msg: `Fatal Error: ${error.message}`, type: 'error' }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const generateDetailedExcel = async (results: InvigilatorAssignment[]) => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Duty Chart');

        const uniqueDates = Array.from(new Set(results.map(asg => asg.exam.date))).sort();
        const shiftTimings = [
            { id: 'I', label: 'Shift I', color: 'FFFF00' },
            { id: 'II', label: 'Shift II', color: '92D050' },
        ];

        const dateColStart = 5;
        const totalCols = dateColStart + (uniqueDates.length * 2);


        // Styling Helper
        const setBorder = (cell: any) => {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        };

        // Header
        worksheet.mergeCells(1, 1, 1, totalCols + 1);
        worksheet.getCell(1, 1).value = 'Graphic Era Hill University, Dehradun';
        worksheet.getCell(1, 1).font = { bold: true, size: 16 };
        worksheet.getCell(1, 1).alignment = { horizontal: 'center' };

        worksheet.mergeCells(2, 1, 2, totalCols + 1);
        worksheet.getCell(2, 1).value = 'Examination Center:- Graphic Era Hill University, Bhimtal Campus';
        worksheet.getCell(2, 1).font = { bold: true, size: 14 };
        worksheet.getCell(2, 1).alignment = { horizontal: 'center' };

        worksheet.mergeCells(3, 1, 3, totalCols + 1);
        worksheet.getCell(3, 1).value = 'End Term Examination (Even Semester) May 2026';
        worksheet.getCell(3, 1).font = { bold: true, size: 14 };
        worksheet.getCell(3, 1).alignment = { horizontal: 'center' };

        // Date & Shift Headers
        worksheet.getCell(9, 1).value = 'Sr. No.';
        worksheet.getCell(9, 2).value = 'Name of Invigilator';
        worksheet.getCell(9, 3).value = 'Designation';
        worksheet.getCell(9, 4).value = 'Deptt.';
        [1,2,3,4].forEach(c => setBorder(worksheet.getCell(9, c)));

        uniqueDates.forEach((date, dateIdx) => {
            const startCol = dateColStart + (dateIdx * 2);
            worksheet.mergeCells(9, startCol, 9, startCol + 1);
            const dateCell = worksheet.getCell(9, startCol);

            dateCell.value = new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            dateCell.alignment = { horizontal: 'center' };
            setBorder(dateCell);

            shiftTimings.forEach((shift, sIdx) => {
                const sCell = worksheet.getCell(10, startCol + sIdx);
                sCell.value = shift.id;
                sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: shift.color } };
                sCell.alignment = { horizontal: 'center' };
                setBorder(sCell);
            });
        });

        const totalDutyCol = totalCols + 1;
        worksheet.getCell(9, totalDutyCol).value = 'Total Duty';
        setBorder(worksheet.getCell(9, totalDutyCol));

        // Data Row Generation
        const facultyIds = Array.from(new Set(results.map(asg => asg.invigilator.id)));
        const sortedFaculty = invigilators.filter(f => facultyIds.includes(f.id)).sort((a, b) => a.name.localeCompare(b.name));

        sortedFaculty.forEach((inv, idx) => {
            const rowNum = 11 + idx;
            worksheet.getCell(rowNum, 1).value = idx + 1;
            worksheet.getCell(rowNum, 2).value = inv.name;
            const designationMap: Record<string, string> = {
                'Assistant Professor': 'AP',
                'Associate Professor': 'AsP',
                'Lecturer': 'Lec',
                'Nursing Tutor': 'NT',
                'Teaching Associate': 'TA',
                'Teaching Assistant': 'TA',
                'Professor': 'Prof',
                'Lab Assistant': 'LA'
            };
            worksheet.getCell(rowNum, 3).value = designationMap[inv.designation] || inv.designation;
            worksheet.getCell(rowNum, 4).value = inv.department.substring(0, 3).toUpperCase();
            [1,2,3,4].forEach(c => setBorder(worksheet.getCell(rowNum, c)));

            let total = 0;
            uniqueDates.forEach((date, dateIdx) => {
                const startCol = dateColStart + (dateIdx * 2);
                shiftTimings.forEach((shift, sIdx) => {
                    const cell = worksheet.getCell(rowNum, startCol + sIdx);
                    setBorder(cell);
                    cell.alignment = { horizontal: 'center' };

                    // Advanced Shift Matching
                    const asgs = results.filter(a => {
                        if (a.invigilator.id !== inv.id || a.exam.date !== date) return false;
                        return (a.exam as any).manualShiftIndex === sIdx;
                    });

                    if (asgs.length > 0) {
                        // Use '001' for Mid-term and '01' for Regular as requested
                        const isMid = asgs.some(a => a.exam.id.toLowerCase().includes('mid'));
                        cell.value = isMid ? '001' : '01';
                        total++;
                    }

                });
            });
            worksheet.getCell(rowNum, totalDutyCol).value = total;
            setBorder(worksheet.getCell(rowNum, totalDutyCol));
        });

        // --- SUMMARY SECTION ---
        const startSummaryRow = 13 + sortedFaculty.length;
        worksheet.addRow([]);
        worksheet.mergeCells(startSummaryRow + 1, 1, startSummaryRow + 1, 3);
        worksheet.getCell(startSummaryRow + 1, 1).value = 'DUTY SUMMARY REPORT';
        worksheet.getCell(startSummaryRow + 1, 1).font = { bold: true };

        worksheet.getCell(startSummaryRow + 2, 1).value = 'Date';
        worksheet.getCell(startSummaryRow + 2, 2).value = 'Shift';
        worksheet.getCell(startSummaryRow + 2, 3).value = 'Total Faculty Allotted';
        [1,2,3].forEach(c => {
            setBorder(worksheet.getCell(startSummaryRow + 2, c));
            worksheet.getCell(startSummaryRow + 2, c).font = { bold: true };
        });

        let summaryIdx = 0;
        uniqueDates.forEach(date => {
            shiftTimings.forEach((shift, sIdx) => {
                const shiftResults = results.filter(a => {
                    if (a.exam.date !== date) return false;
                    return (a.exam as any).manualShiftIndex === sIdx;
                });

                if (shiftResults.length > 0) {
                    const rowNum = startSummaryRow + 3 + summaryIdx;
                    worksheet.getCell(rowNum, 1).value = date;
                    worksheet.getCell(rowNum, 2).value = shift.label;
                    
                    const activeCount = shiftResults.filter(r => !r.isReserved).length;

                    worksheet.getCell(rowNum, 3).value = activeCount; 
                    
                    [1,2,3].forEach(c => setBorder(worksheet.getCell(rowNum, c)));
                    summaryIdx++;
                }
            });
        });

        // Superintendent Footer
        const finalRow = startSummaryRow + 5 + summaryIdx;
        worksheet.mergeCells(finalRow, totalDutyCol - 4, finalRow, totalDutyCol);
        worksheet.getCell(finalRow, totalDutyCol - 4).value = 'Superintendent of Examination GEHU, Bhimtal Campus';
        worksheet.getCell(finalRow, totalDutyCol - 4).font = { bold: true };
        worksheet.getCell(finalRow, totalDutyCol - 4).alignment = { horizontal: 'right' };

        return await workbook.xlsx.writeBuffer();
    };

      const downloadAllReports = async () => {
        if (!results) return;
        setIsProcessing(true);
        try {
            // 1. Reconstruct FullAllotment structure to match old algorithm
            const fullAllotment: Record<string, { seatPlan: any, invigilatorAssignments: InvigilatorAssignment[] }> = {};
            
            results.forEach(asg => {
                const sessionKey = `${asg.exam.date} ${asg.exam.time}`;
                if (!fullAllotment[sessionKey]) {
                    fullAllotment[sessionKey] = {
                        seatPlan: { exam: asg.exam, assignments: [] },
                        invigilatorAssignments: []
                    };
                }
                fullAllotment[sessionKey].invigilatorAssignments.push(asg);
                
                // Add mock seat to ensure classroom exists in SeatPlan for legacy reports
                if (asg.classroom && !fullAllotment[sessionKey].seatPlan.assignments.some((s: any) => s.classroom?.id === asg.classroom!.id)) {
                    fullAllotment[sessionKey].seatPlan.assignments.push({
                        classroom: asg.classroom,
                        seatNumber: 1
                    });
                }
            });

            // 2. Import old export functions dynamically or use them if already imported
            const { 
                generateMasterReport, 
                generateInvigilatorDutyRoster, 
                generateVisualSeatPlanExcel 
            } = await import('@/lib/report-generator');

            // 3. Generate All Buffers
            toast({ title: "Generating Reports", description: "Creating all university format reports..." });
            const zip = new JSZip();
            const today = new Date().toISOString().split('T')[0];
            
            // A. The custom detailed duty chart
            const detailedBuf = await generateDetailedExcel(results);
            zip.file("1_Detailed_University_Duty_Chart.xlsx", detailedBuf);

            // B. Old Master Report
            const masterBuf = await generateMasterReport(fullAllotment, [], classrooms, invigilators, true);
            zip.file("2_Exam_Master_Report.xlsx", masterBuf);

            // C. Old Duty Roster
            const rosterBuf = await generateInvigilatorDutyRoster(fullAllotment, invigilators, true);
            zip.file("3_Invigilator_Duty_Roster.xlsx", rosterBuf);

            // D. Old Visual Grid
            const visualBuf = await generateVisualSeatPlanExcel(fullAllotment, classrooms, true);
            zip.file("4_Visual_Seat_Plans.xlsx", visualBuf);

            // 4. Download the ZIP
            const content = await zip.generateAsync({ type: "blob" });
            const fileName = `GEHU_Bhimtal_Exam_Reports_${today}.zip`;
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 5000);

            toast({
                title: "Package Downloaded",
                description: "All university reports have been bundled into a ZIP file.",
            });

        } catch (err: any) {
            console.error(err);
            setProcessLog(prev => [...prev, { msg: `Export Error: ${err.message}`, type: 'error' }]);
            toast({
                title: "Download Error",
                description: "Failed to generate the old report package.",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <SidebarProvider>
            <div className="flex min-h-screen">
                <MainSidebar />
                <SidebarInset>
                    <MainHeader />
                    <main className="flex-1 p-6 space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Manual Faculty Allotment</h1>
                                <p className="text-muted-foreground mt-1">Paste your specific requirements to generate custom faculty assignments.</p>
                            </div>
                            {results && (
                                <Button onClick={downloadAllReports} disabled={isProcessing} className="gap-2 bg-primary text-primary-foreground">
                                    <Package className="size-4" />
                                    {isProcessing ? 'Generating...' : 'Download All Reports'}

                                </Button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="shadow-lg border-primary/20">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="text-primary size-5" />
                                        Input Requirements
                                    </CardTitle>
                                    <CardDescription>
                                        Paste data in the pipe-separated format below.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Textarea 
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        placeholder="| Date | Shift | Rooms | Faculty |"
                                        className="min-h-[400px] font-mono text-sm border-primary/10 focus-visible:ring-primary/30"
                                    />
                                    <Button 
                                        onClick={handleProcess} 
                                        disabled={isProcessing}
                                        className="w-full gap-2 py-6 text-lg shadow-md hover:shadow-lg transition-all"
                                    >
                                        {isProcessing ? 'Processing...' : (
                                            <>
                                                <Play className="size-5 fill-current" />
                                                Generate Manual Allotment
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="shadow-md flex flex-col h-full">
                                <CardHeader>
                                    <CardTitle>Results & Verification</CardTitle>
                                    <CardDescription>
                                        Live log and allotment counts for each shift.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-hidden flex flex-col gap-4">
                                    <div className="bg-black/5 rounded-xl border p-4 font-mono text-[10px] overflow-y-auto max-h-[250px] space-y-1">
                                        {processLog.map((log, i) => (
                                            <div key={i} className={`
                                                ${log.type === 'success' ? 'text-green-600' : ''}
                                                ${log.type === 'warning' ? 'text-orange-600 font-bold' : ''}
                                                ${log.type === 'error' ? 'text-red-600 font-bold' : ''}
                                                ${log.type === 'info' ? 'text-muted-foreground' : ''}
                                            `}>
                                                {log.msg}
                                            </div>
                                        ))}
                                        {processLog.length === 0 && <div className="text-muted-foreground italic">Process log will appear here...</div>}
                                    </div>

                                    {results ? (
                                        <div className="flex-1 overflow-y-auto space-y-2 border-t pt-4">
                                            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Assignment Snapshot</div>
                                            {results.slice(0, 50).map((asg, i) => (
                                                <div key={i} className="p-2 bg-muted/30 rounded-lg flex justify-between items-center border text-[11px]">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-primary">{asg.invigilator.name}</span>
                                                        <span className="text-[9px] px-1 bg-muted border rounded">{asg.invigilator.designation}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-medium">{asg.exam.date}</div>
                                                        <div className="text-[9px] text-muted-foreground">{asg.classroom?.roomNo || 'Reserved'}</div>
                                                    </div>
                                                </div>
                                            ))}
                                            {results.length > 50 && (
                                                <div className="text-center text-xs text-muted-foreground pt-2">
                                                    + {results.length - 50} more assignments in report...
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl">
                                            <AlertCircle className="size-12 opacity-20 mb-4" />
                                            <p>No results yet. Click generate to start.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}
