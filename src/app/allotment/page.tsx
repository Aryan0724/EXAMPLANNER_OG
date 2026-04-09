
'use client';

import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Printer, Building, UserCheck, Eye, EyeOff, Info, UserMinus, RotateCcw, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SeatPlan, InvigilatorAssignment, ExamSlot, Classroom, Student, Invigilator } from '@/lib/types';
import { generateSeatPlan, assignInvigilators } from '@/lib/planning';
import { generateRoomSeatPlanPDF } from '@/lib/report-generator';
import { ClassroomVisualizer } from '@/components/classroom-visualizer';
import { AllotmentContext } from '@/context/AllotmentContext';
import { DataContext } from '@/context/DataContext';
type FullAllotment = Record<string, { seatPlan: SeatPlan, invigilatorAssignments: InvigilatorAssignment[] }>;
import { ExclusionReport } from '@/components/exclusion-report';

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
    const examsInSlot = allotment ? allotment[key].seatPlan.exam : examSlotsByTime[key];
    const representativeExam = Array.isArray(examsInSlot) ? examsInSlot[0] : examsInSlot;
    const examNames = Array.isArray(examsInSlot) ? examsInSlot.map(e => `${e.subjectCode}${e.group ? ` (G${e.group})` : ''}`).join(', ') : `${representativeExam.subjectCode}${representativeExam.group ? ` (G${representativeExam.group})` : ''}`;
    return {
      id: key,
      label: `${representativeExam.date} @ ${representativeExam.time} (${examNames})`,
    };
  });
};


