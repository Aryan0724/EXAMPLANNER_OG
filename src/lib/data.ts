
import { Student, Classroom, createClassroom, Invigilator, ExamSlot } from './types';

export const DEPARTMENTS = [
  'Computer Science',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
];

export const COURSES = {
  'Computer Science': ['B.Tech in CS'],
  'Mechanical Engineering': ['B.Tech in ME'],
  'Civil Engineering': ['B.Tech in CE'],
  'Electrical Engineering': ['B.Tech in EE'],
};

// --- Generate 5000 Students of 1st year in 4 courses ---
export const STUDENTS: Student[] = Array.from({ length: 5000 }, (_, i) => {
    const deptIndex = i % DEPARTMENTS.length;
    const dept = DEPARTMENTS[deptIndex];
    const deptCourses = COURSES[dept as keyof typeof COURSES];
    const course = deptCourses[0];
    const semester = 1; // All are 1st year students
    const isDebarred = (i + 1) % 50 === 0;

    return {
      id: `S${String(i + 1).padStart(4, '0')}`,
      name: `Student ${i + 1}`,
      rollNo: `${dept.substring(0,2).toUpperCase()}-${String(i + 1).padStart(4,'0')}`,
      department: dept,
      course: course,
      semester: semester,
      section: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'][i % 8],
      eligibleSubjects: [], // Initially eligible for all subjects in their course
      unavailableSlots: [],
      seatAssignment: null,
      isDebarred: isDebarred,
    };
});

// --- Generate Classrooms with bench capacity of 2 ---
export const CLASSROOMS: Classroom[] = [
  // Block A (CS/IT) - All bench capacity 2
  createClassroom({ id: 'CRA101', roomNo: 'A-101', building: 'Academic Block A', rows: 8, columns: 5, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'CS/IT' }), // 80
  createClassroom({ id: 'CRA102', roomNo: 'A-102', building: 'Academic Block A', rows: 10, columns: 5, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'CS/IT' }), // 100
  createClassroom({ id: 'CRA201', roomNo: 'A-201', building: 'Academic Block A', rows: 10, columns: 6, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'CS/IT' }), // 120
  createClassroom({ id: 'CRA202', roomNo: 'A-202', building: 'Academic Block A', rows: 12, columns: 6, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'CS/IT' }), // 144

  // Block B (ME/CE/AE) - All bench capacity 2
  createClassroom({ id: 'CRB101', roomNo: 'B-101', building: 'Academic Block B', rows: 10, columns: 5, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'ME/CE/AE' }), // 100
  createClassroom({ id: 'CRB102', roomNo: 'B-102', building: 'Academic Block B', rows: 10, columns: 5, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'ME/CE/AE' }), // 100
  createClassroom({ id: 'CRB201', roomNo: 'B-201', building: 'Academic Block B', rows: 15, columns: 5, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'ME/CE/AE' }), // 150
  createClassroom({ id: 'CRB202', roomNo: 'B-202', building: 'Academic Block B', rows: 20, columns: 5, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'ME/CE/AE' }), // 200
  
  // Block C (EE/EC/BT/CH) - All bench capacity 2
  createClassroom({ id: 'CRC101', roomNo: 'C-101', building: 'Academic Block C', rows: 7, columns: 4, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'EE/EC/BT' }), // 56
  createClassroom({ id: 'CRC102', roomNo: 'C-102', building: 'Academic Block C', rows: 8, columns: 5, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'EE/EC/BT' }), // 80
  createClassroom({ id: 'CRC201', roomNo: 'C-201', building: 'Academic Block C', rows: 10, columns: 5, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'EE/EC/BT' }), // 100
  createClassroom({ id: 'CRC202', roomNo: 'C-202', building: 'Academic Block C', rows: 10, columns: 6, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'EE/EC/BT' }), // 120

  // Block D (Arch) - All bench capacity 2
  createClassroom({ id: 'CRD101', roomNo: 'D-101', building: 'Architecture Block D', rows: 10, columns: 4, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'Arch' }), // 80
  createClassroom({ id: 'CRD102', roomNo: 'D-102', building: 'Architecture Block D', rows: 12, columns: 5, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'Arch' }), // 120
];


// --- Generate 100 Invigilators ---
export const INVIGILATORS: Invigilator[] = Array.from({ length: 100 }, (_, i) => ({
  id: `I${String(i + 1).padStart(3, '0')}`,
  name: `Professor ${i + 1}`,
  department: DEPARTMENTS[i % DEPARTMENTS.length],
  isAvailable: Math.random() > 0.1, // 90% available
  unavailableSlots: [],
  assignedSessionIds: [],
}));


// --- Generate ~50 Exam Slots for 1st year students ---
export const EXAM_SCHEDULE: ExamSlot[] = [];
const examDates = ['2024-09-10', '2024-09-11', '2024-09-12', '2024-09-13', '2024-09-14'];
const examTimes = ['09:00', '14:00'];
let examCounter = 1;

for (const date of examDates) {
  for (const time of examTimes) {
    // Create up to 4 concurrent exams for the 4 courses
    for (let i = 0; i < DEPARTMENTS.length; i++) {
        if(examCounter > 50) break;
        
        const dept = DEPARTMENTS[i % DEPARTMENTS.length];
        const course = COURSES[dept as keyof typeof COURSES][0];
        const semester = 1;
        
        // Ensure we don't schedule the same course twice in the same slot
        const isAlreadyScheduled = EXAM_SCHEDULE.some(e => e.date === date && e.time === time && e.course === course);
        if (isAlreadyScheduled) continue;
        
        EXAM_SCHEDULE.push({
            id: `E${String(examCounter).padStart(3, '0')}`,
            subjectName: `${dept} Subject ${examCounter}`,
            subjectCode: `${dept.substring(0,2).toUpperCase()}10${(examCounter % 3) + 1}`,
            department: dept,
            course: course,
            semester: semester,
            date: date,
            time: time,
            duration: 180,
        });
        examCounter++;
    }
  }
}
