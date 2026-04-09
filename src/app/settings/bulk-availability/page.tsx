'use client';

import { useState, useContext, useMemo } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Ban, Users, Building, UserCheck, AlertCircle, Trash2 } from 'lucide-react';
import { DataContext } from '@/context/DataContext';
import { ExamSlot, Student, Classroom, Invigilator } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function BulkAvailabilityPage() {
    const { toast } = useToast();
    const { students, setStudents, classrooms, setClassrooms, invigilators, setInvigilators, examSchedule } = useContext(DataContext);

    const [selectedSlotId, setSelectedSlotId] = useState<string>('');
    const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<'students' | 'classrooms' | 'invigilators'>('students');

    const selectedSlot = useMemo(() =>
        examSchedule.find(s => s.id === selectedSlotId),
        [examSchedule, selectedSlotId]);

    const handleSelectAll = (ids: string[]) => {
        const newSet = new Set(selectedEntityIds);
        const allSelected = ids.every(id => newSet.has(id));

        if (allSelected) {
            ids.forEach(id => newSet.delete(id));
        } else {
            ids.forEach(id => newSet.add(id));
        }
        setSelectedEntityIds(newSet);
    };

    const toggleEntity = (id: string) => {
        const newSet = new Set(selectedEntityIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedEntityIds(newSet);
    };

    const handleApplyAvailability = () => {
        if (!selectedSlotId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select an exam session first.' });
            return;
        }

        if (selectedEntityIds.size === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'No items selected.' });
            return;
        }

        const reason = "Bulk unavailability mark";

        if (activeTab === 'students') {
            setStudents(prev => prev.map(s => {
                if (selectedEntityIds.has(s.id)) {
                    const alreadyUnavailable = s.unavailableSlots.some(slot => slot.slotId === selectedSlotId);
                    if (!alreadyUnavailable) {
                        return { ...s, unavailableSlots: [...s.unavailableSlots, { slotId: selectedSlotId, reason }] };
                    }
                }
                return s;
            }));
        } else if (activeTab === 'classrooms') {
            setClassrooms(prev => prev.map(c => {
                if (selectedEntityIds.has(c.id)) {
                    const alreadyUnavailable = c.unavailableSlots.some(slot => slot.slotId === selectedSlotId);
                    if (!alreadyUnavailable) {
                        return { ...c, unavailableSlots: [...c.unavailableSlots, { slotId: selectedSlotId, reason }] };
                    }
                }
                return c;
            }));
        } else {
            setInvigilators(prev => prev.map(i => {
                if (selectedEntityIds.has(i.id)) {
                    const alreadyUnavailable = i.unavailableSlots.some(slot => slot.slotId === selectedSlotId);
                    if (!alreadyUnavailable) {
                        return { ...i, unavailableSlots: [...i.unavailableSlots, { slotId: selectedSlotId, reason }] };
                    }
                }
                return i;
            }));
        }

        toast({ title: 'Success', description: `Marked ${selectedEntityIds.size} ${activeTab} as unavailable.` });
        setSelectedEntityIds(new Set());
    };

    return (
        <SidebarProvider>
            <div className="flex min-h-screen">
                <MainSidebar />
                <SidebarInset>
                    <div className="flex flex-col h-full">
                        <MainHeader />
                        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                            <div className="max-w-5xl mx-auto space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h1 className="text-3xl font-bold tracking-tight">Availability Command Center</h1>
                                        <p className="text-muted-foreground">Batch manage unavailability for students, rooms, and staff.</p>
                                    </div>
                                    <Ban className="w-10 h-10 text-destructive/50" />
                                </div>

                                <Card className="border-primary/10 shadow-lg">
                                    <CardHeader className="bg-muted/30">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5 text-amber-500" />
                                            Step 1: Select Exam Session
                                        </CardTitle>
                                        <CardDescription>All unavailability marked below will apply to this specific session.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <Select onValueChange={setSelectedSlotId} value={selectedSlotId}>
                                            <SelectTrigger className="w-full h-12">
                                                <SelectValue placeholder="Select an exam session (Date | Time | Subject)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {examSchedule.map((slot: ExamSlot) => (
                                                    <SelectItem key={slot.id} value={slot.id}>
                                                        {slot.date} | {slot.time} | {slot.subjectName} ({slot.course})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {selectedSlot && (
                                            <div className="mt-4 p-3 rounded-md bg-amber-500/5 border border-amber-500/10 flex items-center gap-2 text-sm text-amber-600 font-medium">
                                                <AlertCircle className="w-4 h-4" />
                                                Currently configuring unavailability for: {selectedSlot.subjectName} on {selectedSlot.date}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="border-primary/10 shadow-xl overflow-hidden">
                                    <Tabs value={activeTab} onValueChange={(v: any) => { setActiveTab(v); setSelectedEntityIds(new Set()); }}>
                                        <div className="bg-muted/10 border-b px-6 pt-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    Step 2: Selection Matrix
                                                </CardTitle>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">{selectedEntityIds.size} selected</Badge>
                                                    <Button
                                                        onClick={handleApplyAvailability}
                                                        disabled={selectedEntityIds.size === 0 || !selectedSlotId}
                                                        size="sm"
                                                    >
                                                        Apply Unavailability
                                                    </Button>
                                                </div>
                                            </div>
                                            <TabsList className="grid w-full grid-cols-3 mb-4">
                                                <TabsTrigger value="students" className="gap-2">
                                                    <Users className="w-4 h-4" /> Students
                                                </TabsTrigger>
                                                <TabsTrigger value="classrooms" className="gap-2">
                                                    <Building className="w-4 h-4" /> Classrooms
                                                </TabsTrigger>
                                                <TabsTrigger value="invigilators" className="gap-2">
                                                    <UserCheck className="w-4 h-4" /> Invigilators
                                                </TabsTrigger>
                                            </TabsList>
                                        </div>

                                        <TabsContent value="students" className="m-0">
                                            <ScrollArea className="h-[400px]">
                                                <EntityList
                                                    items={students}
                                                    selectedIds={selectedEntityIds}
                                                    onToggle={toggleEntity}
                                                    onSelectAll={handleSelectAll}
                                                    type="student"
                                                />
                                            </ScrollArea>
                                        </TabsContent>
                                        <TabsContent value="classrooms" className="m-0">
                                            <ScrollArea className="h-[400px]">
                                                <EntityList
                                                    items={classrooms}
                                                    selectedIds={selectedEntityIds}
                                                    onToggle={toggleEntity}
                                                    onSelectAll={handleSelectAll}
                                                    type="classroom"
                                                />
                                            </ScrollArea>
                                        </TabsContent>
                                        <TabsContent value="invigilators" className="m-0">
                                            <ScrollArea className="h-[400px]">
                                                <EntityList
                                                    items={invigilators}
                                                    selectedIds={selectedEntityIds}
                                                    onToggle={toggleEntity}
                                                    onSelectAll={handleSelectAll}
                                                    type="invigilator"
                                                />
                                            </ScrollArea>
                                        </TabsContent>
                                    </Tabs>
                                </Card>
                            </div>
                        </main>
                    </div>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}

function EntityList({ items, selectedIds, onToggle, onSelectAll, type }: any) {
    const ids = items.map((i: any) => i.id);
    const allSelectedInList = ids.length > 0 && ids.every((id: string) => selectedIds.has(id));

    return (
        <div className="p-6 pt-2">
            <div className="flex items-center space-x-2 mb-4 p-2 bg-muted/30 rounded border-dashed border">
                <Checkbox
                    id="select-all"
                    checked={allSelectedInList}
                    onCheckedChange={() => onSelectAll(ids)}
                />
                <label htmlFor="select-all" className="text-sm font-semibold cursor-pointer">
                    Select All {type.charAt(0).toUpperCase() + type.slice(1)}s
                </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((item: any) => (
                    <div
                        key={item.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${selectedIds.has(item.id)
                                ? 'bg-primary/5 border-primary ring-1 ring-primary/20'
                                : 'bg-card hover:bg-muted/50'
                            }`}
                        onClick={() => onToggle(item.id)}
                    >
                        <Checkbox checked={selectedIds.has(item.id)} />
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium truncate">{item.name || item.roomNo || item.id}</span>
                            <span className="text-[10px] text-muted-foreground truncate">
                                {item.rollNo || item.building || item.department}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
