const fs = require('fs');
const xlsx = require('xlsx');

const f1 = 'C:/Users/Aryan/.gemini/antigravity/brain/122f741a-d73d-4d55-8d15-b5f72ccab663/.user_uploaded/media_1792346206747_5e4b1aec.xlsx';
const f2 = 'C:/Users/Aryan/.gemini/antigravity/brain/122f741a-d73d-4d55-8d15-b5f72ccab663/.user_uploaded/media_1792346303453_e2ef2ef9.xlsx';

const wb1 = xlsx.readFile(f1);
const wb2 = xlsx.readFile(f2);

const romanToNum = { 'I': 1, 'III': 3, 'V': 5, 'VII': 7, '1': 1, '3': 3, '5': 5, '7': 7 };

const campusCohorts = [];
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
    const semNum = romanToNum[sem] || sem;
    campusCohorts.push({ shift: sheetName, course, batch, sem, semNum, total });
  }
});

const rows1 = xlsx.utils.sheet_to_json(wb1.Sheets['Sheet1'], { header: 1 });

function normalizeName(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]/g, '');
}

console.log('--- Matching Cohorts to F1 Exams ---');
campusCohorts.forEach(cohort => {
  const matchingF1 = [];
  rows1.slice(1).forEach(r => {
    if (!r || !r[4]) return;
    const f1Course = String(r[4]).trim();
    const f1Sem = Number(r[5]);
    if (f1Sem !== Number(cohort.semNum)) return;

    // Check if course matches
    const f1Upper = f1Course.toUpperCase();
    const cUpper = cohort.course.toUpperCase();

    let matches = false;
    // Specific BTL checks
    if (f1Upper.includes('GEU CAMPUS ONLY') || (f1Upper.includes('GEU CAMPUS') && !f1Upper.includes('BTL'))) {
      matches = false;
    } else if (cUpper === 'B.TECH CSE' || cUpper === 'B.TECH') {
      if (cohort.semNum === 1 && f1Upper === 'BACHELOR OF TECHNOLOGY') matches = true;
      if (cohort.semNum !== 1 && (f1Upper.includes('COMPUTER SCIENCE') || f1Upper.includes('(CS)'))) matches = true;
    } else if (cUpper === 'B.TECH ECE') {
      if (f1Upper.includes('ECE')) matches = true;
    } else if (cUpper === 'B.TECH ME') {
      if (f1Upper.includes('MECHANICAL') || f1Upper.includes('(ME)')) matches = true;
    } else if (cUpper === 'B.TECH CE') {
      if (f1Upper.includes('CIVIL') || f1Upper.includes('(CE)')) matches = true;
    } else if (cUpper === 'B.PHARMA') {
      if (f1Upper.includes('PHARMACY') || f1Upper.includes('PHARMA')) matches = true;
    } else if (cUpper === 'BBA') {
      if (f1Upper === 'BACHELOR OF BUSINESS ADMINISTRATION' || f1Upper === 'BACHELOR OF BUSINESS ADMINISTRATION (BTL/HLD)') matches = true;
    } else if (cUpper === 'BCA') {
      if (f1Upper === 'BACHELOR OF COMPUTER APPLICATIONS') matches = true;
    } else if (cUpper === 'B.COM(H)') {
      if (f1Upper === 'BACHELOR OF COMMERCE (HONOURS)') matches = true;
    } else if (cUpper.includes('AI') && cUpper.includes('BCA')) {
      if (f1Upper.includes('BCA') && (f1Upper.includes('ARTIFICIAL INTELLIGENCE') || f1Upper.includes('AI'))) matches = true;
    } else if (cUpper === 'MCA') {
      if ((f1Upper === 'MASTER OF COMPUTER APPLICATIONS' || f1Upper.startsWith('MASTER OF COMPUTER APPLICATIONS')) && !f1Upper.includes('AI&DS') && !f1Upper.includes('D2 SECTION')) matches = true;
    } else if (cUpper.includes('MCA AI') || cUpper.includes('MCA AI&DS')) {
      if (f1Upper.includes('MCA AI&DS') && !f1Upper.includes('D2 SECTION')) matches = true;
    } else if (cUpper === 'M.TECH CSE') {
      if (f1Upper.includes('MASTER OF TECHNOLOGY')) matches = true;
    } else if (cUpper === 'M.PHARMA') {
      if (f1Upper.includes('MASTER OF PHARMACY')) matches = true;
    } else if (cUpper.startsWith('DIPLOMA')) {
      if (cUpper.includes('CS') && f1Upper.includes('DIPLOMA (CS)')) matches = true;
      else if (cUpper.includes('ME') && f1Upper.includes('DIPLOMA (ME)')) matches = true;
      else if (cUpper.includes('CE') && f1Upper.includes('DIPLOMA (CE)')) matches = true;
      else if (cUpper.includes('ECE') && f1Upper.includes('DIPLOMA (ECE)')) matches = true;
      else if (cUpper === 'DIPLOMA' && f1Upper === 'DIPLOMA') matches = true;
    }

    if (matches) {
      const d = typeof r[1] === 'number' ? xlsx.SSF.parse_date_code(r[1]) : null;
      const dateStr = d ? `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}` : String(r[1]);
      matchingF1.push({
        date: dateStr,
        day: r[2],
        time: r[3],
        f1Course,
        subject: r[6],
        code: r[7]
      });
    }
  });

  console.log(`${cohort.shift} | ${cohort.course} (Sem ${cohort.sem}) [Students: ${cohort.total}]: Matched ${matchingF1.length} exams`);
  if (matchingF1.length === 0) {
    console.log(`   --> NO EXAMS MATCHED FOR ${cohort.course} Sem ${cohort.sem}!`);
  }
});
