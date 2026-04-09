'use client';

import { useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, Building, UserCheck, CalendarDays, Sparkles, Loader2, Database, Trash2, FileDown, ArrowRight, FileUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DataContext } from '@/context/DataContext';
import { AllotmentContext } from '@/context/AllotmentContext';
import { generateMockClassrooms, generateMockExamSchedule, generateMockInvigilators, generateMockStudents } from '@/lib/data';
import { createClassroom, type ExamSlot, type Student, type Invigilator, type SeatPlan, type InvigilatorAssignment } from '@/lib/types';
import { generateMasterReport, generateInvigilatorDutyRoster } from '@/lib/report-generator';
import { generateSeatPlan, assignInvigilators } from '@/lib/planning';

import { BlockPriorityDialog } from '@/components/block-priority-dialog'; // Assuming this component exists and is exported
import { DataImportDialog } from '@/components/data-import-dialog';
import { CustomMockDataDialog } from '@/components/custom-mock-data-dialog';

export function DashboardClient() {
    const { toast } = useToast();
    const router = useRouter();

    const {
        students, setStudents,
        classrooms, setClassrooms,
        invigilators, setInvigilators,
        examSchedule, setExamSchedule,
        blockPriority, setBlockPriority,
        excludedBlocks, setExcludedBlocks,
        excludedRooms, setExcludedRooms
    } = useContext(DataContext);

    const { fullAllotment, setFullAllotment } = useContext(AllotmentContext);

    const [isGenerating, setIsGenerating] = useState(false);
    const [isPriorityDialogOpen, setIsPriorityDialogOpen] = useState(false);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [isCustomMockDialogOpen, setIsCustomMockDialogOpen] = useState(false);

    const stats = [
        { title: 'Total Students', value: students.length, icon: Users, href: '/students' },
        { title: 'Total Classrooms', value: classrooms.length, icon: Building, href: '/classrooms' },
        { title: 'Total Invigilators', value: invigilators.length, icon: UserCheck, href: '/invigilators' },
        { title: 'Scheduled Exams', value: examSchedule.length, icon: CalendarDays, href: '/schedule' },
    ];

    const availableBlocks = Array.from(new Set(classrooms.map(c => c.building))).sort();

    const handlePopulateMockData = (count: number = 200) => {
        toast({ title: 'Populating Mock Data...', description: `Generating ${count} sample students and related data.` });
        setStudents(generateMockStudents(count));
        setClassrooms(generateMockClassrooms());
        setInvigilators(generateMockInvigilators());
        setExamSchedule(generateMockExamSchedule());
    };

    const handleClearAllData = () => {
        toast({ title: 'Data Cleared', description: 'All local data has been cleared.' });
        setStudents([]);
        setClassrooms([]);
        setInvigilators([]);
        setExamSchedule([]);
        setFullAllotment(null);
    };

    const handleSavePriority = (priority: string[], exBlocks: string[], exRooms: string[]) => {
        setBlockPriority(priority);
        setExcludedBlocks(exBlocks);
        setExcludedRooms(exRooms);
        toast({
            title: 'Settings Updated',
            description: 'Allotment preferences have been saved.',
        });
        setIsPriorityDialogOpen(false);
    };

    const handleExportMasterReport = () => {
        if (!fullAllotment || Object.keys(fullAllotment).length === 0) {
            toast({ variant: 'destructive', title: 'No Allotment Data', description: 'Please generate a full allotment first.' });
            return;
        }
        try {
            generateMasterReport(fullAllotment, students, classrooms, invigilators);
            toast({ title: 'Report Generated', description: 'The master invigilation report has been downloaded.' });
        } catch (error) {
            console.error("Failed to generate report:", error);
            toast({ variant: 'destructive', title: 'Export Failed', description: 'There was an error generating the report.' });
        }
    };

    const handleExportDutyRoster = () => {
        if (!fullAllotment || Object.keys(fullAllotment).length === 0) {
            toast({ variant: 'destructive', title: 'No Allotment Data', description: 'Please generate a full allotment first.' });
            return;
        }
        try {
            generateInvigilatorDutyRoster(fullAllotment, invigilators);
            toast({ title: 'Roster Generated', description: 'The invigilator duty roster has been downloaded.' });
        } catch (error) {
            console.error("Failed to generate roster:", error);
            toast({ variant: 'destructive', title: 'Export Failed', description: 'There was an error generating the roster.' });
        }
    }

    const handleGenerateAll = async () => {
        if (students.length === 0 || classrooms.length === 0 || invigilators.length === 0 || examSchedule.length === 0) {
            toast({ variant: 'destructive', title: 'Cannot Generate Allotment', description: 'Please populate all required data first.' });
            return;
        }
        setIsGenerating(true);
        toast({ title: 'Generating Full Allotment...', description: 'The algorithm is creating plans session by session. This may take some time.' });
        await new Promise(resolve => setTimeout(resolve, 100));
        try {
            let studentMasterList: Student[] = JSON.parse(JSON.stringify(students));
            let invigilatorMasterList: Invigilator[] = JSON.parse(JSON.stringify(invigilators));
            let classroomMasterList = JSON.parse(JSON.stringify(classrooms));

            // Apply User Preferences for Classroom Selection
            classroomMasterList = classroomMasterList.filter((room: any) =>
                !excludedBlocks.includes(room.building) &&
                !excludedRooms.includes(room.id)
            );

            const examSlotsByTime = examSchedule.reduce((acc, exam) => {
                const key = `${exam.date} ${exam.time}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(exam);
                return acc;
            }, {} as Record<string, ExamSlot[]>);
            const generatedPlans: Record<string, { seatPlan: SeatPlan, invigilatorAssignments: InvigilatorAssignment[] }> = {};
            const sortedSessionKeys = Object.keys(examSlotsByTime).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
            for (const key of sortedSessionKeys) {
                const concurrentExams = examSlotsByTime[key];
                if (!concurrentExams || concurrentExams.length === 0) continue;

                const { plan, updatedStudents } = generateSeatPlan(studentMasterList, classroomMasterList, concurrentExams, blockPriority);
                studentMasterList = updatedStudents;
                const { assignments: invigilatorAssignments, updatedInvigilators } = assignInvigilators(invigilatorMasterList, plan, concurrentExams[0]);
                invigilatorMasterList = updatedInvigilators;
                generatedPlans[key] = { seatPlan: plan, invigilatorAssignments };
            }
            setStudents(studentMasterList);
            setInvigilators(invigilatorMasterList);
            setFullAllotment(generatedPlans);
            toast({
                title: 'Generation Complete!',
                description: 'Full allotment has been generated for all exam sessions.',
                action: <Button onClick={() => router.push('/allotment')}>View Allotment</Button>,
                duration: 10000
            });
        } catch (error: any) {
            console.error('An error occurred during allotment generation:', error);
            toast({ variant: 'destructive', title: 'Generation Failed', description: error.message || 'An unexpected error occurred.' });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Welcome to Examplanner</CardTitle>
                    <CardDescription>Your centralized dashboard for exam management. Get a quick overview and access key actions below.</CardDescription>
                </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                            <stat.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <Link href={stat.href} className="text-xs text-muted-foreground flex items-center gap-1 hover:underline">
                                View all <ArrowRight className="h-3 w-3" />
                            </Link>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Core Actions</CardTitle>
                        <CardDescription>Manage your data and generate examination plans.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <Button className="w-full" onClick={handleGenerateAll} disabled={isGenerating || examSchedule.length === 0}>
                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Generate Full Allotment
                            </Button>
                            <Button variant="outline" onClick={() => setIsPriorityDialogOpen(true)} disabled={classrooms.length === 0}>
                                <Building className="mr-2 h-4 w-4" />
                                Configure Rooms
                            </Button>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button className="w-full" variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                                <FileUp className="mr-2 h-4 w-4" />
                                Import Data
                            </Button>
                            <Button className="w-full" variant="secondary" onClick={() => setIsCustomMockDialogOpen(true)}>
                                <Database className="mr-2 h-4 w-4" />
                                Mock Data Generator
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button className="w-full" variant="destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Clear All Data
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete all student, classroom, invigilator, and schedule data from the application.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleClearAllData}>Yes, clear all data</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Report Generation</CardTitle>
                        <CardDescription>Export detailed reports from generated allotment data.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4">
                        <Button onClick={handleExportMasterReport} disabled={!fullAllotment}>
                            <FileDown className="mr-2 h-4 w-4" />
                            Generate Master Report (Excel)
                        </Button>
                        <Button onClick={handleExportDutyRoster} disabled={!fullAllotment}>
                            <FileDown className="mr-2 h-4 w-4" />
                            Generate Duty Roster (Excel)
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <BlockPriorityDialog
                isOpen={isPriorityDialogOpen}
                onClose={() => setIsPriorityDialogOpen(false)}
                availableBlocks={availableBlocks}
                currentPriority={blockPriority}
                excludedBlocks={excludedBlocks}
                excludedRooms={excludedRooms}
                classrooms={classrooms}
                onSave={handleSavePriority}
            />

            <DataImportDialog
                isOpen={isImportDialogOpen}
                onClose={() => setIsImportDialogOpen(false)}
                onImportStudents={(data) => {
                    setStudents(prev => [...prev, ...data]);
                    toast({ description: `Added ${data.length} students.` });
                }}
                onImportClassrooms={(data) => {
                    setClassrooms(prev => [...prev, ...data]);
                    toast({ description: `Added ${data.length} classrooms.` });
                }}
                onImportInvigilators={(data) => {
                    setInvigilators(prev => [...prev, ...data]);
                    toast({ description: `Added ${data.length} invigilators.` });
                }}
                onImportExams={(data) => {
                    setExamSchedule(prev => [...prev, ...data]);
                    toast({ description: `Added ${data.length} exams.` });
                }}
            />

            <CustomMockDataDialog
                isOpen={isCustomMockDialogOpen}
                onClose={() => setIsCustomMockDialogOpen(false)}
                onClearData={handleClearAllData}
                onGenerateCustom={(newStudents, newExams) => {
                    setStudents(prev => [...prev, ...newStudents]);
                    setExamSchedule(prev => [...prev, ...newExams]);

                    let extraMsg = '';
                    if (classrooms.length === 0) {
                        setClassrooms(generateMockClassrooms());
                        extraMsg += ' Added default classrooms.';
                    }
                    if (invigilators.length === 0) {
                        setInvigilators(generateMockInvigilators());
                        extraMsg += ' Added default invigilators.';
                    }

                    toast({
                        title: "Custom Data Generated",
                        description: `Added ${newStudents.length} students and ${newExams.length} exams.${extraMsg}`
                    });
                }}
                onGenerateRandom={(count) => {
                    handlePopulateMockData(count);
                }}
            />
        </div>
    );
}
