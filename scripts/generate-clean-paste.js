const fs = require('fs');
const exams = JSON.parse(fs.readFileSync('scripts/bhimtal_extracted_exams.json', 'utf8'));

// Format as TSV with headers
const header = ['Date', 'Time', 'Subject Code', 'Subject Name', 'Course', 'Semester', 'Department'].join('\t');
const rows = exams.map(e => [
  e.date,
  e.time,
  e.subjectCode,
  e.subjectName,
  e.course,
  e.semester,
  e.department
].join('\t'));

const tsvContent = [header, ...rows].join('\n');
fs.writeFileSync('bhimtal_exam_schedule.tsv', tsvContent, 'utf8');

// Also create clean CSV
const csvHeader = 'Date,Time,Subject Code,Subject Name,Course,Semester,Department';
const csvRows = exams.map(e => {
  const esc = (s) => `"${String(s || '').replace(/"/g, '""')}"`;
  return [
    e.date,
    esc(e.time),
    esc(e.subjectCode),
    esc(e.subjectName),
    esc(e.course),
    e.semester,
    esc(e.department)
  ].join(',');
});
const csvContent = [csvHeader, ...csvRows].join('\n');
fs.writeFileSync('bhimtal_exam_schedule.csv', csvContent, 'utf8');

console.log('Regenerated bhimtal_exam_schedule.tsv and bhimtal_exam_schedule.csv with exact shift times!');
