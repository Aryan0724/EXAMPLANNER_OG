

import { Student, Classroom, createClassroom, Invigilator, ExamSlot } from './types';

export const DEPARTMENTS: string[] = [];

export const COURSES: Record<string, string[]> = {};

export const STUDENTS: Student[] = [];

export const CLASSROOMS: Classroom[] = [];

export const INVIGILATORS: Invigilator[] = [];

const rawSchedule: Omit<ExamSlot, 'id'>[] = [];

export const EXAM_SCHEDULE: ExamSlot[] = rawSchedule
    .filter(exam => exam.date && !exam.date.includes('NaT'))
    .map((exam, index) => ({
        ...exam,
        id: `E${String(index + 1).padStart(3, '0')}`,
    }));
