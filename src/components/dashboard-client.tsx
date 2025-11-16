
"use client";

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, CalendarDays, Users, Building, UserCheck } from 'lucide-react';

export function DashboardClient() {
  return (
    <div className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Welcome to Examplanner</CardTitle>
                <CardDescription>Your all-in-one solution for exam scheduling and resource management.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="flex items-start gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">1</div>
                    <div>
                        <p className="font-semibold">Upload Your Data</p>
                        <p className="text-sm text-muted-foreground">
                            The first step is to populate the application with your data. Go to the <Link href="/import-export" className="text-primary hover:underline">Import / Export</Link> page to upload your master files for students, classrooms, invigilators, and the exam schedule.
                        </p>
                    </div>
                </div>
                 <div className="flex items-start gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">2</div>
                    <div>
                        <p className="font-semibold">Review and Manage</p>
                        <p className="text-sm text-muted-foreground">
                            Use the <Link href="/students" className="text-primary hover:underline">Students</Link>, <Link href="/classrooms" className="text-primary hover:underline">Classrooms</Link>, <Link href="/invigilators" className="text-primary hover:underline">Invigilators</Link>, and <Link href="/schedule" className="text-primary hover:underline">Schedule</Link> pages to make any final adjustments or mark specific resources as unavailable for certain exam slots.
                        </p>
                    </div>
                </div>
                 <div className="flex items-start gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">3</div>
                    <div>
                        <p className="font-semibold">Generate Allotment</p>
                        <p className="text-sm text-muted-foreground">
                            Once your data is ready, go to the <Link href="/schedule" className="text-primary hover:underline">Schedule</Link> page and click the <span className="font-semibold">"Generate Full Allotment"</span> button. This will create all seating plans and invigilator duties at once.
                        </p>
                    </div>
                </div>
                 <div className="flex items-start gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">4</div>
                    <div>
                        <p className="font-semibold">View and Print</p>
                        <p className="text-sm text-muted-foreground">
                            Finally, head to the <Link href="/allotment" className="text-primary hover:underline">Allotment</Link> page to view the generated plans for each session, visualize classroom layouts, and print the allotment sheets.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>
              Use the Import / Export page to upload your master data files. This is the primary way to get started with the application.
            </CardDescription>
          </CardHeader>
           <CardContent>
             <Link href="/import-export" passHref>
                <Button className="w-full">
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Go to Import / Export
                </Button>
            </Link>
           </CardContent>
        </Card>
    </div>
  );
}
