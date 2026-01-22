'use client';

import React, { createContext, useState, ReactNode } from 'react';
import { Student, Classroom, Invigilator, ExamSlot, createClassroom } from '@/lib/types';
import { generateMockStudents, generateMockClassrooms, generateMockInvigilators, generateMockExamSchedule } from '@/lib/data';

interface DataContextType {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  classrooms: Classroom[];
  setClassrooms: React.Dispatch<React.SetStateAction<Classroom[]>>;
  invigilators: Invigilator[];
  setInvigilators: React.Dispatch<React.SetStateAction<Invigilator[]>>;
  examSchedule: ExamSlot[];
  setExamSchedule: React.Dispatch<React.SetStateAction<ExamSlot[]>>;
}

export const DataContext = createContext<DataContextType>({
  students: [],
  setStudents: () => {},
  classrooms: [],
  setClassrooms: () => {},
  invigilators: [],
  setInvigilators: () => {},
  examSchedule: [],
  setExamSchedule: () => {},
});

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [students, setStudents] = useState<Student[]>(() => generateMockStudents());
  const [classrooms, setClassrooms] = useState<Classroom[]>(() => generateMockClassrooms().map(c => createClassroom(c)));
  const [invigilators, setInvigilators] = useState<Invigilator[]>(() => generateMockInvigilators());
  const [examSchedule, setExamSchedule] = useState<ExamSlot[]>(() => generateMockExamSchedule());

  return (
    <DataContext.Provider value={{ students, setStudents, classrooms, setClassrooms, invigilators, setInvigilators, examSchedule, setExamSchedule }}>
      {children}
    </DataContext.Provider>
  );
};
