
"use client";

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Users, Building, UserCheck, Settings, BookCopy, ShieldAlert, GraduationCap } from 'lucide-react';
import { STUDENTS, CLASSROOMS, INVIGILATORS, EXAM_SCHEDULE } from '@/lib/data';

const StatCard = ({ title, value, icon, description, link }: { title: string, value: string | number, icon: React.ReactNode, description: string, link: string }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="pb-4">
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
      <CardFooter>
         <Button asChild className="w-full">
            <Link href={link}>
                <Settings className="mr-2 h-4 w-4" /> Manage
            </Link>
         </Button>
      </CardFooter>
    </Card>
  )
};


export function DashboardClient() {
  const totalExams = EXAM_SCHEDULE.length;
  const totalStudents = STUDENTS.length;
  const eligibleStudents = STUDENTS.filter(s => !s.isDebarred && s.ineligibilityRecords.length === 0).length;
  const totalClassrooms = CLASSROOMS.length;
  const availableClassrooms = CLASSROOMS.filter(c => c.unavailableSlots.length === 0).length;
  const totalInvigilators = INVIGILATORS.length;
  const availableInvigilators = INVIGILATORS.filter(i => i.isAvailable && i.unavailableSlots.length === 0).length;

  return (
    <div className="space-y-8">
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard 
                title="Total Exams"
                value={totalExams}
                icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
                description="Total exam slots in the schedule"
                link="/schedule"
            />
             <StatCard 
                title="Students"
                value={`${eligibleStudents} / ${totalStudents}`}
                icon={<Users className="h-4 w-4 text-muted-foreground" />}
                description="Eligible students ready for allotment"
                link="/students"
            />
             <StatCard 
                title="Classrooms"
                value={`${availableClassrooms} / ${totalClassrooms}`}
                icon={<Building className="h-4 w-4 text-muted-foreground" />}
                description="Classrooms currently marked as available"
                link="/classrooms"
            />
             <StatCard 
                title="Invigilators"
                value={`${availableInvigilators} / ${totalInvigilators}`}
                icon={<UserCheck className="h-4 w-4 text-muted-foreground" />}
                description="Invigilators generally available for duty"
                link="/invigilators"
            />
       </div>

      <div className="grid gap-6 md:grid-cols-2">
         <Card>
            <CardHeader>
                <CardTitle>Getting Started Guide</CardTitle>
                <CardDescription>Follow these steps to generate your first exam allotment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="flex items-start gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">1</div>
                    <div>
                        <p className="font-semibold">Manage Your Data</p>
                        <p className="text-sm text-muted-foreground">
                            Visit the <Link href="/students" className="text-primary hover:underline">Students</Link>, <Link href="/classrooms" className="text-primary hover:underline">Classrooms</Link>, and <Link href="/invigilators" className="text-primary hover:underline">Invigilators</Link> pages to see the mock data. Use the "Manage Status" or "Manage Availability" buttons to mark resources as unavailable for specific exam slots.
                        </p>
                    </div>
                </div>
                 <div className="flex items-start gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">2</div>
                    <div>
                        <p className="font-semibold">Review the Exam Schedule</p>
                        <p className="text-sm text-muted-foreground">
                            Go to the <Link href="/schedule" className="text-primary hover:underline">Schedule</Link> page. Here, you can add, edit, or delete exam slots. This is the master list of all exams to be scheduled.
                        </p>
                    </div>
                </div>
                 <div className="flex items-start gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">3</div>
                    <div>
                        <p className="font-semibold">Generate Full Allotment</p>
                        <p className="text-sm text-muted-foreground">
                            Once your data and schedule are correct, click the <span className="font-semibold">"Generate Full Allotment"</span> button on the Schedule page. This will create seating plans and invigilator duties for all exam sessions at once.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>About the Data</CardTitle>
            <CardDescription>
              The application is pre-populated with mock data to demonstrate its features.
            </CardDescription>
          </CardHeader>
           <CardContent className="space-y-3">
             <div className="flex items-start gap-3">
                <GraduationCap className="h-5 w-5 mt-1 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Students:</span> Data is generated with unique roll numbers, courses, and departments. Some students are marked as "debarred" or ineligible for specific subjects to test edge cases.
                </p>
             </div>
             <div className="flex items-start gap-3">
                <BookCopy className="h-5 w-5 mt-1 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Schedule:</span> A comprehensive schedule with over 700 exam slots across multiple departments, courses, and semesters is included.
                </p>
             </div>
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 mt-1 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Logic:</span> The allocation engine prioritizes seat retention, separates students from different departments, and ensures invigilators are rotated fairly.
                </p>
             </div>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
