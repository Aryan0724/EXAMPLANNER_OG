"use client";

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileUp, Sparkles, Loader2, Filter, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Student, Classroom, Invigilator, ExamSlot, SeatPlan, InvigilatorAssignment } from '@/lib/types';
import { STUDENTS, CLASSROOMS, INVIGILATORS, EXAM_SCHEDULE, DEPARTMENTS } from '@/lib/data';
import { generateSeatPlan, assignInvigilators } from '@/lib/planning';
import { AiSuggestionCard } from '@/components/ai-suggestion-card';
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
        label: `${representativeExam.date} @ ${representativeExam.time} (${examNames})`
    }
});


export function DashboardClient() {
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState({
    students: false,
    classrooms: false,
    invigilators: false,
    schedule: false,
  });

  const [data, setData] = useState<{
    students: Student[];
    classrooms: Classroom[];
    invigilators: Invigilator[];
    schedule: ExamSlot[];
  }>({
    students: [],
    classrooms: [],
    invigilators: [],
    schedule: [],
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | undefined>(slotOptions[0]?.id);
  const [seatPlan, setSeatPlan] = useState<SeatPlan | null>(null);
  const [invigilatorAssignments, setInvigilatorAssignments] = useState<InvigilatorAssignment[] | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  
  const handleDataLoad = (type: keyof typeof isLoading) => {
    setIsLoading(prev => ({...prev, [type]: true}));
    setTimeout(() => {
        let loadedData: any;
        let toastMessage;
        switch(type) {
            case 'students':
                loadedData = { students: STUDENTS };
                toastMessage = `${STUDENTS.length} student records loaded.`;
                break;
            case 'classrooms':
                loadedData = { classrooms: CLASSROOMS };
                toastMessage = `${CLASSROOMS.length} classroom records loaded.`;
                break;
            case 'invigilators':
                loadedData = { invigilators: INVIGILATORS };
                toastMessage = `${INVIGILATORS.length} invigilator records loaded.`;
                break;
            case 'schedule':
                loadedData = { schedule: EXAM_SCHEDULE };
                toastMessage = `Exam schedule with ${EXAM_SCHEDULE.length} slots loaded.`;
                break;
        }
      setData(prev => ({...prev, ...loadedData}));
      setIsLoading(prev => ({...prev, [type]: false}));
      toast({
        title: 'Data Imported',
        description: toastMessage,
      });
    }, 1000);
  };

  const handleGeneration = () => {
    if (!selectedSlotKey || data.students.length === 0 || data.classrooms.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please load student and classroom data, and select an exam slot before generating.',
      });
      return;
    }
    
    setIsGenerating(true);
    setTimeout(() => {
      const selectedExams = examSlotsByTime[selectedSlotKey];
      if (!selectedExams || selectedExams.length === 0) return;

      const newSeatPlan = generateSeatPlan(data.students, data.classrooms, selectedExams);
      setSeatPlan(newSeatPlan);
      
      const classroomsInUse = [...new Map(newSeatPlan.assignments.map(item => [item.classroom.id, item.classroom])).values()];

      const newInvigilatorAssignments = assignInvigilators(data.invigilators, classroomsInUse, selectedExams[0]);
      setInvigilatorAssignments(newInvigilatorAssignments);

      setIsGenerating(false);
      toast({
        title: 'Generation Complete',
        description: `Seat plan generated for ${selectedExams.length} concurrent exam(s).`,
      });
    }, 2000);
  };
  
  const filteredInvigilators = invigilatorAssignments?.filter(a => departmentFilter === 'all' || a.classroom.departmentBlock === CLASSROOMS.find(c => c.id.startsWith(departmentFilter.substring(0,2)))?.departmentBlock);
  
  const classroomsInPlan = seatPlan ? [...new Map(seatPlan.assignments.map(item => [item.classroom.id, item.classroom])).values()] : [];

  const filteredClassrooms = departmentFilter === 'all' ? classroomsInPlan : classroomsInPlan.filter(c => c.departmentBlock === CLASSROOMS.find(cl => cl.id.startsWith(departmentFilter.substring(0,2)))?.departmentBlock);

  const representativeExam = seatPlan ? examSlotsByTime[selectedSlotKey!]?.[0] : null;


  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Load all necessary data from your source files.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" onClick={() => handleDataLoad('students')} disabled={isLoading.students}>
              {isLoading.students ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
              Students
            </Button>
            <Button variant="outline" onClick={() => handleDataLoad('classrooms')} disabled={isLoading.classrooms}>
              {isLoading.classrooms ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
              Classrooms
            </Button>
            <Button variant="outline" onClick={() => handleDataLoad('invigilators')} disabled={isLoading.invigilators}>
              {isLoading.invigilators ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
              Invigilators
            </Button>
            <Button variant="outline" onClick={() => handleDataLoad('schedule')} disabled={isLoading.schedule}>
              {isLoading.schedule ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
              Schedule
            </Button>
          </CardContent>
        </Card>
        
        <AiSuggestionCard />

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Control Panel & Generation</CardTitle>
            <CardDescription>Select an exam session and generate the seat allotment and invigilator duties.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-auto flex-grow">
              <Select onValueChange={setSelectedSlotKey} defaultValue={selectedSlotKey} disabled={data.schedule.length === 0}>
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
      </div>

      {(seatPlan || invigilatorAssignments) && (
        <Card>
          <CardHeader>
             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <CardTitle>Allotment & Schedule</CardTitle>
                    <CardDescription>
                       Generated plan for session: {representativeExam?.date} @ {representativeExam?.time}
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2 mt-4 sm:mt-0">
                    <Filter className="h-4 w-4 text-muted-foreground"/>
                    <Select onValueChange={setDepartmentFilter} defaultValue="all">
                        <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue placeholder="Filter by Department" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            {DEPARTMENTS.map(dep => (
                                <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="seat-plan">
              <TabsList>
                <TabsTrigger value="seat-plan">Seat Plan</TabsTrigger>
                <TabsTrigger value="invigilator-schedule">Invigilator Schedule</TabsTrigger>
              </TabsList>
              <TabsContent value="seat-plan" className="space-y-4 pt-4">
                 {filteredClassrooms.map(classroom => (
                    <div key={classroom.id}>
                        <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
                            <Building className="w-5 h-5" />
                            {classroom.id} ({classroom.roomNo})
                        </h3>
                        <ClassroomVisualizer
                            classroom={classroom}
                            assignments={seatPlan?.assignments.filter(a => a.classroom.id === classroom.id) ?? []}
                        />
                    </div>
                ))}
              </TabsContent>
              <TabsContent value="invigilator-schedule">
                <div className="rounded-md border mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Classroom</TableHead>
                        <TableHead>Invigilator ID</TableHead>
                        <TableHead>Invigilator Name</TableHead>
                        <TableHead>Department</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvigilators?.map((assignment, index) => (
                        <TableRow key={index}>
                          <TableCell>{assignment.classroom.id}</TableCell>
                          <TableCell className="font-code">{assignment.invigilator.id}</TableCell>
                          <TableCell>{assignment.invigilator.name}</TableCell>
                          <TableCell>{assignment.invigilator.department}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

    </div>
  );
}