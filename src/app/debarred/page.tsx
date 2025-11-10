
'use client';

import { useState, useMemo } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldBan, Users } from 'lucide-react';
import { STUDENTS as initialStudents } from '@/lib/data';
import { Student } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DebarredPage() {
  const [students, setStudents] = useState<Student[]>(initialStudents);

  const globallyDebarred = useMemo(() => {
    return students.filter(s => s.isDebarred);
  }, [students]);

  const subjectIneligible = useMemo(() => {
    const ineligible: (Student & { subjectCode: string; reason: string; })[] = [];
    students.forEach(student => {
      if (student.ineligibilityRecords && student.ineligibilityRecords.length > 0) {
        student.ineligibilityRecords.forEach(record => {
          ineligible.push({
            ...student,
            subjectCode: record.subjectCode,
            reason: record.reason,
          });
        });
      }
    });
    return ineligible;
  }, [students]);

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
                    <ShieldBan className="h-6 w-6" />
                    <CardTitle>Debarred & Ineligible Students</CardTitle>
                  </div>
                  <CardDescription>
                    A list of students who are globally debarred or ineligible for specific subjects.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="globally-debarred">
                    <TabsList>
                      <TabsTrigger value="globally-debarred">Globally Debarred ({globallyDebarred.length})</TabsTrigger>
                      <TabsTrigger value="subject-ineligible">Subject-Specific Ineligibility ({subjectIneligible.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="globally-debarred" className="pt-4">
                      <div className="border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Roll No.</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Department</TableHead>
                              <TableHead>Reason</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {globallyDebarred.map((student) => (
                              <TableRow key={student.id}>
                                <TableCell>{student.rollNo}</TableCell>
                                <TableCell>{student.name}</TableCell>
                                <TableCell>{student.department}</TableCell>
                                <TableCell>
                                    <Badge variant="destructive">Globally Debarred</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                    <TabsContent value="subject-ineligible" className="pt-4">
                      <div className="border rounded-md">
                         <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Roll No.</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Department</TableHead>
                              <TableHead>Subject Code</TableHead>
                              <TableHead>Reason</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {subjectIneligible.map((student, index) => (
                              <TableRow key={`${student.id}-${student.subjectCode}-${index}`}>
                                <TableCell>{student.rollNo}</TableCell>
                                <TableCell>{student.name}</TableCell>
                                <TableCell>{student.department}</TableCell>
                                <TableCell className="font-code">{student.subjectCode}</TableCell>
                                <TableCell>{student.reason}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
