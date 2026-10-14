
import { generateMockInvigilators, generateMockStudents, generateMockClassrooms, getBhimtalExamSchedule } from '../src/lib/data';
import { Invigilator, Student, Classroom, ExamSlot, InvigilatorAssignment, SeatPlan } from '../src/lib/types';
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

// --- UPDATED REQUIREMENTS (FROM USER TEXT TABLES) ---
// Structure: [Date]: { [Time]: { rooms: number, back: number, reserved: number, total: number } }
const DATA: Record<string, Record<string, any>> = {
    "2026-05-14": {
        "09:30": { type: 'Mid', rooms: 2, total: 4, reserved: 0 },
        "09:31": { type: 'Main', rooms: 14, total: 49, active: 42, back: 4, reserved: 3 },
        "13:30": { type: 'Main', rooms: 17, total: 44, active: 40, back: 1, reserved: 3 }
    },
    "2026-05-15": {
        "09:30": { type: 'Mid', rooms: 2, total: 4, reserved: 0 },
        "09:31": { type: 'Main', rooms: 17, total: 47, active: 42, back: 2, reserved: 3 },
        "13:30": { type: 'Main', rooms: 19, total: 51, active: 42, back: 6, reserved: 3 } // 17+2 rooms
    },
    "2026-05-16": {
        "09:30": { type: 'Mid', rooms: 2, total: 4, reserved: 0 },
        "09:31": { type: 'Main', rooms: 19, total: 49, active: 42, back: 4, reserved: 3 }, // 17+2 rooms
        "13:30": { type: 'Main', rooms: 17, total: 45, active: 40, back: 2, reserved: 3 }
    },
    "2026-05-18": {
        "09:30": { type: 'Mid', rooms: 2, total: 4, reserved: 0 },
        "09:31": { type: 'Main', rooms: 17, total: 47, active: 42, back: 2, reserved: 3 },
        "13:30": { type: 'Main', rooms: 17, total: 47, active: 42, back: 2, reserved: 3 }
    },
    "2026-05-19": {
        "09:30": { type: 'Mid', rooms: 2, total: 4, reserved: 0 },
        "09:31": { type: 'Main', rooms: 17, total: 51, active: 42, back: 6, reserved: 3 },
        "13:30": { type: 'Main', rooms: 17, total: 47, active: 42, back: 2, reserved: 3 }
    },
    "2026-05-20": {
        "09:31": { type: 'Main', rooms: 17, total: 47, active: 42, back: 2, reserved: 3 },
        "13:30": { type: 'Main', rooms: 17, total: 49, active: 42, back: 4, reserved: 3 }
    },
    "2026-05-21": {
        "09:31": { type: 'Main', rooms: 17, total: 49, active: 42, back: 4, reserved: 3 },
        "13:30": { type: 'Main', rooms: 4, total: 15, active: 12, back: 0, reserved: 3 }
    },
    "2026-05-22": {
        "09:31": { type: 'Main', rooms: 17, total: 47, active: 42, back: 2, reserved: 3 },
        "13:30": { type: 'Main', rooms: 20, total: 53, active: 42, back: 8, reserved: 3 } // 17+3 rooms
    },
    "2026-05-23": {
        "09:31": { type: 'Main', rooms: 17, total: 49, active: 42, back: 4, reserved: 3 },
        "13:30": { type: 'Main', rooms: 7, total: 24, active: 13, back: 8, reserved: 3 } // 4+3 rooms
    },
    "2026-05-25": {
        "09:31": { type: 'Main', rooms: 17, total: 40, active: 35, back: 2, reserved: 3 },
        "13:30": { type: 'Main', rooms: 13, total: 37, active: 26, back: 8, reserved: 3 } // 10+3 rooms
    },
    "2026-05-26": {
        "09:31": { type: 'Main', rooms: 12, total: 29, active: 24, back: 2, reserved: 3 },
        "13:30": { type: 'Main', rooms: 1, total: 3, active: 2, back: 0, reserved: 1 }
    },
    "2026-05-28": {
        "09:31": { type: 'Main', rooms: 1, total: 4, active: 3, back: 0, reserved: 1 },
        "13:30": { type: 'Main', rooms: 6, total: 17, active: 7, back: 8, reserved: 2 } // 3+3 rooms
    },
    "2026-05-29": {
        "09:31": { type: 'Main', rooms: 4, total: 11, active: 8, back: 0, reserved: 3 },
        "13:30": { type: 'Main', rooms: 1, total: 10, active: 2, back: 6, reserved: 2 }
    },
    "2026-05-30": {
        "09:31": { type: 'Main', rooms: 0, total: 3, active: 2, back: 0, reserved: 1 },
        "13:30": { type: 'Main', rooms: 3, total: 8, active: 6, back: 0, reserved: 2 }
    }
};

