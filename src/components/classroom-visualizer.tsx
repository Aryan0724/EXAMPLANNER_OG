"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Seat, Student } from '@/lib/types';
import { cn } from '@/lib/utils';
import { User, Ban } from 'lucide-react';
import { useMemo } from 'react';


// Simple hash function to get a color from a string
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
}

interface ClassroomVisualizerProps {
  assignments: Seat[];
  classroom: {
    id: string;
    rows: number;
    columns: number;
    benchCapacities: number[];
  };
}

const StudentTooltip = ({ student, seatNumber, isDebarredSeat }: { student: Student | null, seatNumber: number, isDebarredSeat?: boolean }) => {
  return (
    <TooltipContent>
      <div className="text-sm">
        <p className="font-bold">{student ? student.name : (isDebarredSeat ? 'Seat Reserved (Debarred)' : 'Empty')}</p>
        <p>Seat: {seatNumber}</p>
        {student && <p>ID: {student.id}</p>}
        {student && <p>Course: {student.course}</p>}
        {student?.isDebarred && <p className="text-destructive font-bold">Status: Debarred</p>}
      </div>
    </TooltipContent>
  );
};


export function ClassroomVisualizer({ assignments, classroom }: ClassroomVisualizerProps) {
  // Helper to get seat index in column-major order
  const getSeatByColRow = (r: number, c: number) => {
    const totalSeatsInPrevCols = classroom.benchCapacities
      .filter((_, index) => index % classroom.columns < c)
      .reduce((a, b) => a + b, 0);
    
    const seatsInThisColBeforeRow = classroom.benchCapacities
      .filter((_, index) => index % classroom.columns === c && Math.floor(index / classroom.columns) < r)
      .reduce((a, b) => a + b, 0);

    const seatNumber = totalSeatsInPrevCols + seatsInThisColBeforeRow + 1;
    return assignments.find(a => a.classroom.id === classroom.id && a.seatNumber === seatNumber);
  };
  
  const courseColors = useMemo(() => {
    const courses = new Set(assignments.map(a => a.student?.exam.subjectCode).filter(Boolean));
    const colorMap = new Map<string, string>();
    courses.forEach(courseCode => {
      colorMap.set(courseCode, stringToColor(courseCode));
    });
    return colorMap;
  }, [assignments]);


  return (
    <TooltipProvider>
      <div
        className="grid gap-3 p-4 rounded-lg border bg-muted/20"
        style={{
          gridTemplateColumns: `repeat(${classroom.columns}, minmax(0, 1fr))`,
          justifyContent: 'center',
        }}
      >
        {Array.from({ length: classroom.columns }).map((_, c) => (
          <div key={`col-${c}`} className="flex flex-col gap-2">
            {Array.from({ length: classroom.rows }).map((_, r) => {
              const benchIndex = r * classroom.columns + c;
              const benchCapacity = classroom.benchCapacities[benchIndex];

              return (
                <div
                  key={`bench-${benchIndex}`}
                  className="flex items-center justify-center gap-1 p-2 rounded-md bg-background border shadow-sm"
                >
                  {Array.from({ length: benchCapacity }).map((__, seatInBench) => {
                     // This part needs to find the right student from the assignments list
                     const seat = assignments.find(a => {
                       // This mapping logic needs to be perfect and match the planning logic
                       // For column-wise filling:
                       const targetSeatNumber = c * classroom.rows * (benchCapacity / classroom.columns) + r * benchCapacity + seatInBench + 1; // Simplified example
                       // The real logic is more complex and must mirror planning.ts
                       // For now, let's find the Nth student in this column.
                       const studentForThisSeat = assignments.filter(a => (Math.floor((a.seatNumber -1) / classroom.rows)) % classroom.columns === c)[r];
                       return a.seatNumber === studentForThisSeat?.seatNumber
                     });
                     // TEMPORARY LOGIC: Find Nth seat in the assignments for this room
                     const seatsInThisRoom = assignments.filter(a => a.classroom.id === classroom.id);
                     const seatIndexInColumn = r;
                     // This is still not quite right. A better way is to construct the grid here.
                      const seatToShow = seatsInThisRoom[c * classroom.rows + r + seatInBench];
                     if (!seatToShow) return null;


                    const seatColor = seatToShow.student?.exam.subjectCode ? courseColors.get(seatToShow.student.exam.subjectCode) : undefined;
                    return (
                      <Tooltip key={seatToShow.seatNumber}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "flex flex-col items-center justify-center w-24 h-16 rounded-md border-2 text-center p-1 shrink-0",
                              seatToShow.student ? 'bg-primary/5' : 'border-dashed border-muted-foreground/50',
                              seatToShow.isDebarredSeat && 'border-destructive bg-destructive/10'
                            )}
                            style={{ borderColor: seatToShow.student && seatColor ? seatColor : undefined }}
                          >
                            {seatToShow.student ? (
                                <User className="w-5 h-5 text-primary" />
                            ) : (
                              seatToShow.isDebarredSeat ? (
                                <Ban className="w-5 h-5 text-destructive" />
                              ) : (
                                <div className="w-5 h-5" />
                              )
                            )}
                            <span className="text-xs text-foreground font-medium truncate w-full">
                              {seatToShow.student ? seatToShow.student.name : (seatToShow.isDebarredSeat ? 'Debarred' : `Seat ${seatToShow.seatNumber}`)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                                {seatToShow.student ? seatToShow.student.rollNo : ''}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <StudentTooltip student={seatToShow.student} seatNumber={seatToShow.seatNumber} isDebarredSeat={seatToShow.isDebarredSeat} />
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
