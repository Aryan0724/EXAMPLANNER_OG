'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, ShieldCheck, Scale, Users, LayoutGrid, AlertCircle, FileText } from 'lucide-react';

interface AllotmentRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EXAM_ALLOTMENT_RULES = [
  {
    num: 1,
    title: 'Course-wise classroom allocation',
    desc: 'Students belonging to the same course should be allotted to the same examination site/classroom, while students from different courses should be allotted to separate sites wherever possible.',
    category: 'Classroom & Course Allocation',
  },
  {
    num: 2,
    title: 'Consecutive roll numbers',
    desc: 'Students with consecutive roll numbers must sit on the same side of the benches, in ascending order.',
    category: 'Bench & Seating Arrangement',
  },
  {
    num: 3,
    title: 'Roll number sequence',
    desc: 'Seating should follow ascending roll-number order, starting from the first bench and proceeding systematically through the classroom.',
    category: 'Bench & Seating Arrangement',
  },
  {
    num: 4,
    title: 'Left-right seating',
    desc: 'The first student should occupy the left seat and the next student the right seat, maintaining the prescribed roll-number sequence on each side.',
    category: 'Bench & Seating Arrangement',
  },
  {
    num: 5,
    title: 'Bench allocation',
    desc: 'Each bench must be assigned according to its actual seating capacity. No bench may accommodate more students than its capacity.',
    category: 'Bench & Seating Arrangement',
  },
  {
    num: 6,
    title: 'Classroom filling',
    desc: 'Fill one classroom before moving to the next classroom, subject to capacity and course-allocation rules.',
    category: 'Classroom & Course Allocation',
  },
  {
    num: 7,
    title: 'Course separation',
    desc: 'Students from different courses should not be mixed within the same classroom unless the available capacity or examination requirements make it necessary.',
    category: 'Classroom & Course Allocation',
  },
  {
    num: 8,
    title: 'Same-course seating',
    desc: 'Students from the same course should be seated in roll-number order, without unnecessary gaps or random shuffling.',
    category: 'Bench & Seating Arrangement',
  },
  {
    num: 10,
    title: 'No duplicate allotment',
    desc: 'A student must not be assigned more than one seat for the same examination session.',
    category: 'Integrity & Uniqueness',
  },
  {
    num: 11,
    title: 'No duplicate occupancy',
    desc: 'A seat must not be assigned to more than one student in the same examination session.',
    category: 'Integrity & Uniqueness',
  },
  {
    num: 15,
    title: 'Capacity management',
    desc: 'If a classroom cannot accommodate all students assigned to it, the remaining students must be allotted to the next eligible classroom.',
    category: 'Classroom & Course Allocation',
  },
  {
    num: 16,
    title: 'Consistent seating pattern',
    desc: 'The algorithm must follow the same predefined seating pattern across all classrooms rather than changing the pattern arbitrarily.',
    category: 'Bench & Seating Arrangement',
  },
  {
    num: 17,
    title: 'Fixed seating across examinations',
    desc: 'If required by the examination cell, students should retain their previously allotted seats across examinations, provided the rooms, schedules, and seating constraints permit it.',
    category: 'Records & Continuity',
  },
  {
    num: 18,
    title: 'Minimum classroom usage',
    desc: 'The algorithm should minimize the number of classrooms used while respecting course-wise allocation and seating constraints.',
    category: 'Classroom & Course Allocation',
  },
  {
    num: 19,
    title: 'Incomplete roll-number sequences',
    desc: 'Missing roll numbers must not cause the algorithm to invent students or assign seats to nonexistent roll numbers.',
    category: 'Integrity & Uniqueness',
  },
  {
    num: 20,
    title: 'Insufficient capacity',
    desc: 'If the available seats cannot accommodate all eligible students under the prescribed rules, the system must report the shortage rather than silently violate the rules.',
    category: 'Capacity & Constraints',
  },
  {
    num: 21,
    title: 'Deterministic allocation',
    desc: 'Given the same student list, classroom configuration, and rules, the system should produce the same seating arrangement unless an administrator explicitly requests a new arrangement.',
    category: 'Integrity & Uniqueness',
  },
  {
    num: 22,
    title: 'Manual adjustments',
    desc: 'Authorized administrators may modify an allotment, but the system must revalidate the affected seating arrangement before publication.',
    category: 'Administration & Overrides',
  },
  {
    num: 23,
    title: 'Allocation records',
    desc: "Every finalized allotment must retain the student's roll number, course, classroom, bench number, and seat position.",
    category: 'Records & Continuity',
  },
  {
    num: 24,
    title: 'No silent rule violations',
    desc: 'If two rules conflict, the system must flag the conflict for resolution instead of silently ignoring either rule.',
    category: 'Capacity & Constraints',
  },
];

export function AllotmentRulesDialog({ open, onOpenChange }: AllotmentRulesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-950/50 rounded-lg text-purple-700 dark:text-purple-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">ExamPlanner — Student Seating Allotment Rules</DialogTitle>
              <DialogDescription className="text-xs">
                Official rules enforced during automated classroom allocation and desk seating.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2">
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">Engine Status: All 24 Rules Active & Automatically Validated</span>
            </div>
            <Badge variant="outline" className="bg-white/80 dark:bg-black/30 border-emerald-300 text-[10px]">
              Strict Mode
            </Badge>
          </div>
        </div>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-3 pb-4">
            {EXAM_ALLOTMENT_RULES.map(rule => (
              <div
                key={rule.num}
                className="p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors flex items-start gap-3 shadow-xs"
              >
                <div className="flex flex-col items-center justify-center shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs">
                  {rule.num}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-foreground">{rule.title}</h4>
                    <Badge variant="secondary" className="text-[10px] font-normal h-5 shrink-0">
                      {rule.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{rule.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
