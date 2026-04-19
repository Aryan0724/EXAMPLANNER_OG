'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
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
  blockPriority: string[];
  setBlockPriority: React.Dispatch<React.SetStateAction<string[]>>;
  excludedBlocks: string[];
  setExcludedBlocks: React.Dispatch<React.SetStateAction<string[]>>;
  excludedRooms: string[];
  setExcludedRooms: React.Dispatch<React.SetStateAction<string[]>>;
  isHydrated: boolean;
  reservedCount: number;
  setReservedCount: React.Dispatch<React.SetStateAction<number>>;
}

export const DataContext = createContext<DataContextType>({
  students: [],
  setStudents: () => { },
  classrooms: [],
  setClassrooms: () => { },
  invigilators: [],
  setInvigilators: () => { },
  examSchedule: [],
  setExamSchedule: () => { },
  blockPriority: [],
  setBlockPriority: () => { },
  excludedBlocks: [],
  setExcludedBlocks: () => { },
  excludedRooms: [],
  setExcludedRooms: () => { },
  isHydrated: false,
  reservedCount: 4,
  setReservedCount: () => { },
});

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [invigilators, setInvigilators] = useState<Invigilator[]>(generateMockInvigilators());
  const [examSchedule, setExamSchedule] = useState<ExamSlot[]>([]);
  const [blockPriority, setBlockPriority] = useState<string[]>([]);
  const [excludedBlocks, setExcludedBlocks] = useState<string[]>([]);
  const [excludedRooms, setExcludedRooms] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [reservedCount, setReservedCount] = useState(4);

  useEffect(() => {
    // Start with empty state for most, but load Real Invigilators by default
    setStudents([]);
    setClassrooms([]);
    setInvigilators(generateMockInvigilators());
    setExamSchedule([]);
    setBlockPriority(['Academic Block C', 'Academic Block D', 'Academic Block E']); // Default priority order
    setExcludedBlocks([]);
    setExcludedRooms([]);
    setIsHydrated(true);
  }, []);

  return (
    <DataContext.Provider value={{
      students, setStudents,
      classrooms, setClassrooms,
      invigilators, setInvigilators,
      examSchedule, setExamSchedule,
      blockPriority, setBlockPriority,
      excludedBlocks, setExcludedBlocks,
      excludedRooms, setExcludedRooms,
      isHydrated,
      reservedCount, setReservedCount
    }}>
      {children}
    </DataContext.Provider>
  );
};
