

import { Student, Classroom, createClassroom, Invigilator, ExamSlot } from './types';

export const DEPARTMENTS = [
  'Engineering',
  'English',
  'Commerce',
  'Design',
  'Allied Sci',
  'Law',
  'Media',
];

export const COURSES = {
  'Engineering': ['B.Tech AI & ML and AI & DS', 'B.Tech core'],
  'English': ['B.A. (Hons.) English with Research', 'BACHELOR OF ARTS (HONOURS) ENGLISH'],
  'Commerce': ['B.Com(Hons) Accounting, Auditing And Taxation', 'B.Com(Hons.) Banking And Finance'],
  'Design': ['B.DESIGN ANIMATION AND GAMING', 'B.Sc Animation and Gaming'],
  'Allied Sci': ['B.Sc. (Hons.) Chemistry'],
  'Law': ['BA LL.B (Hons.)'],
  'Media': ['BACHELOR OF ARTS (JOURNALISM & MASS COMMUNIC)'],
};

const firstNames = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan", "Saanvi", "Aadhya", "Kiara", "Diya", "Pari", "Ananya", "Riya", "Sitara", "Avni", "Zoya", "Liam", "Olivia", "Noah", "Emma", "Oliver", "Ava", "Elijah", "Charlotte", "William", "Sophia", "James", "Amelia", "Benjamin", "Isabella", "Lucas", "Mia", "Henry", "Evelyn", "Alexander", "Harper"];
const lastNames = ["Sharma", "Verma", "Gupta", "Singh", "Kumar", "Patel", "Shah", "Mehta", "Joshi", "Das", "Reddy", "Menon", "Nair", "Pillai", "Smith", "Jones", "Williams", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson"];

const generateName = () => `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;


// --- Generate 5000 Students of 1st year in various courses ---
export const STUDENTS: Student[] = Array.from({ length: 7000 }, (_, i) => {
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
      rollNo: `${(dept.substring(0,3) + (course.includes('B.Tech') ? 'BT' : '')).toUpperCase()}${String(new Date().getFullYear()).slice(2)}-${String(i + 1).padStart(4,'0')}`,
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


// --- Generate 200 Invigilators ---
export const INVIGILATORS: Invigilator[] = Array.from({ length: 200 }, (_, i) => ({
  id: `I${String(i + 1).padStart(3, '0')}`,
  name: `Prof. ${generateName()}`,
  department: DEPARTMENTS[i % DEPARTMENTS.length],
  isAvailable: (i + 1) % 10 !== 0,
  unavailableSlots: [],
  assignedDuties: [],
}));

// --- Exam Schedule from Image ---
export const EXAM_SCHEDULE: ExamSlot[] = [
  { id: 'E001', date: '2025-09-18', time: '09:30', department: 'Engineering', course: 'B.Tech AI & ML and AI & DS', semester: 1, subjectName: 'Mathematics for AI-I', subjectCode: 'TMA 102', duration: 90 },
  { id: 'E002', date: '2025-09-20', time: '09:30', department: 'Engineering', course: 'B.Tech AI & ML and AI & DS', semester: 1, subjectName: 'Introduction to Python Programming', subjectCode: 'TCS 102', duration: 90 },
  { id: 'E003', date: '2025-09-18', time: '09:30', department: 'Engineering', course: 'B.Tech core', semester: 1, subjectName: 'Engineering Mathematics-I', subjectCode: 'TMA 101', duration: 90 },
  { id: 'E004', date: '2025-09-19', time: '09:30', department: 'Engineering', course: 'B.Tech core', semester: 1, subjectName: 'Engineering Chemistry', subjectCode: 'TCH 101', duration: 90 },
  { id: 'E005', date: '2025-09-19', time: '09:30', department: 'Engineering', course: 'B.Tech core', semester: 1, subjectName: 'Engineering Physics', subjectCode: 'TPH 101', duration: 90 },
  { id: 'E006', date: '2025-09-20', time: '09:30', department: 'Engineering', course: 'B.Tech core', semester: 1, subjectName: 'Fundamental of Computer & Introduction to Programming', subjectCode: 'TCS 101', duration: 90 },
  { id: 'E007', date: '2025-09-22', time: '09:30', department: 'Engineering', course: 'B.Tech core', semester: 1, subjectName: 'Basic Electronics Engineering', subjectCode: 'TEC 101', duration: 90 },
  { id: 'E008', date: '2025-09-22', time: '09:30', department: 'Engineering', course: 'B.Tech core', semester: 1, subjectName: 'Basic Electrical Engineering', subjectCode: 'TEE 101', duration: 90 },
  { id: 'E009', date: '2025-09-23', time: '09:30', department: 'Engineering', course: 'B.Tech core', semester: 1, subjectName: 'Professional Communication', subjectCode: 'THU 101', duration: 90 },
  { id: 'E010', date: '2025-09-18', time: '09:30', department: 'English', course: 'B.A. (Hons.) English with Research', semester: 1, subjectName: 'English Communication', subjectCode: 'EAEC 101', duration: 90 },
  { id: 'E011', date: '2025-09-20', time: '09:30', department: 'English', course: 'B.A. (Hons.) English with Research', semester: 1, subjectName: 'Fundamental of Grammar and Communication in English', subjectCode: 'EMC 101', duration: 90 },
  { id: 'E012', date: '2025-09-22', time: '09:30', department: 'English', course: 'B.A. (Hons.) English with Research', semester: 1, subjectName: 'History of English Literature', subjectCode: 'ENG 101', duration: 90 },
  { id: 'E013', date: '2025-09-23', time: '09:30', department: 'English', course: 'B.A. (Hons.) English with Research', semester: 1, subjectName: 'Poetry(A)', subjectCode: 'ENG 102', duration: 90 },
  { id: 'E014', date: '2025-09-24', time: '09:30', department: 'English', course: 'B.A. (Hons.) English with Research', semester: 1, subjectName: 'Drama(A)', subjectCode: 'ENG 103', duration: 90 },
  { id: 'E015', date: '2025-09-25', time: '09:30', department: 'English', course: 'B.A. (Hons.) English with Research', semester: 1, subjectName: 'Environmental Science', subjectCode: 'EVAC 101', duration: 90 },
  { id: 'E016', date: '2025-09-18', time: '09:30', department: 'Commerce', course: 'B.Com(Hons) Accounting, Auditing And Taxation', semester: 1, subjectName: 'Principles of Management', subjectCode: 'BCH101', duration: 90 },
  { id: 'E017', date: '2025-09-19', time: '09:30', department: 'Commerce', course: 'B.Com(Hons) Accounting, Auditing And Taxation', semester: 1, subjectName: 'Financial Accounting', subjectCode: 'BCH102', duration: 90 },
  { id: 'E018', date: '2025-09-20', time: '09:30', department: 'Commerce', course: 'B.Com(Hons) Accounting, Auditing And Taxation', semester: 1, subjectName: 'Micro Economics', subjectCode: 'BCH103', duration: 90 },
  { id: 'E019', date: '2025-09-22', time: '09:30', department: 'Commerce', course: 'B.Com(Hons) Accounting, Auditing And Taxation', semester: 1, subjectName: 'Business Communication', subjectCode: 'BCH104', duration: 90 },
  { id: 'E020', date: '2025-09-23', time: '09:30', department: 'Commerce', course: 'B.Com(Hons) Accounting, Auditing And Taxation', semester: 1, subjectName: 'Fundamentals of Computer', subjectCode: 'BCH105', duration: 90 },
  { id: 'E021', date: '2025-09-24', time: '09:30', department: 'Commerce', course: 'B.Com(Hons) Accounting, Auditing And Taxation', semester: 1, subjectName: 'Business Mathematics', subjectCode: 'BCH106', duration: 90 },
  { id: 'E022', date: '2025-09-18', time: '09:30', department: 'Commerce', course: 'B.Com(Hons.) Banking And Finance', semester: 1, subjectName: 'Principles of Management', subjectCode: 'BCH101', duration: 90 },
  { id: 'E023', date: '2025-09-19', time: '09:30', department: 'Commerce', course: 'B.Com(Hons.) Banking And Finance', semester: 1, subjectName: 'Financial Accounting', subjectCode: 'BCH102', duration: 90 },
  { id: 'E024', date: '2025-09-20', time: '09:30', department: 'Commerce', course: 'B.Com(Hons.) Banking And Finance', semester: 1, subjectName: 'Micro Economics', subjectCode: 'BCH103', duration: 90 },
  { id: 'E025', date: '2025-09-22', time: '09:30', department: 'Commerce', course: 'B.Com(Hons.) Banking And Finance', semester: 1, subjectName: 'Business Communication', subjectCode: 'BCH104', duration: 90 },
  { id: 'E026', date: '2025-09-23', time: '09:30', department: 'Commerce', course: 'B.Com(Hons.) Banking And Finance', semester: 1, subjectName: 'Fundamentals of Computer', subjectCode: 'BCH105', duration: 90 },
  { id: 'E027', date: '2025-09-24', time: '09:30', department: 'Commerce', course: 'B.Com(Hons.) Banking And Finance', semester: 1, subjectName: 'Business Mathematics', subjectCode: 'BCH106', duration: 90 },
  { id: 'E028', date: '2025-09-18', time: '09:30', department: 'Design', course: 'B.DESIGN ANIMATION AND GAMING', semester: 1, subjectName: 'Professional Communication', subjectCode: 'AET 101', duration: 90 },
  { id: 'E029', date: '2025-09-19', time: '09:30', department: 'Design', course: 'B.DESIGN ANIMATION AND GAMING', semester: 1, subjectName: 'Design Thinking', subjectCode: 'FCT 102', duration: 90 },
  { id: 'E030', date: '2025-09-20', time: '09:30', department: 'Design', course: 'B.DESIGN ANIMATION AND GAMING', semester: 1, subjectName: 'Fundamentals of art & Animation', subjectCode: 'BAG 101', duration: 90 },
  { id: 'E031', date: '2025-09-22', time: '09:30', department: 'Design', course: 'B.DESIGN ANIMATION AND GAMING', semester: 1, subjectName: 'History of Art and Design', subjectCode: 'FCT 101', duration: 90 },
  { id: 'E032', date: '2025-09-18', time: '09:30', department: 'Design', course: 'B.Sc Animation and Gaming', semester: 1, subjectName: 'Professional Communication', subjectCode: 'AET 101', duration: 90 },
  { id: 'E033', date: '2025-09-19', time: '09:30', department: 'Design', course: 'B.Sc Animation and Gaming', semester: 1, subjectName: 'Design Thinking', subjectCode: 'FCT 102', duration: 90 },
  { id: 'E034', date: '2025-09-20', time: '09:30', department: 'Design', course: 'B.Sc Animation and Gaming', semester: 1, subjectName: 'Fundamentals of Animation', subjectCode: 'BAG 101', duration: 90 },
  { id: 'E035', date: '2025-09-22', time: '09:30', department: 'Design', course: 'B.Sc Animation and Gaming', semester: 1, subjectName: 'History of Art and Design', subjectCode: 'FCT 101', duration: 90 },
  { id: 'E036', date: '2025-09-18', time: '09:30', department: 'Allied Sci', course: 'B.Sc. (Hons.) Chemistry', semester: 1, subjectName: 'Professional Communication', subjectCode: 'CAEC 101', duration: 90 },
  { id: 'E037', date: '2025-09-20', time: '09:30', department: 'Allied Sci', course: 'B.Sc. (Hons.) Chemistry', semester: 1, subjectName: 'Polymer Science', subjectCode: 'CBHM 101', duration: 90 },
  { id: 'E038', date: '2025-09-22', time: '09:30', department: 'Allied Sci', course: 'B.Sc. (Hons.) Chemistry', semester: 1, subjectName: 'Inorganic Chemistry', subjectCode: 'CBHT 101', duration: 90 },
  { id: 'E039', date: '2025-09-23', time: '09:30', department: 'Allied Sci', course: 'B.Sc. (Hons.) Chemistry', semester: 1, subjectName: 'Physical Chemistry', subjectCode: 'CBHT 102', duration: 90 },
  { id: 'E040', date: '2025-09-24', time: '09:30', department: 'Allied Sci', course: 'B.Sc. (Hons.) Chemistry', semester: 1, subjectName: 'Environmental Education', subjectCode: 'CVAC 101', duration: 90 },
  { id: 'E041', date: '2025-09-18', time: '09:30', department: 'Law', course: 'BA LL.B (Hons.)', semester: 1, subjectName: 'English Communication-I', subjectCode: 'LNC-I-111', duration: 90 },
  { id: 'E042', date: '2025-09-19', time: '09:30', department: 'Law', course: 'BA LL.B (Hons.)', semester: 1, subjectName: 'Law of Torts and Consumer Protection', subjectCode: 'LLC-I-131', duration: 90 },
  { id: 'E043', date: '2025-09-20', time: '09:30', department: 'Law', course: 'BA LL.B (Hons.)', semester: 1, subjectName: 'Legal Methods', subjectCode: 'LLC-I-132', duration: 90 },
  { id: 'E044', date: '2025-09-22', time: '09:30', department: 'Law', course: 'BA LL.B (Hons.)', semester: 1, subjectName: 'Political Science-I', subjectCode: 'LBA-I-121', duration: 90 },
  { id: 'E045', date: '2025-09-23', time: '09:30', department: 'Law', course: 'BA LL.B (Hons.)', semester: 1, subjectName: 'Sociology-I', subjectCode: 'LBA-1-122', duration: 90 },
  { id: 'E046', date: '2025-09-24', time: '09:30', department: 'Law', course: 'BA LL.B (Hons.)', semester: 1, subjectName: 'History-I', subjectCode: 'LBA-I-123', duration: 90 },
  { id: 'E047', date: '2025-09-25', time: '09:30', department: 'Law', course: 'BA LL.B (Hons.)', semester: 1, subjectName: 'Indian Knowledge System', subjectCode: 'LLC-I-116', duration: 90 },
  { id: 'E048', date: '2025-09-18', time: '09:30', department: 'English', course: 'BACHELOR OF ARTS (HONOURS) ENGLISH', semester: 1, subjectName: 'English Communication', subjectCode: 'EAEC 101', duration: 90 },
  { id: 'E049', date: '2025-09-20', time: '09:30', department: 'English', course: 'BACHELOR OF ARTS (HONOURS) ENGLISH', semester: 1, subjectName: 'Fundamental of Grammar and Communication in English', subjectCode: 'EMC 101', duration: 90 },
  { id: 'E050', date: '2025-09-22', time: '09:30', department: 'English', course: 'BACHELOR OF ARTS (HONOURS) ENGLISH', semester: 1, subjectName: 'History of English Literature', subjectCode: 'ENG 101', duration: 90 },
  { id: 'E051', date: '2025-09-23', time: '09:30', department: 'English', course: 'BACHELOR OF ARTS (HONOURS) ENGLISH', semester: 1, subjectName: 'Poetry(A)', subjectCode: 'ENG 102', duration: 90 },
  { id: 'E052', date: '2025-09-24', time: '09:30', department: 'English', course: 'BACHELOR OF ARTS (HONOURS) ENGLISH', semester: 1, subjectName: 'Drama(A)', subjectCode: 'ENG 103', duration: 90 },
  { id: 'E053', date: '2025-09-25', time: '09:30', department: 'English', course: 'BACHELOR OF ARTS (HONOURS) ENGLISH', semester: 1, subjectName: 'Environmental Science', subjectCode: 'EVAC 101', duration: 90 },
  { id: 'E054', date: '2025-09-23', time: '09:30', department: 'Media', course: 'BACHELOR OF ARTS (JOURNALISM & MASS COMMUNIC)', semester: 1, subjectName: 'Introduction to Mass Communication', subjectCode: 'BJMC101', duration: 90 },
  { id: 'E055', date: '2025-09-19', time: '09:30', department: 'Media', course: 'BACHELOR OF ARTS (JOURNALISM & MASS COMMUNIC)', semester: 1, subjectName: 'Basic Introduction to Print Media', subjectCode: 'BJMC102', duration: 90 },
  { id: 'E056', date: '2025-09-20', time: '09:30', department: 'Media', course: 'BACHELOR OF ARTS (JOURNALISM & MASS COMMUNIC)', semester: 1, subjectName: 'Anchoring', subjectCode: 'BJMC104', duration: 90 },
];

    