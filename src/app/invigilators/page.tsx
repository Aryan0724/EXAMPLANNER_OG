'use client';

import { useState, useMemo, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  UserCheck,
  Search,
  CalendarOff,
  History,
  Filter,
  GraduationCap,
  Users,
  Briefcase,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Pencil
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Invigilator } from '@/lib/types';
import { DEPARTMENTS } from '@/lib/data';
import { AvailabilityDialog } from '@/components/availability-dialog';
import { toast } from '@/hooks/use-toast';
import { DataContext } from '@/context/DataContext';

import { InvigilatorDialog } from '@/components/invigilator-dialog';

export default function InvigilatorsPage() {
  const { invigilators, setInvigilators, examSchedule, isHydrated } = useContext(DataContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [desigFilter, setDesigFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');

  const [dialogState, setDialogState] = useState<{ isOpen: boolean; resource: Invigilator | null }>({ isOpen: false, resource: null });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingInvigilator, setEditingInvigilator] = useState<Invigilator | null>(null);

  const router = useRouter();

  const handleSaveInvigilator = (inv: Invigilator) => {
    if (editingInvigilator) {
      // Update existing
      setInvigilators(prev => prev.map(i => i.id === inv.id ? inv : i));
      toast({ title: 'Staff Updated', description: `${inv.name} has been updated.` });
    } else {
      // Add new
      if (invigilators.some(i => i.id === inv.id)) {
        toast({ variant: 'destructive', title: 'Error', description: 'Employee ID already exists.' });
        return;
      }
      setInvigilators(prev => [...prev, inv]);
      toast({ title: 'Staff Added', description: `${inv.name} added to the system.` });
    }
    setIsAddDialogOpen(false);
    setEditingInvigilator(null);
  };

  const openAddDialog = (inv?: Invigilator) => {
    setEditingInvigilator(inv || null);
    setIsAddDialogOpen(true);
  };

  const stats = useMemo(() => {
    if (!invigilators) return { total: 0, profs: 0, assoc: 0, assist: 0, active: 0, female: 0 };
    return {
      total: invigilators.length,
      profs: invigilators.filter(i => i.designation === 'Professor').length,
      assoc: invigilators.filter(i => i.designation === 'Associate Professor').length,
      assist: invigilators.filter(i => i.designation === 'Assistant Professor').length,
      active: invigilators.filter(i => i.isAvailable && i.unavailableSlots.length === 0).length,
      female: invigilators.filter(i => i.gender === 'Female').length
    };
  }, [invigilators]);

  const filteredInvigilators = useMemo(() => {
    let list = invigilators || [];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(inv =>
        inv.name.toLowerCase().includes(q) ||
        inv.id.toLowerCase().includes(q)
      );
    }

    if (deptFilter !== 'all') {
      list = list.filter(inv => inv.department === deptFilter);
    }

    if (desigFilter !== 'all') {
      list = list.filter(inv => inv.designation === desigFilter);
    }

    if (genderFilter !== 'all') {
      list = list.filter(inv => inv.gender === genderFilter);
    }

    return list;
  }, [invigilators, searchQuery, deptFilter, desigFilter, genderFilter]);

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
        title: 'Already Mark as Unavailable',
        description: `${resourceName} is already unavailable for this slot.`,
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
      title: 'Adjustment Saved',
      description: `${resourceName}'s schedule has been updated.`,
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
      title: 'Availability Restored',
      description: `${resourceName} is now available for this slot.`,
    });

    const updatedResource = updatedInvigilators.find(i => i.id === dialogState.resource!.id);
    setDialogState({ isOpen: true, resource: updatedResource || null });
  };

  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Synchronizing Staff Records...</p>
        </div>
      </div>
    );
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
      <InvigilatorDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSave={handleSaveInvigilator}
        invigilator={editingInvigilator}
        departments={DEPARTMENTS}
      />
      <div className="flex min-h-screen">
        <MainSidebar />
        <SidebarInset>
          <div className="flex flex-col h-full">
            <MainHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">

              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                  <h1 className="text-3xl font-bold tracking-tight">Invigilator Management</h1>
                  <p className="text-muted-foreground">Manage faculty assignments, constraints, and total duty counts.</p>
                </div>
                <Button onClick={() => openAddDialog()}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Add Invigilator
                </Button>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      Total Staff
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <p className="text-xs text-muted-foreground">{stats.female} Female | {stats.total - stats.female} Male</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-blue-500" />
                      Seniority Mix
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-[10px]">{stats.profs} Prof.</Badge>
                      <Badge variant="secondary" className="text-[10px]">{stats.assoc} Assoc.</Badge>
                      <Badge variant="secondary" className="text-[10px]">{stats.assist} Assist.</Badge>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Active Pool
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.active}</div>
                    <p className="text-xs text-muted-foreground">Ready for next session</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-amber-500" />
                      Duty Load
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {invigilators.reduce((sum, i) => sum + i.assignedDuties.reduce((acc, d) => acc + d.count, 0), 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Total duties assigned</p>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <Card>
                <CardHeader className="pb-4 border-b">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <CardTitle className="text-base">Filters & Search</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search Name or ID..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={deptFilter} onValueChange={setDeptFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={desigFilter} onValueChange={setDesigFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Designation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Designations</SelectItem>
                      <SelectItem value="Professor">Professor</SelectItem>
                      <SelectItem value="Associate Professor">Associate Professor</SelectItem>
                      <SelectItem value="Assistant Professor">Assistant Professor</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={genderFilter} onValueChange={setGenderFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Genders</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Main Table */}
              <Card className="shadow-xl">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[100px] pl-6 text-xs uppercase font-bold text-muted-foreground">ID</TableHead>
                        <TableHead className="text-xs uppercase font-bold text-muted-foreground">Invigilator</TableHead>
                        <TableHead className="text-xs uppercase font-bold text-muted-foreground">Department</TableHead>
                        <TableHead className="text-xs uppercase font-bold text-muted-foreground text-center">Duties</TableHead>
                        <TableHead className="text-xs uppercase font-bold text-muted-foreground text-center">Status</TableHead>
                        <TableHead className="text-right pr-6 text-xs uppercase font-bold text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvigilators.map((inv) => {
                        const dutyCount = inv.assignedDuties.reduce((acc, d) => acc + d.count, 0);
                        return (
                          <TableRow key={inv.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="pl-6 font-mono text-xs">{inv.id}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${inv.gender === 'Female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {inv.name.split(' ').pop()?.charAt(0)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-sm">{inv.name}</span>
                                  <span className="text-[10px] text-muted-foreground italic uppercase">{inv.designation}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-normal">{inv.department}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={dutyCount > 5 ? "destructive" : "secondary"}
                                className="px-2 font-mono"
                              >
                                {dutyCount}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {inv.isAvailable && inv.unavailableSlots.length === 0 ? (
                                <div className="flex items-center justify-center text-emerald-500 gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-bold uppercase">Ready</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center text-rose-500 gap-1">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-bold uppercase">Restricted</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2"
                                  onClick={() => openAddDialog(inv)}
                                >
                                  <Pencil className="w-4 h-4 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-primary"
                                  onClick={() => router.push(`/invigilators/${inv.id}`)}
                                >
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  History
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2"
                                  onClick={() => openDialog(inv)}
                                >
                                  <CalendarOff className="w-4 h-4 mr-1" />
                                  Availability
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {filteredInvigilators.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground italic border-t">
                      <Search className="w-10 h-10 mb-2 opacity-20" />
                      No staff found matching these filters.
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
