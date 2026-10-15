'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Student, Classroom, Invigilator, ExamSlot, createClassroom, FacultyStudentRule, DEFAULT_FACULTY_STUDENT_RULES } from '@/lib/types';
import { generateMockStudents, generateMockClassrooms, generateMockInvigilators, generateMockExamSchedule, getBhimtalExamSchedule } from '@/lib/data';

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
  facultyStudentRules: FacultyStudentRule[];
  setFacultyStudentRules: React.Dispatch<React.SetStateAction<FacultyStudentRule[]>>;
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
  facultyStudentRules: DEFAULT_FACULTY_STUDENT_RULES,
  setFacultyStudentRules: () => { },
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
  const [facultyStudentRules, setFacultyStudentRulesState] = useState<FacultyStudentRule[]>(DEFAULT_FACULTY_STUDENT_RULES);

  const setFacultyStudentRules = (valOrFn: React.SetStateAction<FacultyStudentRule[]>) => {
    setFacultyStudentRulesState(prev => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      try {
        localStorage.setItem('gehu_faculty_student_rules', JSON.stringify(next));
      } catch (err) {}
      return next;
    });
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('gehu_faculty_student_rules');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFacultyStudentRulesState(parsed);
        }
      }
    } catch (err) {}
  }, []);

  useEffect(() => {
    // Load Bhimtal specific data by default
    setStudents(generateMockStudents(60)); // 60 students per course for realistic testing
    setClassrooms(generateMockClassrooms());
    setInvigilators(generateMockInvigilators());
    setExamSchedule(getBhimtalExamSchedule());
    setBlockPriority(['Academic Block C', 'Academic Block D', 'Academic Block E']);
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
      reservedCount, setReservedCount,
      facultyStudentRules, setFacultyStudentRules
    }}>
      {children}
    </DataContext.Provider>
  );
};
