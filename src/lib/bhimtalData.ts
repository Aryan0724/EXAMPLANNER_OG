
import { ExamSlot } from './types';

export const BHIMTAL_DEPARTMENTS = [
    'Computer Science and Engineering',
    'Electronics and Communication Engineering',
    'Civil Engineering',
    'Mechanical Engineering',
    'Management',
    'Commerce',
    'Computer Applications',
    'Pharmacy',
    'Nursing',
    'Humanities and Social Sciences',
    'Agriculture',
    'Law',
    'Allied Sciences'
];

export const BHIMTAL_COURSES: Record<string, string[]> = {
    'Computer Science and Engineering': [
        'B.Tech Computer Science and Engineering',
        'B.Tech CSE (Hons.) - AI & ML',
        'B.Tech CSE (Hons.) - Cyber Security',
        'B.Tech CSE (Artificial Intelligence & Data Science)',
        'M.Tech Computer Science and Engineering',
        'Diploma in Computer Science and Engineering'
    ],
    'Electronics and Communication Engineering': [
        'B.Tech Electronics and Communication Engineering',
        'B.Tech ECE (Hons.) - VLSI',
        'B.Tech ECE (Hons.) - Drone Technology'
    ],
    'Civil Engineering': [
        'B.Tech Civil Engineering',
        'B.Tech Civil Engineering (Hons.)',
        'Diploma in Civil Engineering'
    ],
    'Mechanical Engineering': [
        'B.Tech Mechanical Engineering',
        'B.Tech Mechanical Engineering (Hons.)',
        'Diploma in Mechanical Engineering'
    ],
    'Management': [
        'Bachelor of Business Administration (BBA)',
        'BBA - International Finance & Accounting (ACCA)',
        'BBA with Business Analytics',
        'Master of Business Administration (MBA)',
        'MBA in Artificial Intelligence and Data Science'
    ],
    'Commerce': [
        'B.Com. (Hons)',
        'B.Com. (Hons) International Finance and Accounting'
    ],
    'Computer Applications': [
        'BCA',
        'BCA (Hons.) - AI & Data Science',
        'MCA',
        'MCA - AI & Data Science',
        'B.Sc. IT'
    ],
    'Pharmacy': [
        'Bachelor of Pharmacy (B.Pharm.)',
        'Diploma in Pharmacy (D.Pharm.)'
    ],
    'Nursing': [
        'B.Sc. Nursing'
    ],
    'Humanities and Social Sciences': [
        'B.A. (H) English',
        'B.A. (H) English with Research'
    ],
    'Agriculture': [
        'B.Sc. Agriculture'
    ],
    'Law': [
        'BA LL.B',
        'BBA LL.B (Hons)'
    ],
    'Allied Sciences': [
        'B.Sc (Hons) Chemistry',
        'B.Sc (Hons) Mathematics',
        'B.Sc (Hons) Physics'
    ]
};

