const fs = require('fs');
const xlsx = require('xlsx');

const f1 = 'C:/Users/Aryan/.gemini/antigravity/brain/122f741a-d73d-4d55-8d15-b5f72ccab663/.user_uploaded/media_1792346206747_5e4b1aec.xlsx';
const f2 = 'C:/Users/Aryan/.gemini/antigravity/brain/122f741a-d73d-4d55-8d15-b5f72ccab663/.user_uploaded/media_1792346303453_e2ef2ef9.xlsx';

const wb2 = xlsx.readFile(f2);
const romanToNum = { 'I': 1, 'III': 3, 'V': 5, 'VII': 7, '1': 1, '3': 3, '5': 5, '7': 7 };

const allCohorts = [];

wb2.SheetNames.forEach(sheetName => {
  const rows = xlsx.utils.sheet_to_json(wb2.Sheets[sheetName], { header: 1 });
  const headerIdx = rows.findIndex(r => r && r.includes && (r.includes('COURSE') || r.includes('Course')));
  if (headerIdx === -1) return;
  const header = rows[headerIdx];
  const courseCol = header.indexOf('COURSE') !== -1 ? header.indexOf('COURSE') : header.indexOf('Course');
  const batchCol = header.indexOf('Batch');
  const semCol = header.indexOf('Sem');
  const totalCol = header.findIndex(c => String(c).includes('Total Students'));

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[courseCol] || String(r[courseCol]).toLowerCase().includes('total')) continue;
    const course = String(r[courseCol]).replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
    const batch = r[batchCol] ? String(r[batchCol]).trim() : '';
    const sem = r[semCol] ? String(r[semCol]).trim() : '';
    const total = r[totalCol] ? Number(r[totalCol]) : 0;
    const semNum = romanToNum[sem] || Number(sem) || 1;

    allCohorts.push({
      shift: sheetName,
      course,
      batch,
      semester: semNum,
      totalStudents: total
    });
  }
});

console.log('Total cohorts:', allCohorts.length);
console.log('Total students:', allCohorts.reduce((acc, c) => acc + c.totalStudents, 0));
fs.writeFileSync('scripts/masterplan_cohorts.json', JSON.stringify(allCohorts, null, 2));
