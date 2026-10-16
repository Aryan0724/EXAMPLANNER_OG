
'use client';

import { useState, useMemo, useContext } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Search, CalendarOff, Users2, Settings2, PlusCircle, Pencil, Trash2, RotateCcw, Grid, Sparkles, CheckCircle2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Classroom } from '@/lib/types';
import { AvailabilityDialog } from '@/components/availability-dialog';
import { BlockPriorityDialog } from '@/components/block-priority-dialog';
import { ClassroomEditDialog } from '@/components/classroom-edit-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { DataContext } from '@/context/DataContext';

export default function ClassroomsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const {
    classrooms,
    setClassrooms,
    examSchedule,
    blockPriority,
    setBlockPriority,
    excludedBlocks,
    setExcludedBlocks,
    excludedRooms,
    setExcludedRooms,
    resetClassroomsToOfficial,
  } = useContext(DataContext);
  const isLoading = !classrooms;

  const [dialogState, setDialogState] = useState<{ isOpen: boolean; resource: Classroom | null }>({ isOpen: false, resource: null });
  const [editDialogState, setEditDialogState] = useState<{ isOpen: boolean; classroom: Classroom | null }>({ isOpen: false, classroom: null });
  const [isPriorityDialogOpen, setIsPriorityDialogOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<Classroom | null>(null);
  const [isResetAlertOpen, setIsResetAlertOpen] = useState(false);

  const totalCapacity = useMemo(() => {
    return classrooms.reduce((sum, c) => sum + (c.capacity || 0), 0);
  }, [classrooms]);

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

  const availableBlocks = useMemo(() => {
    const blocks = new Set(classrooms.map(c => c.building));
    return Array.from(blocks).sort();
  }, [classrooms]);

  const openDialog = (classroom: Classroom) => {
    setDialogState({ isOpen: true, resource: classroom });
  };

  const closeDialog = () => {
    setDialogState({ isOpen: false, resource: null });
  };

  const handleSavePriority = (newPriority: string[], exBlocks: string[], exRooms: string[]) => {
    setBlockPriority(newPriority);
    setExcludedBlocks(exBlocks);
    setExcludedRooms(exRooms);
    toast({
      title: 'Settings Updated',
      description: 'Allotment preferences have been saved.',
    });
  };

  const handleSaveClassroom = (savedRoom: Classroom) => {
    const exists = classrooms.some(c => c.id === savedRoom.id);
    if (exists) {
      setClassrooms(prev => prev.map(c => c.id === savedRoom.id ? savedRoom : c));
    } else {
      setClassrooms(prev => [...prev, savedRoom]);
    }
  };

  const handleDeleteClassroom = () => {
    if (!roomToDelete) return;
    const removedNo = roomToDelete.roomNo;
    setClassrooms(prev => prev.filter(c => c.id !== roomToDelete.id));
    toast({
      title: 'Classroom Deleted',
      description: `Classroom ${removedNo} has been removed.`,
    });
    setRoomToDelete(null);
  };

  const handleResetDefaults = () => {
    resetClassroomsToOfficial();
    setIsResetAlertOpen(false);
    toast({
      title: 'Reset Complete',
      description: 'Restored the official 18 university examination halls (1,147 sitting seats).',
    });
  };

  const handleAddUnavailability = (slotId: string, reason: string) => {
    if (!dialogState.resource) return;

    const resourceName = dialogState.resource.id;
    const isAlreadyUnavailable = dialogState.resource.unavailableSlots.some(s => s.slotId === slotId);

    if (isAlreadyUnavailable) {
      toast({
        variant: 'destructive',
        title: 'Already Unavailable',
        description: `${resourceName} is already marked as unavailable for this slot.`,
      });
      return;
    }

    const updatedClassrooms = classrooms.map(c => {
      if (c.id === dialogState.resource!.id) {
        const newSlots = [...c.unavailableSlots, { slotId, reason }];
        return { ...c, unavailableSlots: newSlots };
      }
      return c;
    });
    setClassrooms(updatedClassrooms as Classroom[]);

    toast({
      title: 'Unavailability Added',
      description: `${resourceName} is now unavailable for the selected slot.`,
    });

    const updatedResource = updatedClassrooms.find(c => c.id === dialogState.resource!.id);
    setDialogState({ isOpen: true, resource: updatedResource || null });
  };

  const handleRemoveUnavailability = (slotId: string) => {
    if (!dialogState.resource) return;

    const resourceName = dialogState.resource.id;
    const updatedClassrooms = classrooms.map(c => {
      if (c.id === dialogState.resource!.id) {
        const newSlots = c.unavailableSlots.filter(s => s.slotId !== slotId);
        return { ...c, unavailableSlots: newSlots };
      }
      return c;
    });
    setClassrooms(updatedClassrooms as Classroom[]);

    toast({
      title: 'Unavailability Removed',
      description: `${resourceName} is now available for the selected slot.`,
    });

    const updatedResource = updatedClassrooms.find(c => c.id === dialogState.resource!.id);
    setDialogState({ isOpen: true, resource: updatedResource || null });
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
      <BlockPriorityDialog
        isOpen={isPriorityDialogOpen}
        onClose={() => setIsPriorityDialogOpen(false)}
        currentPriority={blockPriority}
        availableBlocks={availableBlocks}
        excludedBlocks={excludedBlocks}
        excludedRooms={excludedRooms}
        classrooms={classrooms}
        onSave={handleSavePriority}
      />
      <ClassroomEditDialog
        isOpen={editDialogState.isOpen}
        onClose={() => setEditDialogState({ isOpen: false, classroom: null })}
        classroom={editDialogState.classroom}
        onSave={handleSaveClassroom}
        existingClassrooms={classrooms}
      />

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!roomToDelete} onOpenChange={open => !open && setRoomToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Classroom {roomToDelete?.roomNo}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {roomToDelete?.roomNo} ({roomToDelete?.building})? This will reduce total sitting capacity by {roomToDelete?.capacity} seats.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRoomToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClassroom} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Classroom
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation Alert */}
      <AlertDialog open={isResetAlertOpen} onOpenChange={setIsResetAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              Reset to Official Classrooms?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the 18 official university examination halls (Admin Block A, Academic Blocks C, D, E) with their precise grid layouts and exactly 1,147 sitting seats.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsResetAlertOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetDefaults} className="bg-primary">
              Restore Official Classrooms
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex min-h-screen">
        <MainSidebar />
        <SidebarInset>
          <div className="flex flex-col h-full">
            <MainHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-4">
              {/* Official Summary Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                      <Building className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{classrooms.length}</div>
                      <div className="text-xs text-muted-foreground font-medium">Configured Classrooms / Halls</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-emerald-500/5 border-emerald-500/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                      <Users2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{totalCapacity}</div>
                      <div className="text-xs text-muted-foreground font-medium">Total Exam Sitting Capacity</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-500/5 border-blue-500/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-blue-700 dark:text-blue-300">University Match Ready</div>
                      <div className="text-xs text-muted-foreground font-medium">Exact match for 1,147 student cohort</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building className="h-6 w-6" />
                        <CardTitle>Classroom & Hall Registry</CardTitle>
                      </div>
                      <CardDescription>
                        Hardcoded official examination halls with full customization of grid layouts and sitting capacities.
                      </CardDescription>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsResetAlertOpen(true)}
                        className="h-9 text-xs font-semibold gap-1.5 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset Official (1,147 Seats)
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsPriorityDialogOpen(true)}
                        className="h-9 text-xs font-semibold gap-1.5"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                        Priority Settings
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => setEditDialogState({ isOpen: true, classroom: null })}
                        className="h-9 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Add Classroom
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 w-full max-w-sm">
                    <Input
                      placeholder="Search room, building, or capacity..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">ID</TableHead>
                          <TableHead>Room No.</TableHead>
                          <TableHead>Building / Block</TableHead>
                          <TableHead>Grid Layout</TableHead>
                          <TableHead>Total Sitting</TableHead>
                          <TableHead>Bench Breakdown</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading && (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center p-8">Loading classroom data...</TableCell>
                          </TableRow>
                        )}
                        {!isLoading && filteredClassrooms.map((room) => {
                          const benchCount = (room.rows || 0) * (room.columns || 0);
                          const maxBenchCap = Math.max(...(room.benchCapacities || [2]));
                          return (
                            <TableRow key={room.id} className="hover:bg-muted/40">
                              <TableCell className="font-mono text-xs text-muted-foreground">{room.id}</TableCell>
                              <TableCell className="font-bold text-sm">{room.roomNo}</TableCell>
                              <TableCell>
                                <span className="font-medium text-xs">{room.building}</span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-mono text-xs gap-1">
                                  <Grid className="h-3 w-3 text-muted-foreground" />
                                  {room.rows} × {room.columns} ({benchCount} benches)
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="font-bold text-sm text-primary">{room.capacity}</span>
                                <span className="text-[10px] text-muted-foreground ml-1">students</span>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {maxBenchCap > 2 ? 'Up to 3 / bench' : '1–2 / bench'}
                              </TableCell>
                              <TableCell>
                                {room.unavailableSlots && room.unavailableSlots.length > 0 ? (
                                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                    Unavailable ({room.unavailableSlots.length})
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 px-1.5 py-0">
                                    Available
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditDialogState({ isOpen: true, classroom: room })}
                                    className="h-8 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                                    title="Edit Room Layout & Capacity"
                                  >
                                    <Pencil className="h-3.5 w-3.5 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openDialog(room)}
                                    disabled={!examSchedule}
                                    className="h-8 px-2 text-xs"
                                    title="Manage Availability"
                                  >
                                    <CalendarOff className="h-3.5 w-3.5 mr-1" />
                                    Availability
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setRoomToDelete(room)}
                                    className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                                    title="Delete Room"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {!isLoading && filteredClassrooms.length === 0 && (
                      <div className="text-center p-8 text-muted-foreground">
                        No classrooms found matching &quot;{searchQuery}&quot;.
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