export default function AllotmentPage() {
  const { toast } = useToast();
  const { fullAllotment, setFullAllotment } = useContext(AllotmentContext);
  const { students, classrooms, invigilators, setInvigilators, examSchedule, isHydrated } = useContext(DataContext);

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
        const roomsToStaff = [...new Map(newSeatPlan.assignments.filter(a => a.student).map(item => [item.classroom.id, item.classroom])).values()];
        const sessionTargetPool = invigilators.filter(inv => {
          if (!inv.isAvailable) return false;
          return !inv.unavailableSlots.some(s => s.slotId === slotKey || sessionExamIds.has(s.slotId));
        });

        const { assignments: repairedInvAsg } = assignInvigilators(sessionTargetPool, newSeatPlan, concurrentExams[0]);

        // Only update if we actually got assignments back
        if (repairedInvAsg.length > 0) {
          setSeatPlan(newSeatPlan);
          setInvigilatorAssignments(repairedInvAsg);
          setFullAllotment({
            ...fullAllotment,
            [slotKey]: { seatPlan: newSeatPlan, invigilatorAssignments: repairedInvAsg }
          });
          toast({
            title: "Plan Synchronized",
            description: "Replacement assigned for newly unavailable staff.",
          });
        }
      } else {
        setSeatPlan(newSeatPlan);
        setInvigilatorAssignments(existingInvAsg);
      }
      const firstClassroomId = newSeatPlan.assignments.length > 0 ? [...new Set(newSeatPlan.assignments.map(a => a.classroom.id))][0] : null;
      setSelectedClassroomId(firstClassroomId);
    } else {
      setSeatPlan(null);
      setInvigilatorAssignments(null);
      setSelectedClassroomId(null);
    }
  }, [fullAllotment, calculateExclusions, invigilators, examSlotsByTime, toast, setFullAllotment]);

  // Sync slot options when exam schedule hydrtates
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


  const classroomsInPlan = seatPlan ? [...new Map(seatPlan.assignments.filter(a => a.student).map(item => [item.classroom.id, item.classroom])).values()] : [];

  const selectedClassroom = selectedClassroomId ? classrooms.find(c => c.id === selectedClassroomId) : null;

  const invigilatorsForClassroom = selectedClassroom && invigilatorAssignments
    ? invigilatorAssignments.filter(a => a.classroom.id === selectedClassroom?.id).map(a => a.invigilator)
    : [];

  const currentExams = seatPlan?.exam ? (Array.isArray(seatPlan.exam) ? seatPlan.exam : [seatPlan.exam]) : (examSlotsByTime[selectedSlotKey!] || []);
  const representativeExam = currentExams[0];

  const rollNumberRanges = useMemo(() => {
    if (!selectedClassroom || !seatPlan) return {};

    const studentsInRoom = seatPlan.assignments
      .filter(a => a.classroom.id === selectedClassroom.id && a.student)
      .map(a => a.student!);

    return studentsInRoom.reduce((acc, student) => {
      const subjectCode = student.exam.subjectCode;
      if (!acc[subjectCode]) {
        acc[subjectCode] = { min: student.rollNo, max: student.rollNo, count: 0 };
      }
      if (student.rollNo > acc[subjectCode].max) acc[subjectCode].max = student.rollNo;
      if (student.rollNo < acc[subjectCode].min) acc[subjectCode].min = student.rollNo;
      acc[subjectCode].count += 1;
      return acc;
    }, {} as Record<string, { min: string, max: string, count: number }>);
  }, [selectedClassroom, seatPlan]);


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

  const handleGeneration = () => {
    if (!selectedSlotKey) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select an exam slot before generating.',
      });
      return;
    }

    if (fullAllotment) {
      toast({
        title: 'Already Generated',
        description: 'A full allotment plan has been generated from the Schedule page. Select a slot to view.',
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

    setIsGenerating(true);
    setTimeout(() => {
      const selectedExams = examSlotsByTime[selectedSlotKey!];
      if (!selectedExams || selectedExams.length === 0) return;

      const { plan, updatedStudents } = generateSeatPlan(students, classrooms, selectedExams);
      setSeatPlan(plan);
      const firstClassroomId = plan.assignments.length > 0 ? [...new Set(plan.assignments.map(a => a.classroom.id))][0] : null;
      setSelectedClassroomId(firstClassroomId);

      const classroomsInUse = [...new Map(
        plan.assignments
          .filter(a => a.student)
          .map(item => [item.classroom.id, item.classroom])
      ).values()];

      const sessionExamIds = new Set(selectedExams.map(e => e.id));
      const sessionTargetPool = invigilators.filter(inv => {
        if (!inv.isAvailable) return false;
        return !inv.unavailableSlots.some(s => s.slotId === selectedSlotKey || sessionExamIds.has(s.slotId));
      });

      const { assignments: newInvigilatorAssignments } = assignInvigilators(sessionTargetPool, plan, selectedExams[0]);
      setInvigilatorAssignments(newInvigilatorAssignments);

      // Create update for global context so dashboard reports work too
      const newAllotmentEntry = {
        seatPlan: plan,
        invigilatorAssignments: newInvigilatorAssignments
      };

      // Update local state
      // setFullAllotment is from context
      setFullAllotment((prev: FullAllotment) => ({
        ...prev,
        [selectedSlotKey!]: newAllotmentEntry
      }));

      setIsGenerating(false);
      toast({
        title: 'Generation Complete',
        description: `Seat plan generated for ${selectedExams.length} concurrent exam(s). Global records updated.`,
      });
    }, 2000);
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

    const roomsInUse = [...new Map(seatPlan.assignments.filter(a => a.student).map(item => [item.classroom.id, item.classroom])).values()];

    // 3. Generate NEW assignments
    const { assignments: newInvAsg } = assignInvigilators(sessionTargetPool, seatPlan, representativeExam);

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
    if (!selectedClassroom || !seatPlan || !representativeExam) return;

    const studentsInRoom = seatPlan.assignments
      .filter(a => a.classroom.id === selectedClassroom.id && a.student)
      .map(a => ({
        seatNo: a.seatNumber.toString(),
        rollNo: a.student!.rollNo,
        name: a.student!.name,
        course: a.student!.course,
        subjectCode: a.student!.exam?.subjectCode || '-',
      }));

    if (studentsInRoom.length === 0) {
      toast({
        title: "No Data",
        description: "No students allotted to this room.",
        variant: "default"
      });
      return;
    }

    const examDetails = {
      date: representativeExam.date,
      time: representativeExam.time,
      subjects: currentExams.map(e => e.subjectCode).join(', ')
    };

    generateRoomSeatPlanPDF(selectedClassroom, examDetails, studentsInRoom, invigilatorsForClassroom);

    toast({
      title: "Export Successful",
      description: "Seat plan PDF downloaded successfully."
    });
  };

  const handleDownloadExcel = () => {
    if (!selectedClassroom || !seatPlan) return;

    try {
      import('xlsx').then(XLSX => {
        const studentsInRoom = seatPlan.assignments
          .filter(a => a.classroom.id === selectedClassroom.id && a.student)
          .map(a => ({
            'Seat No': a.seatNumber,
            'Roll No': a.student!.rollNo,
            'Name': a.student!.name,
            'Course': a.student!.course,
            'Department': a.student!.department,
            'Subject Code': a.student!.exam?.subjectCode || '-',
            'Subject Name': a.student!.exam?.subjectName || '-',
          }));

        if (studentsInRoom.length === 0) {
          toast({
            title: "No Data",
            description: "No students allotted to this room.",
            variant: "default"
          });
          return;
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(studentsInRoom);

        // Auto-width
        const colWidths = Object.keys(studentsInRoom[0]).map(key => ({
          wch: Math.max(key.length, ...studentsInRoom.map(row => String((row as any)[key]).length)) + 2
        }));
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, "Seat Plan");
        XLSX.writeFile(wb, `SeatPlan_${selectedClassroom.roomNo}_${representativeExam?.date || 'Export'}.xlsx`);

        toast({
          title: "Export Successful",
          description: "Seat plan downloaded successfully."
        });
      });
    } catch (error) {
      console.error("Export failed", error);
      toast({
        title: "Export Failed",
        description: "Could not generate Excel file.",
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
              <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                <div className="space-y-8">
                  <Card>
                    <CardHeader>
                      <CardTitle>Seat Plan Generation & Allotment</CardTitle>
                      <CardDescription>{fullAllotment ? 'A full allotment has been generated. Select a session to view.' : 'Select an exam session and generate the seat allotment and invigilator duties.'}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-full sm:w-auto flex-grow">
                        <Select onValueChange={handleSlotChange} value={selectedSlotKey}>
                          <SelectTrigger>
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
                      <Button
                        onClick={() => setShowExclusionReport(!showExclusionReport)}
                        variant="outline"
                        disabled={!excludedData}
                      >
                        {showExclusionReport ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                        Exclusion Report
                      </Button>
                      <Button
                        onClick={handleGeneration}
                        disabled={isGenerating || !!(selectedSlotKey && fullAllotment && fullAllotment[selectedSlotKey]) || !selectedSlotKey}
                        className="w-full sm:w-auto"
                      >
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Generate Plan
                      </Button>
                    </CardContent>
                  </Card>

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
                          <div className="flex items-center gap-2 mt-4 sm:mt-0">
                            <Select onValueChange={setSelectedClassroomId} value={selectedClassroomId || ''}>
                              <SelectTrigger className="w-full sm:w-[280px]">
                                <SelectValue placeholder="Select a classroom to view" />
                              </SelectTrigger>
                              <SelectContent>
                                {classroomsInPlan.map(c => (
                                  <SelectItem key={c.id} value={c.id}>{c.roomNo} ({c.building})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button onClick={handleDownloadPDF} variant="outline" disabled={!selectedClassroom} className="hidden sm:flex">
                              <FileDown className="mr-2 h-4 w-4" />
                              PDF
                            </Button>
                            <Button onClick={handleDownloadExcel} variant="outline" disabled={!selectedClassroom} className="hidden sm:flex">
                              <FileDown className="mr-2 h-4 w-4" />
                              Excel
                            </Button>
                            <Button onClick={handlePrint} variant="outline" disabled={!selectedClassroom}>
                              <Printer className="mr-2 h-4 w-4" />
                              Print
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {selectedClassroom && (
                          <div key={selectedClassroom.id}>
                            <h3 className="flex items-center gap-2 text-xl font-semibold mb-2 text-center justify-center">
                              <Building className="w-6 h-6" />
                              Seat Plan: {selectedClassroom.roomNo} ({selectedClassroom.building})
                            </h3>
                            <p className="text-center mb-1 text-muted-foreground">Exam(s): {currentExams.map(e => `${e.subjectName}${e.group ? ` (G${e.group})` : ''}`).join(', ')}</p>
                            <p className="text-center mb-2 text-muted-foreground">Date: {representativeExam?.date} | Time: {representativeExam?.time}</p>
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
                                        {fullAllotment && fullAllotment[selectedSlotKey!] &&
                                          !fullAllotment[selectedSlotKey!].invigilatorAssignments.some(asg => asg.invigilator.id === i.id) && (
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
                                  {currentExams.map((exam, idx) => (
                                    <div key={exam.id} className="flex flex-col items-center">
                                      <div className="text-4xl font-bold tracking-tighter">
                                        {String(exam.time.split(':')[0]).padStart(2, '0')}:{String(exam.time.split(':')[1]).padStart(2, '0')}
                                      </div>
                                      <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                                        {parseInt(exam.time.split(':')[0]) < 12 ? 'Morning' : 'Evening'} Session
                                      </div>
                                      <Badge variant="outline" className="mt-2 text-[10px] uppercase">
                                        {exam.duration} Minutes
                                      </Badge>
                                    </div>
                                  ))}
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
                                      assignments={seatPlan?.assignments.filter(a => a.classroom.id === selectedClassroom.id) ?? []}
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
                    {fullAllotment && fullAllotment[selectedSlotKey!] &&
                      !fullAllotment[selectedSlotKey!].invigilatorAssignments.some(asg => asg.invigilator.id === i.id) && (
                        <span className="text-[10px] text-amber-600 font-bold border border-amber-200 bg-amber-50 px-1 rounded">REPLACED</span>
                      )}
                    <span className="ml-3 text-xs uppercase tracking-widest text-muted-foreground italic">
                      {i.designation} • {i.gender}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <ClassroomVisualizer
              classroom={selectedClassroom}
              assignments={seatPlan?.assignments.filter(a => a.classroom.id === selectedClassroom.id) ?? []}
            />
          </div>
        </div>
      )}
    </>
  );
}
