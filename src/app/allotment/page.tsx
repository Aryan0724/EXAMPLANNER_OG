
'use client';

import { useState, useEffect, useContext } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, Printer, Building, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SeatPlan, InvigilatorAssignment, ExamSlot, Classroom } from '@/lib/types';
import { generateSeatPlan, assignInvigilators } from '@/lib/planning';
import { ClassroomVisualizer } from '@/components/classroom-visualizer';
import { AllotmentContext } from '@/context/AllotmentContext';
import { DataContext } from '@/context/DataContext';

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
  
  useEffect(() => {
    const newSlotOptions = getSlotOptions(fullAllotment, examSchedule);
    setSlotOptions(newSlotOptions);
    if(fullAllotment && newSlotOptions.length > 0) {
      const newSelectedSlotKey = newSlotOptions.find(opt => opt.id === selectedSlotKey) ? selectedSlotKey : newSlotOptions[0].id;
      setSelectedSlotKey(newSelectedSlotKey);
      if(newSelectedSlotKey) updateStateForSlot(newSelectedSlotKey);
    } else {
      setSelectedSlotKey(undefined);
      setSeatPlan(null);
      setInvigilatorAssignments(null);
      setSelectedClassroomId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullAllotment, examSchedule]);

  useEffect(() => {
    const newSlotOptions = getSlotOptions(fullAllotment, examSchedule);
    setSlotOptions(newSlotOptions);
    if (!selectedSlotKey && newSlotOptions.length > 0) {
        setSelectedSlotKey(newSlotOptions[0].id);
    }
  }, [examSchedule, selectedSlotKey, fullAllotment]);

  const updateStateForSlot = (slotKey: string) => {
    if (fullAllotment && fullAllotment[slotKey]) {
      const { seatPlan: newSeatPlan, invigilatorAssignments: newInvigilatorAssignments } = fullAllotment[slotKey];
      setSeatPlan(newSeatPlan);
      setInvigilatorAssignments(newInvigilatorAssignments);
      // Select the first classroom in the new plan automatically
      const firstClassroomId = newSeatPlan.assignments.length > 0 ? newSeatPlan.assignments[0].classroom.id : null;
      setSelectedClassroomId(firstClassroomId);
    } else {
       setSeatPlan(null);
       setInvigilatorAssignments(null);
       setSelectedClassroomId(null);
    }
  };

  const handleSlotChange = (slotKey: string) => {
      setSelectedSlotKey(slotKey);
      if (fullAllotment) {
          updateStateForSlot(slotKey);
      } else {
        // Clear previous plan if we are not in "full allotment" mode
        setSeatPlan(null);
        setInvigilatorAssignments(null);
        setSelectedClassroomId(null);
      }
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
      setSelectedClassroomId(plan.assignments[0]?.classroom.id || null);

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

  const selectedClassroom = selectedClassroomId ? classroomsInPlan.find(c => c.id === selectedClassroomId) : null;

  const invigilatorsForClassroom = selectedClassroom && invigilatorAssignments
    ? invigilatorAssignments.filter(a => a.classroom.id === selectedClassroom?.id).map(a => a.invigilator)
    : [];

  const currentExams = seatPlan?.exam ? (Array.isArray(seatPlan.exam) ? seatPlan.exam : [seatPlan.exam]) : [];
  const representativeExam = currentExams[0];

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
                      <Button onClick={handleGeneration} disabled={isGenerating || fullAllotment || !selectedSlotKey} className="w-full sm:w-auto">
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Generate Plan
                      </Button>
                    </CardContent>
                  </Card>

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
                                            <SelectItem key={c.id} value={c.id}>{c.id} - {c.roomNo} ({c.building})</SelectItem>
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
                                    Seat Plan: {selectedClassroom.id} ({selectedClassroom.roomNo})
                                </h3>
                                <p className="text-center mb-1 text-muted-foreground">Exam(s): {currentExams.map(e => `${e.subjectName}${e.group ? ` (G${e.group})` : ''}`).join(', ')}</p>
                                <p className="text-center mb-2 text-muted-foreground">Date: {representativeExam?.date} | Time: {representativeExam?.time}</p>
                                <div className="text-center mb-4">
                                  <p className="text-sm font-medium text-muted-foreground inline-flex items-center gap-2">
                                    <UserCheck className="w-4 h-4" /> Invigilator(s): <span className="font-semibold text-foreground">{invigilatorsForClassroom.map(i => i.name).join(', ')}</span>
                                  </p>
                                </div>
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
                    Seat Plan: {selectedClassroom.id} ({selectedClassroom.roomNo})
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
