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
import { FileUp, FileDown, Bot, Loader2, Sparkles, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Student, Classroom, Invigilator, Exam, SeatPlan, InvigilatorAssignment } from '@/lib/types';
import { STUDENTS, CLASSROOMS, INVIGILATORS, EXAM_SCHEDULE, DEPARTMENTS } from '@/lib/data';
import { generateSeatPlan, assignInvigilators } from '@/lib/planning';
import { AiSuggestionCard } from '@/components/ai-suggestion-card';

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
    schedule: Exam[];
  }>({
    students: [],
    classrooms: [],
    invigilators: [],
    schedule: [],
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string | undefined>(EXAM_SCHEDULE[0]?.id);
  const [seatPlan, setSeatPlan] = useState<SeatPlan | null>(null);
  const [invigilatorAssignments, setInvigilatorAssignments] = useState<InvigilatorAssignment[] | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  
  const handleDataLoad = (type: keyof typeof isLoading) => {
    setIsLoading(prev => ({...prev, [type]: true}));
    setTimeout(() => {
        let loadedData;
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
                toastMessage = `Exam schedule with ${EXAM_SCHEDULE.length} exams loaded.`;
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
    if (!selectedExamId || data.students.length === 0 || data.classrooms.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please load student and classroom data, and select an exam before generating.',
      });
      return;
    }
    
    setIsGenerating(true);
    setTimeout(() => {
      const selectedExam = data.schedule.find(e => e.id === selectedExamId);
      if (!selectedExam) return;

      // Generate Seat Plan
      const newSeatPlan = generateSeatPlan(data.students, data.classrooms, selectedExam);
      setSeatPlan(newSeatPlan);
      
      const classroomsInUse = Array.from(new Set(newSeatPlan.assignments.map(a => a.classroom)));

      // Assign Invigilators
      const newInvigilatorAssignments = assignInvigilators(data.invigilators, classroomsInUse, selectedExam);
      setInvigilatorAssignments(newInvigilatorAssignments);

      setIsGenerating(false);
      toast({
        title: 'Generation Complete',
        description: 'Seat plan and invigilator assignments have been generated.',
      });
    }, 2000);
  };
  
  const handleReportDownload = (reportType: string) => {
    toast({
        title: 'Report Generation',
        description: `${reportType} is being generated... (Simulation)`,
    });
  };

  const filteredSeatPlan = seatPlan?.assignments.filter(a => departmentFilter === 'all' || a.student?.department === departmentFilter);
  const filteredInvigilators = invigilatorAssignments?.filter(a => departmentFilter === 'all' || a.classroom.departmentBlock === CLASSROOMS.find(c => c.departmentBlock === departmentFilter)?.departmentBlock)

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
            <CardDescription>Select an exam and generate the seat allotment and invigilator duties.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-auto flex-grow">
              <Select onValueChange={setSelectedExamId} defaultValue={selectedExamId} disabled={data.schedule.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an exam..." />
                </SelectTrigger>
                <SelectContent>
                  {data.schedule.map(exam => (
                    <SelectItem key={exam.id} value={exam.id}>{exam.subject} ({exam.department}) - {exam.date} @ {exam.time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGeneration} disabled={isGenerating || !selectedExamId} className="w-full sm:w-auto">
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
                        Generated plan for: {seatPlan?.exam.subject}
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
              <TabsContent value="seat-plan">
                <div className="rounded-md border mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Classroom</TableHead>
                        <TableHead>Seat No.</TableHead>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSeatPlan?.map((seat, index) => (
                        <TableRow key={index}>
                          <TableCell>{seat.classroom.id}</TableCell>
                          <TableCell>{seat.seatNumber}</TableCell>
                          <TableCell className="font-code">{seat.student?.id ?? '---'}</TableCell>
                          <TableCell>{seat.student?.name ?? '---'}</TableCell>
                          <TableCell>{seat.student?.department ?? '---'}</TableCell>
                          <TableCell>
                            {seat.student?.isDebarred ? <Badge variant="destructive">Debarred</Badge> : seat.student ? <Badge variant="secondary">Allotted</Badge> : <Badge variant="outline">Empty</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Report Generation</CardTitle>
          <CardDescription>Export detailed reports in Excel/CSV format.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="secondary" onClick={() => handleReportDownload('Seat Plan')}>
            <FileDown className="mr-2 h-4 w-4" />
            Seat Plan (Excel)
          </Button>
          <Button variant="secondary" onClick={() => handleReportDownload('Student List')}>
            <FileDown className="mr-2 h-4 w-4" />
            Student List (CSV)
          </Button>
          <Button variant="secondary" onClick={() => handleReportDownload('Invigilator Schedule')}>
            <FileDown className="mr-2 h-4 w-4" />
            Invigilator Duty (Excel)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