// --- LOGIC ---
async function generateAllReports() {
    console.log("Generating Production-Grade University Reports...");

    const facultyList = generateMockInvigilators(122);
    const classrooms = generateMockClassrooms();
    const schedule = getBhimtalExamSchedule();

    const fullAllotment: any = {};
    const dates = Object.keys(DATA).sort();

    // 1. PERFORM ALLOTMENT
    dates.forEach(date => {
        const slots = DATA[date];
        Object.keys(slots).forEach(time => {
            const req = slots[time];
            const sessionKey = `${date} ${time}`;
            
            // Selection Logic: Pick faculty with least duties
            facultyList.sort((a, b) => (a.assignedDuties?.length || 0) - (b.assignedDuties?.length || 0));
            
            const assignments: InvigilatorAssignment[] = [];
            for (let i = 0; i < req.total; i++) {
                if (i >= facultyList.length) break;
                
                const inv = facultyList[i];
                const isReserved = i >= (req.total - req.reserved);
                
                assignments.push({
                    invigilator: inv,
                    classroom: isReserved ? null as any : classrooms[i % classrooms.length],
                    isReserved: isReserved
                });
                
                if (!isReserved) {
                    if (!inv.assignedDuties) inv.assignedDuties = [];
                    inv.assignedDuties.push({ date, count: 1 });
                }
            }

            fullAllotment[sessionKey] = {
                seatPlan: { exam: schedule.filter(e => e.date === date), assignments: [], roomStats: [] },
                invigilatorAssignments: assignments
            };
        });
    });

    // 2. GENERATE THE "DETAILED DUTY CHART (UNIVERSITY FORMAT)"
    await generateUniversityDetailedChart(fullAllotment, facultyList);

    // 3. GENERATE OTHER REPORTS
    generateMasterReport(fullAllotment);
    generateDutyRoster(fullAllotment, facultyList);
    await generateZIP(fullAllotment);

    console.log("SUCCESS: All reports generated according to university standards.");
}

async function generateUniversityDetailedChart(fullAllotment: any, allInvigilators: Invigilator[]) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Invigilator Duty Chart');

    const sessionKeys = Object.keys(fullAllotment).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const uniqueDates = Array.from(new Set(sessionKeys.map(key => key.split(' ')[0]))).sort();
    const shiftTimings = [
        { id: 'I', label: 'Shift I: 9:30AM-11:00AM', color: 'FFFF00' },
        { id: 'II', label: 'Shift II: 11:30AM-1:00PM', color: '92D050' },
        { id: 'III', label: 'Shift III: 1:30PM-3:00PM', color: '00B0F0' },
        { id: 'IV', label: 'Shift IV: 3:30PM-5:00PM', color: 'FFC000' },
    ];

    const getShiftIndex = (time: string) => {
        const hour = parseInt(time.split(':')[0]);
        if (hour <= 10) return 0;
        if (hour <= 12) return 1;
        if (hour <= 14) return 2;
        return 3;
    };

    const dateColStart = 5;
    const totalCols = dateColStart + (uniqueDates.length * 4);

    // Styling Headers
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

    // Shift Legend
    shiftTimings.forEach((shift, idx) => {
        const row = 5 + idx;
        worksheet.mergeCells(row, 1, row, 4);
        const cell = worksheet.getCell(row, 1);
        cell.value = shift.label;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: shift.color } };
        cell.font = { bold: true };
    });

    // Date & Shift Headers
    worksheet.getCell(9, 1).value = 'Sr. No.';
    worksheet.getCell(9, 2).value = 'Name of Invigilator';
    worksheet.getCell(9, 3).value = 'Designation';
    worksheet.getCell(9, 4).value = 'Deptt.';
    worksheet.mergeCells(9, 1, 10, 1);
    worksheet.mergeCells(9, 2, 10, 2);
    worksheet.mergeCells(9, 3, 10, 3);
    worksheet.mergeCells(9, 4, 10, 4);

    uniqueDates.forEach((date, dateIdx) => {
        const startCol = dateColStart + (dateIdx * 4);
        worksheet.mergeCells(9, startCol, 9, startCol + 3);
        worksheet.getCell(9, startCol).value = date;
        worksheet.getCell(9, startCol).alignment = { horizontal: 'center' };
        worksheet.getCell(9, startCol).font = { bold: true };

        shiftTimings.forEach((shift, shiftIdx) => {
            const cell = worksheet.getCell(10, startCol + shiftIdx);
            cell.value = shift.id;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: shift.color } };
            cell.alignment = { horizontal: 'center' };
        });
    });

    const totalDutyCol = totalCols + 1;
    worksheet.mergeCells(9, totalDutyCol, 10, totalDutyCol);
    worksheet.getCell(9, totalDutyCol).value = 'Total Duty';
    worksheet.getCell(9, totalDutyCol).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell(9, totalDutyCol).font = { bold: true };

    // Duty Data
    const invDutyMap = new Map<string, Map<string, string>>();
    sessionKeys.forEach(key => {
        const [date, time] = key.split(' ');
        const shiftIdx = getShiftIndex(time);
        fullAllotment[key].invigilatorAssignments.forEach((asg: any) => {
            if (!invDutyMap.has(asg.invigilator.id)) invDutyMap.set(asg.invigilator.id, new Map());
            invDutyMap.get(asg.invigilator.id)!.set(`${date}-${shiftIdx}`, asg.isReserved ? 'R' : '1');
        });
    });

    const sortedInvs = [...allInvigilators].sort((a, b) => a.name.localeCompare(b.name));
    sortedInvs.forEach((inv, idx) => {
        const row = 11 + idx;
        worksheet.getCell(row, 1).value = idx + 1;
        worksheet.getCell(row, 2).value = inv.name;
        worksheet.getCell(row, 3).value = inv.designation === 'Assistant Professor' ? 'AP' : (inv.designation === 'Associate Professor' ? 'Assoc.P' : 'Prof');
        worksheet.getCell(row, 4).value = inv.department.substring(0, 3).toUpperCase();

        let total = 0;
        uniqueDates.forEach((date, dateIdx) => {
            const startCol = dateColStart + (dateIdx * 4);
            shiftTimings.forEach((_, shiftIdx) => {
                const val = invDutyMap.get(inv.id)?.get(`${date}-${shiftIdx}`);
                if (val) {
                    const cell = worksheet.getCell(row, startCol + shiftIdx);
                    cell.value = val;
                    cell.alignment = { horizontal: 'center' };
                    if (val === '1') total++;
                    else cell.font = { color: { argb: 'FF0000' }, bold: true };
                }
            });
        });
        worksheet.getCell(row, totalDutyCol).value = total;
        worksheet.getCell(row, totalDutyCol).alignment = { horizontal: 'center' };
    });

    // Footer
    const footerRow = 13 + sortedInvs.length;
    worksheet.mergeCells(footerRow, totalCols - 5, footerRow, totalCols + 1);
    const footer = worksheet.getCell(footerRow, totalCols - 5);
    footer.value = 'Superintendent of Examination GEHU, Bhimtal Campus';
    footer.font = { bold: true, size: 12 };
    footer.alignment = { horizontal: 'right' };

    // Summaries (Prof, Asst Prof)
    let summaryRow = footerRow + 3;
    worksheet.getCell(summaryRow, 1).value = 'DESIGNATION SUMMARY:';
    worksheet.getCell(summaryRow, 1).font = { bold: true };
    summaryRow++;

    const stats: Record<string, { count: number, totalDuties: number }> = {};
    sortedInvs.forEach(inv => {
        if (!stats[inv.designation]) stats[inv.designation] = { count: 0, totalDuties: 0 };
        stats[inv.designation].count++;
        stats[inv.designation].totalDuties += (inv.assignedDuties?.length || 0);
    });

    worksheet.getCell(summaryRow, 1).value = 'Designation';
    worksheet.getCell(summaryRow, 2).value = 'Faculty Count';
    worksheet.getCell(summaryRow, 3).value = 'Total Assigned Duties';
    [1,2,3].forEach(c => worksheet.getCell(summaryRow, c).font = { bold: true });
    summaryRow++;

    Object.entries(stats).forEach(([desig, data]) => {
        worksheet.getCell(summaryRow, 1).value = desig;
        worksheet.getCell(summaryRow, 2).value = data.count;
        worksheet.getCell(summaryRow, 3).value = data.totalDuties;
        summaryRow++;
    });

    await workbook.xlsx.writeFile('Detailed_University_Duty_Chart_FINAL.xlsx');
}

