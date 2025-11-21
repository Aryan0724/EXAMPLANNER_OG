
import * as XLSX from 'xlsx';
import type { SeatPlan, InvigilatorAssignment, Student, Classroom, Invigilator, ExamSlot } from './types';

type FullAllotment = Record<string, { seatPlan: SeatPlan, invigilatorAssignments: InvigilatorAssignment[] }>;

interface MasterReportRow {
    Exam_Date: string;
    Day: string;
    Shift: string;
    Time: string;
    Course_Name: string;
    Department: string;
    Subject_Name: string;
    Subject_Code: string;
    Room_No: string;
    Room_Capacity: number;
    No_of_Students_Allotted: number;
    Invigilator_1_Name?: string;
    Invigilator_1_ID?: string;
    Invigilator_1_Dept?: string;
    Invigilator_1_Contact?: string; // This will be empty as we don't store it
    Invigilator_2_Name?: string;
    Invigilator_2_ID?: string;
    Invigilator_2_Dept?: string;
    Invigilator_2_Contact?: string; // This will be empty
    Total_Invigilators: number;
    Room_Zone_Block?: string;
    Invigilator_Duty_Type?: string; // Example: Main, Assistant
    Invigilator_Availability_Status?: string; // Example: Available
    Replacement_Invigilator_Name?: string; // Future enhancement
    Replacement_Reason?: string; // Future enhancement
    Teacher_Duty_Count?: number;
    Exam_Session_ID: string;
    Created_By: string;
    Created_On: string;
    Remarks?: string;
}

const getDayOfWeek = (date: string) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date(date).getDay()];
};

