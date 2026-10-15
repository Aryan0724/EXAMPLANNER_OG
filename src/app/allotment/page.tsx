'use client';

import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Sparkles, Loader2, Printer, Building, UserCheck, Eye, EyeOff, Info,
  UserMinus, RotateCcw, FileDown, Building2, LayoutGrid, Download,
  Users, Zap, ChevronRight, ClipboardPaste, Plus, Trash2, Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SeatPlan, InvigilatorAssignment, ExamSlot, Classroom, Student, Invigilator, SessionAllotmentSummary } from '@/lib/types';
import { generateSeatPlan, assignInvigilators, extractSessionRoomSummary, generateFullBatchAllotment, generateStudentsFromBatches } from '@/lib/planning';
import { generateRoomSeatPlanPDF, generateRoomSeatPlanExcel, generateSessionWiseInvigilationRoster, generateMasterReport, generateInvigilatorDutyRoster, generateDetailedInvigilatorDutyChart } from '@/lib/report-generator';
import { ClassroomVisualizer } from '@/components/classroom-visualizer';
import { generateMockStudents, generateMockClassrooms, generateMockInvigilators, generateMockExamSchedule } from '@/lib/data';
import { AllotmentContext } from '@/context/AllotmentContext';
import { DataContext } from '@/context/DataContext';
import { ExclusionReport } from '@/components/exclusion-report';
import { REVISED_NOV_2025_BATCHES } from '@/lib/revisedScheduleNov2025';
import { parsePasteBatches } from '@/lib/parsers';

type FullAllotment = Record<string, { seatPlan: SeatPlan, invigilatorAssignments: InvigilatorAssignment[] }>;

