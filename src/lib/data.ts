import type { Student, Classroom, Invigilator, Exam } from './types';

export const DEPARTMENTS = [
  'Computer Science',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'Biotechnology',
];

export const STUDENTS: Student[] = [
  { id: 'S001', name: 'Aarav Sharma', department: 'Computer Science', isDebarred: false },
  { id: 'S002', name: 'Diya Patel', department: 'Computer Science', isDebarred: false },
  { id: 'S003', name: 'Vivaan Singh', department: 'Computer Science', isDebarred: true },
  { id: 'S004', name: 'Ishaan Kumar', department: 'Mechanical Engineering', isDebarred: false },
  { id: 'S005', name: 'Ananya Gupta', department: 'Mechanical Engineering', isDebarred: false },
  { id: 'S006', name: 'Rohan Mehra', department: 'Civil Engineering', isDebarred: false },
  { id: 'S007', name: 'Saanvi Joshi', department: 'Civil Engineering', isDebarred: false },
  { id: 'S008', name: 'Advik Reddy', department: 'Electrical Engineering', isDebarred: false },
  { id: 'S009', name: 'Kiara Verma', department: 'Electrical Engineering', isDebarred: false },
  { id: 'S010', name: 'Arjun Nair', department: 'Biotechnology', isDebarred: false },
  { id: 'S011', name: 'Zara Khan', department: 'Biotechnology', isDebarred: true },
  ...Array.from({ length: 40 }, (_, i) => ({
    id: `S${String(12 + i).padStart(3, '0')}`,
    name: `Student ${12 + i}`,
    department: DEPARTMENTS[i % DEPARTMENTS.length],
    isDebarred: false,
  })),
];

export const CLASSROOMS: Classroom[] = [
  { id: 'CR101', capacity: 20, departmentBlock: 'A' },
  { id: 'CR102', capacity: 25, departmentBlock: 'A' },
  { id: 'CR201', capacity: 30, departmentBlock: 'B' },
  { id: 'CR202', capacity: 15, departmentBlock: 'B' },
  { id: 'CR301', capacity: 40, departmentBlock: 'C' },
];

export const INVIGILATORS: Invigilator[] = [
  { id: 'I01', name: 'Prof. Anjali Rao', department: 'Computer Science', isAvailable: true },
  { id: 'I02', name: 'Prof. Vikram Singh', department: 'Mechanical Engineering', isAvailable: true },
  { id: 'I03', name: 'Prof. Priya Desai', department: 'Civil Engineering', isAvailable: true },
  { id: 'I04', name: 'Prof. Rahul Menon', department: 'Electrical Engineering', isAvailable: false },
  { id: 'I05', name: 'Prof. Sunita Pillai', department: 'Biotechnology', isAvailable: true },
  { id: 'I06', name: 'Dr. Sameer Ahmed', department: 'Computer Science', isAvailable: true },
  { id: 'I07', name: 'Dr. Neha Choudhary', department: 'Mechanical Engineering', isAvailable: true },
];

export const EXAM_SCHEDULE: Exam[] = [
  { id: 'E01', subject: 'Data Structures', department: 'Computer Science', date: '2024-09-10', time: '09:00' },
  { id: 'E02', subject: 'Thermodynamics', department: 'Mechanical Engineering', date: '2024-09-10', time: '09:00' },
  { id: 'E03', subject: 'Structural Analysis', department: 'Civil Engineering', date: '2024-09-11', time: '14:00' },
  { id: 'E04', subject: 'Circuit Theory', department: 'Electrical Engineering', date: '2024-09-11', time: '14:00' },
  { id: 'E05', subject: 'Molecular Biology', department: 'Biotechnology', date: '2024-09-12', time: '09:00' },
];