export function generateMasterReport(fullAllotment: FullAllotment, allStudents: Student[], allClassrooms: Classroom[], allInvigilators: Invigilator[]) {
    const masterData: MasterReportRow[] = [];
    
    // Create maps for quick lookups
    const invigilatorDutyCountMap = new Map<string, number>();

    // Process each session in the allotment
    for (const sessionKey of Object.keys(fullAllotment)) {
        const { seatPlan, invigilatorAssignments } = fullAllotment[sessionKey];
        const exams = Array.isArray(seatPlan.exam) ? seatPlan.exam : [seatPlan.exam];
        const representativeExam = exams[0];

        // Group assignments by classroom
        const assignmentsByRoom = new Map<string, { students: Student[], invigilators: Invigilator[] }>();

        seatPlan.assignments.forEach(seat => {
            if (seat.student) {
                if (!assignmentsByRoom.has(seat.classroom.id)) {
                    assignmentsByRoom.set(seat.classroom.id, { students: [], invigilators: [] });
                }
                assignmentsByRoom.get(seat.classroom.id)?.students.push(seat.student);
            }
        });

        invigilatorAssignments.forEach(invAssignment => {
            if (!assignmentsByRoom.has(invAssignment.classroom.id)) {
                 assignmentsByRoom.set(invAssignment.classroom.id, { students: [], invigilators: [] });
            }
            assignmentsByRoom.get(invAssignment.classroom.id)?.invigilators.push(invAssignment.invigilator);

            // Increment duty count for each invigilator
            const count = invigilatorDutyCountMap.get(invAssignment.invigilator.id) || 0;
            invigilatorDutyCountMap.set(invAssignment.invigilator.id, count + 1);
        });

        // Create rows for the master report
        for (const [classroomId, data] of assignmentsByRoom.entries()) {
            const classroom = allClassrooms.find(c => c.id === classroomId);
            if (!classroom) continue;

            // Since a room can have students from multiple exams, we list them.
            const uniqueCourses = [...new Set(data.students.map(s => s.course))].join(', ');
            const uniqueDepts = [...new Set(data.students.map(s => s.department))].join(', ');
            const uniqueSubjects = [...new Set(data.students.map(s => s.exam.subjectName))].join(', ');
            const uniqueSubjectCodes = [...new Set(data.students.map(s => s.exam.subjectCode))].join(', ');


            const invigilator1 = data.invigilators[0];
            const invigilator2 = data.invigilators[1];

            const row: MasterReportRow = {
                Exam_Date: representativeExam.date,
                Day: getDayOfWeek(representativeExam.date),
                Shift: new Date(`${representativeExam.date}T${representativeExam.time}`).getHours() < 12 ? 'Morning' : 'Afternoon',
                Time: representativeExam.time,
                Course_Name: uniqueCourses,
                Department: uniqueDepts,
                Subject_Name: uniqueSubjects,
                Subject_Code: uniqueSubjectCodes,
                Room_No: classroom.roomNo,
                Room_Capacity: classroom.capacity,
                No_of_Students_Allotted: data.students.length,
                Invigilator_1_Name: invigilator1?.name,
                Invigilator_1_ID: invigilator1?.id,
                Invigilator_1_Dept: invigilator1?.department,
                Invigilator_2_Name: invigilator2?.name,
                Invigilator_2_ID: invigilator2?.id,
                Invigilator_2_Dept: invigilator2?.department,
                Total_Invigilators: data.invigilators.length,
                Room_Zone_Block: classroom.building,
                Invigilator_Duty_Type: data.invigilators.length > 1 ? 'Main / Assistant' : 'Main',
                Invigilator_Availability_Status: 'Available',
                Teacher_Duty_Count: invigilator1 ? invigilatorDutyCountMap.get(invigilator1.id) : undefined,
                Exam_Session_ID: `EXAM-${representativeExam.date.replace(/-/g, '')}-${representativeExam.time.replace(':', '')}`,
                Created_By: 'Examplanner',
                Created_On: new Date().toLocaleString(),
            };
            masterData.push(row);
        }
    }

    // --- Generate Summary Sheets ---

    // 1. Teacher-wise Summary
    const teacherSummary = allInvigilators.map(inv => {
        const duties = invigilatorDutyCountMap.get(inv.id) || 0;
        const dutyDetails = masterData
            .filter(row => row.Invigilator_1_ID === inv.id || row.Invigilator_2_ID === inv.id)
            .map(row => `${row.Exam_Date} (${row.Room_No})`)
            .join('; ');
        
        return {
            Teacher_Name: inv.name,
            Dept: inv.department,
            No_of_Duties: duties,
            Date_Wise_Rooms: dutyDetails,
            Remarks: duties > 3 ? 'High Load' : ''
        };
    }).filter(row => row.No_of_Duties > 0);


    // 2. Room-wise Report
    const roomReport = masterData.map(row => ({
        Room_No: row.Room_No,
        Date: row.Exam_Date,
        Shift: row.Shift,
        'Course(s)': row.Course_Name,
        'Subject(s)': row.Subject_Code,
        Invigilators: [row.Invigilator_1_Name, row.Invigilator_2_Name].filter(Boolean).join(', '),
        Student_Count: row.No_of_Students_Allotted,
    }));


    // 3. Department Load Sheet
    const dutiesByDept = new Map<string, { totalDuties: number, teacherCount: number }>();
    allInvigilators.forEach(inv => {
        if (!dutiesByDept.has(inv.department)) {
            dutiesByDept.set(inv.department, { totalDuties: 0, teacherCount: 0 });
        }
        const deptData = dutiesByDept.get(inv.department)!;
        deptData.teacherCount += 1;
        deptData.totalDuties += invigilatorDutyCountMap.get(inv.id) || 0;
    });

    const deptLoadSheet = Array.from(dutiesByDept.entries()).map(([dept, data]) => ({
        Department: dept,
        No_of_Teachers: data.teacherCount,
        Total_Duties: data.totalDuties,
        Avg_Duties_per_Teacher: data.teacherCount > 0 ? (data.totalDuties / data.teacherCount).toFixed(2) : 0,
    }));


    // --- Create Excel File ---
    const wb = XLSX.utils.book_new();
    const wsMaster = XLSX.utils.json_to_sheet(masterData);
    const wsTeacher = XLSX.utils.json_to_sheet(teacherSummary);
    const wsRoom = XLSX.utils.json_to_sheet(roomReport);
    const wsDept = XLSX.utils.json_to_sheet(deptLoadSheet);
    
    XLSX.utils.book_append_sheet(wb, wsMaster, "Invigilation_Master_Data");
    XLSX.utils.book_append_sheet(wb, wsTeacher, "Teacher-wise Summary");
    XLSX.utils.book_append_sheet(wb, wsRoom, "Room-wise Report");
    XLSX.utils.book_append_sheet(wb, wsDept, "Department Load Sheet");

    const sessionDate = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Master_Invigilation_Allotment_Report_${sessionDate}.xlsx`);
}
