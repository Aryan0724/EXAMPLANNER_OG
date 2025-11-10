
"use client";

import { useState } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Users, ChevronLeft, ChevronRight, Ban } from 'lucide-react';
import { STUDENTS as initialStudents } from '@/lib/data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Student } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

const STUDENTS_PER_PAGE = 20;

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(students.length / STUDENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * STUDENTS_PER_PAGE;
  const endIndex = startIndex + STUDENTS_PER_PAGE;
  const currentStudents = students.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handleToggleDebarred = (studentId: string) => {
    setStudents(prevStudents => {
        const newStudents = prevStudents.map(student => {
            if (student.id === studentId) {
                const updatedStudent = { ...student, isDebarred: !student.isDebarred };
                toast({
                    title: `Status Updated`,
                    description: `${updatedStudent.name} is now ${updatedStudent.isDebarred ? 'debarred' : 'eligible'}.`,
                });
                return updatedStudent;
            }
            return student;
        });
        return newStudents;
    });
  };


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
                    <Users className="h-6 w-6" />
                    <CardTitle>Students</CardTitle>
                  </div>
                  <CardDescription>List of all students registered for exams. You can toggle their debarred status here.</CardDescription>
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
                               {student.isDebarred && <Badge variant="destructive">Debarred</Badge>}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => handleToggleDebarred(student.id)}>
                                    <Ban className="mr-2 h-3 w-3" />
                                    Toggle Status
                                </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
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
                            disabled={currentPage === totalPages}
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
