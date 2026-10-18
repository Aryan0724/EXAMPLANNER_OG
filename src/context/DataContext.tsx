'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Student, Classroom, Invigilator, ExamSlot, createClassroom, FacultyStudentRule, DEFAULT_FACULTY_STUDENT_RULES } from '@/lib/types';
import { 
  generateMockStudents, 
  generateMockClassrooms, 
  generateMockInvigilators, 
  generateMockExamSchedule, 
  getBhimtalExamSchedule,
  generateOfficialClassrooms,
  generateOfficialStudents 
} from '@/lib/data';

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
  resetClassroomsToOfficial: () => void;
  resetStudentsToOfficial: () => void;
  clearExamSchedule: () => void;
  loadSampleExamSchedule: () => void;
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
  resetClassroomsToOfficial: () => { },
  resetStudentsToOfficial: () => { },
  clearExamSchedule: () => { },
  loadSampleExamSchedule: () => { },
});

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [students, setStudentsState] = useState<Student[]>([]);
  const [classrooms, setClassroomsState] = useState<Classroom[]>([]);
  const [invigilators, setInvigilators] = useState<Invigilator[]>(generateMockInvigilators());
  const [examSchedule, setExamScheduleState] = useState<ExamSlot[]>([]);
  const [blockPriority, setBlockPriority] = useState<string[]>(['Admin Block A', 'Academic Block C', 'Academic Block D', 'Academic Block E']);
  const [excludedBlocks, setExcludedBlocks] = useState<string[]>([]);
  const [excludedRooms, setExcludedRooms] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [reservedCount, setReservedCount] = useState(4);
  const [facultyStudentRules, setFacultyStudentRulesState] = useState<FacultyStudentRule[]>(DEFAULT_FACULTY_STUDENT_RULES);

  const setClassrooms = (valOrFn: React.SetStateAction<Classroom[]>) => {
    setClassroomsState(prev => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      try {
        localStorage.setItem('gehu_classrooms', JSON.stringify(next));
      } catch (err) {}
      return next;
    });
  };

  const setStudents = (valOrFn: React.SetStateAction<Student[]>) => {
    setStudentsState(prev => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      try {
        localStorage.setItem('gehu_students', JSON.stringify(next));
      } catch (err) {}
      return next;
    });
  };

  const setExamSchedule = (valOrFn: React.SetStateAction<ExamSlot[]>) => {
    setExamScheduleState(prev => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      try {
        localStorage.setItem('gehu_exam_schedule', JSON.stringify(next));
      } catch (err) {}
      return next;
    });
  };

  const clearExamSchedule = () => {
    setExamScheduleState([]);
    try {
      localStorage.removeItem('gehu_exam_schedule');
      localStorage.removeItem('gehu_full_allotment');
      localStorage.removeItem('gehu_full_allotment_v5');
    } catch (err) {}
  };

  const loadSampleExamSchedule = () => {
    const sample = getBhimtalExamSchedule();
    setExamSchedule(sample);
  };

  const setFacultyStudentRules = (valOrFn: React.SetStateAction<FacultyStudentRule[]>) => {
    setFacultyStudentRulesState(prev => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      try {
        localStorage.setItem('gehu_faculty_student_rules', JSON.stringify(next));
      } catch (err) {}
      return next;
    });
  };

  const resetClassroomsToOfficial = () => {
    const official = generateOfficialClassrooms();
    setClassrooms(official);
  };

  const resetStudentsToOfficial = () => {
    const official = generateOfficialStudents();
    setStudents(official);
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
    // 1. Initialize Classrooms (Official 18 rooms / 1,147 seats or saved user customizations)
    let initialRooms: Classroom[] = [];
    try {
      const savedRooms = localStorage.getItem('gehu_classrooms');
      if (savedRooms) {
        const parsed = JSON.parse(savedRooms);
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialRooms = parsed.map((r: any) => createClassroom(r));
        }
      }
    } catch (err) {}

    if (initialRooms.length === 0) {
      initialRooms = generateOfficialClassrooms();
      try {
        localStorage.setItem('gehu_classrooms', JSON.stringify(initialRooms));
      } catch (err) {}
    }
    setClassroomsState(initialRooms);

    // 2. Initialize Students (Official 46 cohorts / 4,267 students from 1MASTERPLAN)
    let initialStudents: Student[] = [];
    try {
      const savedStudents = localStorage.getItem('gehu_students');
      if (savedStudents) {
        const parsed = JSON.parse(savedStudents);
        // Automatically upgrade if localStorage has previous smaller student dataset (< 4000 students)
        if (Array.isArray(parsed) && parsed.length >= 4000) {
          initialStudents = parsed;
        } else {
          localStorage.removeItem('gehu_students');
        }
      }
    } catch (err) {}

    if (initialStudents.length === 0) {
      initialStudents = generateOfficialStudents();
      try {
        localStorage.setItem('gehu_students', JSON.stringify(initialStudents));
      } catch (err) {}
    }
    setStudentsState(initialStudents);

    // 3. Initialize Faculty (Invigilators)
    setInvigilators(generateMockInvigilators());

    // 4. Initialize Exam Schedule:
    // Load official extracted Bhimtal campus exam schedule (279 slots across 24 sessions)
    let initialSchedule: ExamSlot[] = [];
    try {
      const savedSchedule = localStorage.getItem('gehu_exam_schedule');
      if (savedSchedule) {
        const parsed = JSON.parse(savedSchedule);
        // Check if saved schedule is outdated (e.g. less than 200 slots or from May 2026)
        const isUpToDate = Array.isArray(parsed) && parsed.length >= 250;
        if (isUpToDate) {
          initialSchedule = parsed;
        } else {
          localStorage.removeItem('gehu_exam_schedule');
          localStorage.removeItem('gehu_full_allotment');
          localStorage.removeItem('gehu_full_allotment_v5');
        }
      }
    } catch (err) {}

    if (initialSchedule.length === 0) {
      initialSchedule = getBhimtalExamSchedule();
      try {
        localStorage.setItem('gehu_exam_schedule', JSON.stringify(initialSchedule));
      } catch (err) {}
    }
    setExamScheduleState(initialSchedule);

    setBlockPriority(['Admin Block A', 'Academic Block C', 'Academic Block D', 'Academic Block E']);
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
      facultyStudentRules, setFacultyStudentRules,
      resetClassroomsToOfficial,
      resetStudentsToOfficial,
      clearExamSchedule,
      loadSampleExamSchedule
    }}>
      {children}
    </DataContext.Provider>
  );
};
