'use client';

import React, { useState, useContext, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Calendar, UserCheck, Plus, Trash2, Search, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { DataContext } from '@/context/DataContext';
import { useToast } from '@/hooks/use-toast';
import type { Invigilator } from '@/lib/types';

interface FacultyTimeRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FacultyTimeRequestsDialog({ open, onOpenChange }: FacultyTimeRequestsDialogProps) {
  const { invigilators, setInvigilators, examSchedule } = useContext(DataContext);
  const { toast } = useToast();

  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('2026-05-14');
  const [selectedShift, setSelectedShift] = useState<string>('Shift I (09:30 AM)');
  const [reason, setReason] = useState<string>('Medical Leave / Exemption Request');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract distinct dates from schedule or default to standard dates
  const availableDates = useMemo(() => {
    const dates = Array.from(new Set(examSchedule.map(e => e.date))).filter(Boolean);
    if (dates.length > 0) return dates.sort();
    return ['2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18', '2026-05-19'];
  }, [examSchedule]);

  // Aggregate all active faculty time requests
  const activeRequests = useMemo(() => {
    const list: {
      facultyId: string;
      facultyName: string;
      department: string;
      designation: string;
      slotId: string;
      reason: string;
    }[] = [];

    invigilators.forEach(inv => {
      if (inv.unavailableSlots && inv.unavailableSlots.length > 0) {
        inv.unavailableSlots.forEach(slot => {
          list.push({
            facultyId: inv.id,
            facultyName: inv.name,
            department: inv.department,
            designation: inv.designation,
            slotId: slot.slotId,
            reason: slot.reason || 'Requested Exemption',
          });
        });
      }
    });

    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(r =>
      r.facultyName.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q) ||
      r.slotId.toLowerCase().includes(q) ||
      r.reason.toLowerCase().includes(q)
    );
  }, [invigilators, searchQuery]);

  const handleAddRequest = () => {
    if (!selectedFacultyId) {
      toast({
        variant: 'destructive',
        title: 'Select Faculty',
        description: 'Please select a faculty member who asked for time exemption.',
      });
      return;
    }

    const slotIdentifier = `${selectedDate} ${selectedShift}`;

    setInvigilators(prev =>
      prev.map(inv => {
        if (inv.id === selectedFacultyId) {
          const currentSlots = inv.unavailableSlots || [];
          // Avoid duplicate slot
          if (currentSlots.some(s => s.slotId === slotIdentifier)) {
            return inv;
          }
          return {
            ...inv,
            unavailableSlots: [
              ...currentSlots,
              { slotId: slotIdentifier, reason: reason.trim() || 'Faculty Time Exemption Request' },
            ],
          };
        }
        return inv;
      })
    );

    const targetFaculty = invigilators.find(i => i.id === selectedFacultyId);
    toast({
      title: 'Time Request Registered',
      description: `Marked ${targetFaculty?.name || 'Faculty'} unavailable on ${slotIdentifier}. Both allotment engines will respect this constraint.`,
    });

    // Reset selection
    setSelectedFacultyId('');
  };

  const handleRemoveRequest = (facultyId: string, slotId: string) => {
    setInvigilators(prev =>
      prev.map(inv => {
        if (inv.id === facultyId) {
          return {
            ...inv,
            unavailableSlots: (inv.unavailableSlots || []).filter(s => s.slotId !== slotId),
          };
        }
        return inv;
      })
    );

    toast({
      title: 'Request Removed',
      description: 'The faculty member is now eligible for duty assignment during that time slot.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/50 rounded-lg text-blue-700 dark:text-blue-300">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Faculty Time Requests & Availability</DialogTitle>
              <DialogDescription className="text-xs">
                Manage individual faculty slot requests, leave applications, and time-shift exemptions. The allotment engine will strictly avoid scheduling them during these requested slots.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3 flex-1 overflow-y-auto">
          {/* Add New Request Form Card */}
          <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
              <Plus className="w-4 h-4 text-primary" />
              <span>Register New Time Request</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Faculty Selector */}
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Faculty Member</Label>
                <Select value={selectedFacultyId} onValueChange={setSelectedFacultyId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select faculty member..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {invigilators.map(inv => (
                      <SelectItem key={inv.id} value={inv.id} className="text-xs">
                        {inv.name} ({inv.designation} - {inv.department})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger className="h-9 text-xs font-mono">
                    <SelectValue placeholder="Select date" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDates.map(date => (
                      <SelectItem key={date} value={date} className="text-xs font-mono">
                        {date}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Shift */}
              <div className="space-y-1">
                <Label className="text-xs">Time / Shift</Label>
                <Select value={selectedShift} onValueChange={setSelectedShift}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Shift I (09:30 AM)" className="text-xs">Shift I (09:30 AM)</SelectItem>
                    <SelectItem value="Shift II (01:30 PM)" className="text-xs">Shift II (01:30 PM)</SelectItem>
                    <SelectItem value="All Day (Exempt)" className="text-xs">Full Day (All Shifts)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Reason & Action Row */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <div className="flex-1 w-full space-y-1">
                <Input
                  placeholder="Reason / Request note (e.g. Medical Leave, Academic Duty, Morning Viva, External)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <Button
                size="sm"
                onClick={handleAddRequest}
                className="w-full sm:w-auto h-9 font-semibold text-xs gap-1.5 bg-primary text-primary-foreground shadow-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Time Constraint</span>
              </Button>
            </div>
          </div>

          {/* Active Requests List */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Active Faculty Exemptions & Requests ({activeRequests.length})
                </span>
                {activeRequests.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                    Enforced in Allotment
                  </Badge>
                )}
              </div>

              {activeRequests.length > 4 && (
                <div className="w-full sm:w-48 relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search requests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              )}
            </div>

            {activeRequests.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed bg-muted/10 text-muted-foreground text-xs space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 opacity-80" />
                <p className="font-semibold text-foreground text-sm">No Time Exemption Requests Active</p>
                <p className="max-w-md mx-auto">
                  All {invigilators.length} faculty members are currently available for scheduling across all exam sessions. Use the form above if any faculty member has submitted a leave or time preference request.
                </p>
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden shadow-xs">
                <Table>
                  <TableHeader className="bg-muted/40 text-xs">
                    <TableRow>
                      <TableHead>Faculty Name</TableHead>
                      <TableHead>Designation & Dept</TableHead>
                      <TableHead>Requested Time Slot</TableHead>
                      <TableHead>Exemption Reason</TableHead>
                      <TableHead className="text-right w-16">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {activeRequests.map((req, idx) => (
                      <TableRow key={`${req.facultyId}-${req.slotId}-${idx}`} className="hover:bg-muted/20">
                        <TableCell className="font-semibold">{req.facultyName}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {req.designation} • <span className="font-medium text-foreground">{req.department}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[11px] border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300">
                            {req.slotId}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{req.reason}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveRequest(req.facultyId, req.slotId)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Remove exemption"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-3 border-t flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 mb-2 sm:mb-0">
            <ShieldAlert className="w-4 h-4 text-primary shrink-0" />
            <span>Exemptions are honored synchronously by both Shift Allotment and Student Seating engines.</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
