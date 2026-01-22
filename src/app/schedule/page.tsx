
'use client';

import { useState, useMemo, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Sparkles, Loader2, Search, PlusCircle, MoreHorizontal } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { COURSES, DEPARTMENTS } from '@/lib/data';
import type { ExamSlot, InvigilatorAssignment, SeatPlan, Student, Classroom, Invigilator } from '@/lib/types';
import { generateSeatPlan, assignInvigilators } from '@/lib/planning';
import { AllotmentContext } from '@/context/AllotmentContext';
import { DataContext } from '@/context/DataContext';
import { ExamDialog } from '@/components/exam-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function SchedulePage() {
    const { 
        students, setStudents, 
        classrooms, 
        invigilators, setInvigilators,
        examSchedule, setExamSchedule 
    } = useContext(DataContext);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [selectedExam, setSelectedExam] = useState<ExamSlot | null>(null);
    const [examToDelete, setExamToDelete] = useState<string | null>(null);

    const { setFullAllotment } = useContext(AllotmentContext);
    const router = useRouter();

    const filteredSchedule = useMemo(() => {
        if (!searchQuery) {
            return examSchedule;
        }
        const lowercasedQuery = searchQuery.toLowerCase();
        return examSchedule.filter(exam =>
            exam.subjectName.toLowerCase().includes(lowercasedQuery) ||
            exam.subjectCode.toLowerCase().includes(lowercasedQuery) ||
            exam.department.toLowerCase().includes(lowercasedQuery) ||
            exam.course.toLowerCase().includes(lowercasedQuery)
        );
    }, [searchQuery, examSchedule]);

    const handleGenerateAll = async () => {
        if (students.length === 0 || classrooms.length === 0 || invigilators.length === 0 || examSchedule.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Cannot Generate Allotment',
                description: 'Please ensure students, classrooms, invigilators, and a schedule have been populated or imported.',
            });
            return;
        }

        setIsGenerating(true);
        toast({ title: 'Generating Full Allotment...', description: 'The algorithm is creating plans session by session. This may take some time.' });
        
        // Use a timeout to allow the UI to update before the heavy computation begins
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            let studentMasterList: Student[] = JSON.parse(JSON.stringify(students));
            let invigilatorMasterList: Invigilator[] = JSON.parse(JSON.stringify(invigilators));
            let classroomMasterList = JSON.parse(JSON.stringify(classrooms));

            const examSlotsByTime = examSchedule.reduce((acc, exam) => {
              const key = `${exam.date} ${exam.time}`;
              if (!acc[key]) {
                acc[key] = [];
              }
              acc[key].push(exam);
              return acc;
            }, {} as Record<string, ExamSlot[]>);

            const generatedPlans: Record<string, { seatPlan: SeatPlan, invigilatorAssignments: InvigilatorAssignment[] }> = {};
            const sortedSessionKeys = Object.keys(examSlotsByTime).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
            
            for (const key of sortedSessionKeys) {
                const concurrentExams = examSlotsByTime[key];
                
                toast({ title: `Processing Session: ${key}`, description: 'Generating seat plan and invigilator duties...' });

                const { plan, updatedStudents } = generateSeatPlan(studentMasterList, classroomMasterList, concurrentExams);
                studentMasterList = updatedStudents; 
                
                const classroomsInUse = [...new Map(plan.assignments.map(item => [item.classroom.id, item.classroom])).values()];

                const { assignments: invigilatorAssignments, updatedInvigilators } = assignInvigilators(invigilatorMasterList, classroomsInUse, concurrentExams[0]);
                invigilatorMasterList = updatedInvigilators;

                generatedPlans[key] = { seatPlan: plan, invigilatorAssignments };
            }
            
            setStudents(studentMasterList);
            setInvigilators(invigilatorMasterList);
            setFullAllotment(generatedPlans);

            toast({
                title: 'Generation Complete!',
                description: 'Full allotment has been generated for all exam sessions and saved.',
                action: <Button onClick={() => router.push('/allotment')}>View Allotment</Button>,
                duration: 10000
            });

        } catch (error: any) {
            console.error('An error occurred during allotment generation:', error);
            toast({
                variant: 'destructive',
                title: 'Generation Failed',
                description: error.message || 'An unexpected error occurred. Please check the console for details.',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveExam = (exam: ExamSlot) => {
        if (selectedExam) {
            // Update
            setExamSchedule(prev => prev.map(e => e.id === exam.id ? exam : e));
            toast({ title: "Exam Updated", description: `Subject ${exam.subjectCode} has been updated.` });
        } else {
            // Create
            setExamSchedule(prev => [...prev, exam]);
            toast({ title: "Exam Added", description: `Subject ${exam.subjectCode} has been added to the schedule.` });
        }
        setIsDialogOpen(false);
        setSelectedExam(null);
    };

    const handleOpenDialog = (exam?: ExamSlot) => {
        setSelectedExam(exam || null);
        setIsDialogOpen(true);
    };
    
    const handleDeleteExam = () => {
        if (examToDelete) {
            const exam = examSchedule.find(e => e.id === examToDelete);
            setExamSchedule(prev => prev.filter(e => e.id !== examToDelete));
            toast({ title: "Exam Deleted", description: `Subject ${exam?.subjectCode} has been removed from the schedule.` });
            setExamToDelete(null);
            setIsAlertOpen(false);
        }
    };
    
    const openDeleteAlert = (examId: string) => {
        setExamToDelete(examId);
        setIsAlertOpen(true);
    };


    return (
        <>
            <ExamDialog 
                isOpen={isDialogOpen}
                onClose={() => { setIsDialogOpen(false); setSelectedExam(null); }}
                onSave={handleSaveExam}
                exam={selectedExam}
                departments={DEPARTMENTS}
                coursesByDept={COURSES}
            />
             <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the exam slot
                        and remove it from the schedule.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setExamToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteExam}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <SidebarProvider>
                <div className="flex min-h-screen">
                    <MainSidebar />
                    <SidebarInset>
                        <div className="flex flex-col h-full">
                            <MainHeader />
                            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                                <Card>
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <CalendarDays className="h-6 w-6" />
                                                    <CardTitle>Exam Schedule</CardTitle>
                                                </div>
                                                <CardDescription>View, manage, and generate allotments for the exam schedule.</CardDescription>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                 <Button variant="outline" onClick={() => handleOpenDialog()}>
                                                    <PlusCircle className="mr-2" />
                                                    Add New Exam
                                                </Button>
                                                <Button onClick={handleGenerateAll} disabled={isGenerating || examSchedule.length === 0}>
                                                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                                    Generate Full Allotment
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="w-full max-w-sm">
                                            <Input
                                                placeholder="Search schedule..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-8"
                                                icon={<Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
                                            />
                                        </div>
                                        <div className="border rounded-md">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Date</TableHead>
                                                        <TableHead>Time</TableHead>
                                                        <TableHead>Subject</TableHead>
                                                        <TableHead>Code</TableHead>
                                                        <TableHead>Group</TableHead>
                                                        <TableHead>Department</TableHead>
                                                        <TableHead>Course</TableHead>
                                                        <TableHead className="text-right">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredSchedule.map((exam) => (
                                                        <TableRow key={exam.id}>
                                                            <TableCell>{exam.date}</TableCell>
                                                            <TableCell>{exam.time}</TableCell>
                                                            <TableCell className="font-medium">{exam.subjectName}</TableCell>
                                                            <TableCell>{exam.subjectCode}</TableCell>
                                                            <TableCell>{exam.group || 'All'}</TableCell>
                                                            <TableCell>{exam.department}</TableCell>
                                                            <TableCell>{exam.course}</TableCell>
                                                            <TableCell className="text-right">
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                                            <span className="sr-only">Open menu</span>
                                                                            <MoreHorizontal className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuItem onClick={() => handleOpenDialog(exam)}>Edit</DropdownMenuItem>
                                                                        <DropdownMenuItem onClick={() => openDeleteAlert(exam.id)} className="text-destructive">Delete</DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                            {filteredSchedule.length === 0 && (
                                                <div className="text-center p-8 text-muted-foreground">
                                                    No exam slots found. Try adding a new exam or changing your search query.
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <div className="text-sm text-muted-foreground">
                                            Showing {filteredSchedule.length} of {examSchedule.length} total exam slots.
                                        </div>
                                    </CardFooter>
                                </Card>
                            </main>
                        </div>
                    </SidebarInset>
                </div>
            </SidebarProvider>
        </>
    );
}
