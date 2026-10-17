
"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Seat, Student } from '@/lib/types';
import { cn } from '@/lib/utils';
import { User, Ban, AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';
import { isStudentConflict } from '@/lib/planning';


// Predefined pastel palette for distinct course colors
const COURSE_PALETTE = [
  '#dbeafe', // blue-100
  '#dcfce7', // green-100
  '#ffedd5', // orange-100
  '#f3e8ff', // purple-100
  '#fee2e2', // red-100
  '#e0f2fe', // sky-100
  '#fef9c3', // yellow-100
  '#fae8ff', // fuchsia-100
  '#ccfbf1', // teal-100
  '#ffe4e6', // rose-100
];

interface ClassroomVisualizerProps {
  assignments: Seat[];
  classroom: {
    id: string;
    rows: number;
    columns: number;
    benchCapacities: number[];
  };
  courseColors?: Map<string, string>;
}

const StudentTooltip = ({ student, seatNumber, isDebarredSeat }: { student: Student | null, seatNumber: number, isDebarredSeat?: boolean }) => {
  return (
    <TooltipContent>
      <div className="text-sm">
        <p className="font-bold">{student ? student.name : (isDebarredSeat ? 'Seat Reserved (Debarred)' : 'Empty')}</p>
        <p>Seat: {seatNumber}</p>
        {student && <p>Roll No: {student.rollNo}</p>}
        {student && student.exam && <p>Subject: {student.exam.subjectCode}</p>}
        {student && <p className="text-xs text-muted-foreground">{student.course} - {student.department}</p>}
        {student?.isDebarred && <p className="text-destructive font-bold">Status: Debarred</p>}
      </div>
    </TooltipContent>
  );
};


export function ClassroomVisualizer({ assignments = [], classroom, courseColors }: ClassroomVisualizerProps) {
  if (!classroom || !classroom.id) {
    return null;
  }

  const seatsForThisRoom = useMemo(() => {
    if (!classroom?.id || !Array.isArray(assignments)) return [];
    return assignments
      .filter(a => a && a.classroom && a.classroom.id === classroom.id)
      .sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0));
  }, [assignments, classroom?.id]);

  const benches = useMemo(() => {
    if (!classroom?.benchCapacities || !Array.isArray(classroom.benchCapacities)) return [];
    const result: Seat[][] = [];
    let currentSeatIdx = 0;
    
    classroom.benchCapacities.forEach(capacity => {
      const bench: Seat[] = [];
      for (let i = 0; i < capacity; i++) {
        if (currentSeatIdx < seatsForThisRoom.length) {
          const seat = seatsForThisRoom[currentSeatIdx];
          if (seat) {
            bench.push(seat);
          }
          currentSeatIdx++;
        }
      }
      result.push(bench);
    });
    
    return result;
  }, [seatsForThisRoom, classroom?.benchCapacities]);

  const columns = classroom.columns || 1;
  const rows = classroom.rows || 1;

  return (
    <TooltipProvider>
      <div
        className="grid gap-1 p-2 rounded-lg border bg-muted/20 overflow-x-auto"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: columns }).map((_, c) => (
          <div key={`col-${c}`} className="flex flex-col gap-1">
            {Array.from({ length: rows }).map((_, r) => {
              const benchIdx = r * columns + c;
              const benchSeats = benches[benchIdx] || [];
              const benchStudents = benchSeats.filter(s => s && s.student).map(s => s.student!);
              const hasBenchConflict = benchStudents.length > 1 && benchStudents.some((s1, i) =>
                benchStudents.slice(i + 1).some(s2 => s1 && s2 && isStudentConflict(s1, s2))
              );

              return (
                <div
                  key={`bench-${r}-${c}`}
                  className={cn(
                    "flex items-center justify-center gap-0.5 p-0.5 rounded-md bg-background border shadow-sm flex-nowrap min-h-[3rem] transition-all",
                    hasBenchConflict && "border-rose-400 bg-rose-50/60 ring-1 ring-rose-400"
                  )}
                  title={hasBenchConflict ? "Bench Rule Violation: Same-course or same-subject students seated together" : undefined}
                >
                  {benchSeats.map((seat, seatIdx) => {
                    if (!seat) return null;
                    const subjectCode = seat.student?.exam?.subjectCode;
                    const bgColor = (subjectCode && courseColors) ? courseColors.get(subjectCode) : undefined;

                    return (
                      <Tooltip key={`seat-${benchIdx}-${seatIdx}`}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "flex flex-col items-center justify-center w-14 h-10 rounded-sm border text-center p-0.5 shrink-0 transition-colors",
                              !seat.student && !seat.isDebarredSeat && 'bg-muted/30 border-dashed',
                              seat.isDebarredSeat && 'border-destructive bg-destructive/10'
                            )}
                            style={{
                              backgroundColor: seat.student && bgColor ? bgColor : undefined,
                              borderColor: seat.student && bgColor ? 'transparent' : undefined
                            }}
                          >
                            {seat.student ? (
                              <User className="w-3 h-3 text-foreground/70" />
                            ) : (
                              seat.isDebarredSeat ? (
                                <Ban className="w-3 h-3 text-destructive" />
                              ) : (
                                <div className="w-3 h-3" />
                              )
                            )}
                            <span className="text-[8px] text-foreground font-bold truncate w-full">
                              {seat.student ? seat.student.rollNo.slice(-3) : (seat.isDebarredSeat ? 'Debarred' : `Empty`)}
                            </span>
                            <span className="text-[7px] text-muted-foreground truncate w-full">
                              {seat.student ? seat.student.exam?.subjectCode : ''}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <StudentTooltip student={seat.student} seatNumber={seat.seatNumber} isDebarredSeat={seat.isDebarredSeat} />
                      </Tooltip>
                    );
                  })}
                  {benchSeats.length === 0 && <div className="text-[10px] text-muted-foreground/30 italic">Empty Bench</div>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}

