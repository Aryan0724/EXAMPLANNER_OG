
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
        {student && <p>Roll No: {student.rollNo}</p>}
        {student && <p>Subject: {student.exam.subjectCode}</p>}
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
  
  const getAssignmentsForBench = (r: number, c: number): Seat[] => {
    const benchIndexInGrid = r * classroom.columns + c;
    const seatsInBench = classroom.benchCapacities[benchIndexInGrid];
    
    // Calculate the start seat number for this bench
    let startingSeatNumberInGrid = 1;
    for (let i = 0; i < benchIndexInGrid; i++) {
        startingSeatNumberInGrid += classroom.benchCapacities[i];
    }

    const benchAssignments: Seat[] = [];
    for (let i = 0; i < seatsInBench; i++) {
        const seatNumberToFind = startingSeatNumberInGrid + i;
        // Find the assignment that belongs to this specific classroom and has this seat number
        const assignment = assignments.find(a => {
            const assignmentInThisRoom = a.classroom.id === classroom.id;
            if(!assignmentInThisRoom) return false;

            const globalSeatNumber = a.seatNumber;
            // This is tricky, we need to map global seat number to a room-local seat number
            // For now, let's assume `assignments` prop is pre-filtered for the current room
            return a.seatNumber === seatNumberToFind;

        });
         if (assignment) {
            benchAssignments.push(assignment);
        } else {
             // Create a placeholder for empty seats to maintain layout
             benchAssignments.push({ student: null, classroom, seatNumber: seatNumberToFind });
        }
    }
    return benchAssignments;
  };

  const seatsForThisRoom = useMemo(() => {
    return assignments
      .filter(a => a.classroom.id === classroom.id)
      .sort((a, b) => a.seatNumber - b.seatNumber);
  }, [assignments, classroom.id]);


  return (
    <TooltipProvider>
      <div
        className="grid gap-2 p-2 rounded-lg border bg-muted/20 overflow-x-auto"
        style={{
          gridTemplateColumns: `repeat(${classroom.columns}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: classroom.columns }).map((_, c) => (
          <div key={`col-${c}`} className="flex flex-col gap-2">
            {Array.from({ length: classroom.rows }).map((_, r) => {
              const benchIndexInGrid = r * classroom.columns + c;
              const seatsOnBench = classroom.benchCapacities[benchIndexInGrid];

              let startingSeatIndexForBench = 0;
              for(let i=0; i < benchIndexInGrid; i++) {
                startingSeatIndexForBench += classroom.benchCapacities[i];
              }
              
              const benchAssignments = seatsForThisRoom.slice(startingSeatIndexForBench, startingSeatIndexForBench + seatsOnBench);
              
              // If there are fewer assignments than bench capacity, fill with empty seats
              while(benchAssignments.length < seatsOnBench) {
                benchAssignments.push({ student: null, classroom, seatNumber: 0 });
              }

              return (
                <div
                  key={`bench-${r}-${c}`}
                  className="flex items-center justify-center gap-1 p-1 rounded-md bg-background border shadow-sm flex-nowrap"
                >
                  {benchAssignments.map((seat, seatIdx) => {
                    const seatColor = seat.student?.exam.subjectCode ? courseColors.get(seat.student.exam.subjectCode) : undefined;
                    return (
                      <Tooltip key={seat.student?.id || `empty-${r}-${c}-${seatIdx}`}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "flex flex-col items-center justify-center w-20 h-14 rounded-md border text-center p-1 shrink-0",
                              seat.student ? 'bg-primary/5' : 'bg-muted/30 border-dashed',
                              seat.isDebarredSeat && 'border-destructive bg-destructive/10'
                            )}
                            style={{ borderColor: seat.student && seatColor ? seatColor : undefined }}
                          >
                            {seat.student ? (
                                <User className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              seat.isDebarredSeat ? (
                                <Ban className="w-3.5 h-3.5 text-destructive" />
                              ) : (
                                <div className="w-3.5 h-3.5" />
                              )
                            )}
                            <span className="text-[10px] text-foreground font-medium truncate w-full">
                              {seat.student ? seat.student.name : (seat.isDebarredSeat ? 'Debarred' : `Empty`)}
                            </span>
                            <span className="text-[9px] text-muted-foreground">
                                {seat.student ? seat.student.rollNo : ''}
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
