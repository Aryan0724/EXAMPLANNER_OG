
'use client';

import { useState, useMemo, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCheck, Search, CalendarOff, History } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Invigilator } from '@/lib/types';
import { AvailabilityDialog } from '@/components/availability-dialog';
import { toast } from '@/hooks/use-toast';
import { DataContext } from '@/context/DataContext';

export default function InvigilatorsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { invigilators, setInvigilators, examSchedule } = useContext(DataContext);
  const isLoading = !invigilators;

  const [dialogState, setDialogState] = useState<{ isOpen: boolean; resource: Invigilator | null }>({ isOpen: false, resource: null });
  const router = useRouter();

  const filteredInvigilators = useMemo(() => {
    const invigilatorsList = invigilators || [];
    if (!searchQuery) {
      return invigilatorsList;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return invigilatorsList.filter(inv =>
      inv.id.toLowerCase().includes(lowercasedQuery) ||
      inv.name.toLowerCase().includes(lowercasedQuery) ||
      inv.department.toLowerCase().includes(lowercasedQuery)
    );
  }, [searchQuery, invigilators]);

  const openDialog = (invigilator: Invigilator) => {
    setDialogState({ isOpen: true, resource: invigilator });
  };
  
  const closeDialog = () => {
    setDialogState({ isOpen: false, resource: null });
  }

  const handleAddUnavailability = (slotId: string, reason: string) => {
    if (!dialogState.resource) return;
    
    const resourceName = dialogState.resource.name;
    if (dialogState.resource.unavailableSlots.some(s => s.slotId === slotId)) {
      toast({
        variant: 'destructive',
        title: 'Already Unavailable',
        description: `${resourceName} is already marked as unavailable for this slot.`,
      });
      return;
    }
    
    const updatedInvigilators = invigilators.map(i => {
      if (i.id === dialogState.resource!.id) {
        return { ...i, unavailableSlots: [...i.unavailableSlots, { slotId, reason }] };
      }
      return i;
    });
    setInvigilators(updatedInvigilators);

    toast({
        title: 'Unavailability Added',
        description: `${resourceName} is now unavailable for the selected slot.`,
    });

    const updatedResource = updatedInvigilators.find(i => i.id === dialogState.resource!.id);
    setDialogState({ isOpen: true, resource: updatedResource || null });
  };

  const handleRemoveUnavailability = (slotId: string) => {
    if (!dialogState.resource) return;

    const resourceName = dialogState.resource.name;
    const updatedInvigilators = invigilators.map(i => {
      if (i.id === dialogState.resource!.id) {
        return { ...i, unavailableSlots: i.unavailableSlots.filter(s => s.slotId !== slotId) };
      }
      return i;
    });
    setInvigilators(updatedInvigilators);
    
    toast({
        title: 'Unavailability Removed',
        description: `${resourceName} is now available for the selected slot.`,
    });
    
    const updatedResource = updatedInvigilators.find(i => i.id === dialogState.resource!.id);
    setDialogState({ isOpen: true, resource: updatedResource || null });
  };

  const handleViewHistory = (invigilatorId: string) => {
    router.push(`/invigilators/${invigilatorId}`);
  }

  return (
    <SidebarProvider>
      <AvailabilityDialog
        isOpen={dialogState.isOpen}
        onClose={closeDialog}
        resource={dialogState.resource}
        resourceType="Invigilator"
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
                        <UserCheck className="h-6 w-6" />
                        <CardTitle>Invigilators</CardTitle>
                      </div>
                      <CardDescription>List of all invigilators available for duty.</CardDescription>
                    </div>
                     <div className="flex items-center gap-2">
                        <div className="w-full max-w-sm">
                        <Input
                            placeholder="Search by ID, Name, Department..."
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
                            <TableHead>Name</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoading && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center p-8">Loading invigilators...</TableCell>
                            </TableRow>
                          )}
                          {!isLoading && filteredInvigilators.map((inv) => (
                            <TableRow key={inv.id}>
                              <TableCell className="font-medium">{inv.id}</TableCell>
                              <TableCell>{inv.name}</TableCell>
                              <TableCell>{inv.department}</TableCell>
                              <TableCell>
                                {inv.unavailableSlots.length > 0 ? (
                                    <Badge variant="destructive">Unavailable ({inv.unavailableSlots.length} slots)</Badge>
                                ) : (
                                  inv.isAvailable ? <Badge variant="secondary">Available</Badge> : <Badge variant="outline">Generally Unavailable</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right space-x-2">
                                <Button variant="outline" size="sm" onClick={() => handleViewHistory(inv.id)}>
                                  <History className="mr-2 h-3 w-3" />
                                  History
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => openDialog(inv)} disabled={!examSchedule}>
                                  <CalendarOff className="mr-2 h-3 w-3" />
                                  Availability
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                   </div>
                    {!isLoading && filteredInvigilators.length === 0 && (
                        <div className="text-center p-8 text-muted-foreground">
                            No invigilators found.
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
