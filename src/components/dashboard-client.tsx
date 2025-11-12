
"use client";

import { useState } from 'react';
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
import { FileUp, CalendarDays, Users, Building, UserCheck, Settings, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();
  
  const totalExams = EXAM_SCHEDULE.length;
  const totalStudents = STUDENTS.length;
  const eligibleStudents = STUDENTS.filter(s => !s.isDebarred && s.ineligibilityRecords.length === 0).length;
  const totalClassrooms = CLASSROOMS.length;
  const availableClassrooms = CLASSROOMS.filter(c => c.unavailableSlots.length === 0).length;
  const totalInvigilators = INVIGILATORS.length;
  const availableInvigilators = INVIGILATORS.filter(i => i.isAvailable && i.unavailableSlots.length === 0).length;


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // In a real app, you'd parse the file here.
        // For this demo, we'll just simulate a delay and show a toast.
        setTimeout(() => {
            toast({
                title: 'Data Uploaded',
                description: `Successfully processed ${file.name}.`,
            });
        }, 1500);
    };

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
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Upload data files or jump to key planning stages.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <Button variant="outline" asChild size="lg">
                <label htmlFor="data-upload" className="cursor-pointer">
                    <Upload className="mr-2" />
                    Upload Data
                </label>
            </Button>
            <input id="data-upload" type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFileUpload} />
             <Button size="lg" asChild>
                <Link href="/schedule">
                    Generate Full Allotment
                </Link>
             </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>
              After uploading your data, generate a full allotment from the 'Schedule' page and then view the results in 'Allotment'.
            </CardDescription>
          </CardHeader>
           <CardContent>
             <p className="text-sm text-muted-foreground">
                1. Use the <span className="font-semibold text-primary">Upload Data</span> button to import student lists, schedules, etc.
             </p>
              <p className="text-sm text-muted-foreground mt-2">
                2. Navigate to the <Link href="/schedule" className="font-semibold text-primary hover:underline">Schedule</Link> page to generate the master seat plan.
             </p>
             <p className="text-sm text-muted-foreground mt-2">
                3. Go to the <Link href="/allotment" className="font-semibold text-primary hover:underline">Allotment</Link> page to view the detailed seating arrangements.
             </p>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
