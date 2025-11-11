"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Seat, Student } from '@/lib/types';
import { cn } from '@/lib/utils';
import { User, Ban } from 'lucide-react';

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
  let seatIndex = 0;
  
  for (const benchCapacity of classroom.benchCapacities) {
      const bench: Seat[] = [];
      for(let i = 0; i < benchCapacity; i++) {
          const assignment = assignments.find(a => a.seatNumber === seatIndex + 1);
          // Even if assignment is not found, we may need a placeholder for an empty seat.
          // Let's create a placeholder seat object to render the grid correctly.
          const seatObject = assignment || {
              student: null,
              classroom: classroom,
              seatNumber: seatIndex + 1,
          };
          bench.push(seatObject);
          seatIndex++;
      }
      benches.push(bench);
  }


  return (
    <TooltipProvider>
      <div
        className="grid gap-4 p-4 rounded-lg border bg-muted/20"
        style={{
          gridTemplateColumns: `repeat(${classroom.columns}, minmax(0, 1fr))`,
        }}
      >
        {benches.map((bench, benchIndex) => (
          <div
            key={benchIndex}
            className="flex items-center justify-center gap-2 p-3 rounded-md bg-background border shadow-sm"
          >
            {bench.map((seat) => (
              <Tooltip key={seat.seatNumber}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex flex-col items-center justify-center w-24 h-16 rounded-md border-2 text-center p-1",
                      seat.student ? 'border-primary bg-primary/10' : 'border-dashed border-muted-foreground/50',
                      seat.isDebarredSeat && 'border-destructive bg-destructive/10'
                    )}
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
                      {seat.student ? seat.student.name : (seat.isDebarredSeat ? 'Debarred' : 'Empty')}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                        {seat.student ? seat.student.rollNo : `Seat ${seat.seatNumber}`}
                    </span>
                  </div>
                </TooltipTrigger>
                <StudentTooltip student={seat.student} seatNumber={seat.seatNumber} isDebarredSeat={seat.isDebarredSeat} />
              </Tooltip>
            ))}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
