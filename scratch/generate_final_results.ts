
import { generateSeatPlan, assignInvigilators } from '../src/lib/planning';
import { 
    generateMockStudents, 
    generateMockClassrooms, 
    generateMockInvigilators, 
    getBhimtalExamSchedule 
} from '../src/lib/data';
import * as fs from 'fs';

function runFullAllotment() {
    console.log("Starting Full Allotment Generation for GEHU Bhimtal...");
    
    // 1. Setup Data
    const students = generateMockStudents(80); // 80 students per course for a realistic load
    const classrooms = generateMockClassrooms();
    const invigilators = generateMockInvigilators();
    const schedule = getBhimtalExamSchedule();

    const results: any[] = [];

    // Group schedule by session (Date + Time)
    const sessions = schedule.reduce((acc, exam) => {
        const key = `${exam.date} ${exam.time}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(exam);
        return acc;
    }, {} as Record<string, any[]>);

    const sessionKeys = Object.keys(sessions).sort();

    let studentMasterList = [...students];
    let invigilatorMasterList = [...invigilators];

    console.log(`Processing ${sessionKeys.length} sessions...`);

    sessionKeys.forEach(sessionKey => {
        const concurrentExams = sessions[sessionKey];
        
        // Generate Seat Plan
        const { plan, updatedStudents } = generateSeatPlan(studentMasterList, classrooms, concurrentExams);
        studentMasterList = updatedStudents;

        // Assign Invigilators
        const { assignments: invAssignments, updatedInvigilators } = assignInvigilators(invigilatorMasterList, plan, concurrentExams[0], 4);
        invigilatorMasterList = updatedInvigilators;

        // Collate Result for this session
        const sessionResult = {
            session: sessionKey,
            exams: concurrentExams.map(e => ({
                subject: e.subjectName,
                course: e.course,
                students: plan.assignments.filter(a => a.student && a.student.exam.id === e.id).length
            })),
            roomsUsed: Array.from(new Set(plan.assignments.filter(a => a.student).map(a => a.classroom.roomNo))),
            invigilators: invAssignments.map(a => ({
                name: a.invigilator.name,
                room: a.classroom?.roomNo || 'Reserved',
                dept: a.invigilator.department
            }))
        };
        results.push(sessionResult);
    });

    // Write to a JSON file for the software/user to consume
    fs.writeFileSync('bhimtal_allotment_results.json', JSON.stringify(results, null, 2));
    
    // Also generate a Markdown Summary
    let md = "# GEHU Bhimtal Final Allotment Results\n\n";
    md += `Generated on: ${new Date().toLocaleString()}\n\n`;
    
    results.forEach(res => {
        md += `## Session: ${res.session}\n`;
        md += `### Exams:\n`;
        res.exams.forEach((e: any) => {
            md += `- **${e.subject}** (${e.course}): ${e.students} students\n`;
        });
        
        md += `\n### Room Allotment & Invigilation:\n`;
        md += `| Room | Invigilator | Department |\n`;
        md += `| :--- | :--- | :--- |\n`;
        res.invigilators.forEach((inv: any) => {
            md += `| ${inv.room} | ${inv.name} | ${inv.dept} |\n`;
        });
        md += `\n---\n`;
    });

    fs.writeFileSync('bhimtal_allotment_summary.md', md);
    console.log("Allotment complete. Results saved to bhimtal_allotment_results.json and bhimtal_allotment_summary.md");
}

try {
    runFullAllotment();
} catch (e) {
    console.error(e);
}
