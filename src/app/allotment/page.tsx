'use client';

import { useState } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, Printer, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SeatPlan, InvigilatorAssignment, ExamSlot, Classroom } from '@/lib/types';
import { STUDENTS, CLASSROOMS, INVIGILATORS, EXAM_SCHEDULE } from '@/lib/data';
import { generateSeatPlan, assignInvigilators } from '@/lib/planning';
import { ClassroomVisualizer } from '@/components/classroom-visualizer';

// Group exams by date and time to handle concurrent exams
const examSlotsByTime = EXAM_SCHEDULE.reduce((acc, exam) => {
  const key = `${exam.date} ${exam.time}`;
  if (!acc[key]) {
    acc[key] = [];
  }
  acc[key].push(exam);
  return acc;
}, {} as Record<string, ExamSlot[]>);

const slotOptions = Object.entries(examSlotsByTime).map(([key, exams]) => {
  const representativeExam = exams[0];
  const examNames = exams.map(e => e.subjectCode).join(', ');
  return {
    id: key,
    label: `${representativeExam.date} @ ${representativeExam.time} (${examNames})`,
  };
});

export default function AllotmentPage() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | undefined>(slotOptions[0]?.id);
  const [seatPlan, setSeatPlan] = useState<SeatPlan | null>(null);
  const [invigilatorAssignments, setInvigilatorAssignments] = useState<InvigilatorAssignment[] | null>(null);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);

  const handleGeneration = () => {
    if (!selectedSlotKey) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select an exam slot before generating.',
      });
      return;
    }

    setIsGenerating(true);
    setTimeout(() => {
      const selectedExams = examSlotsByTime[selectedSlotKey];
      if (!selectedExams || selectedExams.length === 0) return;

      const newSeatPlan = generateSeatPlan(STUDENTS, CLASSROOMS, selectedExams);
      setSeatPlan(newSeatPlan);
      setSelectedClassroomId(newSeatPlan.assignments[0]?.classroom.id || null);

      const classroomsInUse = [...new Map(newSeatPlan.assignments.map(item => [item.classroom.id, item.classroom])).values()];
      const newInvigilatorAssignments = assignInvigilators(INVIGILATORS, classroomsInUse, selectedExams[0]);
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

  const representativeExam = seatPlan ? examSlotsByTime[selectedSlotKey!]?.[0] : null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <MainSidebar />
        <SidebarInset>
          <div className="flex flex-col h-full">
            <MainHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 no-print">
              <div className="space-y-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Seat Plan Generation & Allotment</CardTitle>
                    <CardDescription>Select an exam session and generate the seat allotment and invigilator duties.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-full sm:w-auto flex-grow">
                      <Select onValueChange={setSelectedSlotKey} defaultValue={selectedSlotKey}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an exam session..." />
                        </SelectTrigger>
                        <SelectContent>
                          {slotOptions.map(slot => (
                            <SelectItem key={slot.id} value={slot.id}>{slot.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleGeneration} disabled={isGenerating || !selectedSlotKey} className="w-full sm:w-auto">
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
                          <div key={selectedClassroom.id} className="printable-area">
                              <h3 className="flex items-center gap-2 text-xl font-semibold mb-4 text-center justify-center">
                                  <Building className="w-6 h-6" />
                                  Seat Plan: {selectedClassroom.id} ({selectedClassroom.roomNo})
                              </h3>
                               <p className="text-center mb-1 text-muted-foreground">Exam: {examSlotsByTime[selectedSlotKey!].map(e => e.subjectName).join(', ')}</p>
                               <p className="text-center mb-4 text-muted-foreground">Date: {representativeExam?.date} | Time: {representativeExam?.time}</p>
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
              </div>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
