
'use client';

import { useMemo } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, UserCheck, ShieldOff } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Classroom, Invigilator, ExamSlot, createClassroom } from '@/lib/types';
import { collection } from 'firebase/firestore';


export default function UnavailabilityReportPage() {
  const firestore = useFirestore();

  const { data: classroomsData } = useCollection<Omit<Classroom, 'capacity'>>(useMemoFirebase(() => firestore ? collection(firestore, 'classrooms') : null, [firestore]));
  const classrooms = useMemo(() => (classroomsData || []).map(c => createClassroom(c)), [classroomsData]);

  const { data: invigilatorsData } = useCollection<Invigilator>(useMemoFirebase(() => firestore ? collection(firestore, 'invigilators') : null, [firestore]));
  const invigilators = invigilatorsData || [];

  const { data: examScheduleData } = useCollection<ExamSlot>(useMemoFirebase(() => firestore ? collection(firestore, 'examSchedule') : null, [firestore]));
  const examSchedule = examScheduleData || [];

  
  const getSlotLabel = (slotId: string) => {
    const slot = examSchedule.find(s => s.id === slotId);
    return slot ? `${slot.date} @ ${slot.time} (${slot.subjectCode})` : `Unknown Slot (${slotId})`;
  }

  const unavailableClassrooms = useMemo(() => 
    classrooms.filter(c => c.unavailableSlots.length > 0)
  , [classrooms]);

  const unavailableInvigilators = useMemo(() =>
    invigilators.filter(i => i.unavailableSlots.length > 0)
  , [invigilators]);

  const hasUnavailability = unavailableClassrooms.length > 0 || unavailableInvigilators.length > 0;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <MainSidebar />
        <SidebarInset>
          <div className="flex flex-col h-full">
            <MainHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
                <div className="mb-4">
                    <Breadcrumb>
                      <BreadcrumbList>
                        <BreadcrumbItem>
                          <BreadcrumbLink href="/settings">Explorer</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbPage>Global Unavailability Report</BreadcrumbPage>
                        </BreadcrumbItem>
                      </BreadcrumbList>
                    </Breadcrumb>
                </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ShieldOff className="h-6 w-6" />
                    <CardTitle>Global Unavailability Report</CardTitle>
                  </div>
                  <CardDescription>
                    A complete list of all classrooms and invigilators marked as unavailable for one or more exam sessions.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                    {!hasUnavailability ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No classrooms or invigilators have been marked as unavailable.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {unavailableClassrooms.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-2"><Building className="w-5 h-5"/>Unavailable Classrooms</h3>
                                     <div className="border rounded-md">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Classroom</TableHead>
                                              <TableHead>Unavailable For Slot</TableHead>
                                              <TableHead>Reason</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {unavailableClassrooms.map(cr => (
                                                cr.unavailableSlots.map(slot => (
                                                    <TableRow key={`${cr.id}-${slot.slotId}`}>
                                                        <TableCell className="font-medium">{cr.roomNo} ({cr.building})</TableCell>
                                                        <TableCell>{getSlotLabel(slot.slotId)}</TableCell>
                                                        <TableCell>{slot.reason}</TableCell>
                                                    </TableRow>
                                                ))
                                            ))}
                                          </TableBody>
                                        </Table>
                                     </div>
                                </div>
                            )}

                             {unavailableInvigilators.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-2"><UserCheck className="w-5 h-5"/>Unavailable Invigilators</h3>
                                     <div className="border rounded-md">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Invigilator</TableHead>
                                              <TableHead>Department</TableHead>
                                              <TableHead>Unavailable For Slot</TableHead>
                                              <TableHead>Reason</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {unavailableInvigilators.map(inv => (
                                                inv.unavailableSlots.map(slot => (
                                                    <TableRow key={`${inv.id}-${slot.slotId}`}>
                                                        <TableCell className="font-medium">{inv.name}</TableCell>
                                                        <TableCell>{inv.department}</TableCell>
                                                        <TableCell>{getSlotLabel(slot.slotId)}</TableCell>
                                                        <TableCell>{slot.reason}</TableCell>
                                                    </TableRow>
                                                ))
                                            ))}
                                          </TableBody>
                                        </Table>
                                     </div>
                                </div>
                            )}
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
