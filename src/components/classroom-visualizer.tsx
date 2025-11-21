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
  const benches: Seat[][] = [];
  let seatCounter = 0;

  // Reconstruct benches based on row/column structure
  for (let r = 0; r < classroom.rows; r++) {
    for (let c = 0; c < classroom.columns; c++) {
      const benchIndexInGrid = r * classroom.columns + c;
      const benchCapacity = classroom.benchCapacities[benchIndexInGrid];
      const bench: Seat[] = [];
      for (let i = 0; i < benchCapacity; i++) {
        const seatIndexOverall = seatCounter;
        const assignment = assignments.find(a => a.classroom.id === classroom.id && a.seatNumber === seatIndexOverall + 1);
        const seatObject = assignment || {
          student: null,
          classroom: classroom,
          seatNumber: seatIndexOverall + 1,
        };
        bench.push(seatObject);
        seatCounter++;
      }
      benches.push(bench);
    }
  }
  
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
        {benches.map((bench, benchIndex) => (
          <div
            key={benchIndex}
            className="flex items-center justify-center gap-1 p-2 rounded-md bg-background border shadow-sm flex-wrap"
          >
            {bench.map((seat) => {
              const seatColor = seat.student?.exam.subjectCode ? courseColors.get(seat.student.exam.subjectCode) : undefined;
              return (
              <Tooltip key={seat.seatNumber}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex flex-col items-center justify-center w-24 h-16 rounded-md border-2 text-center p-1 shrink-0",
                      seat.student ? 'bg-primary/5' : 'border-dashed border-muted-foreground/50',
                      seat.isDebarredSeat && 'border-destructive bg-destructive/10'
                    )}
                    style={{ borderColor: seat.student && seatColor ? seatColor : undefined }}
                  >
                    {seat.student ? (
                        <User className="w-5 h-5 text-primary" />
                    ) : (
                      seat.isDebarredSeat ? (
                        <Ban className="w-5 h-5 text-destructive" />
                      ) : (
                        <div className="w-5 h-5" />
                      )
                    )}
                    <span className="text-xs text-foreground font-medium truncate w-full">
                      {seat.student ? seat.student.name : (seat.isDebarredSeat ? 'Debarred' : `Seat ${seat.seatNumber}`)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                        {seat.student ? seat.student.rollNo : ''}
                    </span>
                  </div>
                </TooltipTrigger>
                <StudentTooltip student={seat.student} seatNumber={seat.seatNumber} isDebarredSeat={seat.isDebarredSeat} />
              </Tooltip>
            )})}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
