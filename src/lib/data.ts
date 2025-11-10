import { Student, Classroom, createClassroom, Invigilator, ExamSlot } from './types';

export const DEPARTMENTS = [
  'Computer Science',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'Biotechnology',
  'Aerospace Engineering',
  'Chemical Engineering',
  'Information Technology',
  'Electronics & Comm.',
  'Architecture'
];

export const COURSES = {
  'Computer Science': ['CS101', 'CS202', 'CS303', 'CS404'],
  'Mechanical Engineering': ['ME101', 'ME202', 'ME303', 'ME404'],
  'Civil Engineering': ['CE101', 'CE202', 'CE303', 'CE404'],
  'Electrical Engineering': ['EE101', 'EE202', 'EE303', 'EE404'],
  'Biotechnology': ['BT101', 'BT202', 'BT303', 'BT404'],
  'Aerospace Engineering': ['AE101', 'AE202', 'AE303', 'AE404'],
  'Chemical Engineering': ['CH101', 'CH202', 'CH303', 'CH404'],
  'Information Technology': ['IT101', 'IT202', 'IT303', 'IT404'],
  'Electronics & Comm.': ['EC101', 'EC202', 'EC303', 'EC404'],
  'Architecture': ['AR101', 'AR202', 'AR303', 'AR404'],
};

// --- Generate 5000 Students ---
export const STUDENTS: Student[] = Array.from({ length: 5000 }, (_, i) => {
    const dept = DEPARTMENTS[i % DEPARTMENTS.length];
    const deptCourses = COURSES[dept as keyof typeof COURSES];
    const course = deptCourses[i % deptCourses.length];
    const semester = (i % 8) + 1;
    const isDebarred = Math.random() < 0.02; // 2% of students are debarred
    
    return {
      id: `S${String(i + 1).padStart(4, '0')}`,
      name: `Student ${i + 1}`,
      rollNo: `${dept.substring(0,2).toUpperCase()}-${String(i + 1).padStart(4,'0')}`,
      department: dept,
      course: course,
      semester: semester,
      section: ['A', 'B', 'C', 'D'][i % 4],
      eligibleSubjects: [], // Simplified for now
      unavailableSlots: [],
      seatAssignment: null,
      ...(isDebarred && { isDebarred: true })
    } as Student & { isDebarred?: boolean };
});

// --- Generate more Classrooms to seat ~5000 students ---
// Total capacity will be sum of all rooms, need enough for largest exam session.
export const CLASSROOMS: Classroom[] = [
  // Block A (CS/IT)
  createClassroom({ id: 'CRA101', roomNo: 'A-101', building: 'Academic Block A', rows: 8, columns: 5, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'CS/IT' }), // 80
  createClassroom({ id: 'CRA102', roomNo: 'A-102', building: 'Academic Block A', rows: 10, columns: 5, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'CS/IT' }), // 100
  createClassroom({ id: 'CRA201', roomNo: 'A-201', building: 'Academic Block A', rows: 10, columns: 6, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'CS/IT' }), // 120
  createClassroom({ id: 'CRA202', roomNo: 'A-202', building: 'Academic Block A', rows: 12, columns: 6, benchCapacity: 3, unavailableSlots: [], departmentBlock: 'CS/IT' }), // 216

  // Block B (ME/CE/AE)
  createClassroom({ id: 'CRB101', roomNo: 'B-101', building: 'Academic Block B', rows: 10, columns: 5, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'ME/CE/AE' }), // 100
  createClassroom({ id: 'CRB102', roomNo: 'B-102', building: 'Academic Block B', rows: 10, columns: 5, benchCapacity: 3, unavailableSlots: [], departmentBlock: 'ME/CE/AE' }), // 150
  createClassroom({ id: 'CRB201', roomNo: 'B-201', building: 'Academic Block B', rows: 15, columns: 5, benchCapacity: 3, unavailableSlots: [], departmentBlock: 'ME/CE/AE' }), // 225
  createClassroom({ id: 'CRB202', roomNo: 'B-202', building: 'Academic Block B', rows: 20, columns: 5, benchCapacity: 3, unavailableSlots: [], departmentBlock: 'ME/CE/AE' }), // 300
  
  // Block C (EE/EC/BT/CH)
  createClassroom({ id: 'CRC101', roomNo: 'C-101', building: 'Academic Block C', rows: 7, columns: 4, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'EE/EC/BT' }), // 56
  createClassroom({ id: 'CRC102', roomNo: 'C-102', building: 'Academic Block C', rows: 8, columns: 5, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'EE/EC/BT' }), // 80
  createClassroom({ id: 'CRC201', roomNo: 'C-201', building: 'Academic Block C', rows: 10, columns: 5, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'EE/EC/BT' }), // 100
  createClassroom({ id: 'CRC202', roomNo: 'C-202', building: 'Academic Block C', rows: 10, columns: 6, benchCapacity: 3, unavailableSlots: [], departmentBlock: 'EE/EC/BT' }), // 180

  // Block D (Arch)
  createClassroom({ id: 'CRD101', roomNo: 'D-101', building: 'Architecture Block D', rows: 10, columns: 4, benchCapacity: 1, unavailableSlots: [], departmentBlock: 'Arch' }), // 40
  createClassroom({ id: 'CRD102', roomNo: 'D-102', building: 'Architecture Block D', rows: 12, columns: 5, benchCapacity: 1, unavailableSlots: [], departmentBlock: 'Arch' }), // 60
];


// --- Generate more Invigilators ---
export const INVIGILATORS: Invigilator[] = Array.from({ length: 100 }, (_, i) => ({
  id: `I${String(i + 1).padStart(3, '0')}`,
  name: `Professor ${i + 1}`,
  department: DEPARTMENTS[i % DEPARTMENTS.length],
  isAvailable: Math.random() > 0.1, // 90% available
  unavailableSlots: [],
  assignedSessionIds: [],
}));


// --- Generate ~50 Exam Slots ---
export const EXAM_SCHEDULE: ExamSlot[] = [];
const examDates = ['2024-09-10', '2024-09-11', '2024-09-12', '2024-09-13', '2024-09-14'];
const examTimes = ['09:00', '14:00'];
let examCounter = 1;

for (const date of examDates) {
  for (const time of examTimes) {
    // Create 5 concurrent exams for each slot
    for (let i = 0; i < 5; i++) {
        if(examCounter > 50) break;
        const deptIndex = (examCounter - 1 + i) % DEPARTMENTS.length;
        const dept = DEPARTMENTS[deptIndex];
        const deptCourses = COURSES[dept as keyof typeof COURSES];
        const course = deptCourses[(examCounter-1) % deptCourses.length];
        const semester = ((examCounter-1) % 4) * 2 + 1; // Semesters 1, 3, 5, 7
        
        EXAM_SCHEDULE.push({
            id: `E${String(examCounter).padStart(3, '0')}`,
            subjectName: `${dept} Subject ${examCounter}`,
            subjectCode: `${dept.substring(0,2).toUpperCase()}${semester}0${(examCounter % 3) + 1}`,
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
