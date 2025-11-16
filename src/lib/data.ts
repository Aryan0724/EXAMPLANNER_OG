

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


export const STUDENTS: Student[] = [];

export const CLASSROOMS: Classroom[] = [];

export const INVIGILATORS: Invigilator[] = [];

export const EXAM_SCHEDULE: ExamSlot[] = [];
