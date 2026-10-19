const fs = require('fs');
const exams = JSON.parse(fs.readFileSync('scripts/bhimtal_extracted_exams.json', 'utf8'));

// Format as TSV with headers
const header = ['Date', 'Time', 'Subject Code', 'Subject Name', 'Course', 'Semester', 'Department'].join('\t');
const rows = exams.map(e => {
  // e.time is e.g. "09.30 AM - 11.00 AM" -> "09:30"
  const cleanTime = e.time.split(' - ')[0].replace('.', ':');
  return [
    e.date,
    cleanTime,
    e.subjectCode,
    e.subjectName,
    e.course,
    e.semester,
    e.department
  ].join('\t');
});

const tsvContent = [header, ...rows].join('\n');
fs.writeFileSync('scripts/schedule_paste_tsv.txt', tsvContent, 'utf8');

// Also create CSV
const csvHeader = 'Date,Time,Subject Code,Subject Name,Course,Semester,Department';
const csvRows = exams.map(e => {
  const cleanTime = e.time.split(' - ')[0].replace('.', ':');
  const esc = (s) => `"${String(s || '').replace(/"/g, '""')}"`;
  return [
    e.date,
    cleanTime,
    esc(e.subjectCode),
    esc(e.subjectName),
    esc(e.course),
    e.semester,
    esc(e.department)
  ].join(',');
});
const csvContent = [csvHeader, ...csvRows].join('\n');
fs.writeFileSync('scripts/schedule_paste_csv.csv', csvContent, 'utf8');

console.log('TSV rows count:', rows.length);
console.log('CSV rows count:', csvRows.length);
