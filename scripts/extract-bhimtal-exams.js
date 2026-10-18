const fs = require('fs');
const xlsx = require('xlsx');

const f1 = 'C:/Users/Aryan/.gemini/antigravity/brain/122f741a-d73d-4d55-8d15-b5f72ccab663/.user_uploaded/media_1792346206747_5e4b1aec.xlsx';
const wb1 = xlsx.readFile(f1);
const rows1 = xlsx.utils.sheet_to_json(wb1.Sheets['Sheet1'], { header: 1 });

const cohorts = JSON.parse(fs.readFileSync('scripts/masterplan_cohorts.json', 'utf8'));

// We want to extract all exam slots for Bhimtal campus.
// For each row in F1, let's see which cohort it matches:
const bhimtalExams = [];
const seenExamKeys = new Set();

rows1.slice(1).forEach((r, idx) => {
  if (!r || !r[4]) return;
  const school = String(r[0] || '').trim();
  const rawDate = r[1];
  const day = String(r[2] || '').trim();
  const time = String(r[3] || '').trim();
  const rawCourse = String(r[4] || '').trim();
  const sem = Number(r[5]);
  const subjectName = String(r[6] || '').trim();
  const code = String(r[7] || '').trim();

  const d = typeof rawDate === 'number' ? xlsx.SSF.parse_date_code(rawDate) : null;
  const dateStr = d ? `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}` : String(rawDate);

  const f1Upper = rawCourse.toUpperCase();

  // Exclude courses explicitly for other campuses
  if (f1Upper.includes('GEU CAMPUS ONLY') || (f1Upper.includes('GEU CAMPUS') && !f1Upper.includes('BTL'))) {
    return;
  }

  // Find matching Bhimtal cohort
  let matchedCohort = null;
  for (const c of cohorts) {
    if (c.semester !== sem) continue;
    const cUpper = c.course.toUpperCase();

    let m = false;
    if (cUpper === 'B.TECH CSE' || cUpper === 'B.TECH') {
      if (sem === 1 && f1Upper === 'BACHELOR OF TECHNOLOGY') m = true;
      if (sem !== 1 && (f1Upper.includes('COMPUTER SCIENCE') || f1Upper.includes('(CS)'))) m = true;
    } else if (cUpper === 'B.TECH ECE') {
      if (f1Upper.includes('ECE')) m = true;
    } else if (cUpper === 'B.TECH ME') {
      if (f1Upper.includes('MECHANICAL') || f1Upper.includes('(ME)')) m = true;
    } else if (cUpper === 'B.TECH CE') {
      if (f1Upper.includes('CIVIL') || f1Upper.includes('(CE)')) m = true;
    } else if (cUpper === 'B.PHARMA') {
      if (f1Upper.includes('PHARMACY') || f1Upper.includes('PHARMA')) m = true;
    } else if (cUpper === 'BBA') {
      if (f1Upper === 'BACHELOR OF BUSINESS ADMINISTRATION' || f1Upper === 'BACHELOR OF BUSINESS ADMINISTRATION (BTL/HLD)') m = true;
    } else if (cUpper === 'BCA') {
      if (f1Upper === 'BACHELOR OF COMPUTER APPLICATIONS') m = true;
    } else if (cUpper === 'B.COM(H)') {
      if (f1Upper === 'BACHELOR OF COMMERCE (HONOURS)') m = true;
    } else if (cUpper.includes('AI') && cUpper.includes('BCA')) {
      if (f1Upper.includes('BCA') && (f1Upper.includes('ARTIFICIAL INTELLIGENCE') || f1Upper.includes('AI') || f1Upper.includes('A I A D S'))) m = true;
    } else if (cUpper === 'MCA') {
      if ((f1Upper === 'MASTER OF COMPUTER APPLICATIONS' || f1Upper.startsWith('MASTER OF COMPUTER APPLICATIONS')) && !f1Upper.includes('AI&DS') && !f1Upper.includes('D2 SECTION')) m = true;
    } else if (cUpper.includes('MCA AI') || cUpper.includes('MCA AI&DS')) {
      if (f1Upper.includes('MCA AI&DS') && !f1Upper.includes('D2 SECTION')) m = true;
    } else if (cUpper === 'M.TECH CSE') {
      if (f1Upper.includes('MASTER OF TECHNOLOGY')) m = true;
    } else if (cUpper === 'M.PHARMA') {
      if (f1Upper.includes('MASTER OF PHARMACY')) m = true;
    } else if (cUpper.startsWith('DIPLOMA')) {
      if (cUpper.includes('CS') && f1Upper.includes('DIPLOMA (CS)')) m = true;
      else if (cUpper.includes('ME') && f1Upper.includes('DIPLOMA (ME)')) m = true;
      else if (cUpper.includes('CE') && f1Upper.includes('DIPLOMA (CE)')) m = true;
      else if (cUpper.includes('ECE') && f1Upper.includes('DIPLOMA (ECE)')) m = true;
      else if (cUpper === 'DIPLOMA' && f1Upper === 'DIPLOMA') m = true;
    }

    if (m) {
      matchedCohort = c;
      break;
    }
  }

  if (matchedCohort) {
    const examKey = `${dateStr}_${time}_${matchedCohort.course}_Sem${sem}_${code}`;
    if (!seenExamKeys.has(examKey)) {
      seenExamKeys.add(examKey);
      bhimtalExams.push({
        id: `EX_${code.replace(/[^a-zA-Z0-9]/g, '_')}_S${sem}_${bhimtalExams.length + 1}`,
        date: dateStr,
        day,
        time,
        course: matchedCohort.course,
        semester: sem,
        subjectName,
        subjectCode: code,
        department: school,
        shift: matchedCohort.shift
      });
    }
  }
});

