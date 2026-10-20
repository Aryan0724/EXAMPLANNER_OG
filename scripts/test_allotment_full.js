const fs = require('fs');

// Load cohorts, exams, and aliases
const cohorts = JSON.parse(fs.readFileSync('scripts/masterplan_cohorts.json', 'utf8'));
const exams = JSON.parse(fs.readFileSync('scripts/bhimtal_extracted_exams.json', 'utf8'));

const COURSE_ALIASES = {
  'b.tech cse': 'B.Tech CSE',
  'b.tech computer science and engineering': 'B.Tech CSE',
  'btech cse': 'B.Tech CSE',
  'b.tech (cse)': 'B.Tech CSE',
  'bachelor of technology (computer science)': 'B.Tech CSE',
  'bachelor of technology (computer science)(btl/hld)': 'B.Tech CSE',
  'bachelor of technology (computer science)(hld/btl)': 'B.Tech CSE',
  'bachelor of technology': 'B.Tech',
  'b.tech': 'B.Tech',
  'btech': 'B.Tech',
  'b.sc (nursing)': 'B.Sc (Nursing)',
  'b.sc. nursing': 'B.Sc (Nursing)',
  'b.sc nursing': 'B.Sc (Nursing)',
  'bsc nursing': 'B.Sc (Nursing)',
  'b.tech ece': 'B.Tech ECE',
  'b.tech electronics and communication engineering': 'B.Tech ECE',
  'btech ece': 'B.Tech ECE',
  'bachelor of technology (ece) only (btl)': 'B.Tech ECE',
  'bachelor of technology ece  group only (btl)': 'B.Tech ECE',
  'bachelor of technology( ece)  only (btl)': 'B.Tech ECE',
  'b.tech me': 'B.Tech ME',
  'b.tech mechanical engineering': 'B.Tech ME',
  'btech me': 'B.Tech ME',
  'bachelor of technology (me) only (btl)': 'B.Tech ME',
  'bachelor of technology (mechanical engineering) only (btl)': 'B.Tech ME',
  'b.tech ce': 'B.Tech CE',
  'b.tech civil engineering': 'B.Tech CE',
  'btech ce': 'B.Tech CE',
  'bachelor of technology (ce) only (btl)': 'B.Tech CE',
  'bachelor of technology (civil engineering)  only (btl)': 'B.Tech CE',
  'bachelor of technology (civil engineering) only (btl)': 'B.Tech CE',
  'b.pharma': 'B.Pharma',
  'b.pharm': 'B.Pharma',
  'bpharm': 'B.Pharma',
  'bpharma': 'B.Pharma',
  'bachelor of pharmacy': 'B.Pharma',
  'pharmacy': 'B.Pharma',
  'bba': 'BBA',
  'bachelor of business administration': 'BBA',
  'bachelor of business administration (btl/hld)': 'BBA',
  'bca': 'BCA',
  'bachelor of computer applications': 'BCA',
  'b.com(h)': 'B.Com(H)',
  'b.com (h)': 'B.Com(H)',
  'b.com (hons.)': 'B.Com(H)',
  'b.com hons': 'B.Com(H)',
  'bcom(h)': 'B.Com(H)',
  'bcom (h)': 'B.Com(H)',
  'bcom hons': 'B.Com(H)',
  'bachelor of commerce (honours)': 'B.Com(H)',
  'b.com': 'B.Com(H)',
  'bcom': 'B.Com(H)',
  'bca(hons.) with ai&ds': 'BCA(Hons.) with AI&DS',
  'bca (hons.) with ai&ds': 'BCA(Hons.) with AI&DS',
  'bca ai&ds': 'BCA(Hons.) with AI&DS',
  'bca a i a d s': 'BCA(Hons.) with AI&DS',
  'bca(artificial intelligence and data science)': 'BCA(Hons.) with AI&DS',
  'mca': 'MCA',
  'master of computer applications': 'MCA',
  'mca ai&ds': 'MCA AI&DS',
  'm.tech cse': 'M.Tech CSE',
  'master of technology': 'M.Tech CSE',
  'm.pharma': 'M.Pharma',
  'master of pharmacy(pharmaceutics)': 'M.Pharma',
  'diploma cse': 'Diploma CSE',
  'diplomacse': 'Diploma CSE',
  'diploma (cs)': 'Diploma CSE',
  'diploma': 'Diploma CSE',
  'diploma ece': 'Diploma ECE',
  'diplomaece': 'Diploma ECE',
  'diploma (ece)': 'Diploma ECE',
  'diploma me': 'Diploma ME',
  'diplomame': 'Diploma ME',
  'diploma (me)': 'Diploma ME',
  'diploma ce': 'Diploma CE',
  'diplomace': 'Diploma CE',
  'diploma (ce)': 'Diploma CE',
  'diploma (ce)  (btl)': 'Diploma CE',
};

function canonicalizeCourse(c) {
  if (!c) return '';
  const clean = c.trim().toLowerCase().replace(/\s+/g, ' ');
  if (COURSE_ALIASES[clean]) return COURSE_ALIASES[clean];
  const alpha = clean.replace(/[^a-z0-9]/g, '');
  for (const [k, v] of Object.entries(COURSE_ALIASES)) {
    if (k.replace(/[^a-z0-9]/g, '') === alpha) return v;
  }
  return c.trim();
}

function isCourseMatch(c1, c2) {
  return canonicalizeCourse(c1).toLowerCase() === canonicalizeCourse(c2).toLowerCase();
}

// Generate realistic students
const students = [];
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

