"use client";

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUp, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Student, Classroom, Invigilator, ExamSlot } from '@/lib/types';
import { STUDENTS, CLASSROOMS, INVIGILATORS, EXAM_SCHEDULE } from '@/lib/data';
import { AiSuggestionCard } from '@/components/ai-suggestion-card';

export function DashboardClient() {
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState({
    students: false,
    classrooms: false,
    invigilators: false,
    schedule: false,
  });

  // This component no longer manages the data state for planning,
  // but it can still trigger the mock loading for confirmation.
  const handleDataLoad = (type: keyof typeof isLoading) => {
    setIsLoading(prev => ({...prev, [type]: true}));
    setTimeout(() => {
        let count;
        let name;
        switch(type) {
            case 'students':
                count = STUDENTS.length;
                name = "student";
                break;
            case 'classrooms':
                count = CLASSROOMS.length;
                name = "classroom";
                break;
            case 'invigilators':
                count = INVIGILATORS.length;
                name = "invigilator";
                break;
            case 'schedule':
                count = EXAM_SCHEDULE.length;
                name = "exam slot";
                break;
        }
      setIsLoading(prev => ({...prev, [type]: false}));
      toast({
        title: 'Data Source Confirmed',
        description: `${count} ${name} records are available for planning.`,
      });
    }, 1000);
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Data Sources</CardTitle>
            <CardDescription>Confirm and load all necessary data for planning.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" onClick={() => handleDataLoad('students')} disabled={isLoading.students}>
              {isLoading.students ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
              Students
            </Button>
            <Button variant="outline" onClick={() => handleDataLoad('classrooms')} disabled={isLoading.classrooms}>
              {isLoading.classrooms ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
              Classrooms
            </Button>
            <Button variant="outline" onClick={() => handleDataLoad('invigilators')} disabled={isLoading.invigilators}>
              {isLoading.invigilators ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
              Invigilators
            </Button>
            <Button variant="outline" onClick={() => handleDataLoad('schedule')} disabled={isLoading.schedule}>
              {isLoading.schedule ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
              Schedule
            </Button>
          </CardContent>
        </Card>
        
        <AiSuggestionCard />
      </div>
       <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
          <CardDescription>
            Once you have confirmed your data sources, proceed to the 'Allotment' page to generate and view seating plans.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