console.log('Total Bhimtal exams extracted:', bhimtalExams.length);

// Also add B.Sc (Nursing) exams for the dates if needed:
const nursingCohorts = cohorts.filter(c => c.course.includes('Nursing'));
const uniqueDates = [...new Set(bhimtalExams.map(e => e.date))].sort();

const nursingSubjects = {
  1: [
    { code: 'NUR 101', name: 'Applied Anatomy & Applied Physiology' },
    { code: 'NUR 102', name: 'Applied Sociology & Applied Psychology' },
    { code: 'NUR 103', name: 'Nursing Foundation I' }
  ],
  3: [
    { code: 'NUR 301', name: 'Applied Microbiology & Infection Control' },
    { code: 'NUR 302', name: 'Pharmacology I & Pathology I' },
    { code: 'NUR 303', name: 'Adult Health Nursing I' }
  ],
  5: [
    { code: 'NUR 501', name: 'Child Health Nursing I' },
    { code: 'NUR 502', name: 'Mental Health Nursing I' },
    { code: 'NUR 503', name: 'Community Health Nursing I' }
  ],
  7: [
    { code: 'NUR 701', name: 'Community Health Nursing II' },
    { code: 'NUR 702', name: 'Nursing Research & Statistics' },
    { code: 'NUR 703', name: 'Midwifery/Obstetrics & Gynaecology Nursing II' }
  ]
};

const shiftTimes = {
  'ETE_Shift_1': '09.30 AM - 11.00 AM',
  'ETE_Shift_2': '11.30 AM - 01.00 PM',
  'ETE_Shift_3': '01.30 PM - 03.00 PM',
  'ETE_Shift_4': '03.30 PM - 05.00 PM'
};

nursingCohorts.forEach(nc => {
  const subs = nursingSubjects[nc.semester] || [];
  subs.forEach((sub, sIdx) => {
    if (sIdx < uniqueDates.length) {
      const dateStr = uniqueDates[sIdx];
      const time = shiftTimes[nc.shift];
      bhimtalExams.push({
        id: `EX_${sub.code.replace(/[^a-zA-Z0-9]/g, '_')}_S${nc.semester}_${bhimtalExams.length + 1}`,
        date: dateStr,
        day: 'Exams',
        time,
        course: nc.course,
        semester: nc.semester,
        subjectName: sub.name,
        subjectCode: sub.code,
        department: 'College of Nursing',
        shift: nc.shift
      });
    }
  });
});

console.log('Total Bhimtal exams with Nursing:', bhimtalExams.length);

// Group by Date and Time
const sessionMap = new Map();
bhimtalExams.forEach(e => {
  const sessionKey = `${e.date} ${e.time}`;
  if (!sessionMap.has(sessionKey)) sessionMap.set(sessionKey, []);
  sessionMap.get(sessionKey).push(e);
});

console.log('Total exam sessions (Date + Time):', sessionMap.size);
sessionMap.forEach((exams, sessionKey) => {
  const coursesInSession = [...new Set(exams.map(e => `${e.course} (Sem ${e.semester})`))];
  console.log(`Session [${sessionKey}]: ${exams.length} exams across ${coursesInSession.length} courses: ${coursesInSession.slice(0, 5).join(', ')}${coursesInSession.length > 5 ? '...' : ''}`);
});

fs.writeFileSync('scripts/bhimtal_extracted_exams.json', JSON.stringify(bhimtalExams, null, 2));
