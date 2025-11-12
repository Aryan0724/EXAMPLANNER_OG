
'use client';

import Link from 'next/link';
import { use } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookCopy, ChevronRight } from 'lucide-react';
import { COURSES, DEPARTMENTS, EXAM_SCHEDULE } from '@/lib/data';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';

export default function CourseSubjectsPage({ params: paramsProp }: { params: { departmentId: string, courseId: string } }) {
  const params = use(Promise.resolve(paramsProp));
  const departmentName = DEPARTMENTS.find(d => encodeURIComponent(d.toLowerCase().replace(/ /g, '-')) === params.departmentId) || 'Unknown Department';
  
  const courseName = (COURSES[departmentName as keyof typeof COURSES] || []).find(c => encodeURIComponent(c.toLowerCase().replace(/ /g, '-')) === params.courseId) || 'Unknown Course';

  const subjectsForCourse = EXAM_SCHEDULE.filter(
    exam => exam.department === departmentName && exam.course === courseName
  );
  const subjects = [...new Map(subjectsForCourse.map(s => [s.subjectCode, { code: s.subjectCode, name: s.subjectName }])).values()];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <MainSidebar />
        <SidebarInset>
          <div className="flex flex-col h-full">
            <MainHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
               <div className="mb-4">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/settings">Explorer</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink href={`/settings/${params.departmentId}`}>{departmentName}</BreadcrumbLink>
                    </BreadcrumbItem>
                     <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{courseName}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Subjects for {courseName}</CardTitle>
                  <CardDescription>
                    Select a subject to view and manage student eligibility.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {subjects.map(subject => (
                    <Link
                      key={subject.code}
                      href={`/settings/${params.departmentId}/${params.courseId}/${subject.code}`}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <BookCopy className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <span className="text-md font-medium">{subject.name}</span>
                            <span className="text-muted-foreground ml-2 font-code">({subject.code})</span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Link>
                  ))}
                   {subjects.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                        No subjects found in the exam schedule for this course.
                    </div>
                  )}
                </CardContent>
              </Card>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

    