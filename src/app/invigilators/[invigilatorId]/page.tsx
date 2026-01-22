
'use client';

import { useContext, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { User, Calendar, Clock, Building, BookOpen } from 'lucide-react';
import { AllotmentContext } from '@/context/AllotmentContext';
import { DataContext } from '@/context/DataContext';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Invigilator } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function InvigilatorHistoryPage() {
  const params = useParams();
  const { invigilatorId } = params;
  
  const { invigilators } = useContext(DataContext);
  const { fullAllotment } = useContext(AllotmentContext);

  const invigilator = useMemo(() => {
    return invigilators.find(i => i.id === invigilatorId);
  }, [invigilators, invigilatorId]);

  const isLoading = !invigilator && invigilators.length === 0;

  const dutyHistory = useMemo(() => {
    if (!fullAllotment || !invigilatorId) return [];

    const duties: any[] = [];
    Object.values(fullAllotment).forEach(({ invigilatorAssignments, seatPlan }) => {
      invigilatorAssignments.forEach(assignment => {
        if (assignment.invigilator.id === invigilatorId) {
          const examsInRoom = [...new Set(seatPlan.assignments
            .filter(sa => sa.classroom.id === assignment.classroom.id && sa.student)
            .map(sa => `${sa.student!.exam.subjectName} (${sa.student!.exam.subjectCode})`))
          ].join(', ');

          duties.push({
            date: assignment.exam.date,
            time: assignment.exam.time,
            classroom: assignment.classroom,
            exams: examsInRoom,
          });
        }
      });
    });

    // Sort duties chronologically
    return duties.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA.getTime() - dateB.getTime();
    });
  }, [fullAllotment, invigilatorId]);

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen">
          <MainSidebar />
          <SidebarInset>
            <div className="flex flex-col h-full">
              <MainHeader />
              <main className="flex-1 p-6">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-1/2" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
              </main>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  if (!invigilator) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen">
          <MainSidebar />
          <SidebarInset>
            <div className="flex flex-col h-full">
              <MainHeader />
              <main className="flex-1 p-6 flex items-center justify-center">
                <p>Invigilator not found.</p>
              </main>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
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
                      <BreadcrumbLink href="/invigilators">Invigilators</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{invigilator.name}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <User className="h-8 w-8 text-primary" />
                      <div>
                        <CardTitle className="text-2xl">{invigilator.name}</CardTitle>
                        <CardDescription>
                          ID: {invigilator.id} | Department: {invigilator.department}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Duty History</CardTitle>
                    <CardDescription>
                      A complete record of all invigilation duties assigned to {invigilator.name}.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead><Calendar className="inline-block mr-2 h-4 w-4" />Date</TableHead>
                            <TableHead><Clock className="inline-block mr-2 h-4 w-4" />Time</TableHead>
                            <TableHead><Building className="inline-block mr-2 h-4 w-4" />Classroom</TableHead>
                            <TableHead><BookOpen className="inline-block mr-2 h-4 w-4" />Exams in Room</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dutyHistory.map((duty, index) => (
                            <TableRow key={index}>
                              <TableCell>{duty.date}</TableCell>
                              <TableCell>{duty.time}</TableCell>
                              <TableCell>
                                <div className="font-medium">{duty.classroom.roomNo}</div>
                                <div className="text-sm text-muted-foreground">{duty.classroom.building}</div>
                              </TableCell>
                              <TableCell>{duty.exams || 'N/A'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {dutyHistory.length === 0 && (
                      <div className="text-center p-8 text-muted-foreground">
                        {fullAllotment 
                            ? `No duties have been assigned to ${invigilator.name} in the current allotment.`
                            : "Generate a full allotment from the Schedule page to see duty history."
                        }
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
