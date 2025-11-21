

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
        'B.Tech Electronics & Communication Engg (Hons.) with Specialization in Drone Technology',
        'B.Tech Electronics & Communication Engineering (Hons.) with specialization in VLSI',
        'B.Tech in Electronics and Communication Engineering',
    ],
    'Mechanical Engineering': [
        'B.Tech Mechanical Engineering (Hons.) with Specialization in Electric Vehicle',
        'B.Tech Mechanical Engineering (Hons.) with specialization in Mechatronics',
        'B.Tech Mechanical Engineering',
    ],
    'Computer Application': [
        'BCA (Hons.) with AI and DS',
        'B.Sc. IT',
        'BCA',
        'MCA',
        'MCA in AI and DS',
    ],
    'Management': [
        'Master of Business Administration',
        'BBA (International Finance & Accounting with ACCA)',
        'BBA',
    ],
    'Commerce': [
        'B.Com. (Hons)',
        'B.Com (Hons.) International Finance and Accounting with ACCA, UK',
        'B.Com International Finance and Accounting with ACCA, UK',
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
        'Allied Sciences (General)'
    ],
    'Department of Personality Development': [
        'Personality Development Certificate Program'
    ]
};

const COURSE_CODE_MAPPING = [
    { code: '01', dept: 'Computer Science and Engineering', name: 'B.Tech CSE (Hons.) with specialization in Cyber Security' },
    { code: '02', dept: 'Computer Science and Engineering', name: 'B.Tech Computer Science Engineering' },
    { code: '03', dept: 'Computer Science and Engineering', name: 'Diploma In Computer Science Engineering' },
    { code: '04', dept: 'Computer Science and Engineering', name: 'B.Tech CSE (Hons.) with specialization in Cyber Security' }, // Duplicate
    { code: '05', dept: 'Computer Science and Engineering', name: 'B.Tech Computer Science Engineering' }, // Duplicate
    { code: '06', dept: 'Computer Science and Engineering', name: 'B.Tech CSE (Hons.) with specialization in Artificial Intelligence and Machine Learning' },
    { code: '11', dept: 'Civil Engineering', name: 'B.Tech Civil Engineering (Hons.) with specialization in Environmental Engineering' },
    { code: '12', dept: 'Civil Engineering', name: 'B.Tech Civil Engineering (Hons.) with specialization in Geoinformatics' },
    { code: '13', dept: 'Civil Engineering', name: 'B.Tech in Civil Engineering' },
    { code: '21', dept: 'Electronics and Communication Engineering', name: 'B.Tech Electronics & Communication Engg (Hons.) with Specialization in Drone Technology' },
    { code: '22', dept: 'Electronics and Communication Engineering', name: 'B.Tech Electronics & Communication Engineering (Hons.) with specialization in VLSI' },
    { code: '23', dept: 'Electronics and Communication Engineering', name: 'B.Tech in Electronics and Communication Engineering' },
    { code: '31', dept: 'Mechanical Engineering', name: 'B.Tech Mechanical Engineering (Hons.) with Specialization in Electric Vehicle' },
    { code: '32', dept: 'Mechanical Engineering', name: 'B.Tech Mechanical Engineering (Hons.) with specialization in Mechatronics' },
    { code: '33', dept: 'Mechanical Engineering', name: 'B.Tech Mechanical Engineering' },
    { code: '41', dept: 'Computer Application', name: 'BCA (Hons.) with AI and DS' },
    { code: '42', dept: 'Computer Application', name: 'B.Sc. IT' },
    { code: '43', dept: 'Computer Application', name: 'BCA' },
    { code: '44', dept: 'Computer Application', name: 'B.Sc. IT' }, // Duplicate
    { code: '45', dept: 'Computer Application', name: 'MCA' },
    { code: '46', dept: 'Computer Application', name: 'BCA (Hons.) with AI and DS' }, // Duplicate
    { code: '47', dept: 'Computer Application', name: 'MCA in AI and DS' },
    { code: '51', dept: 'Management', name: 'Master of Business Administration' },
    { code: '52', dept: 'Management', name: 'BBA (International Finance & Accounting with ACCA)' },
    { code: '53', dept: 'Management', name: 'BBA' },
    { code: '54', dept: 'Management', name: 'BBA' }, // Duplicate
    { code: '55', dept: 'Management', name: 'BBA (International Finance & Accounting with ACCA)' }, // Duplicate
    { code: '56', dept: 'Management', name: 'Master of Business Administration' }, // Duplicate
    { code: '61', dept: 'Commerce', name: 'B.Com. (Hons)' },
    { code: '62', dept: 'Commerce', name: 'B.Com (Hons.) International Finance and Accounting with ACCA, UK' },
    { code: '63', dept: 'Commerce', name: 'B.Com International Finance and Accounting with ACCA, UK' },
    { code: '71', dept: 'Nursing', name: 'B.Sc. Nursing' },
    { code: '81', dept: 'Pharmacy', name: 'B.Pharm' },
    { code: '91', dept: 'Polytechnic', name: 'Diploma In Civil Engineering' },
    { code: '92', dept: 'Polytechnic', name: 'Diploma In Computer Science Engineering' },
    { code: '93', dept: 'Polytechnic', name: 'Diploma In Mechanical Engineering' },
    { code: '97', dept: 'Allied Sciences', name: 'Allied Sciences (General)' },
    { code: '98', dept: 'Department of Personality Development', name: 'Personality Development Certificate Program' }
];

// Functions to generate mock data
export const generateMockStudents = (studentsPerCourse = 10): Student[] => {
    const students: Student[] = [];
    const year = '25'; // For 2025 batch
    let globalStudentCounter = 0;

    COURSE_CODE_MAPPING.forEach(courseInfo => {
        const courseShortName = courseInfo.name.split(' ')[0].replace('.', '');
        for (let i = 1; i <= studentsPerCourse; i++) {
            const personalId = String(i).padStart(3, '0');
            const rollNo = `${year}${courseInfo.code}${personalId}`;
            const studentName = `${courseShortName}_Student_${personalId}`;

            students.push({
                id: `S${rollNo}`,
                name: studentName,
                rollNo: rollNo,
                department: courseInfo.dept,
                course: courseInfo.name,
                semester: (globalStudentCounter % 8) + 1,
                section: ['A', 'B', 'C'][globalStudentCounter % 3],
                group: Math.random() > 0.7 ? (Math.random() > 0.5 ? 'A' : 'B') : undefined,
                ineligibilityRecords: [],
                unavailableSlots: [],
                seatAssignment: null,
                isDebarred: Math.random() > 0.98,
                debarmentReason: 'Disciplinary Action'
            });
            globalStudentCounter++;
        }
    });

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