const getExamSlotsByTime = (examSchedule: ExamSlot[]) => {
  return examSchedule.reduce((acc, exam) => {
    const key = `${exam.date} ${exam.time}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(exam);
    return acc;
  }, {} as Record<string, ExamSlot[]>);
};

const getSlotOptions = (allotment: Record<string, any> | null, examSchedule: ExamSlot[]) => {
  const examSlotsByTime = getExamSlotsByTime(examSchedule);
  const source = allotment ? Object.keys(allotment) : Object.keys(examSlotsByTime);
  return source.map(key => {
    const examsInSlot = allotment && allotment[key] ? allotment[key].seatPlan.exam : examSlotsByTime[key];
    const representativeExam = Array.isArray(examsInSlot) ? examsInSlot[0] : examsInSlot;
    if (!representativeExam) {
      return { id: key, label: key };
    }
    const examNames = Array.isArray(examsInSlot)
      ? examsInSlot.map(e => `${e.subjectCode}${e.group ? ` (G${e.group})` : ''}`).join(', ')
      : `${representativeExam.subjectCode}${representativeExam.group ? ` (G${representativeExam.group})` : ''}`;
    return {
      id: key,
      label: `${representativeExam.date} @ ${representativeExam.time} (${examNames})`,
    };
  });
};

export default function AllotmentPage() {
  const { toast } = useToast();
  const { fullAllotment, setFullAllotment } = useContext(AllotmentContext);
  const {
    students, setStudents,
    classrooms,
    invigilators, setInvigilators,
    examSchedule,
    isHydrated,
    reservedCount, setReservedCount,
    blockPriority, excludedBlocks, excludedRooms
  } = useContext(DataContext);

  // ── Two Ways of Allotment Mode ──
  // Mode 1: 'visual-seating' = Detailed desk-by-desk seating plan visualizer (DEFAULT)
  // Mode 2: 'room-summary' = Room & Batch matching and university duty chart
  const [allotmentMode, setAllotmentMode] = useState<'visual-seating' | 'room-summary'>('visual-seating');

  const examSlotsByTime = useMemo(() => getExamSlotsByTime(examSchedule), [examSchedule]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [slotOptions, setSlotOptions] = useState(() => getSlotOptions(fullAllotment, examSchedule));
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | undefined>(slotOptions[0]?.id);

  const [seatPlan, setSeatPlan] = useState<SeatPlan | null>(null);
  const [invigilatorAssignments, setInvigilatorAssignments] = useState<InvigilatorAssignment[] | null>(null);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);

  const [excludedData, setExcludedData] = useState<{
    debarredStudents: Student[];
    ineligibleStudents: (Student & { reason: string; subjectCode: string })[];
    unavailableClassrooms: (Classroom & { reason: string })[];
    unavailableInvigilators: (Invigilator & { reason: string })[];
  } | null>(null);
  const [showExclusionReport, setShowExclusionReport] = useState(false);

  // Quick Batch Counts Adjuster Dialog
  const [isBatchAdjustDialogOpen, setIsBatchAdjustDialogOpen] = useState(false);
  const [editableBatches, setEditableBatches] = useState(() =>
    REVISED_NOV_2025_BATCHES.map(b => ({ ...b }))
  );
  const [batchSearchQuery, setBatchSearchQuery] = useState('');
  const [pasteBatchesText, setPasteBatchesText] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [isReallotting, setIsReallotting] = useState(false);

  // ── Compute Session Summary for Mode 1 ──
  const currentSessionSummary: SessionAllotmentSummary | null = useMemo(() => {
    if (!selectedSlotKey || !fullAllotment || !fullAllotment[selectedSlotKey]) return null;
    const { seatPlan: plan, invigilatorAssignments: asg } = fullAllotment[selectedSlotKey];
    return extractSessionRoomSummary(selectedSlotKey, plan, asg, classrooms);
  }, [selectedSlotKey, fullAllotment, classrooms]);

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
      const concurrentExams = examSlotsByTime[slotKey] || [];
      const sessionExamIds = new Set(concurrentExams.map(e => e.id));

      const hasInvalidAssignments = existingInvAsg.some(asg => {
        const invInMaster = invigilators.find(i => i.id === asg.invigilator.id);
        if (!invInMaster || !invInMaster.isAvailable) return true;
        return invInMaster.unavailableSlots.some(s => s.slotId === slotKey || sessionExamIds.has(s.slotId));
      });

      if (hasInvalidAssignments) {
        const sessionTargetPool = invigilators.filter(inv => {
          if (!inv.isAvailable) return false;
          return !inv.unavailableSlots.some(s => s.slotId === slotKey || sessionExamIds.has(s.slotId));
        });

        const { assignments: repairedInvAsg } = assignInvigilators(sessionTargetPool, newSeatPlan, concurrentExams[0]);

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
        }
      } else {
        setSeatPlan(newSeatPlan);
        setInvigilatorAssignments(existingInvAsg);
      }
      const firstClassroomId = newSeatPlan.assignments.length > 0 ? [...new Set(newSeatPlan.assignments.filter(a => a.classroom).map(a => a.classroom.id))][0] : null;
      setSelectedClassroomId(firstClassroomId);
    } else {
      setSeatPlan(null);
      setInvigilatorAssignments(null);
      setSelectedClassroomId(null);
    }
  }, [fullAllotment, calculateExclusions, invigilators, examSlotsByTime, toast, setFullAllotment]);

  useEffect(() => {
    if (isHydrated) {
      const options = getSlotOptions(fullAllotment, examSchedule);
      setSlotOptions(options);
      if (options.length > 0 && !selectedSlotKey) {
        setSelectedSlotKey(options[0].id);
      }
    }
  }, [isHydrated, fullAllotment, examSchedule, selectedSlotKey]);

  useEffect(() => {
    const newSlotOptions = getSlotOptions(fullAllotment, examSchedule);
    setSlotOptions(newSlotOptions);

    const isCurrentSlotValid = newSlotOptions.some(opt => opt.id === selectedSlotKey);
    if (!isCurrentSlotValid && newSlotOptions.length > 0) {
      setSelectedSlotKey(newSlotOptions[0].id);
    } else if (newSlotOptions.length === 0) {
      setSelectedSlotKey(undefined);
    }
  }, [fullAllotment, examSchedule, selectedSlotKey]);

  useEffect(() => {
    if (selectedSlotKey) {
      updateStateForSlot(selectedSlotKey);
    } else {
      setExcludedData(null);
      setSeatPlan(null);
      setInvigilatorAssignments(null);
      setSelectedClassroomId(null);
    }
  }, [selectedSlotKey, students, classrooms, invigilators, updateStateForSlot]);

  const classroomsInPlan = seatPlan ? [...new Map(seatPlan.assignments.filter(a => a.student && a.classroom).map(item => [item.classroom.id, item.classroom])).values()] : [];
  const selectedClassroom = selectedClassroomId ? classrooms.find(c => c.id === selectedClassroomId) : null;
  const invigilatorsForClassroom = selectedClassroom && invigilatorAssignments
    ? invigilatorAssignments.filter(a => a.classroom?.id === selectedClassroom.id).map(a => a.invigilator)
    : [];

  const currentExams = seatPlan?.exam ? (Array.isArray(seatPlan.exam) ? seatPlan.exam : [seatPlan.exam]) : (examSlotsByTime[selectedSlotKey!] || []);
  const representativeExam = currentExams[0];

  const rollNumberRanges = useMemo(() => {
    if (!selectedClassroom || !seatPlan) return {};
    const studentsInRoom = seatPlan.assignments
      .filter(a => a.classroom?.id === selectedClassroom.id && a.student)
      .map(a => a.student!);

    return studentsInRoom.reduce((acc, student) => {
      const subjectCode = student.exam?.subjectCode || 'General';
      if (!acc[subjectCode]) {
        acc[subjectCode] = { min: student.rollNo, max: student.rollNo, count: 0 };
      }
      if (student.rollNo > acc[subjectCode].max) acc[subjectCode].max = student.rollNo;
      if (student.rollNo < acc[subjectCode].min) acc[subjectCode].min = student.rollNo;
      acc[subjectCode].count += 1;
      return acc;
    }, {} as Record<string, { min: string, max: string, count: number }>);
  }, [selectedClassroom, seatPlan]);

  const courseColors = useMemo(() => {
    const palette = ['#dbeafe', '#dcfce7', '#ffedd5', '#f3e8ff', '#fee2e2', '#e0f2fe', '#fef9c3', '#fae8ff'];
    const map = new Map<string, string>();
    Object.keys(rollNumberRanges).forEach((code, idx) => {
      map.set(code, palette[idx % palette.length]);
    });
    return map;
  }, [rollNumberRanges]);

  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse text-sm">Loading Examination Allotment...</p>
        </div>
      </div>
    );
  }

  const handleSlotChange = (slotKey: string) => {
    setSelectedSlotKey(slotKey);
    setShowExclusionReport(false);
  };

  // ── 1-Click Flood Mock Data & Generate Allotment ──
  const handleQuickFloodAndGenerate = async () => {
    setIsGenerating(true);
    toast({ title: '⚡ Flooding Mock Data...', description: 'Generating students, classrooms, invigilators & schedule.' });
    await new Promise(resolve => setTimeout(resolve, 150));
    try {
      const freshStudents: Student[] = JSON.parse(JSON.stringify(generateMockStudents(200)));
      const freshClassrooms = generateMockClassrooms();
      const freshInvigilators: Invigilator[] = JSON.parse(JSON.stringify(generateMockInvigilators()));
      const freshExams: ExamSlot[] = generateMockExamSchedule();

      setStudents(freshStudents);
      setClassrooms(freshClassrooms);
      setInvigilators(freshInvigilators);
      setExamSchedule(freshExams);

      let studentMasterList: Student[] = JSON.parse(JSON.stringify(freshStudents));
      let invigilatorMasterList: Invigilator[] = JSON.parse(JSON.stringify(freshInvigilators));
      const classroomMasterList = JSON.parse(JSON.stringify(freshClassrooms));

      const examSlotsMap = freshExams.reduce((acc, exam) => {
        const key = `${exam.date} ${exam.time}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(exam);
        return acc;
      }, {} as Record<string, ExamSlot[]>);

      const generatedPlans: Record<string, { seatPlan: SeatPlan, invigilatorAssignments: InvigilatorAssignment[] }> = {};
      const sortedSessionKeys = Object.keys(examSlotsMap).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

      for (const key of sortedSessionKeys) {
        const concurrentExams = examSlotsMap[key];
        if (!concurrentExams || concurrentExams.length === 0) continue;
        const { plan, updatedStudents } = generateSeatPlan(studentMasterList, classroomMasterList, concurrentExams, blockPriority);
        studentMasterList = updatedStudents;
        const { assignments: invAsg, updatedInvigilators } = assignInvigilators(invigilatorMasterList, plan, concurrentExams[0], reservedCount);
        invigilatorMasterList = updatedInvigilators;
        generatedPlans[key] = { seatPlan: plan, invigilatorAssignments: invAsg };
      }

      setStudents(studentMasterList);
      setInvigilators(invigilatorMasterList);
      setFullAllotment(generatedPlans);

      const firstKey = sortedSessionKeys[0];
      setSelectedSlotKey(firstKey);
      if (generatedPlans[firstKey]) {
        setSeatPlan(generatedPlans[firstKey].seatPlan);
        setInvigilatorAssignments(generatedPlans[firstKey].invigilatorAssignments);
        const firstRoom = generatedPlans[firstKey].seatPlan.assignments.find(a => a.classroom)?.classroom?.id;
        if (firstRoom) setSelectedClassroomId(firstRoom);
      }

      toast({
        title: '🎉 Allotment Ready!',
        description: `Full seating and invigilation generated for ${sortedSessionKeys.length} session(s).`,
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Generation Failed', description: e.message });
    } finally {
      setIsGenerating(false);
    }
  };

  // ── University Excel Export Handlers ──
  const handleExportMasterReport = () => {
    if (!fullAllotment) return;
    try {
      generateMasterReport(fullAllotment, students, classrooms, invigilators);
      toast({ title: "Master Report Downloaded", description: "Official room-wise examination chart exported as Excel." });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Export Failed', description: e.message });
    }
  };

  const handleExportDutyRoster = async () => {
    if (!fullAllotment) return;
    try {
      await generateDetailedInvigilatorDutyChart(fullAllotment, invigilators);
      toast({ title: "Official Duty Chart Downloaded", description: "Exported university duty chart with 'No of Duty Required' and Superintendent signature." });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Export Failed', description: e.message });
    }
  };

  const handleExportSessionRoster = async () => {
    if (!fullAllotment) return;
    try {
      await generateSessionWiseInvigilationRoster(fullAllotment, classrooms);
      toast({ title: "Session Roster Downloaded", description: "Shift-wise duty chart downloaded successfully." });
    } catch (error) {
      toast({ variant: "destructive", title: "Export Failed", description: "Could not generate session roster." });
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedClassroom || !seatPlan || !representativeExam) return;
    const roomAssignments = seatPlan.assignments.filter(a => a.classroom?.id === selectedClassroom.id && a.student);
    const mappedStudents = roomAssignments.map(a => ({
      seatNo: String(a.seatNumber),
      rollNo: a.student?.rollNo || '',
      name: a.student?.name || '',
      course: a.student?.course || '',
      subjectCode: a.student?.exam?.subjectCode || ''
    }));
    const roomInvigilators = (invigilatorAssignments || [])
      .filter(a => a.classroom?.id === selectedClassroom.id && !a.isReserved)
      .map(a => a.invigilator);
    await generateRoomSeatPlanPDF(
      selectedClassroom,
      { date: representativeExam.date, time: representativeExam.time, subjects: representativeExam.subjectName },
      mappedStudents,
      roomInvigilators
    );
  };

  const handleDownloadExcel = async () => {
    if (!selectedClassroom || !seatPlan || !representativeExam) return;
    const roomAssignments = seatPlan.assignments.filter(a => a.classroom?.id === selectedClassroom.id && a.student);
    await generateRoomSeatPlanExcel(selectedClassroom, representativeExam, roomAssignments);
  };

  const handlePrint = () => {
    window.print();
  };

  // ── Switch to Mode 2 focused on a specific classroom ──
  const handleViewRoomLayout = (classroomId: string) => {
    setSelectedClassroomId(classroomId);
    setAllotmentMode('visual-seating');
  };

  // ── Re-allot with custom batch counts ──
  const handleExecuteBatchReallotment = async () => {
    setIsReallotting(true);
    toast({ title: 'Re-matching Classrooms...', description: 'Applying new student numbers and updating all session charts.' });

    await new Promise(r => setTimeout(r, 150));
    try {
      const result = generateFullBatchAllotment(
        editableBatches,
        classrooms,
        invigilators,
        examSchedule,
        {
          reservedCount: reservedCount || 2,
          blockPriority,
          excludedBlocks,
          excludedRooms
        }
      );

      setStudents(result.updatedStudents);
      setInvigilators(result.updatedInvigilators);
      setFullAllotment(result.fullAllotment);

      setIsBatchAdjustDialogOpen(false);
      toast({
        title: 'Allotment Updated!',
        description: `Successfully re-allocated classrooms across all sessions with new batch numbers.`
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Re-allotment Failed', description: err.message });
    } finally {
      setIsReallotting(false);
    }
  };

  const handleApplyPastedBatchesInline = () => {
    const parsed = parsePasteBatches(pasteBatchesText);
    if (parsed.length === 0) {
      toast({ variant: 'destructive', title: 'No Batches Found', description: 'Use format: "Course Sem X: Count" or table lines.' });
      return;
    }
    let updated = 0;
    setEditableBatches(prev => {
      const next = [...prev];
      parsed.forEach(pb => {
        const match = next.find(b =>
          b.course.toLowerCase().includes(pb.course.toLowerCase()) &&
          Number(b.semester) === Number(pb.semester)
        );
        if (match) {
          match.count = pb.count;
          updated++;
        }
      });
      return next;
    });
    toast({ title: 'Counts Applied', description: `Updated ${updated} batch student numbers.` });
    setPasteBatchesText('');
    setShowPasteBox(false);
  };

  const filteredEditableBatches = useMemo(() => {
    if (!batchSearchQuery.trim()) return editableBatches;
    const q = batchSearchQuery.toLowerCase();
    return editableBatches.filter(b =>
      b.course.toLowerCase().includes(q) ||
      `sem ${b.semester}`.includes(q)
    );
  }, [editableBatches, batchSearchQuery]);

  return (
    <>
      <SidebarProvider>
        <div className="flex min-h-screen">
          <MainSidebar />
          <SidebarInset>
            <div className="flex flex-col h-full no-print">
              <MainHeader />
              <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">

                {/* ── Top Bar: Mode Switcher + Global Session Controls ── */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-card border rounded-2xl p-4 shadow-sm">
                  {/* Two Ways of Allotment Toggle */}
                  <div className="inline-flex p-1 rounded-xl bg-muted/60 border border-border/40 gap-1">
                    <Button
                      variant={allotmentMode === 'visual-seating' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setAllotmentMode('visual-seating')}
                      className="font-bold text-xs rounded-lg h-9 shadow-none"
                    >
                      <LayoutGrid className="mr-1.5 h-4 w-4" />
                      Desk Seating Plan (Visualizer)
                    </Button>
                    <Button
                      variant={allotmentMode === 'room-summary' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setAllotmentMode('room-summary')}
                      className="font-bold text-xs rounded-lg h-9 shadow-none"
                    >
                      <Building2 className="mr-1.5 h-4 w-4" />
                      Room &amp; Duty Roster (Table)
                    </Button>
                  </div>

                  {/* Actions & Adjust Batch Numbers */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={handleQuickFloodAndGenerate}
                      disabled={isGenerating}
                      className="bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-bold text-xs shadow-sm h-9"
                    >
                      {isGenerating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-1.5 h-3.5 w-3.5" />}
                      Flood Mock Allotment
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsBatchAdjustDialogOpen(true)}
                      className="text-xs font-bold border-primary/30 text-primary hover:bg-primary/5 h-9"
                    >
                      <Users className="mr-1.5 h-3.5 w-3.5" />
                      Adjust Batch Counts
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportMasterReport}
                      disabled={!fullAllotment}
                      className="text-xs font-bold"
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5 text-primary" />
                      Master (Excel)
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportDutyRoster}
                      disabled={!fullAllotment}
                      className="text-xs font-bold"
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5 text-indigo-600" />
                      Duty Chart (Excel)
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportSessionRoster}
                      disabled={!fullAllotment}
                      className="text-xs font-bold"
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                      Session Roster
                    </Button>
                  </div>
                </div>

                {/* ── Session Selection Card ── */}
                <Card className="shadow-sm">
                  <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
                    <div className="w-full md:flex-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1.5">Examination Session:</Label>
                      <Select onValueChange={handleSlotChange} value={selectedSlotKey}>
                        <SelectTrigger className="h-10 text-xs font-bold">
                          <SelectValue placeholder="Select an exam session..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {slotOptions.map(slot => (
                            <SelectItem key={slot.id} value={slot.id} className="text-xs">{slot.label}</SelectItem>
                          ))}
                          {slotOptions.length === 0 && <div className="p-3 text-center text-xs text-muted-foreground">No sessions scheduled.</div>}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div>
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Standby Staff / Shift:</Label>
                        <input
                          type="number"
                          value={reservedCount}
                          onChange={(e) => setReservedCount(parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1.5 bg-muted/40 border border-input rounded-lg text-xs font-bold text-center"
                          min="0"
                          max="20"
                        />
                      </div>

                      <Button variant="ghost" size="sm" onClick={() => setShowExclusionReport(!showExclusionReport)} className="text-xs mt-3">
                        {showExclusionReport ? <EyeOff className="mr-1.5 h-3.5 w-3.5" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />}
                        {showExclusionReport ? 'Hide Exclusions' : 'Exclusions'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {showExclusionReport && excludedData && <ExclusionReport data={excludedData} />}

                {/* ══════════════════════════════════════════════════════════
                    WAY 1: ROOM & BATCH ALLOTMENT (UNIVERSITY ROSTER)
                   ══════════════════════════════════════════════════════════ */}
                {allotmentMode === 'room-summary' && (
                  <div className="space-y-4">
                    {currentSessionSummary ? (
                      <>
                        {/* Session KPI Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="p-3.5 rounded-2xl bg-card border shadow-sm">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Total Students in Shift</span>
                            <p className="text-2xl font-extrabold text-primary mt-0.5">{currentSessionSummary.totalStudents.toLocaleString()}</p>
                          </div>
                          <div className="p-3.5 rounded-2xl bg-card border shadow-sm">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Classrooms Allotted</span>
                            <p className="text-2xl font-extrabold text-foreground mt-0.5">{currentSessionSummary.totalRooms} Rooms</p>
                          </div>
                          <div className="p-3.5 rounded-2xl bg-card border shadow-sm">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Active Faculty on Duty</span>
                            <p className="text-2xl font-extrabold text-emerald-600 mt-0.5">
                              {currentSessionSummary.rooms.reduce((acc, r) => acc + r.invigilators.length, 0)} Faculty
                            </p>
                          </div>
                          <div className="p-3.5 rounded-2xl bg-card border shadow-sm">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Standby / Reserved Staff</span>
                            <p className="text-2xl font-extrabold text-amber-600 mt-0.5">
                              {currentSessionSummary.reservedInvigilators.length} Faculty
                            </p>
                          </div>
                        </div>

                        {/* Room Allotment Roster Table */}
                        <Card className="shadow-sm overflow-hidden">
                          <CardHeader className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div>
                              <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-primary" />
                                Room Allotment &amp; Invigilator Duty Roster
                              </CardTitle>
                              <CardDescription className="text-xs">
                                Session: <strong>{currentSessionSummary.date}</strong> | <strong>{currentSessionSummary.time}</strong> ({currentSessionSummary.shift})
                              </CardDescription>
                            </div>
                            <Button size="sm" variant="outline" onClick={handlePrint} className="text-xs font-bold">
                              <Printer className="mr-1.5 h-3.5 w-3.5" /> Print Room Doors List
                            </Button>
                          </CardHeader>

                          <CardContent className="p-0">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs text-left border-collapse">
                                <thead className="bg-muted/40 text-[10px] uppercase font-bold text-muted-foreground tracking-wider border-b">
                                  <tr>
                                    <th className="p-3 pl-4">Room &amp; Block</th>
                                    <th className="p-3">Capacity</th>
                                    <th className="p-3">Students</th>
                                    <th className="p-3">Occupancy</th>
                                    <th className="p-3">Allotted Batches &amp; Subject Details</th>
                                    <th className="p-3">Invigilator(s) on Duty</th>
                                    <th className="p-3 pr-4 text-right">Desk Seating</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                  {currentSessionSummary.rooms.map((room) => (
                                    <tr key={room.roomId} className="hover:bg-muted/15 transition-colors">
                                      <td className="p-3 pl-4 font-bold text-foreground">
                                        <div className="flex items-center gap-2">
                                          <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                                            <Building className="h-4 w-4" />
                                          </div>
                                          <div>
                                            <span className="text-sm font-extrabold">{room.roomNo}</span>
                                            <span className="block text-[10px] text-muted-foreground font-normal">{room.building}</span>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="p-3 font-mono text-muted-foreground">{room.capacity}</td>
                                      <td className="p-3 font-mono font-bold text-primary">{room.allocatedCount}</td>
                                      <td className="p-3">
                                        <div className="flex items-center gap-1.5">
                                          <div className="w-14 h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                              className={`h-full rounded-full ${
                                                room.occupancyPercent >= 90 ? 'bg-emerald-500' : 'bg-primary'
                                              }`}
                                              style={{ width: `${Math.min(100, room.occupancyPercent)}%` }}
                                            />
                                          </div>
                                          <span className="text-[10px] font-mono text-muted-foreground">{room.occupancyPercent}%</span>
                                        </div>
                                      </td>
                                      <td className="p-3 space-y-1.5">
                                        {room.batches.map((batch, idx) => (
                                          <div key={idx} className="flex items-center gap-1.5 flex-wrap">
                                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 py-0 font-bold bg-primary/5 text-primary border-primary/20">
                                              {batch.subjectCode}
                                            </Badge>
                                            <span className="font-semibold text-foreground">{batch.course} (Sem {batch.semester}):</span>
                                            <span className="font-bold text-primary">[{batch.studentCount} students]</span>
                                            {batch.rollNoRange && (
                                              <span className="text-[10px] text-muted-foreground font-mono">({batch.rollNoRange})</span>
                                            )}
                                          </div>
                                        ))}
                                      </td>
                                      <td className="p-3 space-y-1">
                                        {room.invigilators.length > 0 ? (
                                          room.invigilators.map(inv => (
                                            <div key={inv.id} className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                                              <UserCheck className="h-3 w-3 text-emerald-600 shrink-0" />
                                              <span>{inv.name}</span>
                                              <Badge variant="outline" className="text-[8px] h-3.5 px-1 py-0">{inv.department}</Badge>
                                            </div>
                                          ))
                                        ) : (
                                          <span className="text-[11px] text-muted-foreground italic">Unassigned</span>
                                        )}
                                      </td>
                                      <td className="p-3 pr-4 text-right">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleViewRoomLayout(room.roomId)}
                                          className="text-xs font-bold text-primary hover:bg-primary/10 h-8"
                                        >
                                          View Desks <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Reserved Standby Faculty */}
                        {currentSessionSummary.reservedInvigilators.length > 0 && (
                          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                            <h4 className="text-xs font-bold uppercase text-amber-900 tracking-wider mb-2 flex items-center gap-1.5">
                              <UserCheck className="h-4 w-4 text-amber-600" />
                              Reserved Standby Invigilators for This Session
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {currentSessionSummary.reservedInvigilators.map(inv => (
                                <div key={inv.id} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-amber-300 shadow-sm text-xs">
                                  <span className="font-bold text-amber-950">{inv.name}</span>
                                  <Badge variant="outline" className="text-[9px] h-4 px-1">{inv.department}</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <Card className="text-center py-12">
                        <CardContent>
                          <Building2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                          <p className="text-sm font-bold text-foreground">No Allotment Data for Selected Session</p>
                          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                            Click "Adjust Batch Student Numbers" above or open the Setup Wizard from Dashboard to match classrooms and generate the room duty chart.
                          </p>
                          <Button size="sm" onClick={() => setIsBatchAdjustDialogOpen(true)} className="mt-4 font-bold text-xs">
                            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Allot Classrooms Now
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* ══════════════════════════════════════════════════════════
                    WAY 2: DETAILED SEATING PLAN (VISUALIZER)
                   ══════════════════════════════════════════════════════════ */}
                {allotmentMode === 'visual-seating' && seatPlan && (
                  <Card className="shadow-sm">
                    <CardHeader className="p-4 border-b">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <CardTitle className="text-base font-bold flex items-center gap-2">
                            <LayoutGrid className="h-5 w-5 text-primary" />
                            Desk Seating Layout Visualizer
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Viewing bench-by-bench seat matrix for session: {representativeExam?.date} @ {representativeExam?.time}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Select onValueChange={setSelectedClassroomId} value={selectedClassroomId || ''}>
                            <SelectTrigger className="w-full sm:w-[240px] h-9 text-xs font-bold">
                              <SelectValue placeholder="Select classroom..." />
                            </SelectTrigger>
                            <SelectContent>
                              {classroomsInPlan.map(c => (
                                <SelectItem key={c.id} value={c.id} className="text-xs">{c.roomNo} ({c.building})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button onClick={handleDownloadPDF} variant="outline" size="sm" disabled={!selectedClassroom} className="text-xs">
                            <FileDown className="mr-1.5 h-3.5 w-3.5" /> PDF
                          </Button>
                          <Button onClick={handleDownloadExcel} variant="outline" size="sm" disabled={!selectedClassroom} className="text-xs">
                            <FileDown className="mr-1.5 h-3.5 w-3.5" /> Excel
                          </Button>
                          <Button onClick={handlePrint} variant="outline" size="sm" disabled={!selectedClassroom} className="text-xs">
                            <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-6">
                      {selectedClassroom ? (
                        <div key={selectedClassroom.id} className="space-y-4">
                          <div className="text-center space-y-1">
                            <h3 className="flex items-center gap-2 text-lg font-bold justify-center">
                              <Building className="w-5 h-5 text-primary" />
                              Seat Plan: {selectedClassroom.roomNo} ({selectedClassroom.building})
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              Exam(s): {currentExams.map(e => `${e.subjectName}${e.group ? ` (G${e.group})` : ''}`).join(', ')}
                            </p>
                          </div>

                          {/* Student Summary & Legend */}
                          {Object.keys(rollNumberRanges).length > 0 && (
                            <div className="p-3 bg-muted/40 rounded-xl border flex flex-wrap gap-3">
                              {Object.entries(rollNumberRanges).map(([code, range]) => {
                                const color = courseColors.get(code);
                                return (
                                  <div key={code} className="flex items-center gap-2 p-2 rounded-lg bg-card border shadow-xs text-xs">
                                    <div className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: color }} />
                                    <div>
                                      <span className="font-bold text-foreground">{code}</span>
                                      <span className="text-[10px] text-muted-foreground block">{range.count} students ({range.min} - {range.max})</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Classroom Desk Grid Visualizer */}
                          <ClassroomVisualizer
                            classroom={selectedClassroom}
                            assignments={seatPlan?.assignments.filter(a => a.classroom?.id === selectedClassroom.id) ?? []}
                            courseColors={courseColors}
                          />
                        </div>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground text-xs">
                          Please select a classroom from the dropdown above to view its desk seating grid.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Fallback when in visual mode and no seat plan exists */}
                {allotmentMode === 'visual-seating' && !seatPlan && (
                  <Card className="text-center py-16 shadow-sm border-dashed">
                    <CardContent className="space-y-4">
                      <LayoutGrid className="w-16 h-16 text-primary/40 mx-auto" />
                      <div>
                        <h3 className="text-lg font-bold text-foreground">No Allotment Generated for this Session</h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                          Click below to flood mock data and generate the full desk seating plan across all classrooms, or pick a different session above.
                        </p>
                      </div>
                      <Button
                        onClick={handleQuickFloodAndGenerate}
                        disabled={isGenerating}
                        className="bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-bold text-xs px-6 shadow-md"
                      >
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-1.5 h-4 w-4" />}
                        1-Click Flood Mock Data &amp; Generate Allotment
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </main>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>

      {/* ── Dialog: Quick Batch Numbers Adjuster (Way 1 On-Page Engine) ── */}
      <Dialog open={isBatchAdjustDialogOpen} onOpenChange={setIsBatchAdjustDialogOpen}>
        <DialogContent className="sm:max-w-[850px] max-h-[88vh] overflow-hidden flex flex-col p-0 rounded-3xl border-none shadow-2xl">
          <div className="p-6 bg-gradient-to-r from-primary/10 via-background to-indigo-50/40 border-b">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Adjust Batch Student Numbers &amp; Match Rooms
            </DialogTitle>
            <DialogDescription className="text-xs mt-1">
              Specify how many students are enrolled in each batch (e.g. BTech Sem 1, BTech Sem 3). The algorithm will allocate them to classrooms.
            </DialogDescription>
          </div>

          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter courses (e.g. BTech, CSE, Sem 3)..."
                  value={batchSearchQuery}
                  onChange={(e) => setBatchSearchQuery(e.target.value)}
                  className="pl-8 bg-muted/40 border-none h-9 text-xs rounded-xl"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowPasteBox(!showPasteBox)} className="text-xs font-bold">
                  <ClipboardPaste className="h-3.5 w-3.5 mr-1" /> Paste Counts
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditableBatches(prev => prev.map(b => ({ ...b, count: 60 })))} className="text-xs font-bold">
                  All = 60
                </Button>
              </div>
            </div>

            {showPasteBox && (
              <div className="p-3 border rounded-xl bg-muted/20 space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Paste text (e.g. "BTech Sem 1: 180" or table rows):</Label>
                <textarea
                  className="w-full h-24 rounded-lg border bg-background p-2 text-xs font-mono"
                  placeholder="B.Tech core Sem 1: 180&#10;B.Tech CSE Sem 3: 150"
                  value={pasteBatchesText}
                  onChange={(e) => setPasteBatchesText(e.target.value)}
                />
                <Button size="sm" className="font-bold text-xs w-full" onClick={handleApplyPastedBatchesInline}>
                  Apply to Matching Batches
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
              {filteredEditableBatches.map(b => (
                <div key={b.id} className="p-3 border rounded-xl bg-card flex items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-bold truncate" title={b.course}>{b.course}</p>
                    <Badge variant="outline" className="text-[9px] h-3.5 px-1 font-bold">Sem {b.semester}</Badge>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-muted-foreground">Count:</span>
                    <Input
                      type="number"
                      value={b.count}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setEditableBatches(prev => prev.map(item => item.id === b.id ? { ...item, count: val } : item));
                      }}
                      className="w-20 h-7 text-xs font-bold text-center bg-muted/40 border-none rounded-lg"
                      min="0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t bg-muted/10 flex justify-between items-center px-6">
            <span className="text-xs text-muted-foreground font-medium">
              Total Enrolled: <strong className="text-primary font-bold">{editableBatches.reduce((s, b) => s + (Number(b.count) || 0), 0).toLocaleString()}</strong>
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsBatchAdjustDialogOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteBatchReallotment}
                disabled={isReallotting}
                className="bg-primary font-bold text-xs px-5 shadow-sm"
              >
                {isReallotting ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Matching Rooms...</> : <><Sparkles className="mr-1.5 h-3.5 w-3.5" /> Re-Match &amp; Allot Classrooms</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
