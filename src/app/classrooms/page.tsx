
'use client';

import { useState, useMemo } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Search, CalendarOff, Users2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Classroom, createClassroom } from '@/lib/types';
import { AvailabilityDialog } from '@/components/availability-dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function ClassroomsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const firestore = useFirestore();

  const classroomsCol = useMemoFirebase(() => firestore ? collection(firestore, 'classrooms') : null, [firestore]);
  const { data: classroomsData, isLoading } = useCollection<Omit<Classroom, 'capacity'>>(classroomsCol);
  
  // Re-create the full classroom objects with the capacity getter
  const classrooms = useMemo(() => (classroomsData || []).map(c => createClassroom(c)), [classroomsData]);

  const examScheduleCol = useMemoFirebase(() => firestore ? collection(firestore, 'examSchedule') : null, [firestore]);
  const { data: examSchedule } = useCollection(examScheduleCol);

  const [dialogState, setDialogState] = useState<{ isOpen: boolean; resource: Classroom | null }>({ isOpen: false, resource: null });

  const filteredClassrooms = useMemo(() => {
    if (!searchQuery) {
      return classrooms;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return classrooms.filter(room =>
      room.id.toLowerCase().includes(lowercasedQuery) ||
      room.roomNo.toLowerCase().includes(lowercasedQuery) ||
      room.building.toLowerCase().includes(lowercasedQuery)
    );
  }, [searchQuery, classrooms]);

  const openDialog = (classroom: Classroom) => {
    setDialogState({ isOpen: true, resource: classroom });
  };
  
  const closeDialog = () => {
    setDialogState({ isOpen: false, resource: null });
  }

  const handleAddUnavailability = (slotId: string, reason: string) => {
    if (!dialogState.resource || !firestore) return;

    const resourceName = dialogState.resource.id;
    if (dialogState.resource.unavailableSlots.some(s => s.slotId === slotId)) {
        toast({
            variant: 'destructive',
            title: 'Already Unavailable',
            description: `${resourceName} is already marked as unavailable for this slot.`,
        });
        return;
    }

    const classroomRef = doc(firestore, 'classrooms', dialogState.resource.id);
    const newSlots = [...dialogState.resource.unavailableSlots, { slotId, reason }];
    updateDocumentNonBlocking(classroomRef, { unavailableSlots: newSlots });

    toast({
        title: 'Unavailability Added',
        description: `${resourceName} is now unavailable for the selected slot.`,
    });

    const updatedResource = { ...dialogState.resource, unavailableSlots: newSlots };
    setDialogState({ isOpen: true, resource: updatedResource });
  };

  const handleRemoveUnavailability = (slotId: string) => {
    if (!dialogState.resource || !firestore) return;

    const resourceName = dialogState.resource.id;
    const classroomRef = doc(firestore, 'classrooms', dialogState.resource.id);
    const newSlots = dialogState.resource.unavailableSlots.filter(s => s.slotId !== slotId);
    updateDocumentNonBlocking(classroomRef, { unavailableSlots: newSlots });
    
    toast({
        title: 'Unavailability Removed',
        description: `${resourceName} is now available for the selected slot.`,
    });

    const updatedResource = { ...dialogState.resource, unavailableSlots: newSlots };
    setDialogState({ isOpen: true, resource: updatedResource });
  };

  return (
    <SidebarProvider>
      <AvailabilityDialog
        isOpen={dialogState.isOpen}
        onClose={closeDialog}
        resource={dialogState.resource}
        resourceType="Classroom"
        onSubmit={handleAddUnavailability}
        onRemove={handleRemoveUnavailability}
        examSchedule={examSchedule || []}
      />
      <div className="flex min-h-screen">
        <MainSidebar />
        <SidebarInset>
          <div className="flex flex-col h-full">
            <MainHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building className="h-6 w-6" />
                        <CardTitle>Classrooms</CardTitle>
                      </div>
                      <CardDescription>List of all classrooms available for examinations.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-full max-w-sm">
                        <Input
                            placeholder="Search by ID, Room No, Building..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                            icon={<Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
                        />
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
                          <TableHead>Room No.</TableHead>
                          <TableHead>Building</TableHead>
                          <TableHead>Capacity</TableHead>
                          <TableHead>Features</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading && Array.from({ length: 5 }).map((_, i) => (
                           <TableRow key={`skel-${i}`}>
                              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                              <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                              <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                              <TableCell className="text-right"><Skeleton className="h-8 w-40 ml-auto" /></TableCell>
                           </TableRow>
                        ))}
                        {!isLoading && filteredClassrooms.map((room) => (
                          <TableRow key={room.id}>
                            <TableCell className="font-medium">{room.id}</TableCell>
                            <TableCell>{room.roomNo}</TableCell>
                            <TableCell>{room.building}</TableCell>
                            <TableCell>{room.capacity}</TableCell>
                            <TableCell>
                              {room.benchCapacities.some(c => c > 2) && (
                                <Badge variant="outline" className="flex items-center gap-1.5">
                                  <Users2 className="h-3 w-3" />
                                  3-Seater Benches
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                                {room.unavailableSlots.length > 0 ? (
                                    <Badge variant="destructive">Unavailable ({room.unavailableSlots.length} slots)</Badge>
                                ) : (
                                    <Badge variant="secondary">Available</Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => openDialog(room)} disabled={!examSchedule}>
                                    <CalendarOff className="mr-2 h-3 w-3" />
                                    Manage Availability
                                </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                     {!isLoading && filteredClassrooms.length === 0 && (
                        <div className="text-center p-8 text-muted-foreground">
                            No classrooms found.
                        </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
