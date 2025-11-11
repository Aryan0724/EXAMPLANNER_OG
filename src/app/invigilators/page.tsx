
'use client';

import { useState, useMemo } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCheck, Search, CalendarOff } from 'lucide-react';
import { INVIGILATORS as initialInvigilators } from '@/lib/data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Invigilator } from '@/lib/types';
import { AvailabilityDialog } from '@/components/availability-dialog';
import { toast } from '@/hooks/use-toast';

export default function InvigilatorsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [invigilators, setInvigilators] = useState<Invigilator[]>(initialInvigilators);
  const [dialogState, setDialogState] = useState<{ isOpen: boolean; resource: Invigilator | null }>({ isOpen: false, resource: null });

  const filteredInvigilators = useMemo(() => {
    if (!searchQuery) {
      return invigilators;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return invigilators.filter(inv =>
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
    
    let resourceName = '';
    const updatedInvigilators = invigilators.map(inv => {
      if (inv.id === dialogState.resource?.id) {
        resourceName = inv.name;
        if (inv.unavailableSlots.some(s => s.slotId === slotId)) {
          toast({
            variant: 'destructive',
            title: 'Already Unavailable',
            description: `${resourceName} is already marked as unavailable for this slot.`,
          });
          return inv;
        }
        const newSlots = [...inv.unavailableSlots, { slotId, reason }];
        return { ...inv, unavailableSlots: newSlots };
      }
      return inv;
    });

    setDialogState(prev => ({ ...prev, resource: updatedInvigilators.find(i => i.id === prev.resource?.id) || null }));
    setInvigilators(updatedInvigilators);

    if (resourceName) {
      toast({
          title: 'Unavailability Added',
          description: `${resourceName} is now unavailable for the selected slot.`,
      });
    }
  };

  const handleRemoveUnavailability = (slotId: string) => {
    if (!dialogState.resource) return;

    let resourceName = '';
    const updatedInvigilators = invigilators.map(inv => {
        if (inv.id === dialogState.resource?.id) {
            resourceName = inv.name;
            const newSlots = inv.unavailableSlots.filter(s => s.slotId !== slotId);
            return { ...inv, unavailableSlots: newSlots };
        }
        return inv;
    });

    setDialogState(prev => ({ ...prev, resource: updatedInvigilators.find(i => i.id === prev.resource?.id) || null }));
    setInvigilators(updatedInvigilators);
    toast({
        title: 'Unavailability Removed',
        description: `${resourceName} is now available for the selected slot.`,
    });
  };

  return (
    <SidebarProvider>
      <AvailabilityDialog
        isOpen={dialogState.isOpen}
        onClose={closeDialog}
        resource={dialogState.resource}
        resourceType="Invigilator"
        onSubmit={handleAddUnavailability}
        onRemove={handleRemoveUnavailability}
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
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredInvigilators.map((inv) => (
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
                              <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => openDialog(inv)}>
                                    <CalendarOff className="mr-2 h-3 w-3" />
                                    Manage Availability
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
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

    