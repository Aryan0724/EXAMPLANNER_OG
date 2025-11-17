

import { Student, Classroom, createClassroom, Invigilator, ExamSlot } from './types';

export const DEPARTMENTS: string[] = [
    'Computer Science and Engineering',
    'Civil Engineering',
    'Electronics and Communication Engineering',
    'Mechanical Engineering',
    'Computer Application',
    'Management',
    'Commerce',
    'Nursing',
    'Pharmacy',
    'Polytechnic',
    'Allied Sciences',
    'Department of Personality Development'
];

export const COURSES: Record<string, string[]> = {
    'Computer Science and Engineering': [
        'B.Tech CSE (Hons.) with specialization in Cyber Security',
        'B.Tech Computer Science Engineering',
        'Diploma In Computer Science Engineering',
        'B.Tech CSE (Hons.) with specialization in Artificial Intelligence and Machine Learning',
    ],
    'Civil Engineering': [
        'B.Tech Civil Engineering (Hons.) with specialization in Environmental Engineering',
        'B.Tech Civil Engineering (Hons.) with specialization in Geoinformatics',
        'B.Tech in Civil Engineering',
    ],
    'Electronics and Communication Engineering': [
        'B Tech Electronics Communication Engg hons with Specialization in Drone Technology',
        'B.Tech Electronics & Communication Engineering (Hons.) with specialization in VLSI',
        'B.Tech in Electronics and Communication Engineering',
    ],
    'Mechanical Engineering': [
        'B Tech Mechanical Engineering Hons with Specialization in Electric Vehicle',
        'B.Tech Mechanical Engineering (Hons.) with specialization in Mechatronics',
        'B.Tech Mechanical Engineering',
    ],
    'Computer Application': [
        'BCA (Hons.) with AI and DS',
        'BSc IT',
        'BCA',
        'MCA',
        'MCA in AI and DS',
    ],
    'Management': [
        'Master of Business Administration',
        'BBA International Finance And Accounting With ACCA',
        'BBA',
    ],
    'Commerce': [
        'B.Com. (Hons)',
        'B.Com. (Hons) International Finance and Accounting with ACCA, UK',
        'B.Com. International Finance and Accounting with ACCA, UK',
    ],
    'Nursing': [
        'B.Sc. Nursing',
    ],
    'Pharmacy': [
        'B.Pharm',
    ],
    'Polytechnic': [
        'Diploma In Civil Engineering',
        'Diploma In Computer Science Engineering',
        'Diploma In Mechanical Engineering',
    ],
    'Allied Sciences': [
        'Mathematics',
        'Physics',
        'Chemistry',
        'Statistics', 
        'Environmental Science'
    ],
    'Department of Personality Development': [
        'Skills development'
    ]
};

// Functions to generate mock data
export const generateMockStudents = (count = 1000): Student[] => {
    const students: Student[] = [];
    const departmentKeys = Object.keys(COURSES);

    for (let i = 0; i < count; i++) {
        const department = departmentKeys[i % departmentKeys.length];
        const coursesInDept = COURSES[department];
        const course = coursesInDept[i % coursesInDept.length];
        const semester = (i % 8) + 1;
        const section = ['A', 'B', 'C'][i % 3];
        const studentId = `S${String(i + 1).padStart(5, '0')}`;
        const rollNo = `R${String(20000 + i)}`;

        students.push({
            id: studentId,
            name: `Student ${i + 1}`,
            rollNo: rollNo,
            department,
            course,
            semester,
            section,
            group: Math.random() > 0.7 ? (Math.random() > 0.5 ? 'A' : 'B') : undefined,
            ineligibilityRecords: [],
            unavailableSlots: [],
            seatAssignment: null,
            isDebarred: Math.random() > 0.98,
            debarmentReason: 'Disciplinary Action'
        });
    }
    return students;
};

export const generateMockClassrooms = (count = 50): Classroom[] => {
    const classrooms: Classroom[] = [];
    const buildings = ['A', 'B', 'C', 'D', 'E'];
    for (let i = 0; i < count; i++) {
        const rows = [4, 5, 6][i % 3];
        const columns = [4, 5, 6][i % 3];
        const benchCount = rows * columns;
        const benchCapacities = Array(benchCount).fill(0).map(() => (Math.random() > 0.8 ? 3 : 2));

        classrooms.push(
            createClassroom({
                id: `C${String(i + 1).padStart(3, '0')}`,
                roomNo: `${buildings[i % buildings.length]}${101 + i}`,
                building: `Block ${buildings[i % buildings.length]}`,
                rows,
                columns,
                benchCapacities,
                unavailableSlots: [],
                departmentBlock: DEPARTMENTS[i % DEPARTMENTS.length],
            })
        );
    }
    return classrooms;
};


export const generateMockInvigilators = (count = 100): Invigilator[] => {
    const invigilators: Invigilator[] = [];
    for (let i = 0; i < count; i++) {
        invigilators.push({
            id: `I${String(i + 1).padStart(3, '0')}`,
            name: `Invigilator ${i + 1}`,
            department: DEPARTMENTS[i % DEPARTMENTS.length],
            isAvailable: Math.random() > 0.1,
            unavailableSlots: [],
            assignedDuties: [],
        });
    }
    return invigilators;
};

export const generateMockExamSchedule = (count = 200): ExamSlot[] => {
    const schedule: ExamSlot[] = [];
    const departmentKeys = Object.keys(COURSES);

    for (let i = 0; i < count; i++) {
        const date = new Date();
        date.setDate(date.getDate() + Math.floor(i / 10)); // 10 exams per day
        const dateString = date.toISOString().split('T')[0];
        const time = (i % 2 === 0) ? '09:30' : '14:00';

        const department = departmentKeys[i % departmentKeys.length];
        const coursesInDept = COURSES[department];
        const course = coursesInDept[i % coursesInDept.length];
        const semester = (i % 8) + 1;
        
        schedule.push({
            id: `E${String(i + 1).padStart(4, '0')}`,
            date: dateString,
            time: time,
            course,
            department,
            semester,
            subjectName: `Subject ${department.substring(0,3)}${semester}${i+1}`,
            subjectCode: `CS${semester}${i % 99}`,
            duration: 180,
            group: Math.random() > 0.8 ? (Math.random() > 0.5 ? 'A' : 'B') : undefined,
        });
    }
    return schedule;
};


// Initial empty data, to be populated by user or mock data function
export let STUDENTS: Student[] = [];

export let CLASSROOMS: Classroom[] = [];

export let INVIGILATORS: Invigilator[] = [];

export let EXAM_SCHEDULE: ExamSlot[] = [];
