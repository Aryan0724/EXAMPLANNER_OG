
'use client';

import { useState, useEffect, useContext, useMemo } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, Printer, Building, UserCheck, Eye, EyeOff, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SeatPlan, InvigilatorAssignment, ExamSlot, Classroom, Student, Invigilator } from '@/lib/types';
import { generateSeatPlan, assignInvigilators } from '@/lib/planning';
import { ClassroomVisualizer } from '@/components/classroom-visualizer';
import { AllotmentContext } from '@/context/AllotmentContext';
import { DataContext } from '@/context/DataContext';
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
  const { fullAllotment } = useContext(AllotmentContext);
  const { students, classrooms, invigilators, examSchedule } = useContext(DataContext);
  const examSlotsByTime = getExamSlotsByTime(examSchedule);


  const [isGenerating, setIsGenerating] = useState(false);
  const [slotOptions, setSlotOptions] = useState(getSlotOptions(fullAllotment, examSchedule));
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

  useEffect(() => {
    const newSlotOptions = getSlotOptions(fullAllotment, examSchedule);
    setSlotOptions(newSlotOptions);
    if(fullAllotment && newSlotOptions.length > 0) {
      const newSelectedSlotKey = newSlotOptions.find(opt => opt.id === selectedSlotKey) ? selectedSlotKey : newSlotOptions[0].id;
      setSelectedSlotKey(newSelectedSlotKey);
      if(newSelectedSlotKey) updateStateForSlot(newSelectedSlotKey);
    } else if (newSlotOptions.length > 0 && !selectedSlotKey) {
      setSelectedSlotKey(newSlotOptions[0].id);
      updateStateForSlot(newSlotOptions[0].id);
    } else if (newSlotOptions.length === 0) {
      setSelectedSlotKey(undefined);
      setSeatPlan(null);
      setInvigilatorAssignments(null);
      setSelectedClassroomId(null);
      setExcludedData(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullAllotment, examSchedule]);

  useEffect(() => {
     if (selectedSlotKey) {
        updateStateForSlot(selectedSlotKey);
     } else {
        setExcludedData(null);
        setSeatPlan(null);
        setInvigilatorAssignments(null);
     }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlotKey, students, classrooms, invigilators]);

  const updateStateForSlot = (slotKey: string) => {
    calculateExclusions(slotKey);
    if (fullAllotment && fullAllotment[slotKey]) {
      const { seatPlan: newSeatPlan, invigilatorAssignments: newInvigilatorAssignments } = fullAllotment[slotKey];
      setSeatPlan(newSeatPlan);
      setInvigilatorAssignments(newInvigilatorAssignments);
      const firstClassroomId = newSeatPlan.assignments.length > 0 ? [...new Set(newSeatPlan.assignments.map(a => a.classroom.id))][0] : null;
      setSelectedClassroomId(firstClassroomId);
    } else {
       setSeatPlan(null);
       setInvigilatorAssignments(null);
       setSelectedClassroomId(null);
    }
  };

  const calculateExclusions = (slotKey: string) => {
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
  };

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

      const classroomsInUse = [...new Map(plan.assignments.map(item => [item.classroom.id, item.classroom])).values()];
      const { assignments: newInvigilatorAssignments } = assignInvigilators(invigilators, classroomsInUse, selectedExams[0]);
      setInvigilatorAssignments(newInvigilatorAssignments);

      setIsGenerating(false);
      toast({
        title: 'Generation Complete',
        description: `Seat plan generated for ${selectedExams.length} concurrent exam(s).`,
      });
    }, 2000);
  };
  
  const handlePrint = () => {
    window.print();
  }
  
  const classroomsInPlan = seatPlan ? [...new Map(seatPlan.assignments.map(item => [item.classroom.id, item.classroom])).values()] : [];

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
    }, {} as Record<string, {min: string, max: string, count: number}>);
  }, [selectedClassroom, seatPlan]);

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
                      <Button onClick={handleGeneration} disabled={isGenerating || fullAllotment || !selectedSlotKey} className="w-full sm:w-auto">
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
                                <Button onClick={handlePrint} variant="outline" disabled={!selectedClassroom}>
                                  <Printer className="mr-2 h-4 w-4" />
                                  Print Allotment
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
                                  <p className="text-sm font-medium text-muted-foreground inline-flex items-center gap-2">
                                    <UserCheck className="w-4 h-4" /> Invigilator(s): <span className="font-semibold text-foreground">{invigilatorsForClassroom.map(i => i.name).join(', ')}</span>
                                  </p>
                                </div>
                                {Object.keys(rollNumberRanges).length > 0 && (
                                  <Card className="mb-4 bg-muted/50">
                                    <CardHeader className="p-4">
                                      <CardTitle className="text-base flex items-center gap-2"><Info className="w-4 h-4" />Student Summary</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0 text-sm">
                                      {Object.entries(rollNumberRanges).map(([subjectCode, range]) => (
                                        <div key={subjectCode}>
                                          <span className="font-semibold">{subjectCode}:</span> {range.count} student(s) from <span className="font-mono">{range.min}</span> to <span className="font-mono">{range.max}</span>
                                        </div>
                                      ))}
                                    </CardContent>
                                  </Card>
                                )}
                                <ClassroomVisualizer
                                    classroom={selectedClassroom}
                                    assignments={seatPlan?.assignments.filter(a => a.classroom.id === selectedClassroom.id) ?? []}
                                />
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
                    <p className="text-md font-medium inline-flex items-center gap-2">
                        <UserCheck className="w-5 h-5" /> Invigilator(s): <span className="font-semibold">{invigilatorsForClassroom.map(i => i.name).join(', ')}</span>
                    </p>
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
