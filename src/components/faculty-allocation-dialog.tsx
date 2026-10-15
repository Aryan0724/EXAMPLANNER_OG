'use client';

import React, { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, RotateCcw, UserCheck, ShieldAlert, Sparkles, Check, Users } from 'lucide-react';
import { FacultyStudentRule, DEFAULT_FACULTY_STUDENT_RULES } from '@/lib/types';
import { getRequiredFacultyCount } from '@/lib/planning';

interface FacultyAllocationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rules: FacultyStudentRule[], reserveCount: number) => void;
  initialRules?: FacultyStudentRule[];
  initialReserveCount?: number;
  title?: string;
  description?: string;
  confirmLabel?: string;
  isProcessing?: boolean;
}

export function FacultyAllocationDialog({
  isOpen,
  onClose,
  onConfirm,
  initialRules,
  initialReserveCount = 3,
  title = "Invigilator & Faculty Allocation Rules",
  description = "Specify how many faculty members to allot per classroom based on student count before running allotment.",
  confirmLabel = "Confirm & Run Allotment",
  isProcessing = false,
}: FacultyAllocationDialogProps) {
  const [rules, setRules] = useState<FacultyStudentRule[]>(
    initialRules && initialRules.length > 0 ? initialRules : DEFAULT_FACULTY_STUDENT_RULES
  );
  const [reserveCount, setReserveCount] = useState<number>(initialReserveCount);
  const [testStudentCount, setTestStudentCount] = useState<number>(35);

  useEffect(() => {
    if (isOpen) {
      if (initialRules && initialRules.length > 0) {
        setRules(JSON.parse(JSON.stringify(initialRules)));
      } else {
        setRules(JSON.parse(JSON.stringify(DEFAULT_FACULTY_STUDENT_RULES)));
      }
      setReserveCount(initialReserveCount);
    }
  }, [isOpen, initialRules, initialReserveCount]);

  const handleAddRule = () => {
    const lastRule = rules[rules.length - 1];
    const newMin = lastRule ? lastRule.maxStudents + 1 : 0;
    const newMax = newMin + 30;
    const newFaculty = lastRule ? lastRule.facultyCount + 1 : 1;

    setRules([
      ...rules,
      {
        id: `rule-${Date.now()}`,
        minStudents: newMin,
        maxStudents: newMax,
        facultyCount: newFaculty,
      },
    ]);
  };

  const handleUpdateRule = (id: string, field: keyof FacultyStudentRule, value: number) => {
    setRules(prev =>
      prev.map(r => (r.id === id ? { ...r, [field]: Math.max(0, value) } : r))
    );
  };

  const handleDeleteRule = (id: string) => {
    if (rules.length <= 1) return;
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const handleApplyPreset = (preset: 'default' | 'onePer20' | 'onePer30' | 'fixed1' | 'fixed2') => {
    if (preset === 'default') {
      setRules(JSON.parse(JSON.stringify(DEFAULT_FACULTY_STUDENT_RULES)));
    } else if (preset === 'onePer20') {
      setRules([
        { id: 'p-1', minStudents: 0, maxStudents: 20, facultyCount: 1 },
        { id: 'p-2', minStudents: 21, maxStudents: 40, facultyCount: 2 },
        { id: 'p-3', minStudents: 41, maxStudents: 60, facultyCount: 3 },
        { id: 'p-4', minStudents: 61, maxStudents: 999, facultyCount: 4 },
      ]);
    } else if (preset === 'onePer30') {
      setRules([
        { id: 'p-1', minStudents: 0, maxStudents: 30, facultyCount: 1 },
        { id: 'p-2', minStudents: 31, maxStudents: 60, facultyCount: 2 },
        { id: 'p-3', minStudents: 61, maxStudents: 90, facultyCount: 3 },
        { id: 'p-4', minStudents: 91, maxStudents: 999, facultyCount: 4 },
      ]);
    } else if (preset === 'fixed1') {
      setRules([
        { id: 'p-1', minStudents: 0, maxStudents: 999, facultyCount: 1 },
      ]);
    } else if (preset === 'fixed2') {
      setRules([
        { id: 'p-1', minStudents: 0, maxStudents: 999, facultyCount: 2 },
      ]);
    }
  };

  const calculatedFacultyForTest = getRequiredFacultyCount(testStudentCount, rules);

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-muted/40 rounded-lg border text-xs">
            <span className="font-semibold text-muted-foreground mr-1">Presets:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleApplyPreset('default')}
              className="h-6 text-[11px] px-2"
            >
              Default (0-20: 1, 21-50: 2, 51-80: 3, 81+: 4)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleApplyPreset('onePer20')}
              className="h-6 text-[11px] px-2"
            >
              1 per 20 Students
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleApplyPreset('onePer30')}
              className="h-6 text-[11px] px-2"
            >
              1 per 30 Students
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleApplyPreset('fixed2')}
              className="h-6 text-[11px] px-2"
            >
              Standard 2 per Room
            </Button>
          </div>

          {/* Rules Configuration Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Faculty Allocation Tiers
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRule}
                className="h-7 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/10"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Range Tier
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden divide-y bg-card shadow-xs">
              <div className="grid grid-cols-12 gap-2 p-2 bg-muted/60 text-[11px] font-semibold text-muted-foreground">
                <div className="col-span-4">Student Range (Min - Max)</div>
                <div className="col-span-5">Faculty / Invigilators to Allot</div>
                <div className="col-span-2 text-center">Summary</div>
                <div className="col-span-1 text-right">Action</div>
              </div>

              {rules.map((rule, idx) => (
                <div
                  key={rule.id}
                  className="grid grid-cols-12 gap-2 p-2.5 items-center hover:bg-muted/20 transition-colors"
                >
                  <div className="col-span-4 flex items-center gap-1.5">
                    <Input
                      type="number"
                      min="0"
                      value={rule.minStudents}
                      onChange={e => handleUpdateRule(rule.id, 'minStudents', parseInt(e.target.value) || 0)}
                      className="h-8 text-xs font-mono font-bold text-center"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                      type="number"
                      min="1"
                      value={rule.maxStudents}
                      onChange={e => handleUpdateRule(rule.id, 'maxStudents', parseInt(e.target.value) || 1)}
                      className="h-8 text-xs font-mono font-bold text-center"
                    />
                  </div>

                  <div className="col-span-5 flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={rule.facultyCount}
                      onChange={e => handleUpdateRule(rule.id, 'facultyCount', parseInt(e.target.value) || 1)}
                      className="h-8 w-20 text-xs font-mono font-bold text-center"
                    />
                    <span className="text-xs text-muted-foreground">
                      {rule.facultyCount === 1 ? 'Faculty (Lead)' : `${rule.facultyCount} Faculty (Lead + Co)`}
                    </span>
                  </div>

                  <div className="col-span-2 text-center">
                    <Badge variant="secondary" className="text-[10px] font-medium font-mono">
                      {rule.minStudents} - {rule.maxStudents} : {rule.facultyCount}
                    </Badge>
                  </div>

                  <div className="col-span-1 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={rules.length <= 1}
                      onClick={() => handleDeleteRule(rule.id)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive disabled:opacity-30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Standby / Reserve Faculty Setting */}
          <div className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between gap-4">
            <div>
              <Label className="text-xs font-semibold block">Standby / Reserved Faculty per Session</Label>
              <p className="text-[11px] text-muted-foreground">
                Backup invigilators assigned to exam control room in case of emergency absences.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="20"
                value={reserveCount}
                onChange={e => setReserveCount(parseInt(e.target.value) || 0)}
                className="h-8 w-20 text-xs font-mono font-bold text-center"
              />
              <span className="text-xs font-medium text-muted-foreground">Staff</span>
            </div>
          </div>

          {/* Live Simulator Widget */}
          <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="text-xs font-semibold text-foreground">Rule Verification Calculator:</span>
                <p className="text-[11px] text-muted-foreground">
                  Check how many staff will be allotted for a room with given students
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Room with</span>
                <Input
                  type="number"
                  min="0"
                  value={testStudentCount}
                  onChange={e => setTestStudentCount(parseInt(e.target.value) || 0)}
                  className="h-7 w-16 text-xs text-center font-bold"
                />
                <span className="text-xs text-muted-foreground">students</span>
              </div>
              <span className="text-xs text-muted-foreground">→</span>
              <Badge className="bg-primary text-primary-foreground font-bold text-xs px-2.5 py-0.5">
                {calculatedFacultyForTest} {calculatedFacultyForTest === 1 ? 'Faculty' : 'Faculty'}
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(rules, reserveCount)}
            disabled={isProcessing}
            className="gap-2 font-semibold"
          >
            {isProcessing ? (
              <>Running Allotment Engine...</>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {confirmLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
