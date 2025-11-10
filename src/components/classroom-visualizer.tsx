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
    benchCapacity: number;
  };
}

const StudentTooltip = ({ student }: { student: Student | null }) => {
  if (!student) return null;
  return (
    <TooltipContent>
      <div className="text-sm">
        <p className="font-bold">{student.name}</p>
        <p>ID: {student.id}</p>
        <p>Course: {student.course}</p>
      </div>
    </TooltipContent>
  );
};


export function ClassroomVisualizer({ assignments, classroom }: ClassroomVisualizerProps) {
  const benches = [];
  const totalBenches = classroom.rows * classroom.columns;

  for (let i = 0; i < totalBenches; i++) {
    const benchAssignments = assignments.slice(i * classroom.benchCapacity, (i + 1) * classroom.benchCapacity);
    benches.push(benchAssignments);
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
            {bench.map((seat, seatIndex) => (
              <Tooltip key={seat.seatNumber}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex flex-col items-center justify-center w-16 h-16 rounded-md border-2",
                      seat.student ? 'border-primary bg-primary/10' : 'border-dashed border-muted-foreground/50',
                      (seat.student as any)?.isDebarred && 'border-destructive bg-destructive/10'
                    )}
                  >
                    {seat.student ? (
                        (seat.student as any)?.isDebarred ? (
                            <Ban className="w-6 h-6 text-destructive" />
                        ) : (
                            <User className="w-6 h-6 text-primary" />
                        )
                    ) : (
                      <div className="w-6 h-6" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      Seat {seat.seatNumber}
                    </span>
                  </div>
                </TooltipTrigger>
                <StudentTooltip student={seat.student} />
              </Tooltip>
            ))}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
