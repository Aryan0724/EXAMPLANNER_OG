
'use client';

import { useMemo } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Telescope, BookOpen, BookCopy, GraduationCap } from 'lucide-react';
import { STUDENTS, EXAM_SCHEDULE, DEPARTMENTS, COURSES } from '@/lib/data';

interface Subject {
  code: string;
  name: string;
}

interface Course {
  name: string;
  subjects: Subject[];
}

interface Department {
  name: string;
  courses: Course[];
}

export default function ExplorerPage() {
  const academicStructure = useMemo(() => {
    const structure: Department[] = [];

    DEPARTMENTS.forEach(deptName => {
      const department: Department = {
        name: deptName,
        courses: [],
      };

      const coursesInDept = COURSES[deptName as keyof typeof COURSES] || [];
      coursesInDept.forEach(courseName => {
        const course: Course = {
          name: courseName,
          subjects: [],
        };
        
        const subjectsForCourse = EXAM_SCHEDULE.filter(
          exam => exam.department === deptName && exam.course === courseName
        );

        const uniqueSubjects = [...new Map(subjectsForCourse.map(s => [s.subjectCode, { code: s.subjectCode, name: s.subjectName }])).values()];
        
        course.subjects = uniqueSubjects;
        department.courses.push(course);
      });

      structure.push(department);
    });

    return structure;
  }, []);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <MainSidebar />
        <SidebarInset>
          <div className="flex flex-col h-full">
            <MainHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Telescope className="h-6 w-6" />
                    <CardTitle>Student Explorer</CardTitle>
                  </div>
                  <CardDescription>
                    Browse departments, courses, and subjects derived from your data.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full">
                    {academicStructure.map(dept => (
                      <AccordionItem key={dept.name} value={dept.name}>
                        <AccordionTrigger className="text-lg font-medium">
                          <div className="flex items-center gap-3">
                             <GraduationCap className="h-5 w-5 text-primary" />
                             {dept.name}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pl-6">
                           <Accordion type="multiple" className="w-full">
                             {dept.courses.map(course => (
                               <AccordionItem key={course.name} value={course.name}>
                                 <AccordionTrigger>
                                  <div className="flex items-center gap-3">
                                    <BookOpen className="h-4 w-4 text-accent" />
                                    {course.name}
                                  </div>
                                 </AccordionTrigger>
                                 <AccordionContent className="pl-8 pt-2">
                                    <ul className="space-y-2">
                                       {course.subjects.length > 0 ? course.subjects.map(subject => (
                                          <li key={subject.code} className="flex items-center gap-3 text-sm">
                                             <BookCopy className="h-4 w-4 text-muted-foreground" />
                                             <div>
                                                <span className="font-medium">{subject.name}</span>
                                                <span className="text-muted-foreground ml-2 font-code">({subject.code})</span>
                                             </div>
                                          </li>
                                       )) : (
                                        <li className="text-sm text-muted-foreground italic">No subjects found in the exam schedule for this course.</li>
                                       )}
                                    </ul>
                                 </AccordionContent>
                               </AccordionItem>
                             ))}
                           </Accordion>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
