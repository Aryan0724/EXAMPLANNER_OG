import { Student, Classroom, createClassroom, Invigilator, ExamSlot } from './types';

export const DEPARTMENTS = [
  'Computer Science',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'Biotechnology',
];

export const COURSES = {
  'Computer Science': ['CS101', 'CS201', 'CS301'],
  'Mechanical Engineering': ['ME101', 'ME201', 'ME301'],
  'Civil Engineering': ['CE101', 'CE201', 'CE301'],
  'Electrical Engineering': ['EE101', 'EE201', 'EE301'],
  'Biotechnology': ['BT101', 'BT201', 'BT301'],
};

export const STUDENTS: Student[] = [
  { id: 'S001', name: 'Aarav Sharma', rollNo: 'CS-001', department: 'Computer Science', course: 'CS101', semester: 1, section: 'A', eligibleSubjects: ['DS101', 'ALGO202'], unavailableSlots: [], seatAssignment: null },
  { id: 'S002', name: 'Diya Patel', rollNo: 'CS-002', department: 'Computer Science', course: 'CS101', semester: 1, section: 'A', eligibleSubjects: ['DS101', 'ALGO202'], unavailableSlots: [], seatAssignment: null },
  { id: 'S003', name: 'Vivaan Singh', rollNo: 'CS-003', department: 'Computer Science', course: 'CS101', semester: 1, section: 'A', eligibleSubjects: ['DS101'], unavailableSlots: [{ slotId: 'E02', reason: 'Medical' }], seatAssignment: null, isDebarred: true } as Student & { isDebarred: boolean}, // Temp compat
  { id: 'S004', name: 'Ishaan Kumar', rollNo: 'ME-001', department: 'Mechanical Engineering', course: 'ME101', semester: 1, section: 'A', eligibleSubjects: ['TD101'], unavailableSlots: [], seatAssignment: null },
  { id: 'S005', name: 'Ananya Gupta', rollNo: 'ME-002', department: 'Mechanical Engineering', course: 'ME101', semester: 1, section: 'A', eligibleSubjects: ['TD101'], unavailableSlots: [], seatAssignment: null },
  { id: 'S006', name: 'Rohan Mehra', rollNo: 'CE-001', department: 'Civil Engineering', course: 'CE101', semester: 1, section: 'A', eligibleSubjects: ['SA201'], unavailableSlots: [], seatAssignment: null },
  { id: 'S007', name: 'Saanvi Joshi', rollNo: 'CE-002', department: 'Civil Engineering', course: 'CE101', semester: 1, section: 'A', eligibleSubjects: ['SA201'], unavailableSlots: [], seatAssignment: null },
  { id: 'S008', name: 'Advik Reddy', rollNo: 'EE-001', department: 'Electrical Engineering', course: 'EE101', semester: 1, section: 'A', eligibleSubjects: ['CT201'], unavailableSlots: [], seatAssignment: null },
  { id: 'S009', name: 'Kiara Verma', rollNo: 'EE-002', department: 'Electrical Engineering', course: 'EE101', semester: 1, section: 'A', eligibleSubjects: ['CT201'], unavailableSlots: [], seatAssignment: null },
  { id: 'S010', name: 'Arjun Nair', rollNo: 'BT-001', department: 'Biotechnology', course: 'BT101', semester: 1, section: 'A', eligibleSubjects: ['MB301'], unavailableSlots: [], seatAssignment: null },
  { id: 'S011', name: 'Zara Khan', rollNo: 'BT-002', department: 'Biotechnology', course: 'BT101', semester: 1, section: 'A', eligibleSubjects: ['MB301'], unavailableSlots: [], seatAssignment: null, isDebarred: true } as Student & { isDebarred: boolean}, // Temp compat
  ...Array.from({ length: 40 }, (_, i) => {
    const dept = DEPARTMENTS[i % DEPARTMENTS.length];
    return {
      id: `S${String(12 + i).padStart(3, '0')}`,
      name: `Student ${12 + i}`,
      rollNo: `${dept.substring(0,2).toUpperCase()}-${String(3 + i).padStart(3,'0')}`,
      department: dept,
      course: COURSES[dept as keyof typeof COURSES][0],
      semester: 1,
      section: 'B',
      eligibleSubjects: [],
      unavailableSlots: [],
      seatAssignment: null,
      isDebarred: false
    } as Student & { isDebarred: boolean}
  }),
];

export const CLASSROOMS: Classroom[] = [
  createClassroom({ id: 'CR101', roomNo: '101', building: 'A', rows: 5, columns: 2, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'A' }),
  createClassroom({ id: 'CR102', roomNo: '102', building: 'A', rows: 5, columns: 3, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'A' }),
  createClassroom({ id: 'CR201', roomNo: '201', building: 'B', rows: 6, columns: 3, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'B' }),
  createClassroom({ id: 'CR202', roomNo: '202', building: 'B', rows: 4, columns: 2, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'B' }),
  createClassroom({ id: 'CR301', roomNo: '301', building: 'C', rows: 8, columns: 3, benchCapacity: 2, unavailableSlots: [], departmentBlock: 'C' }),
];

export const INVIGILATORS: Invigilator[] = [
  { id: 'I01', name: 'Prof. Anjali Rao', department: 'Computer Science', isAvailable: true, unavailableSlots: [], assignedSessionIds: [] },
  { id: 'I02', name: 'Prof. Vikram Singh', department: 'Mechanical Engineering', isAvailable: true, unavailableSlots: [], assignedSessionIds: [] },
  { id: 'I03', name: 'Prof. Priya Desai', department: 'Civil Engineering', isAvailable: true, unavailableSlots: [], assignedSessionIds: [] },
  { id: 'I04', name: 'Prof. Rahul Menon', department: 'Electrical Engineering', isAvailable: false, unavailableSlots: [{ slotId: 'E04', reason: 'Duty Conflict' }], assignedSessionIds: [] },
  { id: 'I05', name: 'Prof. Sunita Pillai', department: 'Biotechnology', isAvailable: true, unavailableSlots: [], assignedSessionIds: [] },
  { id: 'I06', name: 'Dr. Sameer Ahmed', department: 'Computer Science', isAvailable: true, unavailableSlots: [], assignedSessionIds: [] },
  { id: 'I07', name: 'Dr. Neha Choudhary', department: 'Mechanical Engineering', isAvailable: true, unavailableSlots: [], assignedSessionIds: [] },
];

export const EXAM_SCHEDULE: ExamSlot[] = [
  { id: 'E01', subjectName: 'Data Structures', subjectCode: 'DS101', department: 'Computer Science', course: 'CS101', semester: 1, date: '2024-09-10', time: '09:00', duration: 180 },
  { id: 'E02', subjectName: 'Thermodynamics', subjectCode: 'TD101', department: 'Mechanical Engineering', course: 'ME101', semester: 1, date: '2024-09-10', time: '09:00', duration: 180 },
  { id: 'E03', subjectName: 'Structural Analysis', subjectCode: 'SA201', department: 'Civil Engineering', course: 'CE101', semester: 1, date: '2024-09-11', time: '14:00', duration: 180 },
  { id: 'E04', subjectName: 'Circuit Theory', subjectCode: 'CT201', department: 'Electrical Engineering', course: 'EE101', semester: 1, date: '2024-09-11', time: '14:00', duration: 180 },
  { id: 'E05', subjectName: 'Molecular Biology', subjectCode: 'MB301', department: 'Biotechnology', course: 'BT101', semester: 1, date: '2024-09-12', time: '09:00', duration: 180 },
];
