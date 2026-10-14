
import { generateMockStudents, generateMockClassrooms, generateMockInvigilators, getBhimtalExamSchedule } from '../src/lib/data';
import * as fs from 'fs';

function generateCSVs() {
    console.log("Generating CSV files for GEHU Bhimtal...");

    // 1. Invigilators
    const invs = generateMockInvigilators();
    const invHeader = "id,name,department,designation,gender,isAvailable\n";
    const invCsv = invHeader + invs.map(i => `${i.id},${i.name},${i.department},${i.designation},${i.gender},${i.isAvailable}`).join('\n');
    fs.writeFileSync('invigilators.csv', invCsv);

    // 2. Classrooms
    const rooms = generateMockClassrooms();
    const roomHeader = "id,roomNo,building,rows,columns,benchCapacities,departmentBlock\n";
    const roomCsv = roomHeader + rooms.map(r => `${r.id},${r.roomNo},${r.building},${r.rows},${r.columns},"[${r.benchCapacities.join(';')}]",${r.departmentBlock}`).join('\n');
    fs.writeFileSync('classrooms.csv', roomCsv);

    // 3. Exam Schedule
    const schedule = getBhimtalExamSchedule();
    const examHeader = "id,date,time,course,department,semester,subjectName,subjectCode,duration,group\n";
    const examCsv = examHeader + schedule.map(e => `${e.id},${e.date},${e.time},"${e.course}","${e.department}",${e.semester},"${e.subjectName}",${e.subjectCode},${e.duration},${e.group || ''}`).join('\n');
    fs.writeFileSync('exam_schedule.csv', examCsv);

    // 4. Students (Sample)
    const students = generateMockStudents(10); // 10 per course for a smaller sample file
    const studentHeader = "id,name,rollNo,department,course,semester,section,group\n";
    const studentCsv = studentHeader + students.map(s => `${s.id},${s.name},${s.rollNo},"${s.department}","${s.course}",${s.semester},${s.section},${s.group || ''}`).join('\n');
    fs.writeFileSync('students.csv', studentCsv);

    console.log("CSV files generated successfully.");
}

generateCSVs();
