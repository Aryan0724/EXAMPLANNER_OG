
"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Seat, Student } from '@/lib/types';
import { cn } from '@/lib/utils';
import { User, Ban } from 'lucide-react';
import { useMemo } from 'react';


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
  courseColors: Map<string, string>;
}

const StudentTooltip = ({ student, seatNumber, isDebarredSeat }: { student: Student | null, seatNumber: number, isDebarredSeat?: boolean }) => {
  return (
    <TooltipContent>
      <div className="text-sm">
        <p className="font-bold">{student ? student.name : (isDebarredSeat ? 'Seat Reserved (Debarred)' : 'Empty')}</p>
        <p>Seat: {seatNumber}</p>
        {student && <p>Roll No: {student.rollNo}</p>}
        {student && <p>Subject: {student.exam?.subjectCode}</p>}
        {student && <p className="text-xs text-muted-foreground">{student.course} - {student.department}</p>}
        {student?.isDebarred && <p className="text-destructive font-bold">Status: Debarred</p>}
      </div>
    </TooltipContent>
  );
};


export function ClassroomVisualizer({ assignments, classroom, courseColors }: ClassroomVisualizerProps) {
  // Internal color calculation removed in favor of passed prop

  const seatsForThisRoom = useMemo(() => {
    return assignments
      .filter(a => a.classroom.id === classroom.id)
      .sort((a, b) => a.seatNumber - b.seatNumber);
  }, [assignments, classroom.id]);

  const grid: (Seat | null)[][] = Array.from({ length: classroom.rows }, () => Array(classroom.columns * 2).fill(null));

  let seatIndex = 0;
  for (let r = 0; r < classroom.rows; r++) {
    for (let c = 0; c < classroom.columns * 2; c++) {
      if (seatIndex < seatsForThisRoom.length) {
        const benchIndex = Math.floor(c / 2);
        const seatInBench = c % 2;
        const gridR = r;
        const gridC = benchIndex * 2 + seatInBench;

        if (!grid[gridR]) grid[gridR] = [];

        grid[gridR][gridC] = seatsForThisRoom[seatIndex];
        seatIndex++;
      }
    }
  }


  return (
    <TooltipProvider>
      <div
        className="grid gap-1 p-2 rounded-lg border bg-muted/20 overflow-x-auto"
        style={{
          gridTemplateColumns: `repeat(${classroom.columns}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: classroom.columns }).map((_, c) => (
          <div key={`col-${c}`} className="flex flex-col gap-1">
            {Array.from({ length: classroom.rows }).map((_, r) => {
              const leftSeat = grid[r]?.[c * 2];
              const rightSeat = grid[r]?.[c * 2 + 1];

              return (
                <div
                  key={`bench-${r}-${c}`}
                  className="flex items-center justify-center gap-0.5 p-0.5 rounded-md bg-background border shadow-sm flex-nowrap"
                >
                  {[leftSeat, rightSeat].map((seat, seatIdx) => {
                    if (!seat) return <div key={seatIdx} className="w-14 h-10 shrink-0" />;

                    const subjectCode = seat.student?.exam?.subjectCode;
                    const bgColor = subjectCode ? courseColors?.get(subjectCode) : undefined;

                    return (
                      <Tooltip key={`seat-${r}-${c}-${seatIdx}`}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "flex flex-col items-center justify-center w-14 h-10 rounded-sm border text-center p-0.5 shrink-0 transition-colors",
                              !seat.student && !seat.isDebarredSeat && 'bg-muted/30 border-dashed',
                              seat.isDebarredSeat && 'border-destructive bg-destructive/10'
                            )}
                            style={{
                              backgroundColor: seat.student && bgColor ? bgColor : undefined,
                              borderColor: seat.student && bgColor ? 'transparent' : undefined // Hide border if bg is set for cleaner look
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
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}

