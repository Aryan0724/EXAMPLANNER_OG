
"use client";

import { useState, useMemo } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Users, ChevronLeft, ChevronRight, Ban, X, Search } from 'lucide-react';
import { STUDENTS as initialStudents } from '@/lib/data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Student } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

const STUDENTS_PER_PAGE = 20;

interface StatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onSubmitDebarred: (reason: string, isDebarred: boolean) => void;
  onRemoveIneligibility: (subjectCode: string) => void;
}

const DebarmentStatusDialog = ({ isOpen, onClose, student, onSubmitDebarred, onRemoveIneligibility }: StatusDialogProps) => {
    const [reason, setReason] = useState('');

    if (!student) return null;

    const handleSubmit = () => {
        if (!reason.trim()) {
            toast({
                variant: 'destructive',
                title: 'Reason is required',
                description: 'Please provide a reason for this status change.',
            });
            return;
        }
        onSubmitDebarred(reason, !student.isDebarred);
        setReason('');
    };

    const handleRemove = (subjectCode: string) => {
        onRemoveIneligibility(subjectCode);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Manage Status for {student.name}</DialogTitle>
                    <DialogDescription>
                        Update global debarment status or view subject-specific ineligibility.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-2">
                    <Card>
                         <CardHeader>
                            <CardTitle>Global Debarment</CardTitle>
                            <CardDescription>
                                {student.isDebarred 
                                    ? "This student is currently debarred from all exams. You can make them eligible."
                                    : "This student is currently eligible. You can debar them from all exams."
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                             <Label htmlFor="reason">Reason for Change</Label>
                            <Textarea 
                                id="reason" 
                                placeholder="e.g., Disciplinary action, Fee overdue, etc."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)} 
                            />
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleSubmit} variant={student.isDebarred ? 'default' : 'destructive'}>
                                {student.isDebarred ? 'Make Eligible' : 'Mark as Debarred'}
                            </Button>
                        </CardFooter>
                    </Card>

                   {student.ineligibilityRecords && student.ineligibilityRecords.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Subject-Specific Ineligibility</CardTitle>
                                <CardDescription>
                                    This student is ineligible for the following subjects. You can remove these restrictions here.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {student.ineligibilityRecords.map(record => (
                                    <div key={record.subjectCode} className="flex items-center justify-between p-2 border rounded-md">
                                        <div>
                                            <p className="font-semibold">{record.subjectCode}</p>
                                            <p className="text-sm text-muted-foreground">{record.reason}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemove(record.subjectCode)}>
                                            <X className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                   )}
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'debarred' | 'ineligible'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogState, setDialogState] = useState<{ isOpen: boolean; student: Student | null }>({ isOpen: false, student: null });


  const filteredStudents = useMemo(() => {
    let studentsToFilter = students;

    if (filter === 'debarred') {
      studentsToFilter = studentsToFilter.filter(s => s.isDebarred);
    } else if (filter === 'ineligible') {
      studentsToFilter = studentsToFilter.filter(s => s.ineligibilityRecords && s.ineligibilityRecords.length > 0);
    }
    
    if (searchQuery) {
        const lowercasedQuery = searchQuery.toLowerCase();
        studentsToFilter = studentsToFilter.filter(student =>
            student.id.toLowerCase().includes(lowercasedQuery) ||
            student.rollNo.toLowerCase().includes(lowercasedQuery) ||
            student.name.toLowerCase().includes(lowercasedQuery)
        );
    }

    return studentsToFilter;
  }, [students, filter, searchQuery]);

  const totalPages = Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * STUDENTS_PER_PAGE;
  const endIndex = startIndex + STUDENTS_PER_PAGE;
  const currentStudents = filteredStudents.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const openStatusDialog = (student: Student) => {
    setDialogState({ isOpen: true, student });
  };
  
  const closeStatusDialog = () => {
    setDialogState({ isOpen: false, student: null });
  }

  const handleSubmitDebarred = (reason: string, isDebarred: boolean) => {
    if (!dialogState.student) return;
    
    let studentName = '';
    const updatedStudents = students.map(student => {
        if (student.id === dialogState.student?.id) {
            studentName = student.name;
            return { ...student, isDebarred: isDebarred, debarmentReason: isDebarred ? reason : undefined };
        }
        return student;
    });
    setStudents(updatedStudents);

    toast({
        title: `Status Updated for ${studentName}`,
        description: `${studentName} is now ${isDebarred ? 'debarred' : 'eligible'}. Reason: ${reason}`,
    });
    
    // Also update the student in the dialog state
    const updatedStudent = updatedStudents.find(s => s.id === dialogState.student?.id) || null;
    setDialogState({ isOpen: true, student: updatedStudent });
  };

  const handleRemoveIneligibility = (subjectCode: string) => {
    if (!dialogState.student) return;

    let studentName = '';
    const updatedStudents = students.map(student => {
        if (student.id === dialogState.student?.id) {
             studentName = student.name;
            const newRecords = student.ineligibilityRecords.filter(r => r.subjectCode !== subjectCode);
            return { ...student, ineligibilityRecords: newRecords };
        }
        return student;
    });
    setStudents(updatedStudents);

    toast({
        title: `Eligibility Updated for ${studentName}`,
        description: `${studentName} is now eligible for ${subjectCode}.`,
    });
    // Refresh dialog state
    const updatedStudent = updatedStudents.find(s => s.id === dialogState.student?.id) || null;
    setDialogState({ isOpen: true, student: updatedStudent });
  };

  return (
    <SidebarProvider>
      <DebarmentStatusDialog
        isOpen={dialogState.isOpen}
        onClose={closeStatusDialog}
        student={dialogState.student}
        onSubmitDebarred={handleSubmitDebarred}
        onRemoveIneligibility={handleRemoveIneligibility}
      />
      <div className="flex min-h-screen">
        <MainSidebar />
        <SidebarInset>
          <div className="flex flex-col h-full">
            <MainHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                          <Users className="h-6 w-6" />
                          <CardTitle>Students</CardTitle>
                      </div>
                      <CardDescription>Manage student eligibility and debarment status.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                        <div className="w-full sm:w-auto max-w-sm">
                          <Input
                            placeholder="Search students..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                            icon={<Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
                          />
                        </div>
                        <div className="flex gap-2">
                            <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All</Button>
                            <Button variant={filter === 'debarred' ? 'default' : 'outline'} onClick={() => setFilter('debarred')}>Debarred</Button>
                            <Button variant={filter === 'ineligible' ? 'default' : 'outline'} onClick={() => setFilter('ineligible')}>Ineligible</Button>
                        </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Roll No.</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Course</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentStudents.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">{student.id}</TableCell>
                            <TableCell>{student.rollNo}</TableCell>
                            <TableCell>{student.name}</TableCell>
                            <TableCell>{student.department}</TableCell>
                            <TableCell>{student.course}</TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1 items-start">
                                    {student.isDebarred && <Badge variant="destructive" title={student.debarmentReason}>Debarred</Badge>}
                                    {student.ineligibilityRecords && student.ineligibilityRecords.length > 0 && (
                                        <Badge variant="secondary" title={student.ineligibilityRecords.map(r => `${r.subjectCode}: ${r.reason}`).join('\n')}>
                                            Ineligible ({student.ineligibilityRecords.length} subjects)
                                        </Badge>
                                    )}
                                    {!student.isDebarred && (!student.ineligibilityRecords || student.ineligibilityRecords.length === 0) && (
                                        <Badge variant="outline">Eligible</Badge>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => openStatusDialog(student)}>
                                    <Ban className="mr-2 h-3 w-3" />
                                    Manage Status
                                </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {currentStudents.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                          No students found for this filter.
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Showing {Math.min(startIndex + 1, filteredStudents.length)}-{Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length} students.
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handlePreviousPage}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages || totalPages === 0}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </CardFooter>
              </Card>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

    