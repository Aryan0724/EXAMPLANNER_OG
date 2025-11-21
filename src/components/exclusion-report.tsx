
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Ban, Building, User, UserX } from 'lucide-react';
import type { Student, Classroom, Invigilator } from '@/lib/types';
import { Badge } from './ui/badge';

interface ExclusionReportProps {
  data: {
    debarredStudents: Student[];
    ineligibleStudents: (Student & { reason: string; subjectCode: string })[];
    unavailableClassrooms: (Classroom & { reason: string })[];
    unavailableInvigilators: (Invigilator & { reason: string })[];
  };
}

export function ExclusionReport({ data }: ExclusionReportProps) {
  const {
    debarredStudents,
    ineligibleStudents,
    unavailableClassrooms,
    unavailableInvigilators,
  } = data;
  
  const hasExclusions = debarredStudents.length > 0 ||
                        ineligibleStudents.length > 0 ||
                        unavailableClassrooms.length > 0 ||
                        unavailableInvigilators.length > 0;

  if (!hasExclusions) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Exclusion Report</CardTitle>
                <CardDescription>Analysis of resources for the selected exam session.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center py-4 text-muted-foreground">
                    <p>All students, classrooms, and invigilators are available for this session.</p>
                </div>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exclusion Report</CardTitle>
        <CardDescription>
          The following resources were not considered for this allotment session and here are the reasons why.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full space-y-2">
          {debarredStudents.length > 0 && (
            <AccordionItem value="debarred-students">
              <AccordionTrigger className="bg-muted/50 px-4 rounded-md">
                <div className="flex items-center gap-2">
                  <UserX className="h-5 w-5 text-destructive" />
                  Debarred Students ({debarredStudents.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                <div className="border rounded-md">
                    <ul className="divide-y">
                        {debarredStudents.map(student => (
                            <li key={student.id} className="p-3">
                                <p className="font-semibold">{student.name} ({student.rollNo})</p>
                                <p className="text-sm text-muted-foreground">Reason: {student.debarmentReason || 'Not specified'}</p>
                            </li>
                        ))}
                    </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {ineligibleStudents.length > 0 && (
            <AccordionItem value="ineligible-students">
              <AccordionTrigger className="bg-muted/50 px-4 rounded-md">
                <div className="flex items-center gap-2">
                  <Ban className="h-5 w-5 text-yellow-600" />
                  Subject Ineligible Students ({ineligibleStudents.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                <div className="border rounded-md">
                    <ul className="divide-y">
                        {ineligibleStudents.map(student => (
                            <li key={`${student.id}-${student.subjectCode}`} className="p-3">
                                <p className="font-semibold">{student.name} ({student.rollNo})</p>
                                <p className="text-sm text-muted-foreground">
                                    Ineligible for <Badge variant="secondary" className="mx-1">{student.subjectCode}</Badge>
                                    | Reason: {student.reason}
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

           {unavailableClassrooms.length > 0 && (
            <AccordionItem value="unavailable-classrooms">
              <AccordionTrigger className="bg-muted/50 px-4 rounded-md">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  Unavailable Classrooms ({unavailableClassrooms.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                <div className="border rounded-md">
                    <ul className="divide-y">
                        {unavailableClassrooms.map(cr => (
                            <li key={cr.id} className="p-3">
                                <p className="font-semibold">{cr.roomNo} ({cr.building})</p>
                                <p className="text-sm text-muted-foreground">Reason: {cr.reason}</p>
                            </li>
                        ))}
                    </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

           {unavailableInvigilators.length > 0 && (
            <AccordionItem value="unavailable-invigilators">
              <AccordionTrigger className="bg-muted/50 px-4 rounded-md">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  Unavailable Invigilators ({unavailableInvigilators.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                 <div className="border rounded-md">
                    <ul className="divide-y">
                        {unavailableInvigilators.map(inv => (
                            <li key={inv.id} className="p-3">
                                <p className="font-semibold">{inv.name} ({inv.department})</p>
                                <p className="text-sm text-muted-foreground">Reason: {inv.reason}</p>
                            </li>
                        ))}
                    </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  );
}
