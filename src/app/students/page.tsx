
"use client";

import { useState, useMemo, useContext } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Users, ChevronLeft, ChevronRight, Ban, X, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Student } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { DataContext } from '@/context/DataContext';

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
    if (!student.isDebarred && !reason.trim()) {
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
                  ? `This student is currently debarred. Reason: ${student.debarmentReason || 'Not specified'}. You can make them eligible again.`
                  : "This student is currently eligible. You can debar them from all exams."
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {!student.isDebarred && (
                <>
                  <Label htmlFor="reason">Reason for Debarment</Label>
                  <Textarea
                    id="reason"
                    placeholder="e.g., Disciplinary action, Fee overdue, etc."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </>
              )}
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
  const { students, setStudents, resetStudentsToOfficial } = useContext(DataContext);
  const isLoading = !students;

  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'debarred' | 'ineligible'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogState, setDialogState] = useState<{ isOpen: boolean; student: Student | null }>({ isOpen: false, student: null });
  const [isResetAlertOpen, setIsResetAlertOpen] = useState(false);

  const availableCourses = useMemo(() => {
    const map = new Map<string, number>();
    (students || []).forEach(s => {
      map.set(s.course, (map.get(s.course) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [students]);

  const filteredStudents = useMemo(() => {
    let studentsToFilter = students || [];

    if (filter === 'debarred') {
      studentsToFilter = studentsToFilter.filter(s => s.isDebarred);
    } else if (filter === 'ineligible') {
      studentsToFilter = studentsToFilter.filter(s => s.ineligibilityRecords && s.ineligibilityRecords.length > 0);
    }

    if (courseFilter !== 'all') {
      studentsToFilter = studentsToFilter.filter(s => s.course === courseFilter);
    }

    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      studentsToFilter = studentsToFilter.filter(student =>
        student.id.toLowerCase().includes(lowercasedQuery) ||
        student.rollNo.toLowerCase().includes(lowercasedQuery) ||
        student.name.toLowerCase().includes(lowercasedQuery) ||
        student.course.toLowerCase().includes(lowercasedQuery) ||
        student.department.toLowerCase().includes(lowercasedQuery)
      );
    }

    return studentsToFilter;
  }, [students, filter, courseFilter, searchQuery]);

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
  };

  const handleResetDefaults = () => {
    resetStudentsToOfficial();
    setIsResetAlertOpen(false);
    toast({
      title: 'Roster Reset Complete',
      description: 'Restored the official 1,147 student cohort across all 16 degree programs.',
    });
  };

  const handleSubmitDebarred = (reason: string, isDebarred: boolean) => {
    if (!dialogState.student) return;

    const studentName = dialogState.student.name;
    const updatedStudents = students.map(s => {
      if (s.id === dialogState.student!.id) {
        return { ...s, isDebarred, debarmentReason: isDebarred ? reason : "" };
      }
      return s;
    });
    setStudents(updatedStudents);

    toast({
      title: `Status Updated for ${studentName}`,
      description: `${studentName} is now ${isDebarred ? 'debarred' : 'eligible'}.`,
    });

    closeStatusDialog();
  };

  const handleRemoveIneligibility = (subjectCode: string) => {
    if (!dialogState.student) return;

    const studentName = dialogState.student.name;
    const targetId = dialogState.student.id;

    const updatedStudents = students.map(s => {
      if (s.id === targetId) {
        const newRecords = s.ineligibilityRecords.filter(r => r.subjectCode !== subjectCode);
        return { ...s, ineligibilityRecords: newRecords };
      }
      return s;
    });
    setStudents(updatedStudents);

    const updatedStudent = updatedStudents.find(s => s.id === targetId);

    toast({
      title: `Eligibility Updated for ${studentName}`,
      description: `${studentName} is now eligible for ${subjectCode}.`,
    });

    if (updatedStudent && updatedStudent.ineligibilityRecords.length === 0 && !updatedStudent.isDebarred) {
      closeStatusDialog();
    } else {
      setDialogState({ isOpen: true, student: updatedStudent || null });
    }
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

      {/* Reset Confirmation Alert */}
      <Dialog open={isResetAlertOpen} onOpenChange={setIsResetAlertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset to Official Student Roster?</DialogTitle>
            <DialogDescription>
              This will restore exactly 1,147 mock students across the 16 degree programs (B.Tech CSE: 424, BBA: 202, BCA AI&DS: 178, BCA: 80, B.Sc Nursing: 63, etc.) matching the university cohort.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetAlertOpen(false)}>Cancel</Button>
            <Button onClick={handleResetDefaults} className="bg-primary">
              Restore Official 1,147 Students
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex min-h-screen">
        <MainSidebar />
        <SidebarInset>
          <div className="flex flex-col h-full">
            <MainHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{students.length}</div>
                      <div className="text-xs text-muted-foreground font-medium">Total Registered Students</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-500/5 border-blue-500/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{availableCourses.length}</div>
                      <div className="text-xs text-muted-foreground font-medium">Academic Batches / Courses</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-emerald-500/5 border-emerald-500/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                        {students.filter(s => !s.isDebarred).length}
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">Eligible for Exam Allotment</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Users className="h-6 w-6" />
                        <CardTitle>Student Registry</CardTitle>
                      </div>
                      <CardDescription>Official student cohort pre-configured for automated seat planning.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsResetAlertOpen(true)}
                        className="h-9 text-xs font-semibold border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                      >
                        Reset Official (1,147 Students)
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                    <div className="w-full sm:w-64">
                      <Input
                        placeholder="Search roll no, name, course..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="h-9 text-xs"
                      />
                    </div>

                    <select
                      value={courseFilter}
                      onChange={(e) => {
                        setCourseFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="h-9 text-xs rounded-md border border-input bg-background px-3 py-1 font-medium focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto"
                    >
                      <option value="all">All Degree Courses ({students.length})</option>
                      {availableCourses.map(([course, count]) => (
                        <option key={course} value={course}>
                          {course} ({count})
                        </option>
                      ))}
                    </select>

                    <div className="flex gap-1.5 ml-auto">
                      <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} className="h-8 text-xs" onClick={() => setFilter('all')}>All</Button>
                      <Button size="sm" variant={filter === 'debarred' ? 'default' : 'outline'} className="h-8 text-xs" onClick={() => setFilter('debarred')}>Debarred</Button>
                      <Button size="sm" variant={filter === 'ineligible' ? 'default' : 'outline'} className="h-8 text-xs" onClick={() => setFilter('ineligible')}>Ineligible</Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">ID</TableHead>
                          <TableHead>Roll No.</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Course</TableHead>
                          <TableHead>Sem</TableHead>
                          <TableHead>Sec</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading && (
                          <TableRow>
                            <TableCell colSpan={9} className="p-8 text-center">Loading students...</TableCell>
                          </TableRow>
                        )}
                        {!isLoading && currentStudents.map((student) => (
                          <TableRow key={student.id} className="hover:bg-muted/40">
                            <TableCell className="font-mono text-xs text-muted-foreground">{student.id}</TableCell>
                            <TableCell className="font-mono font-bold text-xs">{student.rollNo}</TableCell>
                            <TableCell className="font-medium text-xs">{student.name}</TableCell>
                            <TableCell className="font-semibold text-xs text-primary">{student.course}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                Sem {student.semester}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                Sec {student.section || 'A'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{student.department}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1 items-start">
                                {student.isDebarred && <Badge variant="destructive" className="text-[10px] px-1.5 py-0" title={student.debarmentReason}>Debarred</Badge>}
                                {student.ineligibilityRecords && student.ineligibilityRecords.length > 0 && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    Ineligible ({student.ineligibilityRecords.length})
                                  </Badge>
                                )}
                                {!student.isDebarred && (!student.ineligibilityRecords || student.ineligibilityRecords.length === 0) && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">Eligible</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => openStatusDialog(student)}>
                                <Ban className="mr-1.5 h-3 w-3" />
                                Status
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {!isLoading && currentStudents.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        No students found matching your criteria.
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredStudents.length > 0 ? startIndex + 1 : 0}–{Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length} students.
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
                    <span className="text-xs text-muted-foreground">
                      Page {totalPages > 0 ? currentPage : 0} of {totalPages}
                    </span>
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
