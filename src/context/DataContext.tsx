
'use client';

import React, { createContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';
import type { Student, Classroom, Invigilator, ExamSlot } from '@/lib/types';
import { 
    STUDENTS as initialStudents, 
    CLASSROOMS as initialClassrooms, 
    INVIGILATORS as initialInvigilators, 
    EXAM_SCHEDULE as initialExamSchedule 
} from '@/lib/data';

interface DataContextType {
  students: Student[];
  setStudents: Dispatch<SetStateAction<Student[]>>;
  classrooms: Classroom[];
  setClassrooms: Dispatch<SetStateAction<Classroom[]>>;
  invigilators: Invigilator[];
  setInvigilators: Dispatch<SetStateAction<Invigilator[]>>;
  examSchedule: ExamSlot[];
  setExamSchedule: Dispatch<SetStateAction<ExamSlot[]>>;
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
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [classrooms, setClassrooms] = useState<Classroom[]>(initialClassrooms);
  const [invigilators, setInvigilators] = useState<Invigilator[]>(initialInvigilators);
  const [examSchedule, setExamSchedule] = useState<ExamSlot[]>(initialExamSchedule);

  return (
    <DataContext.Provider value={{ 
      students, setStudents, 
      classrooms, setClassrooms,
      invigilators, setInvigilators,
      examSchedule, setExamSchedule
    }}>
      {children}
    </DataContext.Provider>
  );
};
