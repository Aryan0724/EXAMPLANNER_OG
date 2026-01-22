
'use client';

import Link from 'next/link';
import { use, useContext, useState } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookCopy, ChevronRight, MoreHorizontal, PlusCircle } from 'lucide-react';
import { COURSES, DEPARTMENTS } from '@/lib/data';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ExamDialog } from '@/components/exam-dialog';
import { ExamSlot } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DataContext } from '@/context/DataContext';


export default function CourseSubjectsPage({ params: paramsProp }: { params: { departmentId: string, courseId: string } }) {
  const params = use(paramsProp);
  const { examSchedule, setExamSchedule } = useContext(DataContext);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExamSlot | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<string | null>(null);
  
  const departmentName = DEPARTMENTS.find(d => encodeURIComponent(d.toLowerCase().replace(/ /g, '-')) === params.departmentId) || 'Unknown Department';
  
  const courseName = (COURSES[departmentName as keyof typeof COURSES] || []).find(c => encodeURIComponent(c.toLowerCase().replace(/ /g, '-')) === params.courseId) || 'Unknown Course';

  const subjectsForCourse = examSchedule.filter(
    exam => exam.department === departmentName && exam.course === courseName
  );
  const subjects = [...new Map(subjectsForCourse.map(s => [s.subjectCode, { id: s.id, code: s.subjectCode, name: s.subjectName }])).values()];

  const handleOpenDialog = (subjectId?: string) => {
    const exam = subjectId ? examSchedule.find(e => e.id === subjectId) : null;
    setSelectedExam(exam || null);
    setIsDialogOpen(true);
  };

  const handleSaveExam = (exam: ExamSlot) => {
    if (selectedExam) {
      setExamSchedule(prev => prev.map(e => e.id === exam.id ? exam : e));
      toast({ title: "Subject Updated", description: `Subject ${exam.subjectCode} has been updated.` });
    } else {
      setExamSchedule(prev => [...prev, exam]);
      toast({ title: "Subject Added", description: `Subject ${exam.subjectCode} has been added to this course.` });
    }
    setIsDialogOpen(false);
    setSelectedExam(null);
  };

  const openDeleteAlert = (examId: string) => {
    setExamToDelete(examId);
    setIsAlertOpen(true);
  };
  
  const handleDeleteExam = () => {
    if (examToDelete) {
        const exam = examSchedule.find(e => e.id === examToDelete);
        setExamSchedule(prev => prev.filter(e => e.id !== examToDelete));
        toast({ title: "Subject Deleted", description: `Subject ${exam?.subjectCode} has been removed.` });
        setExamToDelete(null);
        setIsAlertOpen(false);
    }
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
        defaultDepartment={departmentName}
        defaultCourse={courseName}
        isExplorerContext={true}
      />
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the subject and its exam slot.
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
                <div className="mb-4">
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/settings">Explorer</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink href={`/settings/${params.departmentId}`}>{departmentName}</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>{courseName}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>Subjects for {courseName}</CardTitle>
                          <CardDescription>
                            Select a subject to manage student eligibility, or add a new subject to this course.
                          </CardDescription>
                        </div>
                        <Button onClick={() => handleOpenDialog()}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Subject
                        </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {subjects.map(subject => (
                      <div
                        key={subject.code}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors group"
                      >
                         <Link
                          href={`/settings/${params.departmentId}/${params.courseId}/${subject.code}`}
                          className="flex-grow flex items-center gap-3"
                        >
                          <BookCopy className="h-5 w-5 text-muted-foreground" />
                          <div>
                              <span className="text-md font-medium">{subject.name}</span>
                              <span className="text-muted-foreground ml-2 font-code">({subject.code})</span>
                          </div>
                        </Link>
                        <div className="flex items-center">
                          <Link href={`/settings/${params.departmentId}/${params.courseId}/${subject.code}`} className="hidden group-hover:block">
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </Link>
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Open menu</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleOpenDialog(subject.id)}>Edit</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openDeleteAlert(subject.id)} className="text-destructive">Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                    {subjects.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                          No subjects found. Add a new subject to get started.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </main>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </>
  );
}
