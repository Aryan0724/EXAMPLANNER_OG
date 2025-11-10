
'use client';

import { useMemo, useState } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Telescope, BookOpen, BookCopy, GraduationCap, Ban, ShieldBan } from 'lucide-react';
import { STUDENTS as initialStudents, EXAM_SCHEDULE, DEPARTMENTS, COURSES } from '@/lib/data';
import { Student } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface Subject {
  code: string;
  name: string;
}

interface Course {
  name: string;
  subjects: Subject[];
}

interface Department {
  name: string;
  courses: Course[];
}

const IneligibilityDialog = ({ 
    isOpen, 
    onClose, 
    onSubmit,
    studentName,
    subjectCode,
}: { 
    isOpen: boolean; 
    onClose: () => void;
    onSubmit: (reason: string) => void;
    studentName: string;
    subjectCode: string;
}) => {
    const [reason, setReason] = useState('');

    const handleSubmit = () => {
        if (reason.trim()) {
            onSubmit(reason);
        } else {
            toast({
                variant: 'destructive',
                title: 'Reason is required',
                description: 'Please provide a reason for making the student ineligible.',
            });
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Mark Ineligible</DialogTitle>
                    <DialogDescription>
                        You are marking <span className="font-bold">{studentName}</span> as ineligible for the subject <span className="font-bold">{subjectCode}</span>. Please provide a reason.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason</Label>
                        <Textarea 
                            id="reason" 
                            placeholder="e.g., Attendance shortage, disciplinary action, etc."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)} 
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Confirm Ineligibility</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


const SubjectStudentList = ({ courseName, departmentName, subjectCode }: { courseName: string, departmentName: string, subjectCode: string }) => {
    const [students, setStudents] = useState<Student[]>(initialStudents);
    const [dialogState, setDialogState] = useState<{isOpen: boolean; studentId: string | null; studentName: string | null}>({ isOpen: false, studentId: null, studentName: null });


    const relevantStudents = useMemo(() => {
        return students.filter(s => s.course === courseName && s.department === departmentName);
    }, [students, courseName, departmentName]);

    const handleToggleEligibility = (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        const isCurrentlyIneligible = student.ineligibilityRecords.some(r => r.subjectCode === subjectCode);

        if (isCurrentlyIneligible) {
            // Make them eligible again (remove the record)
            let studentName = '';
            setStudents(prevStudents => {
                const newStudents = prevStudents.map(s => {
                    if (s.id === studentId) {
                        studentName = s.name;
                        return { ...s, ineligibilityRecords: s.ineligibilityRecords.filter(r => r.subjectCode !== subjectCode) };
                    }
                    return s;
                });
                return newStudents;
            });
             if (studentName) {
                toast({
                    title: `Eligibility Updated for ${studentName}`,
                    description: `${studentName} is now ELIGIBLE for ${subjectCode}.`,
                });
            }
        } else {
            // Open dialog to get reason for ineligibility
            setDialogState({ isOpen: true, studentId, studentName: student.name });
        }
    };

    const handleConfirmIneligibility = (reason: string) => {
        if (!dialogState.studentId) return;

        let studentName = '';

        setStudents(prevStudents => {
            return prevStudents.map(student => {
                if (student.id === dialogState.studentId) {
                    studentName = student.name;
                    const newRecord = { subjectCode, reason };
                    return { ...student, ineligibilityRecords: [...student.ineligibilityRecords, newRecord] };
                }
                return student;
            });
        });

        if (studentName) {
            toast({
                title: `Eligibility Updated for ${studentName}`,
                description: `${studentName} is now INELIGIBLE for ${subjectCode}. Reason: ${reason}`,
            });
        }
        
        setDialogState({ isOpen: false, studentId: null, studentName: null });
    };

    return (
        <>
            <IneligibilityDialog 
                isOpen={dialogState.isOpen}
                onClose={() => setDialogState({ isOpen: false, studentId: null, studentName: null })}
                onSubmit={handleConfirmIneligibility}
                studentName={dialogState.studentName || ''}
                subjectCode={subjectCode}
            />
            <div className="border rounded-md mt-2">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Roll No.</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Status for {subjectCode}</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {relevantStudents.map(student => {
                            const isIneligible = student.ineligibilityRecords.some(r => r.subjectCode === subjectCode);
                            return (
                                <TableRow key={student.id}>
                                    <TableCell>{student.rollNo}</TableCell>
                                    <TableCell>{student.name}</TableCell>
                                    <TableCell>
                                        {isIneligible 
                                            ? <Badge variant="destructive">Ineligible</Badge>
                                            : <Badge variant="secondary">Eligible</Badge> 
                                        }
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => handleToggleEligibility(student.id)}>
                                            <Ban className="mr-2 h-3 w-3" />
                                            Toggle Eligibility
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}


export default function ExplorerPage() {
  const academicStructure = useMemo(() => {
    const structure: Department[] = [];

    DEPARTMENTS.forEach(deptName => {
      const department: Department = {
        name: deptName,
        courses: [],
      };

      const coursesInDept = COURSES[deptName as keyof typeof COURSES] || [];
      coursesInDept.forEach(courseName => {
        const course: Course = {
          name: courseName,
          subjects: [],
        };
        
        const subjectsForCourse = EXAM_SCHEDULE.filter(
          exam => exam.department === deptName && exam.course === courseName
        );

        const uniqueSubjects = [...new Map(subjectsForCourse.map(s => [s.subjectCode, { code: s.subjectCode, name: s.subjectName }])).values()];
        
        course.subjects = uniqueSubjects;
        department.courses.push(course);
      });

      structure.push(department);
    });

    return structure;
  }, []);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <MainSidebar />
        <SidebarInset>
          <div className="flex flex-col h-full">
            <MainHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Telescope className="h-6 w-6" />
                    <CardTitle>Student & Subject Explorer</CardTitle>
                  </div>
                  <CardDescription>
                    Browse your academic structure and manage student eligibility for each subject.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full">
                    {academicStructure.map(dept => (
                      <AccordionItem key={dept.name} value={dept.name}>
                        <AccordionTrigger className="text-lg font-medium">
                          <div className="flex items-center gap-3">
                             <GraduationCap className="h-5 w-5 text-primary" />
                             {dept.name}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pl-6">
                           <Accordion type="multiple" className="w-full">
                             {dept.courses.map(course => (
                               <AccordionItem key={course.name} value={`${dept.name}-${course.name}`}>
                                 <AccordionTrigger>
                                  <div className="flex items-center gap-3">
                                    <BookOpen className="h-4 w-4 text-accent" />
                                    {course.name}
                                  </div>
                                 </AccordionTrigger>
                                 <AccordionContent className="pl-8 pt-2">
                                    <Accordion type="multiple" className="w-full">
                                       {course.subjects.length > 0 ? course.subjects.map(subject => (
                                          <AccordionItem key={subject.code} value={`${dept.name}-${course.name}-${subject.code}`}>
                                            <AccordionTrigger>
                                                <div className="flex items-center gap-3 text-sm">
                                                    <BookCopy className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <span className="font-medium">{subject.name}</span>
                                                        <span className="text-muted-foreground ml-2 font-code">({subject.code})</span>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pl-8 pt-2">
                                                <SubjectStudentList 
                                                    courseName={course.name}
                                                    departmentName={dept.name}
                                                    subjectCode={subject.code}
                                                />
                                            </AccordionContent>
                                          </AccordionItem>
                                       )) : (
                                        <div className="text-sm text-muted-foreground italic p-4">No subjects found in the exam schedule for this course.</div>
                                       )}
                                    </Accordion>
                                 </AccordionContent>
                               </AccordionItem>
                             ))}
                           </Accordion>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
