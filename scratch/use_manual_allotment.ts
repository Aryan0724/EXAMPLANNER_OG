
import { generateMockInvigilators, generateMockClassrooms, getBhimtalExamSchedule } from '../src/lib/data';
import { generateManualFacultyAllotment } from '../src/lib/planning';
import { ExamSlot, Invigilator, Classroom, InvigilatorAssignment } from '../src/lib/types';
import ExcelJS from 'exceljs';
import * as fs from 'fs';

/**
 * MANUAL REQUIREMENTS CONFIGURATION
 * This is where you can specify the exact room and faculty needs for each day/shift.
 */
const MANUAL_REQUIREMENTS = [
    { date: '2026-05-14', time: '09:30', roomCount: 2, activeStaff: 4, reservedStaff: 0 },
    { date: '2026-05-14', time: '09:31', roomCount: 14, activeStaff: 46, reservedStaff: 3 }, // Total 49
    { date: '2026-05-14', time: '13:30', roomCount: 17, activeStaff: 41, reservedStaff: 3 }, // Total 44
    // Add more days as needed...
];

async function runManualAllotment() {
    console.log("Running Manual Faculty Allotment Engine...");

    let facultyPool = generateMockInvigilators(122);
    const classrooms = generateMockClassrooms();
    const schedule = getBhimtalExamSchedule();

    const allAssignments: InvigilatorAssignment[] = [];

    for (const req of MANUAL_REQUIREMENTS) {
        console.log(`Processing ${req.date} ${req.time}...`);
        
        // Find matching exam slot from schedule
        const exam = schedule.find(e => e.date === req.date && (e.time === req.time || (req.time === '09:31' && e.time === '09:30'))) 
                    || { id: 'MOCK', date: req.date, time: req.time } as ExamSlot;

        const result = generateManualFacultyAllotment(
            facultyPool,
            classrooms,
            exam,
            req.roomCount,
            req.activeStaff,
            req.reservedStaff,
            ['Block C', 'Block D', 'Block E']
        );

        allAssignments.push(...result.assignments);
        facultyPool = result.updatedInvigilators;
    }

    await generateUniversityExcel(allAssignments, facultyPool);
    console.log("Manual Allotment Complete. Result saved to 'Manual_University_Duty_Chart.xlsx'");
}

async function generateUniversityExcel(assignments: InvigilatorAssignment[], faculty: Invigilator[]) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Duty Chart');

    // Headers
    sheet.mergeCells(1, 1, 1, 10);
    sheet.getCell(1,1).value = 'GEHU Bhimtal - Manual Faculty Allotment Report';
    sheet.getCell(1,1).font = { bold: true, size: 14 };

    sheet.addRow(['Sr.', 'Date', 'Time', 'Faculty Name', 'Designation', 'Dept', 'Room', 'Status']);
    
    assignments.forEach((asg, idx) => {
        sheet.addRow([
            idx + 1,
            asg.exam.date,
            asg.exam.time,
            asg.invigilator.name,
            asg.invigilator.designation,
            asg.invigilator.department.substring(0, 3).toUpperCase(),
            asg.classroom?.roomNo || 'Reserved',
            asg.isReserved ? 'RESERVED' : 'ACTIVE'
        ]);
    });

    // Summary at bottom
    sheet.addRow([]);
    sheet.addRow(['FACULTY DUTY SUMMARY']);
    faculty.filter(f => (f.assignedDuties?.length || 0) > 0).forEach(f => {
        sheet.addRow([f.name, f.designation, f.assignedDuties?.length]);
    });

    await workbook.xlsx.writeFile('Manual_University_Duty_Chart.xlsx');
}

runManualAllotment();
