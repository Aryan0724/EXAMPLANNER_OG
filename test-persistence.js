
const { generateSeatPlan } = require('./src/lib/planning');
const { generateMockStudents, generateMockClassrooms, generateMockExamSchedule } = require('./src/lib/data');

// Since we are in a ESM/NextJS project, we might need a simple shim or just mock the dependencies
// Actually, let's just write a standalone test that logic-checks the planning.ts

async function testPersistence() {
    console.log("Testing Seat Persistence Logic...");

    // Manual Mock Data
    const students = [
        { id: 'S1', name: 'Student 1', rollNo: '101', department: 'CS', course: 'BTech', semester: 1, ineligibilityRecords: [], unavailableSlots: [], seatAssignment: null },
        { id: 'S2', name: 'Student 2', rollNo: '102', department: 'EC', course: 'BTech', semester: 1, ineligibilityRecords: [], unavailableSlots: [], seatAssignment: null }
    ];

    const classrooms = [
        { id: 'C1', roomNo: '101', building: 'A', rows: 1, columns: 2, benchCapacities: [2], capacity: 2, unavailableSlots: [] }
    ];

    const exam1 = { id: 'E1', date: '2026-02-10', time: '09:30', course: 'BTech', department: 'CS', subjectName: 'Math', subjectCode: 'M1', semester: 1 };
    const exam2 = { id: 'E2', date: '2026-02-10', time: '09:30', course: 'BTech', department: 'EC', subjectName: 'Physics', subjectCode: 'P1', semester: 1 };
    const exam3 = { id: 'E3', date: '2026-02-11', time: '09:30', course: 'BTech', department: 'CS', subjectName: 'Chem', subjectCode: 'C1', semester: 1 };

    // Session 1: Allot E1 and E2
    const { plan: plan1, updatedStudents: studentsAfter1 } = generateSeatPlan(students, classrooms, [exam1, exam2]);
    console.log("Session 1 Assignments:");
    plan1.assignments.filter(a => a.student).forEach(a => console.log(`  ${a.student.name}: Room ${a.classroom.roomNo}, Seat ${a.seatNumber}`));

    // Session 2: Allot E3 (Only Student 1 is eligible)
    const { plan: plan2, updatedStudents: studentsAfter2 } = generateSeatPlan(studentsAfter1, classrooms, [exam3]);
    console.log("\nSession 2 (Persistent) Assignments:");
    plan2.assignments.filter(a => a.student).forEach(a => console.log(`  ${a.student.name}: Room ${a.classroom.roomNo}, Seat ${a.seatNumber}`));

    const s1_1 = plan1.assignments.find(a => a.student?.id === 'S1');
    const s1_2 = plan2.assignments.find(a => a.student?.id === 'S1');

    if (s1_1.seatNumber === s1_2.seatNumber && s1_1.classroom.id === s1_2.classroom.id) {
        console.log("\nSUCCESS: Seat remained constant!");
    } else {
        console.log("\nFAILURE: Seat changed.");
    }
}

// Simple mock for types/imports since we're running in bare node
global.getEligibleStudentsForExam = function (allStudents, exam) {
    return allStudents.filter(s => s.course === exam.course && s.department === exam.department);
};

// We need to actually import the function or copy it for a clean test
// I'll copy the function logic into a temporary test file to avoid ESM/TS issues in a quick node run

testPersistence().catch(console.error);
