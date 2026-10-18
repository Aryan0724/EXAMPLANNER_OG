const fs = require('fs');

// Load cohorts and exams
const cohorts = JSON.parse(fs.readFileSync('scripts/masterplan_cohorts.json', 'utf8'));
const exams = JSON.parse(fs.readFileSync('scripts/bhimtal_extracted_exams.json', 'utf8'));

// Generate students from cohorts
const students = [];
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

cohorts.forEach((cohort, cIdx) => {
  const matchYear = cohort.batch.match(/20(\d{2})/);
  const yr = matchYear ? matchYear[1] : '25';
  const cleanCode = cohort.course.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();

  for (let i = 1; i <= cohort.totalStudents; i++) {
    const padNum = String(i).padStart(3, '0');
    const rollNo = `${yr}${cleanCode}${padNum}`;
    const secIdx = Math.floor((i - 1) / 70);
    const section = SECTIONS[Math.min(secIdx, SECTIONS.length - 1)];

    students.push({
      id: `S_${rollNo}_S${cohort.semester}`,
      name: `Student ${cohort.course} ${i}`,
      rollNo,
      department: cohort.course,
      course: cohort.course,
      semester: cohort.semester,
      section,
      ineligibilityRecords: [],
      unavailableSlots: [],
      seatAssignment: null,
      isDebarred: false
    });
  }
});

console.log('Total students generated:', students.length);

// Classrooms from OFFICIAL_CLASSROOM_SPECS
const OFFICIAL_CLASSROOM_SPECS = [
  { roomNo: 'A007', building: 'Admin Block A', rows: 5, columns: 3, totalSitting: 30 },
  { roomNo: 'A008', building: 'Admin Block A', rows: 6, columns: 3, totalSitting: 33 },
  { roomNo: 'C001', building: 'Academic Block C', rows: 6, columns: 4, totalSitting: 43 },
  { roomNo: 'C003', building: 'Academic Block C', rows: 6, columns: 4, totalSitting: 43 },
  { roomNo: 'C102', building: 'Academic Block C', rows: 6, columns: 4, totalSitting: 42 },
  { roomNo: 'C104', building: 'Academic Block C', rows: 6, columns: 4, totalSitting: 42 },
  { roomNo: 'C202', building: 'Academic Block C', rows: 6, columns: 4, totalSitting: 32 },
  { roomNo: 'C203', building: 'Academic Block C', rows: 9, columns: 4, totalSitting: 72 },
  { roomNo: 'D003', building: 'Academic Block D', rows: 11, columns: 3, totalSitting: 66 },
  { roomNo: 'D006', building: 'Academic Block D', rows: 10, columns: 3, totalSitting: 60 },
  { roomNo: 'D103', building: 'Academic Block D', rows: 15, columns: 4, totalSitting: 120 },
  { roomNo: 'D104', building: 'Academic Block D', rows: 15, columns: 4, totalSitting: 120 },
  { roomNo: 'D106', building: 'Academic Block D', rows: 11, columns: 3, totalSitting: 66 },
  { roomNo: 'D203', building: 'Academic Block D', rows: 11, columns: 7, totalSitting: 77 },
  { roomNo: 'D204', building: 'Academic Block D', rows: 11, columns: 7, totalSitting: 77 },
  { roomNo: 'D205', building: 'Academic Block D', rows: 12, columns: 3, totalSitting: 72 },
  { roomNo: 'D206', building: 'Academic Block D', rows: 12, columns: 3, totalSitting: 72 },
  { roomNo: 'E202', building: 'Academic Block E', rows: 8, columns: 5, totalSitting: 80 },
];

const classrooms = OFFICIAL_CLASSROOM_SPECS.map((spec, index) => {
  const benchCount = spec.rows * spec.columns;
  const baseCapacity = Math.floor(spec.totalSitting / benchCount);
  const remainder = spec.totalSitting % benchCount;
  const benchCapacities = [];
  for (let i = 0; i < benchCount; i++) {
    benchCapacities.push(i < remainder ? baseCapacity + 1 : baseCapacity);
  }
  return {
    id: `CR_${spec.roomNo}`,
    roomNo: spec.roomNo,
    building: spec.building,
    capacity: spec.totalSitting,
    rows: spec.rows,
    columns: spec.columns,
    benchCapacities,
    unavailableSlots: [],
    departmentBlock: spec.building
  };
});

// Test on Session 1: 2026-09-26 09.30 AM - 11.00 AM
const session1Exams = exams.filter(e => e.date === '2026-09-26' && e.time === '09.30 AM - 11.00 AM');
console.log('Session 1 exams count:', session1Exams.length);

// Let's inspect which students match Session 1 exams
function isCourseMatch(c1, c2) {
  if (!c1 || !c2) return false;
  const s1 = c1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = c2.toLowerCase().replace(/[^a-z0-9]/g, '');
  return s1 === s2 || s1.includes(s2) || s2.includes(s1);
}

const eligible = [];
session1Exams.forEach(exam => {
  const matched = students.filter(s => {
    if (s.semester !== exam.semester) return false;
    return isCourseMatch(s.course, exam.course);
  });
  console.log(`Exam ${exam.subjectCode} - ${exam.course} (Sem ${exam.semester}): ${matched.length} students matched`);
  matched.forEach(s => eligible.push({ ...s, exam }));
});

console.log('Total eligible student-exam pairs in Session 1:', eligible.length);
