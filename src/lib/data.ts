

import { Student, Classroom, createClassroom, Invigilator, ExamSlot } from './types';

export const DEPARTMENTS = [
  'B.Tech Computer Science & Engineering',
  'B.Tech Mechanical Engineering',
  'B.Tech Civil Engineering',
  'B.Tech Electronics & Communication Engineering',
];

export const COURSES = {
  'B.Tech Computer Science & Engineering': ['CSE Core', 'CSE with specialization in AI & ML', 'CSE with specialization in Cyber Security'],
  'B.Tech Mechanical Engineering': ['ME Core', 'ME with specialization in Robotics', 'ME with specialization in Automotive'],
  'B.Tech Civil Engineering': ['CE Core', 'CE with specialization in Structural Engineering', 'CE with specialization in Environmental Engineering'],
  'B.Tech Electronics & Communication Engineering': ['ECE Core', 'ECE with specialization in VLSI Design', 'ECE with specialization in Telecommunications'],
};

const firstNames = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan", "Saanvi", "Aadhya", "Kiara", "Diya", "Pari", "Ananya", "Riya", "Sitara", "Avni", "Zoya", "Liam", "Olivia", "Noah", "Emma", "Oliver", "Ava", "Elijah", "Charlotte", "William", "Sophia", "James", "Amelia", "Benjamin", "Isabella", "Lucas", "Mia", "Henry", "Evelyn", "Alexander", "Harper"];
const lastNames = ["Sharma", "Verma", "Gupta", "Singh", "Kumar", "Patel", "Shah", "Mehta", "Joshi", "Das", "Reddy", "Menon", "Nair", "Pillai", "Smith", "Jones", "Williams", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson"];

const generateName = () => `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;


// --- Generate 5000 Students of 1st year in various courses ---
export const STUDENTS: Student[] = Array.from({ length: 5000 }, (_, i) => {
    const deptIndex = i % DEPARTMENTS.length;
    const dept = DEPARTMENTS[deptIndex];
    const deptCourses = COURSES[dept as keyof typeof COURSES];
    const courseIndex = i % deptCourses.length;
    const course = deptCourses[courseIndex];
    const semester = 1; // All are 1st year students
    const isDebarred = (i + 1) % 50 === 0;

    return {
      id: `S${String(i + 1).padStart(4, '0')}`,
      name: generateName(),
      rollNo: `${dept.substring(8,11).toUpperCase()}${String(new Date().getFullYear()).slice(2)}-${String(i + 1).padStart(4,'0')}`,
      department: dept,
      course: course,
      semester: semester,
      section: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'][i % 8],
      group: i % 2 === 0 ? 'A' : 'B', // Assign students to Group A or B
      ineligibilityRecords: [],
      unavailableSlots: [],
      seatAssignment: null,
      isDebarred: isDebarred,
    };
});

const generateBenchCapacities = (rows: number, cols: number, specialRows: number[] = [], specialCapacity: number = 3, defaultCapacity: number = 2): number[] => {
    const capacities: number[] = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            capacities.push(specialRows.includes(r + 1) ? specialCapacity : defaultCapacity);
        }
    }
    return capacities;
};

// --- Generate Classrooms with some having 3-seater benches ---
export const CLASSROOMS: Classroom[] = [
  // Block A (CS/IT) 
  createClassroom({ id: 'CRA101', roomNo: 'A-101', building: 'Academic Block A', rows: 8, columns: 5, benchCapacities: generateBenchCapacities(8, 5), unavailableSlots: [], departmentBlock: 'CS/IT' }),
  createClassroom({ id: 'CRA102', roomNo: 'A-102', building: 'Academic Block A', rows: 10, columns: 5, benchCapacities: generateBenchCapacities(10, 5), unavailableSlots: [], departmentBlock: 'CS/IT' }),
  // Room A201 with 3-seaters in middle rows 5 and 6
  createClassroom({ id: 'CRA201', roomNo: 'A-201', building: 'Academic Block A', rows: 10, columns: 6, benchCapacities: generateBenchCapacities(10, 6, [5, 6]), unavailableSlots: [], departmentBlock: 'CS/IT' }),
  createClassroom({ id: 'CRA202', roomNo: 'A-202', building: 'Academic Block A', rows: 12, columns: 6, benchCapacities: generateBenchCapacities(12, 6, [6,7]), unavailableSlots: [], departmentBlock: 'CS/IT' }),

  // Block B (ME/CE/AE)
  createClassroom({ id: 'CRB101', roomNo: 'B-101', building: 'Academic Block B', rows: 10, columns: 5, benchCapacities: generateBenchCapacities(10, 5), unavailableSlots: [], departmentBlock: 'ME/CE/AE' }),
  createClassroom({ id: 'CRB102', roomNo: 'B-102', building: 'Academic Block B', rows: 10, columns: 5, benchCapacities: generateBenchCapacities(10, 5), unavailableSlots: [], departmentBlock: 'ME/CE/AE' }),
  // Room B201 with 3-seaters in middle rows 7, 8, 9
  createClassroom({ id: 'CRB201', roomNo: 'B-201', building: 'Academic Block B', rows: 15, columns: 5, benchCapacities: generateBenchCapacities(15, 5, [7, 8, 9]), unavailableSlots: [], departmentBlock: 'ME/CE/AE' }),
  createClassroom({ id: 'CRB202', roomNo: 'B-202', building: 'Academic Block B', rows: 20, columns: 5, benchCapacities: generateBenchCapacities(20, 5), unavailableSlots: [], departmentBlock: 'ME/CE/AE' }),
  
  // Block C (EE/EC/BT/CH)
  createClassroom({ id: 'CRC101', roomNo: 'C-101', building: 'Academic Block C', rows: 7, columns: 4, benchCapacities: generateBenchCapacities(7, 4), unavailableSlots: [], departmentBlock: 'EE/EC/BT' }),
  createClassroom({ id: 'CRC102', roomNo: 'C-102', building: 'Academic Block C', rows: 8, columns: 5, benchCapacities: generateBenchCapacities(8, 5, [4]), unavailableSlots: [], departmentBlock: 'EE/EC/BT' }),
  createClassroom({ id: 'CRC201', roomNo: 'C-201', building: 'Academic Block C', rows: 10, columns: 5, benchCapacities: generateBenchCapacities(10, 5), unavailableSlots: [], departmentBlock: 'EE/EC/BT' }),
  createClassroom({ id: 'CRC202', roomNo: 'C-202', building: 'Academic Block C', rows: 10, columns: 6, benchCapacities: generateBenchCapacities(10, 6, [5]), unavailableSlots: [], departmentBlock: 'EE/EC/BT' }),

  // Block D (Arch)
  createClassroom({ id: 'CRD101', roomNo: 'D-101', building: 'Architecture Block D', rows: 10, columns: 4, benchCapacities: generateBenchCapacities(10, 4), unavailableSlots: [], departmentBlock: 'Arch' }),
  createClassroom({ id: 'CRD102', roomNo: 'D-102', building: 'Architecture Block D', rows: 12, columns: 5, benchCapacities: generateBenchCapacities(12, 5), unavailableSlots: [], departmentBlock: 'Arch' }),
];


// --- Generate 100 Invigilators ---
export const INVIGILATORS: Invigilator[] = Array.from({ length: 100 }, (_, i) => ({
  id: `I${String(i + 1).padStart(3, '0')}`,
  name: `Prof. ${generateName()}`,
  department: DEPARTMENTS[i % DEPARTMENTS.length],
  isAvailable: (i + 1) % 10 !== 0,
  unavailableSlots: [],
  assignedDuties: [],
}));


// Realistic 1st year common and department-specific subjects
const subjectsByDept = {
  'common': [
    { code: "MA-101", name: "Engineering Mathematics-I" },
    { code: "PH-101", name: "Engineering Physics", group: 'A' },
    { code: "CH-101", name: "Engineering Chemistry", group: 'B' },
    { code: "HS-101", name: "Professional Communication" },
    { code: "EV-101", name: "Environmental Science" },
  ],
  'B.Tech Computer Science & Engineering': [
    { code: "CS-101", name: "Programming for Problem Solving" },
  ],
  'B.Tech Mechanical Engineering': [
    { code: "ME-101", name: "Engineering Mechanics" },
    { code: "ME-102", name: "Workshop Practice" },
  ],
  'B.Tech Civil Engineering': [
    { code: "CE-101", name: "Basic Civil Engineering" },
  ],
  'B.Tech Electronics & Communication Engineering': [
    { code: "EC-101", name: "Basic Electronics Engineering" },
  ],
};


// --- Generate ~50 Exam Slots for 1st year students ---
export const EXAM_SCHEDULE: ExamSlot[] = [];
const examDates = ['2024-09-10', '2024-09-11', '2024-09-12', '2024-09-13', '2024-09-14', '2024-09-15', '2024-09-16', '2024-09-17', '2024-09-18', '2024-09-19'];
const examTimes = ['09:00', '14:00'];
let examCounter = 1;

let allSubjects: { dept: string, subject: {code: string, name: string, group?: 'A' | 'B'} }[] = [];
for (const dept of DEPARTMENTS) {
    const commonSubjects = subjectsByDept.common.map(s => ({dept, subject: s}));
    const deptSubjects = (subjectsByDept[dept as keyof typeof subjectsByDept] || []).map(s => ({dept, subject: s}));
    allSubjects.push(...commonSubjects, ...deptSubjects);
}
// Unique subjects per department
allSubjects = allSubjects.filter((item, index, self) => 
    index === self.findIndex(t => t.dept === item.dept && t.subject.code === item.subject.code)
);

// Shuffle exams for more realistic scheduling
for (let i = allSubjects.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allSubjects[i], allSubjects[j]] = [allSubjects[j], allSubjects[i]];
}


for (const date of examDates) {
    for (const time of examTimes) {
        if(examCounter > 50 || allSubjects.length === 0) break;
        
        const subjectInfo = allSubjects.shift();
        if (!subjectInfo) continue;

        const { dept, subject } = subjectInfo;
        const coursesInDept = COURSES[dept as keyof typeof COURSES];

        // Schedule this exam for all courses in the department
        for(const course of coursesInDept) {
             if(examCounter > 50) break;

             EXAM_SCHEDULE.push({
                id: `E${String(examCounter).padStart(3, '0')}`,
                subjectName: subject.name,
                subjectCode: subject.code,
                department: dept,
                course: course,
                semester: 1,
                date: date,
                time: time,
                duration: 180,
                group: subject.group,
            });
            examCounter++;
        }
    }
     if(examCounter > 50) break;
}
