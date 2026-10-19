'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CalendarCheck2,
  Armchair,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Users,
  FileSpreadsheet,
  Building,
} from 'lucide-react';

interface AllotmentChoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMode: (mode: 'shift-duty' | 'full') => void;
  currentMode?: 'shift-duty' | 'full';
}

export function AllotmentChoiceDialog({
  open,
  onOpenChange,
  onSelectMode,
  currentMode,
}: AllotmentChoiceDialogProps) {
  const handleSelect = (mode: 'shift-duty' | 'full') => {
    onSelectMode(mode);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-6 sm:p-8">
        <DialogHeader className="text-center sm:text-left space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-primary border-primary/30">
              Examination Allotment Engine
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">GEHU Examination Hub</span>
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            Select Allotment Type
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            The university system supports two distinct allotment workflows. Select the type that matches your current administrative requirements.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
          {/* Kind 1: Faculty Shift Duty Allotment */}
          <div
            onClick={() => handleSelect('shift-duty')}
            className={`group relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              currentMode === 'shift-duty'
                ? 'border-emerald-500 bg-emerald-500/5 shadow-md shadow-emerald-500/10'
                : 'border-border hover:border-emerald-500/60 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 hover:shadow-md'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  <CalendarCheck2 className="size-6" />
                </div>
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px]">
                  Kind 1: Shift Roster
                </Badge>
              </div>

              <div>
                <h3 className="text-lg font-bold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Faculty Shift Duty Allotment
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Provide classroom count and required faculty count per shift/day. The engine auto-allots faculties, prioritizes junior staff, honors staff leave/time requests, and outputs the official Duty Chart.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted/60 border text-[11px] space-y-1.5 font-mono">
                <div className="flex justify-between text-muted-foreground">
                  <span className="font-semibold text-foreground">Inputs:</span>
                  <span>Rooms + Teachers required/shift</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span className="font-semibold text-foreground">Fairness:</span>
                  <span>Junior priority + load balancing</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span className="font-semibold text-foreground">Output:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Official Duty Chart (.xlsx)</span>
                </div>
              </div>
            </div>

            <div className="pt-5 mt-auto">
              <Button
                variant={currentMode === 'shift-duty' ? 'default' : 'outline'}
                className={`w-full font-semibold gap-2 ${
                  currentMode === 'shift-duty'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'group-hover:border-emerald-500 group-hover:text-emerald-600'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect('shift-duty');
                }}
              >
                <span>Select Faculty Shift Allotment</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>

          {/* Kind 2: Full Examination & Seating Allotment */}
          <div
            onClick={() => handleSelect('full')}
            className={`group relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              currentMode === 'full'
                ? 'border-indigo-500 bg-indigo-500/5 shadow-md shadow-indigo-500/10'
                : 'border-border hover:border-indigo-500/60 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 hover:shadow-md'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  <Armchair className="size-6" />
                </div>
                <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px]">
                  Kind 2: Full 1-Click
                </Badge>
              </div>

              <div>
                <h3 className="text-lg font-bold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Full Seating & Room Allotment
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Upload the date sheet schedule. System uses classroom block priorities, reserved seats, 1:24 teacher-student ratio, and designation caps to execute 24-rule student seating and invigilation.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted/60 border text-[11px] space-y-1.5 font-mono">
                <div className="flex justify-between text-muted-foreground">
                  <span className="font-semibold text-foreground">Inputs:</span>
                  <span>Exam Schedule + Priorities + Ratios</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span className="font-semibold text-foreground">Rules:</span>
                  <span>Strict 24 Anti-Cheating Rules</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span className="font-semibold text-foreground">Output:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">Desk Grids, Master Report & Rosters</span>
                </div>
              </div>
            </div>

            <div className="pt-5 mt-auto">
              <Button
                variant={currentMode === 'full' ? 'default' : 'outline'}
                className={`w-full font-semibold gap-2 ${
                  currentMode === 'full'
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'group-hover:border-indigo-500 group-hover:text-indigo-600'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect('full');
                }}
              >
                <span>Select Full Seating Allotment</span>
                <Sparkles className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