export const REAL_BHIMTAL_EXAMS: Omit<ExamSlot, 'id'>[] = [
    // Thursday, 14 May 2026 - Shift 1
    { date: '2026-05-14', time: '09:30', shift: 1, department: 'Humanities and Social Sciences', course: 'B.A. (H) English', semester: 2, subjectName: 'Fundamentals of Computer Application', subjectCode: 'AEC-II', duration: 180 },
    { date: '2026-05-14', time: '09:30', shift: 1, department: 'Commerce', course: 'B.Com. (Hons)', semester: 2, subjectName: 'Human Resource Management', subjectCode: 'BCH201', duration: 180 },
    { date: '2026-05-14', time: '09:30', shift: 1, department: 'Management', course: 'Bachelor of Business Administration (BBA)', semester: 2, subjectName: 'Organisational Behavior', subjectCode: 'BBA201', duration: 180 },
    { date: '2026-05-14', time: '09:30', shift: 1, department: 'Computer Applications', course: 'BCA (Hons.) - AI & Data Science', semester: 2, subjectName: 'Foundations of AI', subjectCode: 'TBD201', duration: 180 },
    { date: '2026-05-14', time: '09:30', shift: 1, department: 'Computer Science and Engineering', course: 'B.Tech Computer Science and Engineering', semester: 2, subjectName: 'Engineering Mathematics-II', subjectCode: 'TMA201', duration: 180 },
    
    // Thursday, 14 May 2026 - Shift 2
    { date: '2026-05-14', time: '13:30', shift: 2, department: 'Humanities and Social Sciences', course: 'B.A. (H) English', semester: 4, subjectName: 'Creative Writing', subjectCode: 'ENG401', duration: 180 },
    { date: '2026-05-14', time: '13:30', shift: 2, department: 'Commerce', course: 'B.Com. (Hons)', semester: 4, subjectName: 'Corporate Law', subjectCode: 'BCH401', duration: 180 },
    { date: '2026-05-14', time: '13:30', shift: 2, department: 'Computer Applications', course: 'BCA', semester: 4, subjectName: 'Web Application Development', subjectCode: 'TBC401', duration: 180 },
    { date: '2026-05-14', time: '13:30', shift: 2, department: 'Computer Science and Engineering', course: 'B.Tech Computer Science and Engineering', semester: 8, subjectName: 'Soft Computing', subjectCode: 'TCS801', duration: 180 },

    // Friday, 15 May 2026 - Shift 1
    { date: '2026-05-15', time: '09:30', shift: 1, department: 'Humanities and Social Sciences', course: 'B.A. (H) English', semester: 6, subjectName: 'Modern European Drama', subjectCode: 'ENG601', duration: 180 },
    { date: '2026-05-15', time: '09:30', shift: 1, department: 'Management', course: 'Bachelor of Business Administration (BBA)', semester: 4, subjectName: 'Entrepreneurship and Startup Ecosystem', subjectCode: 'BBA401', duration: 180 },
    { date: '2026-05-15', time: '09:30', shift: 1, department: 'Computer Applications', course: 'MCA', semester: 2, subjectName: 'Artificial Intelligence', subjectCode: 'TMC201', duration: 180 },
    
    // Friday, 15 May 2026 - Shift 2
    { date: '2026-05-15', time: '13:30', shift: 2, department: 'Commerce', course: 'B.Com. (Hons)', semester: 6, subjectName: 'GST Laws', subjectCode: 'BCH601', duration: 180 },
    { date: '2026-05-15', time: '13:30', shift: 2, department: 'Management', course: 'Bachelor of Business Administration (BBA)', semester: 6, subjectName: 'Project Management', subjectCode: 'BBA601', duration: 180 },
    { date: '2026-05-15', time: '13:30', shift: 2, department: 'Management', course: 'Master of Business Administration (MBA)', semester: 4, subjectName: 'Project Management', subjectCode: 'MBA401', duration: 180 },

    // Saturday, 16 May 2026 - Shift 1
    { date: '2026-05-16', time: '09:30', shift: 1, department: 'Humanities and Social Sciences', course: 'B.A. (H) English', semester: 2, subjectName: 'Applied Phonetics', subjectCode: 'ENG202', duration: 180 },
    { date: '2026-05-16', time: '09:30', shift: 1, department: 'Commerce', course: 'B.Com. (Hons)', semester: 2, subjectName: 'Business Statistics', subjectCode: 'BCH202', duration: 180 },
    { date: '2026-05-16', time: '09:30', shift: 1, department: 'Management', course: 'Bachelor of Business Administration (BBA)', semester: 2, subjectName: 'Marketing Management', subjectCode: 'BBA202', duration: 180 },
    { date: '2026-05-16', time: '09:30', shift: 1, department: 'Computer Science and Engineering', course: 'B.Tech Computer Science and Engineering', semester: 2, subjectName: 'Programming for Problem Solving', subjectCode: 'TCS201', duration: 180 },

    // Saturday, 16 May 2026 - Shift 2
    { date: '2026-05-16', time: '13:30', shift: 2, department: 'Humanities and Social Sciences', course: 'B.A. (H) English', semester: 4, subjectName: 'Literary Criticism', subjectCode: 'ENG402', duration: 180 },
    { date: '2026-05-16', time: '13:30', shift: 2, department: 'Commerce', course: 'B.Com. (Hons)', semester: 4, subjectName: 'Cost Accounting', subjectCode: 'BCH402', duration: 180 },
    { date: '2026-05-16', time: '13:30', shift: 2, department: 'Computer Applications', course: 'BCA', semester: 4, subjectName: 'Computer Organization', subjectCode: 'TBC402', duration: 180 },
    
    // Adding more as extracted from PDF
    { date: '2026-05-18', time: '09:30', shift: 1, department: 'Computer Science and Engineering', course: 'B.Tech Computer Science and Engineering', semester: 6, subjectName: 'Compiler Design', subjectCode: 'TCS601', duration: 180 },
    { date: '2026-05-19', time: '09:30', shift: 1, department: 'Computer Science and Engineering', course: 'B.Tech Computer Science and Engineering', semester: 2, subjectName: 'Fundamentals of AI and ML', subjectCode: 'TCS202', duration: 180 },
    { date: '2026-05-20', time: '09:30', shift: 1, department: 'Computer Science and Engineering', course: 'B.Tech Computer Science and Engineering', semester: 6, subjectName: 'Software Engineering', subjectCode: 'TCS602', duration: 180 },
    { date: '2026-05-21', time: '09:30', shift: 1, department: 'Computer Science and Engineering', course: 'B.Tech Computer Science and Engineering', semester: 2, subjectName: 'Basic Electronics', subjectCode: 'TEC201', duration: 180 },
    { date: '2026-05-22', time: '09:30', shift: 1, department: 'Computer Science and Engineering', course: 'B.Tech Computer Science and Engineering', semester: 6, subjectName: 'Computer Networks-II', subjectCode: 'TCS603', duration: 180 },
    { date: '2026-05-23', time: '09:30', shift: 1, department: 'Computer Science and Engineering', course: 'B.Tech Computer Science and Engineering', semester: 2, subjectName: 'Engineering Chemistry', subjectCode: 'TCH201', duration: 180 },
    { date: '2026-05-25', time: '09:30', shift: 1, department: 'Computer Science and Engineering', course: 'B.Tech Computer Science and Engineering', semester: 6, subjectName: 'Big Data', subjectCode: 'TCS604', duration: 180 },
    { date: '2026-05-26', time: '09:30', shift: 1, department: 'Computer Science and Engineering', course: 'B.Tech Computer Science and Engineering', semester: 2, subjectName: 'Environmental Science', subjectCode: 'TEV201', duration: 180 },
    { date: '2026-05-28', time: '09:30', shift: 1, department: 'Computer Science and Engineering', course: 'B.Tech Computer Science and Engineering', semester: 6, subjectName: 'Generative AI', subjectCode: 'TCS605', duration: 180 }
];
