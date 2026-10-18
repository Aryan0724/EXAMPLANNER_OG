const fs = require('fs');
const cohorts = JSON.parse(fs.readFileSync('scripts/masterplan_cohorts.json', 'utf8'));

const deptMap = {
  'B.Sc (Nursing)': { dept: 'College of Nursing', code: 'NUR' },
  'B.Tech CSE': { dept: 'Computer Science and Engineering', code: 'CSE' },
  'B.Tech': { dept: 'Engineering', code: 'BT' },
  'B.Tech ECE': { dept: 'Electronics and Communication Engineering', code: 'ECE' },
  'B.Tech ME': { dept: 'Mechanical Engineering', code: 'ME' },
  'B.Tech CE': { dept: 'Civil Engineering', code: 'CE' },
  'B.Pharma': { dept: 'College of Pharmacy', code: 'PHARM' },
  'M.Pharma': { dept: 'College of Pharmacy', code: 'MPHARM' },
  'BBA': { dept: 'School of Management', code: 'BBA' },
  'BCA': { dept: 'Computer Applications', code: 'BCA' },
  'B.Com(H)': { dept: 'Commerce', code: 'BCOM' },
  'BCA(Hons.) with AI&DS': { dept: 'Computer Applications', code: 'BCAAI' },
  'BCA A I A D S': { dept: 'Computer Applications', code: 'BCAAI' },
  'MCA': { dept: 'Computer Applications', code: 'MCA' },
  'MCA AI&DS': { dept: 'Computer Applications', code: 'MCAAI' },
  'M.Tech CSE': { dept: 'Computer Science and Engineering', code: 'MTCSE' },
  'Diploma CSE': { dept: 'Polytechnic', code: 'DIPCSE' },
  'DiplomaCSE': { dept: 'Polytechnic', code: 'DIPCSE' },
  'Diploma ECE': { dept: 'Polytechnic', code: 'DIPECE' },
  'DiplomaECE': { dept: 'Polytechnic', code: 'DIPECE' },
  'Diploma ME': { dept: 'Polytechnic', code: 'DIPME' },
  'DiplomaME': { dept: 'Polytechnic', code: 'DIPME' },
  'Diploma CE': { dept: 'Polytechnic', code: 'DIPCE' },
  'DIPLOMA': { dept: 'Polytechnic', code: 'DIP' },
};

const officialSpecs = cohorts.map(c => {
  const info = deptMap[c.course] || { dept: 'General', code: 'GEN' };
  // Canonicalize course name
  let canonCourse = c.course;
  if (c.course === 'DiplomaCSE') canonCourse = 'Diploma CSE';
  if (c.course === 'DiplomaECE') canonCourse = 'Diploma ECE';
  if (c.course === 'DiplomaME') canonCourse = 'Diploma ME';
  if (c.course === 'BCA A I A D S') canonCourse = 'BCA(Hons.) with AI&DS';
  if (c.course === 'DIPLOMA') canonCourse = 'Diploma CSE';

  return {
    course: canonCourse,
    batch: c.batch,
    semester: c.semester,
    totalStudents: c.totalStudents,
    department: info.dept,
    code: info.code,
    shift: c.shift
  };
});

console.log('Total official specs:', officialSpecs.length);
console.log('Total students:', officialSpecs.reduce((a, b) => a + b.totalStudents, 0));
fs.writeFileSync('scripts/official_student_specs.json', JSON.stringify(officialSpecs, null, 2));
