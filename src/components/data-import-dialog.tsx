import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, FileUp, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student, Classroom, Invigilator, ExamSlot } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { parsePasteSchedule } from '@/lib/parsers';

interface DataImportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onImportStudents: (data: Student[]) => void;
    onImportClassrooms: (data: Classroom[]) => void;
    onImportInvigilators: (data: Invigilator[]) => void;
    onImportExams: (data: ExamSlot[]) => void;
}

export function DataImportDialog({
    isOpen,
    onClose,
    onImportStudents,
    onImportClassrooms,
    onImportInvigilators,
    onImportExams
}: DataImportDialogProps) {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('students');
    const [stats, setStats] = useState<{ count: number; type: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [pasteText, setPasteText] = useState('');

    const handlePasteImport = () => {
        setError(null);
        setStats(null);
        try {
            const exams = parsePasteSchedule(pasteText);
            if (exams.length === 0) {
                setError("No valid exams found. Please check formats.");
                return;
            }
            onImportExams(exams);
            setStats({ count: exams.length, type: 'paste-schedule' });
            toast({
                title: "Import Successful",
                description: `Parsed and imported ${exams.length} exams from text.`
            });
        } catch (err: any) {
            setError("Failed to parse text: " + err.message);
        }
    };

    const resetState = () => {
        setStats(null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleTabChange = (val: string) => {
        setActiveTab(val);
        resetState();
    };

    const processFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setStats(null);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    setError("The file appears to be empty.");
                    return;
                }

                validateAndSetData(data);
            } catch (err) {
                console.error(err);
                setError("Failed to parse file. Please ensure it is a valid Excel or CSV file.");
            }
        };
        reader.readAsBinaryString(file);
    };

    const validateAndSetData = (data: any[]) => {
        try {
            let count = 0;
            const normalizeText = (text: string) => {
                if (!text) return '';
                return text
                    .trim()
                    .toUpperCase()
                    .replace(/[./\-_]/g, ' ') // Replace dots, slashes, dashes with spaces
                    .replace(/\s+/g, ' ')    // Collapse multiple spaces
                    .trim();
            };

            if (activeTab === 'students') {
                const students: Student[] = data.map((row: any) => ({
                    id: String(row.rollNo || row.id || Math.random().toString(36).substr(2, 9)),
                    name: row.name || row.Name,
                    rollNo: String(row.rollNo || row.RollNo),
                    course: normalizeText(row.course || row.Course),
                    department: normalizeText(row.department || row.Department),
                    semester: Number(row.semester || row.Semester),
                    section: row.section || row.Section
                })).filter(s => s.name && s.rollNo);

                if (students.length === 0) throw new Error("No valid student records found. Check headers: name, rollNo, course, department, semester");
                onImportStudents(students);
                count = students.length;
            } else if (activeTab === 'classrooms') {
                const rooms: Classroom[] = data.map((row: any) => ({
                    id: String(row.roomNo || row.id || Math.random().toString(36).substr(2, 9)),
                    roomNo: String(row.roomNo || row.RoomNo),
                    capacity: Number(row.capacity || row.Capacity),
                    building: row.building || row.Block || row.Building,
                    floor: Number(row.floor || row.Floor || 0),
                    isExamReady: true
                })).filter(r => r.roomNo && r.capacity);

                if (rooms.length === 0) throw new Error("No valid classrooms found. Check headers: roomNo, capacity, building");
                onImportClassrooms(rooms);
                count = rooms.length;
            } else if (activeTab === 'invigilators') {
                const invs: Invigilator[] = data.map((row: any) => ({
                    id: String(row.id || Math.random().toString(36).substr(2, 9)),
                    name: row.name || row.Name,
                    department: normalizeText(row.department || row.Department),
                    email: row.email || row.Email || '',
                    designation: row.designation || row.Designation || 'Assistant Professor',
                    assignedDuties: [],
                    maxDuties: Number(row.maxDuties || 10)
                })).filter(i => i.name);

                if (invs.length === 0) throw new Error("No valid invigilators found. Check headers: name, department");
                onImportInvigilators(invs);
                count = invs.length;
            } else if (activeTab === 'exams') {
                const parseExcelDate = (input: any): string => {
                    if (!input) return '';
                    if (typeof input === 'number') {
                        // Excel serial date to YYYY-MM-DD
                        // Excel 1900 epoch start: Dec 30 1899
                        const date = new Date((input - 25569) * 86400 * 1000);
                        return date.toISOString().split('T')[0];
                    }
                    if (typeof input === 'string') return input.split('T')[0];
                    return String(input);
                };

                const parseExcelTime = (input: any): string => {
                    if (!input) return '09:00';
                    if (typeof input === 'number') {
                        // Excel time fraction (e.g. 0.5 = 12:00)
                        const totalSeconds = Math.round(input * 24 * 60 * 60);
                        const hours = Math.floor(totalSeconds / 3600);
                        const minutes = Math.floor((totalSeconds % 3600) / 60);
                        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                    }
                    return String(input);
                };

                const exams: ExamSlot[] = data.map((row: any) => ({
                    id: String(row.id || Math.random().toString(36).substr(2, 9)),
                    date: parseExcelDate(row.date || row.Date),
                    time: parseExcelTime(row.time || row.Time),
                    course: normalizeText(row.course || row.Course),
                    department: normalizeText(row.department || row.Department),
                    semester: Number(row.semester || row.Semester),
                    subjectName: row.subjectName || row.SubjectName || row.Subject,
                    subjectCode: String(row.subjectCode || row.SubjectCode || row.Code || 'N/A').toUpperCase().trim(),
                    duration: Number(row.duration || 90),
                    shift: Number(row.shift || 1)
                })).filter(e => e.subjectName && e.date);

                if (exams.length === 0) throw new Error("No valid exams found. Check headers: subjectName, date, time, course");
                onImportExams(exams);
                count = exams.length;
            }

            setStats({ count, type: activeTab });
            toast({
                title: "Import Successful",
                description: `Imported ${count} ${activeTab} records.`,
            });
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Validation failed");
        }
    };

    const downloadTemplate = () => {
        let headers: any[] = [];
        let fileName = 'template.xlsx';

        if (activeTab === 'students') {
            headers = [{ name: "John Doe", rollNo: "1001", course: "B.Tech", department: "CSE", semester: 1, section: "A" }];
            fileName = 'students_template.xlsx';
        } else if (activeTab === 'classrooms') {
            headers = [{ roomNo: "C-101", capacity: 60, building: "Block C", floor: 1 }];
            fileName = 'classrooms_template.xlsx';
        } else if (activeTab === 'invigilators') {
            headers = [{ name: "Dr. Smith", department: "CSE", designation: "Professor", email: "smith@example.com", maxDuties: 5 }];
            fileName = 'invigilators_template.xlsx';
        } else if (activeTab === 'exams') {
            headers = [{ date: "2025-05-20", time: "09:30", course: "B.Tech", department: "CSE", semester: 4, subjectName: "Data Structures", subjectCode: "CS201", duration: 90, shift: 1 }];
            fileName = 'exam_schedule_template.xlsx';
        }

        const ws = XLSX.utils.json_to_sheet(headers);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, fileName);
    };

    const renderUploadUI = () => (
        <div className="mt-6 space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center space-y-4 hover:bg-muted/50 transition-colors">
                <div className="p-4 rounded-full bg-primary/10 text-primary">
                    <Upload className="h-8 w-8" />
                </div>
                <div>
                    <h3 className="font-semibold mb-1">Upload {activeTab} file</h3>
                    <p className="text-sm text-muted-foreground">Drag and drop or click to browse</p>
                </div>
                <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    className="cursor-pointer"
                    onChange={processFile}
                />
            </div>

            <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Supported formats: .xlsx, .csv</span>
                <Button variant="link" size="sm" onClick={downloadTemplate} className="h-auto p-0 text-primary">
                    <Download className="mr-2 h-3 w-3" />
                    Download Template
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Import Failed</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {stats && stats.type === activeTab && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>
                        Successfully processed {stats.count} records for {stats.type}.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Import Data</DialogTitle>
                    <DialogDescription>
                        Upload Excel or CSV files to bulk import data into the system.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="students">Students</TabsTrigger>
                        <TabsTrigger value="classrooms">Rooms</TabsTrigger>
                        <TabsTrigger value="invigilators">Faculty</TabsTrigger>
                        <TabsTrigger value="exams">Exams</TabsTrigger>
                        <TabsTrigger value="paste-schedule">Paste</TabsTrigger>
                    </TabsList>

                    <TabsContent value="students">
                        {renderUploadUI()}
                    </TabsContent>

                    <TabsContent value="classrooms">
                        {renderUploadUI()}
                    </TabsContent>

                    <TabsContent value="invigilators">
                        {renderUploadUI()}
                    </TabsContent>

                    <TabsContent value="exams">
                        {renderUploadUI()}
                    </TabsContent>

                    <TabsContent value="paste-schedule">
                        <div className="mt-4 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Paste Exam Schedule Table</label>
                                <textarea
                                    className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="| Date | Shift | Code | Subject |\n| 23-02-2026 | 09:30 - 11:00 | CS101 | Intro to CS |"
                                    value={pasteText}
                                    onChange={(e) => setPasteText(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">Supported formats: Pipe-separated tables (Markdown style)</p>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button onClick={handlePasteImport} disabled={!pasteText.trim()}>
                                    Parse & Import
                                </Button>
                            </div>

                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Import Failed</AlertTitle>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {stats && stats.type === 'paste-schedule' && (
                                <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <AlertTitle>Success</AlertTitle>
                                    <AlertDescription>
                                        Successfully processed and imported {stats.count} exams from text.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
