
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
  const courseColors = useMemo(() => {
    const courses = new Set(assignments.map(a => a.student?.exam.subjectCode).filter(Boolean));
    const colorMap = new Map<string, string>();
    courses.forEach(courseCode => {
      colorMap.set(courseCode!, stringToColor(courseCode!));
    });
    return colorMap;
  }, [assignments]);
  
  // This function now correctly finds the assignment for a given row and column.
  const getAssignmentsForBench = (r: number, c: number): Seat[] => {
    // Calculate the starting seat number for this column
    let startingSeatNumberInColumn = 1;
    for (let col = 0; col < c; col++) {
        for (let row = 0; row < classroom.rows; row++) {
            startingSeatNumberInColumn += classroom.benchCapacities[row * classroom.columns + col];
        }
    }
    
    // Add seats from rows above in the current column
    for (let row = 0; row < r; row++) {
        startingSeatNumberInColumn += classroom.benchCapacities[row * classroom.columns + c];
    }
    
    const benchIndexInGrid = r * classroom.columns + c;
    const seatsInBench = classroom.benchCapacities[benchIndexInGrid];
    const benchAssignments: Seat[] = [];
    
    for (let i = 0; i < seatsInBench; i++) {
        const seatNumber = startingSeatNumberInColumn + i;
        const assignment = assignments.find(a => a.seatNumber === seatNumber);
        if (assignment) {
            benchAssignments.push(assignment);
        } else {
             // Create a placeholder for empty seats to maintain layout
             benchAssignments.push({ student: null, classroom, seatNumber });
        }
    }
    return benchAssignments;
  };


  return (
    <TooltipProvider>
      <div
        className="grid gap-2 p-2 rounded-lg border bg-muted/20"
        style={{
          gridTemplateColumns: `repeat(${classroom.columns}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: classroom.columns }).map((_, c) => (
          <div key={`col-${c}`} className="flex flex-col gap-2">
            {Array.from({ length: classroom.rows }).map((_, r) => {
              const benchAssignments = getAssignmentsForBench(r, c);

              return (
                <div
                  key={`bench-${r}-${c}`}
                  className="flex items-center justify-center gap-1 p-1 rounded-md bg-background border shadow-sm"
                >
                  {benchAssignments.map((seat) => {
                    const seatColor = seat.student?.exam.subjectCode ? courseColors.get(seat.student.exam.subjectCode) : undefined;
                    return (
                      <Tooltip key={seat.seatNumber}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "flex flex-col items-center justify-center w-24 h-16 rounded-md border text-center p-1 shrink-0",
                              seat.student ? 'bg-primary/5' : 'bg-muted/30 border-dashed',
                              seat.isDebarredSeat && 'border-destructive bg-destructive/10'
                            )}
                            style={{ borderColor: seat.student && seatColor ? seatColor : undefined }}
                          >
                            {seat.student ? (
                                <User className="w-4 h-4 text-primary" />
                            ) : (
                              seat.isDebarredSeat ? (
                                <Ban className="w-4 h-4 text-destructive" />
                              ) : (
                                <div className="w-4 h-4" />
                              )
                            )}
                            <span className="text-[11px] text-foreground font-medium truncate w-full">
                              {seat.student ? seat.student.name : (seat.isDebarredSeat ? 'Debarred' : `Seat ${seat.seatNumber}`)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                                {seat.student ? seat.student.rollNo : 'Empty'}
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
