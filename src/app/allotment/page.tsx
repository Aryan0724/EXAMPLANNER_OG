
'use client';

import { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Printer, Building, UserCheck, Eye, EyeOff, Info, UserMinus, RotateCcw, FileDown, FileSpreadsheet, CheckCircle, AlertTriangle, ShieldCheck, ChevronDown, FileText, CalendarCheck2, Armchair, CalendarDays, SlidersHorizontal, ArrowRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import type { SeatPlan, InvigilatorAssignment, ExamSlot, Classroom, Student, Invigilator, FacultyStudentRule } from '@/lib/types';
import { generateSeatPlan, assignInvigilators, countSeatPlanViolations, isSeatPlanCompliantWithSittingRules } from '@/lib/planning';
import { generateRoomSeatPlanPDF, generateRoomSeatPlanExcel, generateSessionWiseInvigilationRoster, generateMasterReport, generateDetailedInvigilatorDutyChart } from '@/lib/report-generator';
import { ClassroomVisualizer } from '@/components/classroom-visualizer';
import { AllotmentContext } from '@/context/AllotmentContext';
import { DataContext } from '@/context/DataContext';
import { FacultyAllocationDialog } from '@/components/faculty-allocation-dialog';
import { AllotmentRulesDialog } from '@/components/allotment-rules-dialog';
import { AllotmentChoiceDialog } from '@/components/allotment-choice-dialog';
import { FacultyShiftAllotmentView } from '@/components/faculty-shift-allotment-view';
import { BlockPriorityDialog } from '@/components/block-priority-dialog';
type FullAllotment = Record<string, { seatPlan: SeatPlan, invigilatorAssignments: InvigilatorAssignment[] }>;
import { ExclusionReport } from '@/components/exclusion-report';

const getExamSlotsByTime = (examSchedule: ExamSlot[]) => {
  return (examSchedule || []).reduce((acc, exam) => {
    if (!exam) return acc;
    const key = `${exam.date} ${exam.time}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(exam);
    return acc;
  }, {} as Record<string, ExamSlot[]>);
};


const getSlotOptions = (allotment: Record<string, any> | null, examSchedule: ExamSlot[]) => {
  const examSlotsByTime = getExamSlotsByTime(examSchedule || []);
  const keys = new Set<string>();
  if (allotment && typeof allotment === 'object') {
    Object.keys(allotment).forEach(k => keys.add(k));
  }
  Object.keys(examSlotsByTime).forEach(k => keys.add(k));

  const options: { id: string; label: string }[] = [];

  for (const key of keys) {
    const slotExams = allotment?.[key]?.seatPlan?.exam || examSlotsByTime[key];
    const examList = Array.isArray(slotExams) ? slotExams : (slotExams ? [slotExams] : []);
    const rep = examList[0];

    const dateStr = rep?.date || key.split(' ')[0] || 'Session';
    const timeStr = rep?.time || key.split(' ').slice(1).join(' ') || '';
    const examNames = examList.length > 0
      ? examList.map(e => `${e.subjectCode || e.subjectName || 'Exam'}${e.group ? ` (G${e.group})` : ''}`).join(', ')
      : key;

    options.push({
      id: key,
      label: timeStr ? `${dateStr} @ ${timeStr} (${examNames})` : `${dateStr} (${examNames})`,
    });
  }

  return options;
};


export default function AllotmentPage() {
  const { toast } = useToast();
  const { fullAllotment, setFullAllotment } = useContext(AllotmentContext);
  const {
    students,
    classrooms,
    setClassrooms,
    invigilators,
    setInvigilators,
    examSchedule,
    isHydrated,
    reservedCount,
    setReservedCount,
    facultyStudentRules,
    setFacultyStudentRules,
    blockPriority,
    setBlockPriority,
    excludedBlocks,
    setExcludedBlocks,
    excludedRooms,
    setExcludedRooms,
  } = useContext(DataContext);

  const examSlotsByTime = useMemo(() => getExamSlotsByTime(examSchedule), [examSchedule]);

  const [allotmentMode, setAllotmentMode] = useState<'full' | 'shift-duty'>('full');
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [isPriorityDialogOpen, setIsPriorityDialogOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const m = params.get('mode');
      if (m === 'shift-duty' || m === 'full') {
        setAllotmentMode(m);
      }
    }
  }, []);

  const availableBlocks = useMemo(
    () => Array.from(new Set(classrooms.map(c => c.building))).sort(),
    [classrooms]
  );

  const handleSavePriority = (newPriority: string[], newExcludedBlocks: string[], newExcludedRooms: string[]) => {
    setBlockPriority(newPriority);
    setExcludedBlocks(newExcludedBlocks);
    setExcludedRooms(newExcludedRooms);
    setIsPriorityDialogOpen(false);
    toast({ title: 'Room Priorities Saved', description: 'Classroom selection priority updated for seating allotment.' });
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [showFacultyDialog, setShowFacultyDialog] = useState(false);
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [slotOptions, setSlotOptions] = useState(() => getSlotOptions(fullAllotment, examSchedule));
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | undefined>(() => slotOptions[0]?.id);

  const [seatPlan, setSeatPlan] = useState<SeatPlan | null>(null);
  const [invigilatorAssignments, setInvigilatorAssignments] = useState<InvigilatorAssignment[] | null>(null);

  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);

  const autoRepairedSlotsRef = useRef<Set<string>>(new Set());

  const [excludedData, setExcludedData] = useState<{
    debarredStudents: Student[];
    ineligibleStudents: (Student & { reason: string; subjectCode: string })[];
    unavailableClassrooms: (Classroom & { reason: string })[];
    unavailableInvigilators: (Invigilator & { reason: string })[];
  } | null>(null);
  const [showExclusionReport, setShowExclusionReport] = useState(false);

  const calculateExclusions = useCallback((slotKey: string) => {
    const examsInSlot = examSlotsByTime[slotKey] || [];
    if (examsInSlot.length === 0) {
      setExcludedData(null);
      return;
    }
    const examIdsInSlot = new Set(examsInSlot.map(e => e.id));

    const debarredStudents = students.filter(s => s.isDebarred);
    const ineligibleStudents: (Student & { reason: string, subjectCode: string })[] = [];

    students.forEach(student => {
      examsInSlot.forEach(exam => {
        if (student.course === exam.course && student.department === exam.department) {
          const record = student.ineligibilityRecords.find(r => r.subjectCode === exam.subjectCode);
          if (record) {
            ineligibleStudents.push({ ...student, reason: record.reason, subjectCode: exam.subjectCode });
          }
        }
      });
    });

    const unavailableClassrooms = classrooms.map(c => {
      const unavailability = c.unavailableSlots.find(s => examIdsInSlot.has(s.slotId));
      return unavailability ? { ...c, reason: unavailability.reason } : null;
    }).filter((c): c is Classroom & { reason: string } => c !== null);

    const unavailableInvigilators = invigilators.map(i => {
      const unavailability = i.unavailableSlots.find(s => examIdsInSlot.has(s.slotId));
      return unavailability ? { ...i, reason: unavailability.reason } : null;
    }).filter((i): i is Invigilator & { reason: string } => i !== null);

    setExcludedData({
      debarredStudents,
      ineligibleStudents,
      unavailableClassrooms,
      unavailableInvigilators
    });
  }, [students, classrooms, invigilators, examSlotsByTime]);

  const updateStateForSlot = useCallback((slotKey: string) => {
    calculateExclusions(slotKey);
    if (fullAllotment && fullAllotment[slotKey]) {
      const { seatPlan: newSeatPlan, invigilatorAssignments: existingInvAsg } = fullAllotment[slotKey];

      const concurrentExams = (examSlotsByTime[slotKey] && examSlotsByTime[slotKey].length > 0)
        ? examSlotsByTime[slotKey]
        : (newSeatPlan?.exam ? (Array.isArray(newSeatPlan.exam) ? newSeatPlan.exam : [newSeatPlan.exam]) : []);
      const sessionExamIds = new Set(concurrentExams.map(e => e.id));

      // 1. Strict seating compliance self-repair:
      // If the loaded seat plan has bench violations or breaks alternate zig-zag seating
      // (e.g. from an outdated pre-fix plan in localStorage),
      // automatically heal it with the strict alternate checkerboard spacing rules at most once per slotKey.
      const isCompliant = isSeatPlanCompliantWithSittingRules(newSeatPlan, classrooms);
      if (!isCompliant && concurrentExams.length > 0 && students.length > 0 && !autoRepairedSlotsRef.current.has(slotKey)) {
        autoRepairedSlotsRef.current.add(slotKey);
        const cleanStudents = students.map(s => ({ ...s, seatAssignment: null }));
        const { plan: healedSeatPlan } = generateSeatPlan(cleanStudents, classrooms, concurrentExams, blockPriority);
        const sessionTargetPool = invigilators.filter(inv => {
          if (!inv.isAvailable) return false;
          return !inv.unavailableSlots.some(s => s.slotId === slotKey || sessionExamIds.has(s.slotId));
        });

        const { assignments: healedInvAsg } = assignInvigilators(
          sessionTargetPool,
          healedSeatPlan,
          concurrentExams[0],
          reservedCount,
          facultyStudentRules
        );

        setSeatPlan(healedSeatPlan);
        setInvigilatorAssignments(healedInvAsg);
        setFullAllotment((prev: any) => ({
          ...(prev || {}),
          [slotKey]: { seatPlan: healedSeatPlan, invigilatorAssignments: healedInvAsg }
        }));
        const firstClassroomId = healedSeatPlan.assignments.find(a => a && a.classroom?.id)?.classroom?.id ?? null;
        setSelectedClassroomId(firstClassroomId);
        toast({
          title: "Allotment Synchronized",
          description: "Applied ExamPlanner 24-rule seating allotment (Course-wise separation & Left-Right consecutive roll allotment).",
        });
        return;
      }

      const hasInvalidAssignments = existingInvAsg && existingInvAsg.some(asg => {
        const invInMaster = invigilators.find(i => i.id === asg.invigilator?.id);
        if (!invInMaster || !invInMaster.isAvailable) return true;
        return invInMaster.unavailableSlots.some(s => s.slotId === slotKey || sessionExamIds.has(s.slotId));
      });

      if (hasInvalidAssignments && !autoRepairedSlotsRef.current.has(slotKey + '_staff')) {
        autoRepairedSlotsRef.current.add(slotKey + '_staff');
        const sessionTargetPool = invigilators.filter(inv => {
          if (!inv.isAvailable) return false;
          return !inv.unavailableSlots.some(s => s.slotId === slotKey || sessionExamIds.has(s.slotId));
        });

        const { assignments: repairedInvAsg } = assignInvigilators(
          sessionTargetPool,
          newSeatPlan,
          concurrentExams[0],
          reservedCount,
          facultyStudentRules
        );

        // Only update if we actually got assignments back
        if (repairedInvAsg.length > 0) {
          setSeatPlan(newSeatPlan);
          setInvigilatorAssignments(repairedInvAsg);
          setFullAllotment((prev: any) => ({
            ...(prev || {}),
            [slotKey]: { seatPlan: newSeatPlan, invigilatorAssignments: repairedInvAsg }
          }));
          toast({
            title: "Plan Synchronized",
            description: "Replacement assigned for newly unavailable staff.",
          });
          const firstClassroomId = newSeatPlan.assignments.find(a => a && a.classroom?.id)?.classroom?.id ?? null;
          setSelectedClassroomId(firstClassroomId);
          return;
        }
      }

      setSeatPlan(newSeatPlan);
      setInvigilatorAssignments(existingInvAsg);
      const firstClassroomId = newSeatPlan.assignments.find(a => a && a.classroom?.id)?.classroom?.id ?? null;
      setSelectedClassroomId(firstClassroomId);
    } else {
      const concurrentExams = examSlotsByTime[slotKey] || [];
      if (concurrentExams.length > 0 && students.length > 0 && classrooms.length > 0) {
        const cleanStudents = students.map(s => ({ ...s, seatAssignment: null }));
        const { plan: freshPlan } = generateSeatPlan(cleanStudents, classrooms, concurrentExams, blockPriority);
        const sessionExamIds = new Set(concurrentExams.map(e => e.id));
        const sessionTargetPool = invigilators.filter(inv => {
          if (!inv.isAvailable) return false;
          return !inv.unavailableSlots.some(s => s.slotId === slotKey || sessionExamIds.has(s.slotId));
        });
        const { assignments: freshInvAsg } = assignInvigilators(sessionTargetPool, freshPlan, concurrentExams[0], reservedCount, facultyStudentRules);
        setSeatPlan(freshPlan);
        setInvigilatorAssignments(freshInvAsg);
        setFullAllotment((prev: any) => ({
          ...(prev || {}),
          [slotKey]: { seatPlan: freshPlan, invigilatorAssignments: freshInvAsg }
        }));
        const firstClassroomId = freshPlan.assignments.find(a => a && a.classroom?.id)?.classroom?.id ?? null;
        setSelectedClassroomId(firstClassroomId);
        return;
      }

      setSeatPlan(null);
      setInvigilatorAssignments(null);
      setSelectedClassroomId(null);
    }
  }, [fullAllotment, calculateExclusions, invigilators, classrooms, students, blockPriority, reservedCount, facultyStudentRules, examSlotsByTime, toast, setFullAllotment]);

  // Synchronize slot options when fullAllotment or examSchedule updates (single consolidated, non-cyclic effect)
  useEffect(() => {
    const newSlotOptions = getSlotOptions(fullAllotment, examSchedule);
    setSlotOptions(newSlotOptions);

    setSelectedSlotKey(prevKey => {
      if (prevKey && newSlotOptions.some(opt => opt.id === prevKey)) {
        return prevKey;
      }
      return newSlotOptions.length > 0 ? newSlotOptions[0].id : undefined;
    });
  }, [fullAllotment, examSchedule]);

  useEffect(() => {
    if (selectedSlotKey) {
      updateStateForSlot(selectedSlotKey);
    } else {
      setExcludedData(null);
      setSeatPlan(null);
      setInvigilatorAssignments(null);
      setSelectedClassroomId(null);
    }
  }, [selectedSlotKey, updateStateForSlot]);

  const classroomsInPlan = seatPlan
    ? [
        ...new Map(
          seatPlan.assignments
            .filter(a => a && a.student && a.classroom?.id)
            .map(item => [item.classroom.id, item.classroom])
        ).values()
      ]
    : [];

  const selectedClassroom = selectedClassroomId ? classrooms.find(c => c.id === selectedClassroomId) : null;

  const invigilatorsForClassroom = selectedClassroom && invigilatorAssignments
    ? invigilatorAssignments
        .filter(a => a && a.classroom?.id === selectedClassroom.id && a.invigilator)
        .map(a => a.invigilator)
    : [];

  const currentExams = seatPlan?.exam ? (Array.isArray(seatPlan.exam) ? seatPlan.exam : [seatPlan.exam]) : (examSlotsByTime[selectedSlotKey!] || []);
  const representativeExam = currentExams[0];

  // Detection for potentially mismatched dates
  const mismatchedConcurrentExams = useMemo(() => {
    if (!selectedSlotKey || !representativeExam) return [];
    
    // Find all exams that share the same time but have different dates
    return examSchedule.filter(e => 
      e.time === representativeExam.time && 
      e.date !== representativeExam.date &&
      !currentExams.some(ce => ce.id === e.id)
    );
  }, [selectedSlotKey, representativeExam, examSchedule, currentExams]);

  const rollNumberRanges = useMemo(() => {
    if (!selectedClassroom || !seatPlan) return {};

    const studentsInRoom = seatPlan.assignments
      .filter(a => a && a.classroom?.id === selectedClassroom.id && a.student)
      .map(a => a.student!);

    return studentsInRoom.reduce((acc, student) => {
      const subjectCode = student?.exam?.subjectCode || student?.course || 'General';
      if (!acc[subjectCode]) {
        acc[subjectCode] = { min: student.rollNo, max: student.rollNo, count: 0 };
      }
      if (student.rollNo > acc[subjectCode].max) acc[subjectCode].max = student.rollNo;
      if (student.rollNo < acc[subjectCode].min) acc[subjectCode].min = student.rollNo;
      acc[subjectCode].count += 1;
      return acc;
    }, {} as Record<string, { min: string, max: string, count: number }>);
  }, [selectedClassroom, seatPlan]);

  const currentBenchViolations = useMemo(() => {
    if (!seatPlan || !selectedClassroom) return 0;
    return countSeatPlanViolations(seatPlan, [selectedClassroom]);
  }, [seatPlan, selectedClassroom]);


  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Loading Seating Plans...</p>
        </div>
      </div>
    );
  }

  const handleSlotChange = (slotKey: string) => {
    setSelectedSlotKey(slotKey);
    setShowExclusionReport(false); // Hide report on slot change
  };

  const handleExportSessionRoster = async () => {
    if (!fullAllotment) return;
    try {
      await generateSessionWiseInvigilationRoster(fullAllotment, classrooms);
      toast({
        title: "Session Roster Generated",
        description: "High-fidelity duty chart downloaded successfully."
      });
    } catch (error) {
      console.error("Export failed", error);
      toast({ variant: "destructive", title: "Export Failed", description: "Could not generate session roster." });
    }
  };

  const handleExportMasterReport = () => {
    if (!fullAllotment) return;
    try {
      generateMasterReport(fullAllotment, students, classrooms, invigilators);
      toast({
        title: "Master Report Generated",
        description: "Official seating plan master report downloaded successfully."
      });
    } catch (error) {
      console.error("Master report export failed", error);
      toast({ variant: "destructive", title: "Export Failed", description: "Could not generate master report." });
    }
  };

  const handleExportDutyChart = async () => {
    if (!fullAllotment) return;
    try {
      await generateDetailedInvigilatorDutyChart(fullAllotment, invigilators);
      toast({
        title: "Duty Chart Generated",
        description: "Official faculty duty chart downloaded successfully."
      });
    } catch (error) {
      console.error("Duty chart export failed", error);
      toast({ variant: "destructive", title: "Export Failed", description: "Could not generate duty chart." });
    }
  };

  const handleOpenGenerationDialog = () => {
    if (!selectedSlotKey) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select an exam slot before generating.',
      });
      return;
    }

    if (students.length === 0 || classrooms.length === 0 || invigilators.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Missing Data',
        description: 'Please populate student, classroom, and invigilator data before generating a plan.',
      });
      return;
    }

    setShowFacultyDialog(true);
  };

  const handleConfirmGeneration = (rules: FacultyStudentRule[], reserveCount: number) => {
    setShowFacultyDialog(false);
    setFacultyStudentRules(rules);
    setReservedCount(reserveCount);
    executeGeneration(rules, reserveCount);
  };

  const executeGeneration = (rules: FacultyStudentRule[], reserveCount: number) => {
    setIsGenerating(true);
    setTimeout(() => {
      const selectedExams = examSlotsByTime[selectedSlotKey!];
      if (!selectedExams || selectedExams.length === 0) {
        setIsGenerating(false);
        return;
      }

      autoRepairedSlotsRef.current.clear();
      const cleanStudents = students.map(s => ({ ...s, seatAssignment: null }));
      const { plan, updatedStudents } = generateSeatPlan(cleanStudents, classrooms, selectedExams, blockPriority);
      setSeatPlan(plan);
      const firstClassroomId = plan.assignments.find(a => a && a.classroom?.id)?.classroom?.id ?? null;
      setSelectedClassroomId(firstClassroomId);

      const classroomsInUse = [...new Map(
        plan.assignments
          .filter(a => a && a.student && a.classroom?.id)
          .map(item => [item.classroom.id, item.classroom])
      ).values()];

      const sessionExamIds = new Set(selectedExams.map(e => e.id));
      const sessionTargetPool = invigilators.filter(inv => {
        if (!inv.isAvailable) return false;
        return !inv.unavailableSlots.some(s => s.slotId === selectedSlotKey || sessionExamIds.has(s.slotId));
      });

      const { assignments: newInvigilatorAssignments } = assignInvigilators(
        sessionTargetPool,
        plan,
        selectedExams[0],
        reserveCount,
        rules
      );
      setInvigilatorAssignments(newInvigilatorAssignments);

      // Create update for global context so dashboard reports work too
      const newAllotmentEntry = {
        seatPlan: plan,
        invigilatorAssignments: newInvigilatorAssignments
      };

      // Update local state
      setFullAllotment((prev: any) => ({
        ...(prev || {}),
        [selectedSlotKey!]: newAllotmentEntry
      }));

      setIsGenerating(false);
      toast({
        title: 'Generation Complete',
        description: `Seat plan generated for ${selectedExams.length} concurrent exam(s) with strict conflict-free seating.`,
      });
    }, 600);
  };

  const handleRegenerateCurrentSession = () => {
    if (!selectedSlotKey) {
      toast({ variant: 'destructive', title: 'No Session Selected', description: 'Please select an exam session first.' });
      return;
    }
    executeGeneration(facultyStudentRules, reservedCount);
  };

  const handleRegenerateAllSessions = () => {
    const sessionKeys = Object.keys(examSlotsByTime);
    if (sessionKeys.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Sessions Found',
        description: 'Exam schedule has no active sessions to generate.'
      });
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      try {
        let studentMasterList: Student[] = JSON.parse(JSON.stringify(students));
        let invigilatorMasterList: Invigilator[] = JSON.parse(JSON.stringify(invigilators));
        const classroomMasterList = JSON.parse(JSON.stringify(classrooms));

        const generatedPlans: Record<string, { seatPlan: SeatPlan, invigilatorAssignments: InvigilatorAssignment[] }> = {};
        const sortedSessionKeys = sessionKeys.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        for (const key of sortedSessionKeys) {
          const concurrentExams = examSlotsByTime[key];
          if (!concurrentExams || concurrentExams.length === 0) continue;

          const cleanStudents = studentMasterList.map(s => ({ ...s, seatAssignment: null }));
          const { plan, updatedStudents } = generateSeatPlan(cleanStudents, classroomMasterList, concurrentExams, blockPriority);
          studentMasterList = updatedStudents;

          const sessionExamIds = new Set(concurrentExams.map(e => e.id));
          const sessionTargetPool = invigilatorMasterList.filter(inv => {
            if (!inv.isAvailable) return false;
            return !inv.unavailableSlots.some(s => s.slotId === key || sessionExamIds.has(s.slotId));
          });

          const { assignments: invAsg, updatedInvigilators } = assignInvigilators(
            sessionTargetPool,
            plan,
            concurrentExams[0],
            reservedCount,
            facultyStudentRules
          );
          invigilatorMasterList = updatedInvigilators;
          generatedPlans[key] = { seatPlan: plan, invigilatorAssignments: invAsg };
        }

        autoRepairedSlotsRef.current.clear();
        setFullAllotment(generatedPlans);
        if (selectedSlotKey && generatedPlans[selectedSlotKey]) {
          setSeatPlan(generatedPlans[selectedSlotKey].seatPlan);
          setInvigilatorAssignments(generatedPlans[selectedSlotKey].invigilatorAssignments);
          const firstClassroomId = generatedPlans[selectedSlotKey].seatPlan.assignments.find(a => a && a.classroom?.id)?.classroom?.id ?? null;
          setSelectedClassroomId(firstClassroomId);
        }

        toast({
          title: "All Sessions Regenerated",
          description: `Strict conflict-free seating applied across ${sortedSessionKeys.length} session(s).`,
        });
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Generation Failed', description: err.message });
      } finally {
        setIsGenerating(false);
      }
    }, 400);
  };

  const handlePrint = () => {
    window.print();
  }

  const handleEmergencySwap = (invigilatorId: string) => {
    if (!selectedSlotKey || !representativeExam || !seatPlan) return;

    const concurrentExams = examSlotsByTime[selectedSlotKey] || [];
    const sessionExamIds = concurrentExams.map(e => e.id);

    // 1. Create the NEW updated master list locally first
    const updatedMasterInvigilators = invigilators.map(inv => {
      if (inv.id === invigilatorId) {
        const newUnavailability = sessionExamIds.map(id => ({ slotId: id, reason: 'Emergency Absence' }));
        return {
          ...inv,
          unavailableSlots: [...inv.unavailableSlots, ...newUnavailability]
        };
      }
      return inv;
    });

    // 2. Filter pool based on this NEW local list (Synchronous)
    const sessionTargetPool = updatedMasterInvigilators.filter(inv => {
      if (!inv.isAvailable) return false;
      return !inv.unavailableSlots.some(s => s.slotId === selectedSlotKey || sessionExamIds.includes(s.slotId));
    });

    const roomsInUse = [...new Map(seatPlan.assignments.filter(a => a && a.student && a.classroom?.id).map(item => [item.classroom.id, item.classroom])).values()];

    // 3. Check for existing reserved staff in this slot who can fill the gap
    let newInvAsg: InvigilatorAssignment[] = [];
    const currentAssignments = fullAllotment && fullAllotment[selectedSlotKey] ? fullAllotment[selectedSlotKey].invigilatorAssignments : [];
    const availableReserved = currentAssignments.find(asg => asg.isReserved && !asg.classroom);

    if (availableReserved) {
      // Use the reserved person
      newInvAsg = currentAssignments.map(asg => {
        if (asg.invigilator.id === invigilatorId) {
          // Replace absent person with the reserved one
          return { ...asg, invigilator: availableReserved.invigilator, isReserved: false };
        }
        if (asg.invigilator.id === availableReserved.invigilator.id) {
          // Remove the now-assigned reserved person from the standby list
          return null;
        }
        return asg;
      }).filter((asg): asg is InvigilatorAssignment => asg !== null);

      toast({
        title: 'Reserved Staff Deployed',
        description: `${availableReserved.invigilator.name} has been moved from Reserved to active duty.`,
      });
    } else {
      // No reserved staff available, generate NEW assignments for the whole slot (fallback)
      const res = assignInvigilators(sessionTargetPool, seatPlan, representativeExam, reservedCount, facultyStudentRules);
      newInvAsg = res.assignments;
    }

    if (newInvAsg.length === 0) {
      toast({
        variant: "destructive",
        title: "No Replacement Found",
        description: "There are no available staff members to fill this gap. Please check the registry.",
      });
      return;
    }

    // 4. Atomic global update
    setInvigilators(updatedMasterInvigilators);
    setInvigilatorAssignments(newInvAsg);

    if (fullAllotment && fullAllotment[selectedSlotKey]) {
      setFullAllotment({
        ...fullAllotment,
        [selectedSlotKey]: {
          ...fullAllotment[selectedSlotKey],
          invigilatorAssignments: newInvAsg
        }
      });
    }

    toast({
      title: 'Staff Replaced',
      description: 'The absentee has been removed and a replacement has been assigned.',
    });
  };

  const handleDownloadPDF = () => {
    // Native Browser Printing is used for PDF export to ensure 100% reliability 
    // and perfect rendering of colors and grids.
    window.print();
  };

  const handleDownloadExcel = async () => {
    if (!selectedClassroom || !seatPlan || !representativeExam) return;

    try {
      // For Excel, we now want to pass the full assignments for that room 
      // so the generator can build a visual grid.
      const roomAssignments = seatPlan.assignments.filter(a => a && a.classroom?.id === selectedClassroom.id);

      if (roomAssignments.filter(a => a.student).length === 0) {
        toast({
          title: "No Data",
          description: "No students allotted to this room.",
          variant: "default"
        });
        return;
      }

      await generateRoomSeatPlanExcel(selectedClassroom, representativeExam, roomAssignments);

      toast({
        title: "Export Successful",
        description: "Seat plan Excel grid downloaded successfully."
      });
    } catch (error) {
      console.error("Excel Export failed", error);
      toast({
        title: "Excel Export Failed",
        description: "There was an error generating the Excel file. Please check the console.",
        variant: "destructive"
      });
    }
  };



  return (
    <>
      <SidebarProvider>
        <div className="flex min-h-screen">
          <MainSidebar />
          <SidebarInset>
            <div className="flex flex-col h-full no-print">
              <MainHeader />
              <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
                {/* Allotment Mode Selector Header */}
                <div className="bg-card border rounded-2xl p-4 md:p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                          Examination Allotment Hub
                        </h1>
                        <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider text-primary border-primary/30">
                          {allotmentMode === 'shift-duty' ? 'Kind 1 Active' : 'Kind 2 Active'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Choose between Faculty Shift Duty Allotment (Kind 1) and Full Examination & Seating Allotment (Kind 2).
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsChoiceModalOpen(true)}
                        className="h-9 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                      >
                        <Sparkles className="size-3.5" />
                        <span>Choose Allotment Type</span>
                      </Button>
                    </div>
                  </div>

                  {/* Segmented Mode Switcher */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1.5 rounded-xl bg-muted/50 border">
                    <button
                      type="button"
                      onClick={() => {
                        setAllotmentMode('shift-duty');
                        if (typeof window !== 'undefined') {
                          window.history.replaceState(null, '', '/allotment?mode=shift-duty');
                        }
                      }}
                      className={`flex items-center justify-center sm:justify-start gap-2.5 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                        allotmentMode === 'shift-duty'
                          ? 'bg-background text-emerald-700 dark:text-emerald-300 shadow-xs border border-emerald-500/30'
                          : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                      }`}
                    >
                      <div className={`p-1.5 rounded-md ${allotmentMode === 'shift-duty' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                        <CalendarCheck2 className="size-4" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>Kind 1: Faculty Shift Duty Allotment</span>
                          {allotmentMode === 'shift-duty' && <Badge className="h-4 px-1 text-[9px] bg-emerald-600">Active</Badge>}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-normal">Rooms & teachers per shift → Official Duty Chart (.xlsx)</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAllotmentMode('full');
                        if (typeof window !== 'undefined') {
                          window.history.replaceState(null, '', '/allotment?mode=full');
                        }
                      }}
                      className={`flex items-center justify-center sm:justify-start gap-2.5 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                        allotmentMode === 'full'
                          ? 'bg-background text-indigo-700 dark:text-indigo-300 shadow-xs border border-indigo-500/30'
                          : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                      }`}
                    >
                      <div className={`p-1.5 rounded-md ${allotmentMode === 'full' ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700' : 'bg-muted text-muted-foreground'}`}>
                        <Armchair className="size-4" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>Kind 2: Full Seating & Room Allotment</span>
                          {allotmentMode === 'full' && <Badge className="h-4 px-1 text-[9px] bg-indigo-600">Active</Badge>}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-normal">Exam Schedule + 24 Rules → Desk Grids & Invigilation</div>
                      </div>
                    </button>
                  </div>
                </div>

                {allotmentMode === 'shift-duty' ? (
                  <FacultyShiftAllotmentView embedded={true} />
                ) : (
                  <div className="space-y-6">
                    {/* Pre-Allotment Settings Bar for Kind 2 */}
                    <div className="p-3.5 rounded-xl border bg-card/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-muted-foreground font-medium">Pre-Allotment Configuration:</span>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsPriorityDialogOpen(true)}
                          className="h-7 text-[11px] gap-1 px-2 font-mono"
                        >
                          <Building className="size-3 text-primary" />
                          <span>Priority: {blockPriority[0] || 'Capacity-First'}</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowFacultyDialog(true)}
                          className="h-7 text-[11px] gap-1 px-2 font-mono"
                        >
                          <UserCheck className="size-3 text-blue-600" />
                          <span>1:{facultyStudentRules[0]?.maxStudents || 24} Staff Ratio</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowFacultyDialog(true)}
                          className="h-7 text-[11px] gap-1 px-2 font-mono"
                        >
                          <ShieldCheck className="size-3 text-amber-600" />
                          <span>{reservedCount} Standby Reserves</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowRulesDialog(true)}
                          className="h-7 text-[11px] gap-1 px-2 font-mono text-purple-700 dark:text-purple-300"
                        >
                          <ShieldCheck className="size-3 text-purple-600" />
                          <span>24 Seating Rules</span>
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link href="/schedule">
                          <Button variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground hover:text-foreground gap-1">
                            <CalendarDays className="size-3" />
                            <span>{examSchedule.length} Exams in Schedule</span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  <Card className="shadow-xs">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div>
                          <CardTitle className="text-xl">Seat Plan Generation & Allotment</CardTitle>
                          <CardDescription>
                            {fullAllotment
                              ? `Allotment active across ${Object.keys(fullAllotment).length} sessions. Select a session below to inspect room grids.`
                              : 'Select an exam session to generate conflict-free seating and invigilator duties.'}
                          </CardDescription>
                        </div>
                        {slotOptions.length > 0 && (
                          <Badge variant="outline" className="w-fit font-mono text-xs">
                            {slotOptions.length} Sessions Available
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-1">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        {/* Session Selector */}
                        <div className="w-full lg:max-w-md flex-1">
                          <Select onValueChange={handleSlotChange} value={selectedSlotKey}>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Select an exam session..." />
                            </SelectTrigger>
                            <SelectContent>
                              {slotOptions.map(slot => (
                                <SelectItem key={slot.id} value={slot.id}>{slot.label}</SelectItem>
                              ))}
                              {slotOptions.length === 0 && <div className="p-4 text-center text-sm text-muted-foreground">No sessions available.</div>}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Streamlined Action Bar */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* 1. Rules & Configuration */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                className="h-10 text-xs font-semibold gap-1.5 border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                              >
                                <ShieldCheck className="h-4 w-4 text-purple-600" />
                                <span>Rules & Config</span>
                                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Allotment Governance
                              </DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setShowRulesDialog(true)}>
                                <ShieldCheck className="mr-2 h-4 w-4 text-purple-600" />
                                <div className="flex flex-col">
                                  <span className="font-medium text-xs">24 Seating Rules (Active)</span>
                                  <span className="text-[10px] text-muted-foreground">Conflict-free layout & spacing</span>
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setShowFacultyDialog(true)}>
                                <UserCheck className="mr-2 h-4 w-4 text-blue-600" />
                                <div className="flex flex-col">
                                  <span className="font-medium text-xs">Faculty Ratio Rules</span>
                                  <span className="text-[10px] text-muted-foreground">Ratios, thresholds & reserves</span>
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setShowExclusionReport(!showExclusionReport)}>
                                {showExclusionReport ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                                <span>{showExclusionReport ? 'Hide Exclusions Panel' : 'View Exclusions Panel'}</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* 2. Unified Export Reports */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                className="h-10 font-medium text-xs gap-1.5"
                                disabled={!fullAllotment}
                              >
                                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                <span>Export Reports</span>
                                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                University Reports
                              </DropdownMenuLabel>
                              <DropdownMenuItem onClick={handleExportDutyChart}>
                                <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                                <div className="flex flex-col">
                                  <span className="font-medium text-xs">Faculty Duty Chart</span>
                                  <span className="text-[10px] text-muted-foreground">Official invigilation table (.xlsx)</span>
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={handleExportMasterReport}>
                                <FileText className="mr-2 h-4 w-4 text-blue-600" />
                                <div className="flex flex-col">
                                  <span className="font-medium text-xs">Master Report</span>
                                  <span className="text-[10px] text-muted-foreground">Consolidated university overview (.xlsx)</span>
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={handleExportSessionRoster}>
                                <FileDown className="mr-2 h-4 w-4 text-purple-600" />
                                <div className="flex flex-col">
                                  <span className="font-medium text-xs">Session Roster</span>
                                  <span className="text-[10px] text-muted-foreground">Shift-wise invigilation roster (.csv)</span>
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Room Seating
                              </DropdownMenuLabel>
                              <DropdownMenuItem onClick={handleDownloadExcel} disabled={!selectedClassroom}>
                                <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-500" />
                                <span>Room Seating Grid (.xlsx)</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={handlePrint} disabled={!selectedClassroom}>
                                <Printer className="mr-2 h-4 w-4 text-slate-600" />
                                <span>Print Room Seating (PDF)</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* 3. Primary Generation Call-To-Action with Split Options */}
                          <div className="inline-flex rounded-md shadow-xs">
                            <Button
                              onClick={handleRegenerateAllSessions}
                              disabled={isGenerating || Object.keys(examSlotsByTime).length === 0}
                              className="h-10 font-semibold gap-1.5 rounded-r-none bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                            >
                              {isGenerating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                              <span>⚡ Generate Allotment</span>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  disabled={isGenerating || Object.keys(examSlotsByTime).length === 0}
                                  className="h-10 px-2 rounded-l-none border-l border-white/20 bg-indigo-600 hover:bg-indigo-700 text-white"
                                  title="Allotment Options"
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-64">
                                <DropdownMenuItem onClick={handleRegenerateAllSessions}>
                                  <Sparkles className="mr-2 h-4 w-4 text-purple-600" />
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-xs">Generate All Sessions (Strict)</span>
                                    <span className="text-[10px] text-muted-foreground">Applies 24 rules across all dates</span>
                                  </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleRegenerateCurrentSession} disabled={!selectedSlotKey}>
                                  <RotateCcw className="mr-2 h-4 w-4 text-indigo-600" />
                                  <div className="flex flex-col">
                                    <span className="font-medium text-xs">Generate Current Session Only</span>
                                    <span className="text-[10px] text-muted-foreground">Re-run algorithm for active slot</span>
                                  </div>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setShowFacultyDialog(true)}>
                                  <UserCheck className="mr-2 h-4 w-4 text-blue-600" />
                                  <div className="flex flex-col">
                                    <span className="font-medium text-xs">Configure Ratio Rules...</span>
                                    <span className="text-[10px] text-muted-foreground">Set custom faculty-to-student ratios</span>
                                  </div>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {mismatchedConcurrentExams.length > 0 && !seatPlan && (
                    <Card className="border-amber-200 bg-amber-50">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
                          <Info className="w-4 h-4" />
                          Potential Concurrent Exams Detected
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 text-xs text-amber-700">
                        <p>The following exams share the same time (<strong>{representativeExam?.time}</strong>) but have different dates in the schedule. If you intended to mix these courses in the same rooms, please ensure their dates match in the Schedule tab.</p>
                        <ul className="mt-2 list-disc list-inside space-y-1">
                          {mismatchedConcurrentExams.map(e => (
                            <li key={e.id}>
                              {e.subjectCode} ({e.course}) on <strong>{e.date}</strong>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {showExclusionReport && excludedData && <ExclusionReport data={excludedData} />}

                  {seatPlan && (
                    <Card>
                      <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <CardTitle>Allotment Viewer</CardTitle>
                            <CardDescription>
                              Viewing plan for session: {representativeExam?.date} @ {representativeExam?.time}
                            </CardDescription>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-0">
                            <Select onValueChange={setSelectedClassroomId} value={selectedClassroomId || ''}>
                              <SelectTrigger className="w-full sm:w-[260px] h-9">
                                <SelectValue placeholder="Select a classroom to view" />
                              </SelectTrigger>
                              <SelectContent>
                                {classroomsInPlan.map(c => (
                                  <SelectItem key={c.id} value={c.id}>{c.roomNo} ({c.building})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={handlePrint}
                              variant="outline"
                              size="sm"
                              disabled={!selectedClassroom}
                              className="h-9 gap-1.5"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              <span>Print Plan</span>
                            </Button>
                            <Button
                              onClick={handleDownloadExcel}
                              variant="outline"
                              size="sm"
                              disabled={!selectedClassroom}
                              className="h-9 gap-1.5"
                            >
                              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Excel Grid</span>
                            </Button>
                            <Button
                              onClick={handleRegenerateCurrentSession}
                              variant="ghost"
                              size="icon"
                              disabled={isGenerating || !selectedSlotKey}
                              title="Regenerate this session"
                              className="h-9 w-9 text-muted-foreground hover:text-foreground"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {selectedClassroom && (
                          <div key={selectedClassroom.id}>
                            <div className="flex justify-center mb-3">
                              {currentBenchViolations === 0 ? (
                                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold shadow-xs">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>Allotment Rules Compliant: 0 Conflicts (24 Rules Active)</span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold shadow-xs">
                                  <div className="flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                    <span>{currentBenchViolations} seating rule conflict(s) detected in this room.</span>
                                  </div>
                                  <Button size="sm" onClick={handleRegenerateCurrentSession} className="bg-rose-600 hover:bg-rose-700 text-white h-6 px-2 text-[11px]">
                                    Re-Apply Rules
                                  </Button>
                                </div>
                              )}
                            </div>
                            <h3 className="flex items-center gap-2 text-xl font-semibold mb-2 text-center justify-center">
                              <Building className="w-6 h-6" />
                              Seat Plan: {selectedClassroom.roomNo} ({selectedClassroom.building})
                            </h3>
                             <p className="text-center mb-1 text-muted-foreground">Exam(s): {currentExams.map(e => `${e.subjectName}${e.group ? ` (G${e.group})` : ''}`).join(', ')}</p>
                             <p className="text-center mb-2 text-muted-foreground">Date: {representativeExam?.date} | Time: {representativeExam?.time}</p>
                             
                             {invigilatorAssignments?.some(a => a.isReserved && !a.classroom) && (
                               <div className="flex flex-col items-center mb-6 p-3 rounded-lg bg-secondary/20 border border-border/50">
                                 <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Reserved Standby Staff</span>
                                 <div className="flex flex-wrap justify-center gap-2">
                                   {invigilatorAssignments.filter(a => a.isReserved && !a.classroom).map(asg => (
                                     <div key={asg.invigilator.id} className="flex items-center gap-2 px-3 py-1 rounded-full bg-background border shadow-sm">
                                       <div className={`w-2 h-2 rounded-full ${asg.invigilator.gender === 'Female' ? 'bg-pink-400' : 'bg-blue-400'}`} />
                                       <span className="text-xs font-medium">{asg.invigilator.name}</span>
                                       <Badge variant="outline" className="text-[9px] h-4 px-1">{asg.invigilator.department}</Badge>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             )}

                             <div className="text-center mb-4">
                              <div className="flex flex-wrap justify-center gap-3">
                                {invigilatorsForClassroom.map((i, idx) => (
                                  <div key={i.id} className="inline-flex items-center gap-2 p-2 px-4 rounded-xl bg-card border shadow-sm">
                                    <div className={`p-1 rounded-full ${i.gender === 'Female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                                      <UserCheck className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col items-start leading-tight">
                                      <div className="flex items-center gap-1">
                                        <span className="text-sm font-bold">{i.name}</span>
                                        {fullAllotment && selectedSlotKey && fullAllotment[selectedSlotKey] &&
                                          !fullAllotment[selectedSlotKey].invigilatorAssignments.some(asg => asg.invigilator.id === i.id) && (
                                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 h-4 px-1 text-[8px] border-amber-200">
                                              <RotateCcw className="w-2 h-2 mr-0.5" />
                                              Replaced
                                            </Badge>
                                          )}
                                      </div>
                                      <div className="flex gap-1 mt-0.5">
                                        <Badge variant="outline" className="text-[9px] h-3.5 px-1 py-0 uppercase tracking-tighter">
                                          {i.designation.split(' ')[0]}
                                        </Badge>
                                        <Badge variant="secondary" className="text-[9px] h-3.5 px-1 py-0 uppercase">
                                          {i.gender}
                                        </Badge>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 ml-2 text-destructive hover:bg-destructive/10"
                                      onClick={() => handleEmergencySwap(i.id)}
                                      title="Mark Absent & Replace"
                                    >
                                      <UserMinus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <div className="flex flex-col items-center gap-2">
                                  {representativeExam && (
                                    <div className="flex flex-col items-center">
                                      <div className="text-4xl font-bold tracking-tighter">
                                        {String(representativeExam.time.split(':')[0]).padStart(2, '0')}:{String(representativeExam.time.split(':')[1]).padStart(2, '0')}
                                      </div>
                                      <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                                        {parseInt(representativeExam.time.split(':')[0]) < 12 ? 'Morning' : 'Evening'} Session
                                      </div>
                                      <Badge variant="outline" className="mt-2 text-[10px] uppercase">
                                        {representativeExam.duration} Minutes
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Color Logic Lifted for Consistency */}
                              {(() => {
                                const COURSE_PALETTE = [
                                  '#dbeafe', '#dcfce7', '#ffedd5', '#f3e8ff', '#fee2e2',
                                  '#e0f2fe', '#fef9c3', '#fae8ff', '#ccfbf1', '#ffe4e6'
                                ];
                                const courseColors = new Map<string, string>();
                                Object.keys(rollNumberRanges).forEach((subjectCode, idx) => {
                                  courseColors.set(subjectCode, COURSE_PALETTE[idx % COURSE_PALETTE.length]);
                                });

                                return (
                                  <>
                                    {Object.keys(rollNumberRanges).length > 0 && (
                                      <Card className="mb-4 bg-muted/50">
                                        <CardHeader className="p-4 pb-2">
                                          <CardTitle className="text-base flex items-center gap-2"><Info className="w-4 h-4" />Student Summary & Legend</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0 text-sm">
                                          <div className="flex flex-wrap gap-4">
                                            {Object.entries(rollNumberRanges).map(([subjectCode, range]) => {
                                              const color = courseColors.get(subjectCode);
                                              return (
                                                <div key={subjectCode} className="flex items-center gap-2 border p-2 rounded-md bg-white shadow-sm">
                                                  <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: color }}></div>
                                                  <div>
                                                    <div className="font-bold">{subjectCode}</div>
                                                    <div className="text-xs text-muted-foreground">{range.count} students ({range.min}-{range.max})</div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </CardContent>
                                      </Card>
                                    )}
                                    <ClassroomVisualizer
                                      classroom={selectedClassroom}
                                      assignments={seatPlan?.assignments.filter(a => a && a.classroom?.id === selectedClassroom.id) ?? []}
                                      courseColors={courseColors}
                                    />
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                        {!selectedClassroom && (
                          <div className="text-center py-12 text-muted-foreground">
                            <p>Select a classroom to view its seating arrangement.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {(!seatPlan && fullAllotment && Object.keys(fullAllotment).length > 0) && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center py-12 text-muted-foreground">
                          <p>Allotment generated successfully. Select an exam session to view details.</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {examSchedule.length === 0 && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center py-12 text-muted-foreground">
                          <p>No exam data found. Please populate mock data or import a schedule.</p>
                        </div>
                      </CardContent>
                    </Card>
                    )}
                  </div>
                )}
              </main>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
      {selectedClassroom && seatPlan && selectedSlotKey && (
        <div className="printable-area hidden">
          <div className="p-4 border rounded-lg">
            <h3 className="flex items-center gap-2 text-2xl font-bold mb-2 text-center justify-center">
              <Building className="w-8 h-8" />
              Seat Plan: {selectedClassroom.roomNo} ({selectedClassroom.building})
            </h3>
            <p className="text-center text-lg mb-1">Exam(s): {currentExams.map(e => `${e.subjectName}${e.group ? ` (G${e.group})` : ''}`).join(', ')}</p>
            <p className="text-center text-lg mb-2">Date: {representativeExam?.date} | Time: {representativeExam?.time}</p>
            <div className="text-center mb-6">
              <div className="flex flex-wrap justify-center gap-12">
                {invigilatorsForClassroom.map((i, idx) => (
                  <div key={i.id} className="text-md font-medium border-b-2 border-black/10 pb-1 flex items-center gap-2">
                    <span className="font-bold text-lg">{i.name}</span>
                    {fullAllotment && selectedSlotKey && fullAllotment[selectedSlotKey] &&
                      !fullAllotment[selectedSlotKey].invigilatorAssignments.some(asg => asg.invigilator.id === i.id) && (
                        <span className="text-[10px] text-amber-600 font-bold border border-amber-200 bg-amber-50 px-1 rounded">REPLACED</span>
                      )}
                    <span className="ml-3 text-xs uppercase tracking-widest text-muted-foreground italic">
                      {i.designation} • {i.gender}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {(() => {
              const COURSE_PALETTE = [
                '#dbeafe', '#dcfce7', '#ffedd5', '#f3e8ff', '#fee2e2',
                '#e0f2fe', '#fef9c3', '#fae8ff', '#ccfbf1', '#ffe4e6'
              ];
              const printCourseColors = new Map<string, string>();
              Object.keys(rollNumberRanges).forEach((subjectCode, idx) => {
                printCourseColors.set(subjectCode, COURSE_PALETTE[idx % COURSE_PALETTE.length]);
              });

              return (
                <ClassroomVisualizer
                  classroom={selectedClassroom}
                  assignments={seatPlan?.assignments.filter(a => a && a.classroom?.id === selectedClassroom.id) ?? []}
                  courseColors={printCourseColors}
                />
              );
            })()}
          </div>
        </div>
      )}
      <FacultyAllocationDialog
        isOpen={showFacultyDialog}
        onClose={() => setShowFacultyDialog(false)}
        onConfirm={handleConfirmGeneration}
        initialRules={facultyStudentRules}
        initialReserveCount={reservedCount}
        title="Faculty Allocation Rules (Session)"
        description="Configure how many invigilators/faculty to assign per classroom based on student count for this exam session."
      />
      <AllotmentRulesDialog
        open={showRulesDialog}
        onOpenChange={setShowRulesDialog}
      />
      <AllotmentChoiceDialog
        open={isChoiceModalOpen}
        onOpenChange={setIsChoiceModalOpen}
        currentMode={allotmentMode}
        onSelectMode={(mode) => {
          setAllotmentMode(mode);
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', `/allotment?mode=${mode}`);
          }
        }}
      />
      <BlockPriorityDialog
        isOpen={isPriorityDialogOpen}
        onClose={() => setIsPriorityDialogOpen(false)}
        availableBlocks={availableBlocks}
        currentPriority={blockPriority}
        excludedBlocks={excludedBlocks}
        excludedRooms={excludedRooms}
        classrooms={classrooms}
        onSave={handleSavePriority}
      />
    </>
  );
}
