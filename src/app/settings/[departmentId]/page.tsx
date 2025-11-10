'use client';

import Link from 'next/link';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, ChevronRight } from 'lucide-react';
import { COURSES, DEPARTMENTS } from '@/lib/data';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';

export default function DepartmentCoursesPage({ params }: { params: { departmentId: string } }) {
  const departmentName = DEPARTMENTS.find(d => encodeURIComponent(d.toLowerCase().replace(/ /g, '-')) === params.departmentId) || 'Unknown Department';

  const courses = (COURSES[departmentName as keyof typeof COURSES] || []).map(course => ({
    name: course,
    id: encodeURIComponent(course.toLowerCase().replace(/ /g, '-')),
  }));

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
                      <BreadcrumbPage>{departmentName}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Courses in {departmentName}</CardTitle>
                  <CardDescription>
                    Select a course to view its subjects.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {courses.map(course => (
                    <Link
                      key={course.id}
                      href={`/settings/${params.departmentId}/${course.id}`}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-5 w-5 text-accent" />
                        <span className="text-lg font-medium">{course.name}</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Link>
                  ))}
                   {courses.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                        No courses found for this department.
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