function generateMasterReport(fullAllotment: any) {
    const wb = XLSX.utils.book_new();
    const rows = [['Date', 'Time', 'Faculty', 'Room', 'Status']];
    Object.keys(fullAllotment).sort().forEach(key => {
        const [d, t] = key.split(' ');
        fullAllotment[key].invigilatorAssignments.forEach((a: any) => {
            rows.push([d, t, a.invigilator.name, a.classroom?.roomNo || 'Reserved', a.isReserved ? 'RESERVED' : 'ACTIVE']);
        });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Master");
    XLSX.writeFile(wb, "University_Master_Report.xlsx");
}

function generateDutyRoster(fullAllotment: any, invs: Invigilator[]) {
    const wb = XLSX.utils.book_new();
    const data = invs.sort((a,b) => a.name.localeCompare(b.name)).map(inv => ({
        'Name': inv.name,
        'Dept': inv.department,
        'Total Duties': inv.assignedDuties?.length || 0
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Roster");
    XLSX.writeFile(wb, "University_Duty_Roster.xlsx");
}

async function generateZIP(fullAllotment: any) {
    const zip = new JSZip();
    const dates = Array.from(new Set(Object.keys(fullAllotment).map(k => k.split(' ')[0]))).sort();
    for (const date of dates) {
        const rows = [['Shift', 'Faculty', 'Room', 'Status']];
        Object.keys(fullAllotment).filter(k => k.startsWith(date)).forEach(key => {
            fullAllotment[key].invigilatorAssignments.forEach((a: any) => {
                rows.push([key.split(' ')[1], a.invigilator.name, a.classroom?.roomNo || 'Reserved', a.isReserved ? 'RESERVED' : 'ACTIVE']);
            });
        });
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Duty");
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        zip.file(`Duty_Chart_${date}.xlsx`, buf);
    }
    const content = await zip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync('Datewise_Duty_Charts_Package.zip', content);
}

generateAllReports();
