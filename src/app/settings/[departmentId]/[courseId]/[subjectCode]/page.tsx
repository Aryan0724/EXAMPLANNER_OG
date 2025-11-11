
'use client';

import { useState, useMemo } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { STUDENTS as initialStudents, COURSES, DEPARTMENTS, EXAM_SCHEDULE } from '@/lib/data';
import { Student } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Ban, Search } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';

interface IneligibilityDialogProps { 
    isOpen: boolean; 
    onClose: () => void;
    onSubmit: (reason: string) => void;
    studentName: string;
    subjectCode: string;
}

const IneligibilityDialog = ({ isOpen, onClose, onSubmit, studentName, subjectCode }: IneligibilityDialogProps) => {
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

export default function SubjectStudentsPage({ params }: { params: { departmentId: string, courseId: string, subjectCode: string } }) {
    const [students, setStudents] = useState<Student[]>(initialStudents);
    const [dialogState, setDialogState] = useState<{isOpen: boolean; studentId: string | null; studentName: string | null}>({ isOpen: false, studentId: null, studentName: null });
    const [searchQuery, setSearchQuery] = useState('');

    const departmentName = DEPARTMENTS.find(d => encodeURIComponent(d.toLowerCase().replace(/ /g, '-')) === params.departmentId) || 'Unknown Department';
    
    const courseName = (COURSES[departmentName as keyof typeof COURSES] || []).find(c => encodeURIComponent(c.toLowerCase().replace(/ /g, '-')) === params.courseId) || 'Unknown Course';

    const subjectName = EXAM_SCHEDULE.find(e => e.subjectCode === params.subjectCode)?.subjectName || 'Unknown Subject';

    const relevantStudents = useMemo(() => {
        const baseStudents = students.filter(s => s.course === courseName && s.department === departmentName);
        if (!searchQuery) {
            return baseStudents;
        }
        const lowercasedQuery = searchQuery.toLowerCase();
        return baseStudents.filter(student =>
            student.id.toLowerCase().includes(lowercasedQuery) ||
            student.rollNo.toLowerCase().includes(lowercasedQuery) ||
            student.name.toLowerCase().includes(lowercasedQuery)
        );
    }, [students, courseName, departmentName, searchQuery]);


    const handleToggleEligibility = (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        const isCurrentlyIneligible = student.ineligibilityRecords.some(r => r.subjectCode === params.subjectCode);

        if (isCurrentlyIneligible) {
            let studentName = '';
            setStudents(prevStudents => {
                const newStudents = prevStudents.map(s => {
                    if (s.id === studentId) {
                        studentName = s.name;
                        return { ...s, ineligibilityRecords: s.ineligibilityRecords.filter(r => r.subjectCode !== params.subjectCode) };
                    }
                    return s;
                });
                return newStudents;
            });
             if (studentName) {
                toast({
                    title: `Eligibility Updated for ${studentName}`,
                    description: `${studentName} is now ELIGIBLE for ${params.subjectCode}.`,
                });
            }
        } else {
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
                    const newRecord = { subjectCode: params.subjectCode, reason };
                    return { ...student, ineligibilityRecords: [...student.ineligibilityRecords, newRecord] };
                }
                return student;
            });
        });

        if (studentName) {
            toast({
                title: `Eligibility Updated for ${studentName}`,
                description: `${studentName} is now INELIGIBLE for ${params.subjectCode}. Reason: ${reason}`,
            });
        }
        
        setDialogState({ isOpen: false, studentId: null, studentName: null });
    };

    return (
        <SidebarProvider>
            <IneligibilityDialog 
                isOpen={dialogState.isOpen}
                onClose={() => setDialogState({ isOpen: false, studentId: null, studentName: null })}
                onSubmit={handleConfirmIneligibility}
                studentName={dialogState.studentName || ''}
                subjectCode={params.subjectCode}
            />
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
                                       <BreadcrumbLink href={`/settings/${params.departmentId}/${params.courseId}`}>{courseName}</BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                      <BreadcrumbPage>{subjectName} ({params.subjectCode})</BreadcrumbPage>
                                    </BreadcrumbItem>
                                  </BreadcrumbList>
                                </Breadcrumb>
                              </div>
                            <Card>
                                <CardHeader>
                                  <div className="flex justify-between items-center">
                                      <div>
                                        <CardTitle>Student Eligibility for {subjectName} ({params.subjectCode})</CardTitle>
                                        <CardDescription>Manage which students are eligible to write the exam for this subject.</CardDescription>
                                      </div>
                                      <div className="w-full max-w-sm">
                                        <Input
                                          placeholder="Search students..."
                                          value={searchQuery}
                                          onChange={(e) => setSearchQuery(e.target.value)}
                                          className="pl-8"
                                          icon={<Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
                                        />
                                      </div>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="border rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Roll No.</TableHead>
                                                    <TableHead>Name</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {relevantStudents.map(student => {
                                                    const ineligibilityRecord = student.ineligibilityRecords.find(r => r.subjectCode === params.subjectCode);
                                                    const isIneligible = !!ineligibilityRecord;
                                                    return (
                                                        <TableRow key={student.id}>
                                                            <TableCell>{student.rollNo}</TableCell>
                                                            <TableCell>{student.name}</TableCell>
                                                            <TableCell>
                                                                {isIneligible 
                                                                    ? <Badge variant="destructive" title={`Reason: ${ineligibilityRecord.reason}`}>Ineligible</Badge>
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
                                    {relevantStudents.length === 0 && (
                                      <div className="text-center text-muted-foreground py-8">
                                          No students found for this filter.
                                      </div>
                                    )}
                                </CardContent>
                            </Card>
                        </main>
                    </div>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}

    