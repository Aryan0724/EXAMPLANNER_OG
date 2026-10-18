const fs = require('fs');
const exams = JSON.parse(fs.readFileSync('scripts/bhimtal_exams_array.json', 'utf8'));

const tsContent = `import { ExamSlot } from './types';

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
        'B.Tech CSE',
        'B.Tech Computer Science and Engineering',
        'M.Tech CSE',
        'Diploma CSE'
    ],
    'Electronics and Communication Engineering': [
        'B.Tech ECE',
        'Diploma ECE'
    ],
    'Civil Engineering': [
        'B.Tech CE',
        'Diploma CE'
    ],
    'Mechanical Engineering': [
        'B.Tech ME',
        'Diploma ME'
    ],
    'Management': [
        'BBA',
        'Bachelor of Business Administration (BBA)'
    ],
    'Commerce': [
        'B.Com(H)',
        'B.Com. (Hons)'
    ],
    'Computer Applications': [
        'BCA',
        'BCA(Hons.) with AI&DS',
        'MCA',
        'MCA AI&DS'
    ],
    'Pharmacy': [
        'B.Pharma',
        'M.Pharma'
    ],
    'Nursing': [
        'B.Sc (Nursing)'
    ]
};

/**
 * Real Official Bhimtal Campus Examination Schedule
 * Extracted directly from university master schedule and matched to Bhimtal campus cohorts.
 * Total exams: 279 slots across 24 distinct sessions.
 */
export const REAL_BHIMTAL_EXAMS: Omit<ExamSlot, 'id'>[] = ${JSON.stringify(exams, null, 2)};
`;

fs.writeFileSync('src/lib/bhimtalData.ts', tsContent, 'utf8');
console.log('Successfully wrote src/lib/bhimtalData.ts!');
