
import { generateSeatPlan, assignInvigilators } from '../src/lib/planning';
import { generateMockStudents, generateMockClassrooms, generateMockInvigilators, getBhimtalExamSchedule } from '../src/lib/data';

function testAllotment() {
    console.log("Starting Allotment Test for Bhimtal Campus...");
    
    const students = generateMockStudents(40);
    const classrooms = generateMockClassrooms();
    const invigilators = generateMockInvigilators();
    const schedule = getBhimtalExamSchedule();

    console.log(`Total Students: ${students.length}`);
    console.log(`Total Classrooms: ${classrooms.length}`);
    console.log(`Total Exams in Schedule: ${schedule.length}`);

    // Test first session
    const firstSessionKey = `${schedule[0].date} ${schedule[0].time}`;
    const concurrentExams = schedule.filter(e => `${e.date} ${e.time}` === firstSessionKey);

    console.log(`\nTesting Session: ${firstSessionKey}`);
    console.log(`Exams in this session: ${concurrentExams.map(e => e.subjectName).join(', ')}`);

    try {
        const { plan, updatedStudents } = generateSeatPlan(students, classrooms, concurrentExams);
        const assignedSeats = plan.assignments.filter(a => a.student !== null).length;
        console.log(`Successfully assigned ${assignedSeats} seats.`);

        const { assignments: invAssignments } = assignInvigilators(invigilators, plan, concurrentExams[0], 4);
        console.log(`Successfully assigned ${invAssignments.length} invigilators.`);
        
        console.log("\nSample Seat Assignment:");
        const sample = plan.assignments.filter(a => a.student !== null).slice(0, 5);
        sample.forEach(s => {
            console.log(`- Student: ${s.student.name} | Room: ${s.classroom.roomNo} | Seat: ${s.seatNumber} | Subject: ${s.student.exam.subjectName}`);
        });

    } catch (error) {
        console.error("Allotment Failed:", error);
    }
}

testAllotment();
