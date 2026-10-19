'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeftRight,
  UserCheck,
  Calendar,
  Clock,
  DoorOpen,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  Search
} from 'lucide-react';
import type { SeatPlan, InvigilatorAssignment, Classroom, Invigilator } from '@/lib/types';
import { getFacultySeniority } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

type FullAllotment = Record<string, { seatPlan: SeatPlan; invigilatorAssignments: InvigilatorAssignment[] }>;

interface FlatDuty {
  id: string; // sessionKey___idx
  sessionKey: string;
  date: string;
  time: string;
  shiftDisplay: string;
  classroom: Classroom | null;
  roomName: string;
  isReserved: boolean;
  invigilator: Invigilator;
  assignmentIndex: number;
  isExchanged?: boolean;
  exchangedWith?: string;
  originalInvigilatorName?: string;
  originalInvigilatorId?: string;
  exchangeReason?: string;
  exchangeTimestamp?: string;
}

interface FacultyDutyExchangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fullAllotment: FullAllotment | null;
  setFullAllotment: (updater: (prev: FullAllotment | null) => FullAllotment | null) => void;
  initialDutyId?: string;
}

export function FacultyDutyExchangeDialog({
  isOpen,
  onClose,
  fullAllotment,
  setFullAllotment,
  initialDutyId,
}: FacultyDutyExchangeDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'exchange' | 'history'>('exchange');
  const [dutyId1, setDutyId1] = useState<string>(initialDutyId || '');
  const [dutyId2, setDutyId2] = useState<string>('');
  const [reason, setReason] = useState<string>('Mutual duty swap request');
  const [searchFilter1, setSearchFilter1] = useState('');
  const [searchFilter2, setSearchFilter2] = useState('');

  // Extract all flat duties across all sessions
  const flatDuties: FlatDuty[] = useMemo(() => {
    if (!fullAllotment) return [];
    const duties: FlatDuty[] = [];

    const sortedSessionKeys = Object.keys(fullAllotment).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    sortedSessionKeys.forEach((sKey) => {
      const sData = fullAllotment[sKey];
      if (!sData?.invigilatorAssignments) return;

      const [datePart, timePart] = sKey.split(' ');
      const repExam = Array.isArray(sData.seatPlan?.exam) ? sData.seatPlan.exam[0] : sData.seatPlan?.exam;
      const shiftNum = repExam?.shift || (parseInt(timePart?.split(':')[0] || '9') < 12 ? 1 : 2);
      const shiftRoman = ['I', 'II', 'III', 'IV'][shiftNum - 1] || `Shift ${shiftNum}`;
      const shiftDisplay = `Shift ${shiftRoman} (${timePart || '09:30'})`;

      sData.invigilatorAssignments.forEach((asg, idx) => {
        if (!asg?.invigilator) return;
        const id = `${sKey}___${idx}`;
        duties.push({
          id,
          sessionKey: sKey,
          date: datePart || repExam?.date || '',
          time: timePart || repExam?.time || '',
          shiftDisplay,
          classroom: asg.classroom,
          roomName: asg.isReserved ? 'Reserved / Standby Staff' : (asg.classroom?.roomNo || 'Room'),
          isReserved: !!asg.isReserved,
          invigilator: asg.invigilator,
          assignmentIndex: idx,
          isExchanged: asg.isExchanged,
          exchangedWith: asg.exchangedWith,
          originalInvigilatorName: asg.originalInvigilatorName,
          originalInvigilatorId: asg.originalInvigilatorId,
          exchangeReason: asg.exchangeReason,
          exchangeTimestamp: asg.exchangeTimestamp,
        });
      });
    });

    return duties;
  }, [fullAllotment]);

  // If initialDutyId is provided and changed, set it
  React.useEffect(() => {
    if (initialDutyId) {
      setDutyId1(initialDutyId);
    }
  }, [initialDutyId, isOpen]);

  const selectedDuty1 = useMemo(() => flatDuties.find((d) => d.id === dutyId1), [flatDuties, dutyId1]);
  const selectedDuty2 = useMemo(() => flatDuties.find((d) => d.id === dutyId2), [flatDuties, dutyId2]);

  // List of all currently exchanged duties
  const exchangedDuties = useMemo(() => {
    return flatDuties.filter((d) => d.isExchanged);
  }, [flatDuties]);

  // Filter options for Duty 1
  const availableForDuty1 = useMemo(() => {
    if (!searchFilter1) return flatDuties;
    const q = searchFilter1.toLowerCase();
    return flatDuties.filter(
      (d) =>
        d.invigilator.name.toLowerCase().includes(q) ||
        d.roomName.toLowerCase().includes(q) ||
        d.date.includes(q) ||
        d.shiftDisplay.toLowerCase().includes(q)
    );
  }, [flatDuties, searchFilter1]);

  // Filter options for Duty 2 (cannot be same duty or same faculty within same slot)
  const availableForDuty2 = useMemo(() => {
    return flatDuties.filter((d) => {
      if (d.id === dutyId1) return false;
      if (selectedDuty1 && d.invigilator.id === selectedDuty1.invigilator.id) return false;
      if (searchFilter2) {
        const q = searchFilter2.toLowerCase();
        return (
          d.invigilator.name.toLowerCase().includes(q) ||
          d.roomName.toLowerCase().includes(q) ||
          d.date.includes(q) ||
          d.shiftDisplay.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [flatDuties, dutyId1, selectedDuty1, searchFilter2]);

  const handlePerformExchange = () => {
    if (!selectedDuty1 || !selectedDuty2) {
      toast({
        variant: 'destructive',
        title: 'Incomplete Selection',
        description: 'Please select both faculty duties to exchange.',
      });
      return;
    }

    if (selectedDuty1.invigilator.id === selectedDuty2.invigilator.id) {
      toast({
        variant: 'destructive',
        title: 'Same Faculty Selected',
        description: 'You cannot exchange duties with the same faculty member.',
      });
      return;
    }

    const timestamp = new Date().toISOString();
    const reasonText = reason.trim() || 'Mutual duty exchange';

    setFullAllotment((prev) => {
      if (!prev) return null;
      const next: FullAllotment = JSON.parse(JSON.stringify(prev));

      const session1 = next[selectedDuty1.sessionKey];
      const session2 = next[selectedDuty2.sessionKey];

      if (!session1 || !session2) return prev;

      const asg1 = session1.invigilatorAssignments[selectedDuty1.assignmentIndex];
      const asg2 = session2.invigilatorAssignments[selectedDuty2.assignmentIndex];

      if (!asg1 || !asg2) return prev;

      const facultyA = asg1.invigilator;
      const facultyB = asg2.invigilator;

      // Assign Faculty B to Duty 1
      session1.invigilatorAssignments[selectedDuty1.assignmentIndex] = {
        ...asg1,
        invigilator: facultyB,
        isExchanged: true,
        exchangedWith: facultyA.name,
        originalInvigilatorName: facultyA.name,
        originalInvigilatorId: facultyA.id,
        exchangeReason: reasonText,
        exchangeTimestamp: timestamp,
      };

      // Assign Faculty A to Duty 2
      session2.invigilatorAssignments[selectedDuty2.assignmentIndex] = {
        ...asg2,
        invigilator: facultyA,
        isExchanged: true,
        exchangedWith: facultyB.name,
        originalInvigilatorName: facultyB.name,
        originalInvigilatorId: facultyB.id,
        exchangeReason: reasonText,
        exchangeTimestamp: timestamp,
      };

      return next;
    });

    toast({
      title: 'Duty Exchange Marked & Saved',
      description: `Successfully swapped duties between ${selectedDuty1.invigilator.name} and ${selectedDuty2.invigilator.name}. This is highlighted in amber across all views and Excel exports.`,
    });

    setDutyId2('');
    onClose();
  };

  const handleRevertExchange = (duty: FlatDuty) => {
    const origId = duty.originalInvigilatorId;
    const origName = duty.originalInvigilatorName;

    if (!origId || !origName) {
      toast({
        variant: 'destructive',
        title: 'Cannot Revert',
        description: 'Missing original faculty record for this exchange.',
      });
      return;
    }

    setFullAllotment((prev) => {
      if (!prev) return null;
      const next: FullAllotment = JSON.parse(JSON.stringify(prev));

      const sData = next[duty.sessionKey];
      if (!sData?.invigilatorAssignments) return prev;

      const asg = sData.invigilatorAssignments[duty.assignmentIndex];
      if (!asg) return prev;

      // Find the counterpart duty where original was duty.invigilator.id
      let counterpartFound = false;
      Object.keys(next).forEach((sKey) => {
        next[sKey].invigilatorAssignments.forEach((cAsg) => {
          if (
            cAsg.isExchanged &&
            cAsg.originalInvigilatorId === asg.invigilator.id &&
            cAsg.invigilator.id === origId
          ) {
            // Restore counterpart
            cAsg.invigilator = {
              ...cAsg.invigilator,
              id: asg.invigilator.id,
              name: asg.invigilator.name,
            };
            cAsg.isExchanged = false;
            delete cAsg.exchangedWith;
            delete cAsg.originalInvigilatorName;
            delete cAsg.originalInvigilatorId;
            delete cAsg.exchangeReason;
            delete cAsg.exchangeTimestamp;
            counterpartFound = true;
          }
        });
      });

      // Restore this duty to original
      asg.invigilator = {
        ...asg.invigilator,
        id: origId,
        name: origName,
      };
      asg.isExchanged = false;
      delete asg.exchangedWith;
      delete asg.originalInvigilatorName;
      delete asg.originalInvigilatorId;
      delete asg.exchangeReason;
      delete asg.exchangeTimestamp;

      return next;
    });

    toast({
      title: 'Duty Exchange Reverted',
      description: `Reverted ${duty.invigilator.name} back to original duty assignment.`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                Faculty Duty Exchange
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 text-xs">
                  Highlighted in Exports
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Exchange duties between two faculty members. Exchanged entries are automatically color-coded in amber in all Excel reports.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-2 my-2">
            <TabsTrigger value="exchange" className="text-xs font-semibold gap-1.5">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Swap Duties
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs font-semibold gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Exchanged Log ({exchangedDuties.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="exchange" className="flex-1 flex flex-col min-h-0 space-y-4 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Duty 1 - Faculty A */}
              <div className="space-y-2 border rounded-xl p-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-primary" />
                    Duty 1 (Faculty A)
                  </Label>
                  {selectedDuty1 && (
                    <Badge variant="outline" className="text-[10px]">
                      {getFacultySeniority(selectedDuty1.invigilator)}
                    </Badge>
                  )}
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search Faculty A or Room..."
                    value={searchFilter1}
                    onChange={(e) => setSearchFilter1(e.target.value)}
                    className="pl-8 h-8 text-xs mb-2"
                  />
                </div>

                <Select value={dutyId1} onValueChange={setDutyId1}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Select Faculty A's duty..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {availableForDuty1.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-xs">
                        {d.invigilator.name} — {d.date} ({d.shiftDisplay}) [{d.roomName}]
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedDuty1 && (
                  <Card className="bg-background/80 border-primary/20 shadow-xs mt-2">
                    <CardContent className="p-3 text-xs space-y-1.5">
                      <div className="font-bold text-sm text-primary">{selectedDuty1.invigilator.name}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <span>{selectedDuty1.invigilator.designation}</span>
                        <span>•</span>
                        <span>{selectedDuty1.invigilator.department}</span>
                      </div>
                      <div className="pt-1.5 border-t border-border/40 grid grid-cols-2 gap-1 text-[11px]">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" /> {selectedDuty1.date}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" /> {selectedDuty1.shiftDisplay}
                        </div>
                        <div className="col-span-2 flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300">
                          <DoorOpen className="h-3 w-3" /> {selectedDuty1.roomName}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Duty 2 - Faculty B */}
              <div className="space-y-2 border rounded-xl p-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-primary" />
                    Duty 2 (Faculty B)
                  </Label>
                  {selectedDuty2 && (
                    <Badge variant="outline" className="text-[10px]">
                      {getFacultySeniority(selectedDuty2.invigilator)}
                    </Badge>
                  )}
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search Faculty B or Room..."
                    value={searchFilter2}
                    onChange={(e) => setSearchFilter2(e.target.value)}
                    className="pl-8 h-8 text-xs mb-2"
                  />
                </div>

                <Select value={dutyId2} onValueChange={setDutyId2} disabled={!dutyId1}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder={dutyId1 ? "Select Faculty B's duty..." : 'Choose Duty 1 first'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {availableForDuty2.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-xs">
                        {d.invigilator.name} — {d.date} ({d.shiftDisplay}) [{d.roomName}]
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedDuty2 && (
                  <Card className="bg-background/80 border-primary/20 shadow-xs mt-2">
                    <CardContent className="p-3 text-xs space-y-1.5">
                      <div className="font-bold text-sm text-primary">{selectedDuty2.invigilator.name}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <span>{selectedDuty2.invigilator.designation}</span>
                        <span>•</span>
                        <span>{selectedDuty2.invigilator.department}</span>
                      </div>
                      <div className="pt-1.5 border-t border-border/40 grid grid-cols-2 gap-1 text-[11px]">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" /> {selectedDuty2.date}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" /> {selectedDuty2.shiftDisplay}
                        </div>
                        <div className="col-span-2 flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300">
                          <DoorOpen className="h-3 w-3" /> {selectedDuty2.roomName}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Exchange Preview */}
            {selectedDuty1 && selectedDuty2 && (
              <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-300/80 dark:border-amber-900/50 space-y-2">
                <div className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  Duty Exchange Preview
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/80 dark:bg-black/30 p-2 rounded border border-amber-200 dark:border-amber-900/40">
                    <span className="font-semibold text-primary">{selectedDuty1.invigilator.name}</span> will take:
                    <div className="font-medium text-foreground mt-0.5">
                      {selectedDuty2.date} • {selectedDuty2.shiftDisplay} in <span className="underline">{selectedDuty2.roomName}</span>
                    </div>
                  </div>
                  <div className="bg-white/80 dark:bg-black/30 p-2 rounded border border-amber-200 dark:border-amber-900/40">
                    <span className="font-semibold text-primary">{selectedDuty2.invigilator.name}</span> will take:
                    <div className="font-medium text-foreground mt-0.5">
                      {selectedDuty1.date} • {selectedDuty1.shiftDisplay} in <span className="underline">{selectedDuty1.roomName}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-1.5">
              <Label htmlFor="reason" className="text-xs font-semibold">
                Exchange Reason / Note (Optional)
              </Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Mutual swap, Medical emergency, Conference..."
                className="text-xs h-8"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Mutual Request', 'Medical Leave', 'Academic Conference', 'Emergency Swap'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setReason(preset)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* History / Log Tab */}
          <TabsContent value="history" className="flex-1 flex flex-col min-h-0 pt-1">
            {exchangedDuties.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground border rounded-xl border-dashed">
                <Info className="h-8 w-8 text-muted-foreground/60 mb-2" />
                <p className="text-xs font-medium">No duty exchanges have been marked yet.</p>
                <p className="text-[11px] text-muted-foreground">
                  When you swap duties on the &quot;Swap Duties&quot; tab, they will be listed here with an undo option.
                </p>
              </div>
            ) : (
              <ScrollArea className="flex-1 pr-3">
                <div className="space-y-2">
                  {exchangedDuties.map((d) => (
                    <div
                      key={d.id}
                      className="p-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{d.invigilator.name}</span>
                          <Badge className="bg-amber-200 text-amber-900 border-amber-300 text-[10px]">
                            🔄 Swapped
                          </Badge>
                          {d.originalInvigilatorName && (
                            <span className="text-muted-foreground text-[11px]">
                              (Originally: <span className="font-medium">{d.originalInvigilatorName}</span>)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                          <span>📅 {d.date}</span>
                          <span>⏰ {d.shiftDisplay}</span>
                          <span>🚪 {d.roomName}</span>
                        </div>
                        {d.exchangeReason && (
                          <div className="text-[10px] text-amber-800 dark:text-amber-300 italic">
                            Reason: &quot;{d.exchangeReason}&quot;
                          </div>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevertExchange(d)}
                        className="text-xs h-7 border-amber-400 hover:bg-amber-100 text-amber-900 dark:text-amber-200 shrink-0"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Revert
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-3 border-t border-border/60 flex items-center justify-between sm:justify-between">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-400 border border-amber-600"></span>
            <span>Amber highlight in detailed Excel duty chart & rosters</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            {activeTab === 'exchange' && (
              <Button
                size="sm"
                onClick={handlePerformExchange}
                disabled={!selectedDuty1 || !selectedDuty2}
                className="text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
              >
                <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" />
                Confirm Duty Exchange
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
