'use client';

import { useState, useMemo } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, FileUp, Sparkles, Loader2, Download, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { EXAM_SCHEDULE as initialSchedule } from '@/lib/data';
import { ExamSlot } from '@/lib/types';


export default function SchedulePage() {
    const [examSchedule, setExamSchedule] = useState<ExamSlot[]>(initialSchedule);
    const [searchQuery, setSearchQuery] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const filteredSchedule = useMemo(() => {
        if (!searchQuery) {
            return examSchedule;
        }
        const lowercasedQuery = searchQuery.toLowerCase();
        return examSchedule.filter(exam =>
            exam.subjectName.toLowerCase().includes(lowercasedQuery) ||
            exam.subjectCode.toLowerCase().includes(lowercasedQuery) ||
            exam.department.toLowerCase().includes(lowercasedQuery) ||
            exam.course.toLowerCase().includes(lowercasedQuery)
        );
    }, [searchQuery, examSchedule]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        // In a real app, you'd parse the CSV here.
        // For this demo, we'll just simulate a delay and show a toast.
        setTimeout(() => {
            setIsUploading(false);
            toast({
                title: 'Schedule Uploaded',
                description: `Successfully processed ${file.name}. Showing ${initialSchedule.length} exam slots.`,
            });
            // Replace schedule with uploaded data
            setExamSchedule(initialSchedule); 
        }, 2000);
    };

    const handleGenerateAll = () => {
        setIsGenerating(true);
        // This would trigger a complex backend process or a long-running client-side task
        setTimeout(() => {
            setIsGenerating(false);
            toast({
                title: 'Generation Complete',
                description: `Full allotment generated for all ${examSchedule.length} exam slots. View results on the Allotment page.`,
            });
        }, 5000);
    };

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
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <CalendarDays className="h-6 w-6" />
                                                <CardTitle>Exam Schedule</CardTitle>
                                            </div>
                                            <CardDescription>Upload, view, and manage the full examination schedule.</CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" asChild>
                                                <label htmlFor="schedule-upload">
                                                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                                                    Upload Schedule
                                                </label>
                                            </Button>
                                            <input id="schedule-upload" type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={isUploading}/>
                                            <Button onClick={handleGenerateAll} disabled={isGenerating || examSchedule.length === 0}>
                                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                                Generate Full Allotment
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     <div className="flex justify-between items-center">
                                        <div className="w-full max-w-sm">
                                            <Input
                                                placeholder="Search schedule..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-8"
                                                icon={<Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
                                            />
                                        </div>
                                        <Button variant="ghost" size="sm">
                                            <Download className="mr-2 h-4 w-4" />
                                            Download Template
                                        </Button>
                                    </div>
                                    <div className="border rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Time</TableHead>
                                                    <TableHead>Subject</TableHead>
                                                    <TableHead>Code</TableHead>
                                                    <TableHead>Department</TableHead>
                                                    <TableHead>Course</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredSchedule.map((exam) => (
                                                    <TableRow key={exam.id}>
                                                        <TableCell>{exam.date}</TableCell>
                                                        <TableCell>{exam.time}</TableCell>
                                                        <TableCell className="font-medium">{exam.subjectName}</TableCell>
                                                        <TableCell>{exam.subjectCode}</TableCell>
                                                        <TableCell>{exam.department}</TableCell>
                                                        <TableCell>{exam.course}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                         {filteredSchedule.length === 0 && (
                                            <div className="text-center p-8 text-muted-foreground">
                                                No exam slots found. Try uploading a schedule.
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <div className="text-sm text-muted-foreground">
                                        Showing {filteredSchedule.length} of {examSchedule.length} total exam slots.
                                    </div>
                                </CardFooter>
                            </Card>
                        </main>
                    </div>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}