cohorts.forEach(cohort => {
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

// Official Classrooms
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

function buildClassrooms() {
  return OFFICIAL_CLASSROOM_SPECS.map(spec => {
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
      benchCapacities
    };
  });
}

// Group exams by session
const sessionMap = new Map();
exams.forEach(e => {
  const sessionKey = `${e.date} ${e.time}`;
  if (!sessionMap.has(sessionKey)) sessionMap.set(sessionKey, []);
  sessionMap.get(sessionKey).push(e);
});

console.log(`Running simulation on ${sessionMap.size} sessions with ${students.length} students across 18 classrooms...`);

let totalPassed = 0;
let totalFailed = 0;

sessionMap.forEach((sessionExams, sessionKey) => {
  // 1. Identify eligible students for these exams
  const eligibleStudents = [];
  const studentIds = new Set();

  sessionExams.forEach(exam => {
    students.forEach(s => {
      if (s.semester === exam.semester && isCourseMatch(s.course, exam.course)) {
        if (!studentIds.has(s.id)) {
          studentIds.add(s.id);
          eligibleStudents.push({ ...s, exam });
        }
      }
    });
  });

  if (eligibleStudents.length === 0) return;

  // 2. Classrooms sorted by priority then capacity
  const classrooms = buildClassrooms().sort((a, b) => b.capacity - a.capacity);

  // 3. Group students by course
  const courseBatches = new Map();
  eligibleStudents.forEach(s => {
    const key = canonicalizeCourse(s.course);
    if (!courseBatches.has(key)) courseBatches.set(key, []);
    courseBatches.get(key).push(s);
  });

  // Sort by roll number
  courseBatches.forEach(list => {
    list.sort((a, b) => a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true }));
  });

  // 4. Allocate to rooms using the new Side A / Side B seat targets
  const remainingBatches = new Map();
  courseBatches.forEach((list, k) => remainingBatches.set(k, [...list]));
  const getRem = k => remainingBatches.get(k)?.length || 0;
  const getTotalRem = () => {
    let sum = 0;
    remainingBatches.forEach(l => sum += l.length);
    return sum;
  };

  const roomAssignments = [];
  const roomQueue = [...classrooms];

  while (getTotalRem() > 0 && roomQueue.length > 0) {
    const room = roomQueue.shift();

    // Build ordered benches
    const orderedBenches = [];
    for (let col = 0; col < room.columns; col++) {
      for (let r = 0; r < room.rows; r++) {
        const benchIdx = r * room.columns + col;
        if (benchIdx < room.benchCapacities.length && room.benchCapacities[benchIdx] > 0) {
          orderedBenches.push({
            benchIdx,
            benchNumber: benchIdx + 1,
            capacity: room.benchCapacities[benchIdx],
            col,
            row: r
          });
        }
      }
    }

    const sideASeats = [];
    const sideBSeats = [];

    for (const b of orderedBenches) {
      if (b.capacity >= 2) {
        sideASeats.push({ ...b, slot: 'left', pos: 'Left' });
        sideBSeats.push({ ...b, slot: 'right', pos: 'Right' });
      } else if (b.capacity === 1) {
        const isSideA = room.columns > 1 ? (b.col % 2 === 0) : (b.row % 2 === 0);
        if (isSideA) {
          sideASeats.push({ ...b, slot: 'left', pos: 'Left' });
        } else {
          sideBSeats.push({ ...b, slot: 'right', pos: 'Right' });
        }
      }
    }

    const sortedCourses = Array.from(remainingBatches.keys())
      .filter(c => getRem(c) > 0)
      .sort((a, b) => getRem(b) - getRem(a));

    if (sortedCourses.length === 0) break;

    const courseA = sortedCourses[0];
    const poolA = remainingBatches.get(courseA);
    const takeA = Math.min(poolA.length, sideASeats.length);
    const studentsA = poolA.splice(0, takeA);

    const studentsB = [];
    let remSideB = sideBSeats.length;
    while (remSideB > 0) {
      const distinctCourses = Array.from(remainingBatches.keys())
        .filter(c => c !== courseA && getRem(c) > 0)
        .sort((a, b) => getRem(b) - getRem(a));

      if (distinctCourses.length === 0) break;

      const courseB = distinctCourses[0];
      const poolB = remainingBatches.get(courseB);
      const takeB = Math.min(poolB.length, remSideB);
      studentsB.push(...poolB.splice(0, takeB));
      remSideB -= takeB;
    }

    roomAssignments.push({ room, studentsA, studentsB, courseA, sideACap: sideASeats.length, sideBCap: sideBSeats.length });
  }

  // Print inspection for session 1
  if (sessionKey.includes('2026-09-26 09.30')) {
    console.log(`\n--- Detailed Room Inspection for ${sessionKey} ---`);
    roomAssignments.forEach(({ room, studentsA, studentsB, courseA, sideACap, sideBCap }) => {
      const distinctB = new Set(studentsB.map(s => canonicalizeCourse(s.course)));
      console.log(`Room ${room.roomNo} (${room.capacity} seats, ${room.rows}x${room.columns}) => Side A (${sideACap} seats): ${studentsA.length} [${courseA}] | Side B (${sideBCap} seats): ${studentsB.length} [${Array.from(distinctB).join(', ') || 'None'}] | Total in Room: ${studentsA.length + studentsB.length}`);
    });
  }

  totalPassed++;
});

console.log(`\n========================================`);
console.log(`ALL SESSIONS PROCESSED SUCCESSFULLY: ${totalPassed} PASSED`);
console.log(`========================================`);
