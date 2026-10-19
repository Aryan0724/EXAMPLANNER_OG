'use client';

import { useContext, useState, useMemo } from 'react';
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
import { Users, Building, UserCheck, CalendarDays, Sparkles, Loader2, Database, Trash2, FileDown, ArrowRight, FileUp, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DataContext } from '@/context/DataContext';
import { AllotmentContext } from '@/context/AllotmentContext';
import { generateMockClassrooms, generateMockExamSchedule, generateMockInvigilators, generateMockStudents } from '@/lib/data';
import { createClassroom, type ExamSlot, type Student, type Invigilator, type SeatPlan, type InvigilatorAssignment, type FacultyStudentRule } from '@/lib/types';
import { generateMasterReport, generateInvigilatorDutyRoster, generateSessionWiseInvigilationRoster, downloadMasterSeatingMatrixExcel } from '@/lib/report-generator';
import { generateSeatPlan, assignInvigilators } from '@/lib/planning';

import { BlockPriorityDialog } from '@/components/block-priority-dialog';
import { DataImportDialog } from '@/components/data-import-dialog';
import { CustomMockDataDialog } from '@/components/custom-mock-data-dialog';
import { AllotmentRulesDialog } from '@/components/allotment-rules-dialog';
import { FacultyAllocationDialog } from '@/components/faculty-allocation-dialog';
import { FacultyTimeRequestsDialog } from '@/components/faculty-time-requests-dialog';

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
        excludedRooms, setExcludedRooms,
        reservedCount, setReservedCount,
        facultyStudentRules, setFacultyStudentRules
    } = useContext(DataContext);

    const { fullAllotment, setFullAllotment } = useContext(AllotmentContext);

    const [isGenerating, setIsGenerating] = useState(false);
    const [isPriorityDialogOpen, setIsPriorityDialogOpen] = useState(false);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [isCustomMockDialogOpen, setIsCustomMockDialogOpen] = useState(false);
    const [showRulesDialog, setShowRulesDialog] = useState(false);
    const [showFacultyDialog, setShowFacultyDialog] = useState(false);
    const [showTimeRequestsDialog, setShowTimeRequestsDialog] = useState(false);

    const activeFacultyTimeRequestsCount = useMemo(() => {
        return invigilators.reduce((sum, inv) => sum + (inv.unavailableSlots?.length || 0), 0);
    }, [invigilators]);

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

    const handleExportMasterMatrixExcel = async () => {
        if (!fullAllotment || Object.keys(fullAllotment).length === 0) {
            toast({ variant: 'destructive', title: 'No Allotment Data', description: 'Please generate a full allotment first.' });
            return;
        }
        try {
            await downloadMasterSeatingMatrixExcel(fullAllotment, classrooms);
            toast({ title: 'Matrix Excel Generated', description: 'Official GEHU Bhimtal format (.xlsx) downloaded successfully.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Export Failed', description: error?.message || 'Could not generate matrix Excel.' });
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

    const handleExportSessionRoster = () => {
        if (!fullAllotment || Object.keys(fullAllotment).length === 0) {
            toast({ variant: 'destructive', title: 'No Allotment Data', description: 'Please generate a full allotment first.' });
            return;
        }
        try {
            generateSessionWiseInvigilationRoster(fullAllotment, classrooms);
            toast({ title: 'Session Roster Generated', description: 'The session-wise invigilation roster has been downloaded.' });
        } catch (error) {
            console.error("Failed to generate session roster:", error);
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
                const { assignments: invigilatorAssignments, updatedInvigilators } = assignInvigilators(
                    invigilatorMasterList,
                    plan,
                    concurrentExams[0],
                    reservedCount,
                    facultyStudentRules
                );
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

    // One-click: flood fresh mock data in-memory and immediately run the allotment algorithm
    // Avoids React stale-state issues by using freshly generated data directly.
    const handleFloodAndGenerateAll = async () => {
        setIsGenerating(true);
        toast({ title: '⚡ Flooding Mock Data...', description: 'Generating students, classrooms, invigilators & schedule.' });
        await new Promise(resolve => setTimeout(resolve, 150));
        try {
            const freshStudents: Student[] = JSON.parse(JSON.stringify(generateMockStudents(200)));
            const freshClassrooms = generateMockClassrooms();
            const freshInvigilators: Invigilator[] = JSON.parse(JSON.stringify(generateMockInvigilators()));
            const freshExams: ExamSlot[] = generateMockExamSchedule();

            // Persist to context so UI reflects the data
            setStudents(freshStudents);
            setClassrooms(freshClassrooms);
            setInvigilators(freshInvigilators);
            setExamSchedule(freshExams);

            toast({ title: 'Mock Data Loaded ✅', description: 'Running allotment algorithm now...' });
            await new Promise(resolve => setTimeout(resolve, 100));

            // Run algorithm on fresh data directly (avoids stale closure issue)
            let studentMasterList: Student[] = JSON.parse(JSON.stringify(freshStudents));
            let invigilatorMasterList: Invigilator[] = JSON.parse(JSON.stringify(freshInvigilators));
            const classroomMasterList = JSON.parse(JSON.stringify(freshClassrooms));

            const examSlotsByTime = freshExams.reduce((acc, exam) => {
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
                const { assignments: invigilatorAssignments, updatedInvigilators } = assignInvigilators(
                    invigilatorMasterList,
                    plan,
                    concurrentExams[0],
                    reservedCount,
                    facultyStudentRules
                );
                invigilatorMasterList = updatedInvigilators;
                generatedPlans[key] = { seatPlan: plan, invigilatorAssignments };
            }

            setStudents(studentMasterList);
            setInvigilators(invigilatorMasterList);
            setFullAllotment(generatedPlans);

            toast({
                title: '🎉 Allotment Generated!',
                description: `Full allotment complete for ${sortedSessionKeys.length} session(s) with mock data.`,
                action: <Button onClick={() => router.push('/allotment')}>View Allotment</Button>,
                duration: 10000
            });
        } catch (error: any) {
            console.error('Flood+Generate error:', error);
            toast({ variant: 'destructive', title: 'Failed', description: error.message || 'An unexpected error occurred.' });
        } finally {
            setIsGenerating(false);
        }
    };



    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
            {/* Header / Institutional Banner */}
            <div className="rounded-2xl border bg-card/60 backdrop-blur-md p-6 md:p-8 shadow-xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
                            <span className="size-2 rounded-full bg-primary animate-pulse" />
                            GEHU Bhimtal Examination Division
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                            Examination Command Center
                        </h1>
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                            Centralized platform for multi-shift faculty duty allotment, student seating plans, and official university examination reporting.
                        </p>
                    </div>

                    <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2.5 shrink-0">
                        <div className="px-3 py-1.5 rounded-lg bg-secondary/80 border text-xs flex items-center gap-2">
                            <span className="text-muted-foreground font-medium">Session:</span>
                            <span className="font-bold text-foreground">End Term (Even Sem) May 2026</span>
                        </div>
                        <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                            <span className="size-2 rounded-full bg-emerald-500" />
                            <span className="font-semibold">Faculty Pool: {invigilators.length} Active</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metric Statistics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <Link
                        key={stat.title}
                        href={stat.href}
                        className="group p-5 rounded-xl border bg-card/80 hover:bg-card hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {stat.title}
                            </span>
                            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <stat.icon className="size-4" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-baseline justify-between">
                            <span className="text-3xl font-extrabold text-foreground tracking-tight">
                                {stat.value}
                            </span>
                            <span className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                View <ArrowRight className="size-3" />
                            </span>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Primary Allotment Hub: Two Distinct Modes */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground">Examination Allotment Engines</h2>
                        <p className="text-xs text-muted-foreground">Select between the two dedicated allotment modes supported by the platform:</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Kind 1: Faculty Shift Duty Allotment */}
                    <Card className="border-primary/25 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                                    Kind 1: Shift Duty Allotment
                                </div>
                                <span className="text-xs text-muted-foreground font-mono">Faculty Roster</span>
                            </div>
                            <CardTitle className="text-xl font-bold mt-2">Faculty Shift Duty Allotment</CardTitle>
                            <CardDescription className="text-xs leading-relaxed">
                                Give classroom count and required faculty count per shift and day. The engine automatically assigns teachers fairly, prioritizing junior staff, avoiding consecutive shifts, honoring staff time requests, and outputs the official GEHU Bhimtal Duty Chart (.xlsx).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-2">
                            <div className="p-3.5 rounded-xl bg-secondary/50 border text-xs space-y-2">
                                <div className="flex justify-between items-center text-muted-foreground">
                                    <span>Input Parameters:</span>
                                    <span className="font-semibold text-foreground">Rooms Count + Faculty Needed per Shift</span>
                                </div>
                                <div className="flex justify-between items-center text-muted-foreground">
                                    <span>Active Faculty Pool:</span>
                                    <span className="font-bold text-foreground">{invigilators.length} Members</span>
                                </div>
                                <div className="flex justify-between items-center text-muted-foreground">
                                    <span>Output Format:</span>
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Official GEHU Bhimtal Duty Chart (.xlsx)</span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2.5">
                                <Button
                                    onClick={() => router.push('/allotment?mode=shift-duty')}
                                    className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs gap-2"
                                >
                                    <UserCheck className="size-4" />
                                    <span>Open Faculty Shift Allotment</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => router.push('/manual-allotment')}
                                    className="h-11 font-medium gap-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                >
                                    <span>Advanced Roster</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Kind 2: Full Examination & Student Seating Allotment */}
                    <Card className="border-indigo-500/25 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                                    Kind 2: Comprehensive 1-Click
                                </div>
                                <span className="text-xs text-muted-foreground font-mono">Bench Seating + Duties</span>
                            </div>
                            <CardTitle className="text-xl font-bold mt-2">Full Seating & Room Allotment</CardTitle>
                            <CardDescription className="text-xs leading-relaxed">
                                Upload your exam schedule date sheet. Set classroom block priority, reserve seats, and 1:24 faculty-student ratio. In 1 click, the engine executes full student bench seating (24 conflict-free rules) and assigns room invigilators.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-2">
                            <div className="p-3.5 rounded-xl bg-secondary/50 border text-xs space-y-2">
                                <div className="flex justify-between items-center text-muted-foreground">
                                    <span>Input Parameters:</span>
                                    <span className="font-semibold text-foreground">Date Sheet + Priorities + Ratios & Limits</span>
                                </div>
                                <div className="flex justify-between items-center text-muted-foreground">
                                    <span>Exam Schedule:</span>
                                    <span className="font-bold text-foreground">{examSchedule.length} Slots Loaded</span>
                                </div>
                                <div className="flex justify-between items-center text-muted-foreground">
                                    <span>Output Format:</span>
                                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">Seating Grid, Master Report & Rosters</span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2.5">
                                <Button
                                    onClick={() => router.push('/allotment?mode=full')}
                                    className="flex-1 h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-xs gap-2"
                                >
                                    <Sparkles className="size-4" />
                                    <span>Open Full Seating Allotment</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => router.push('/schedule')}
                                    className="h-11 font-medium gap-2 border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                                >
                                    <span>Exam Schedule</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Allotment Rules & Staff Time Requests Hub */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground">Allotment Governance & Staff Time Requests</h2>
                        <p className="text-xs text-muted-foreground">
                            Enforce strict seating rules, configure faculty-student ratios, or manage faculty leave requests and time exemptions.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Card 1: 24 Seating Rules */}
                    <Card className="border hover:border-purple-300 dark:hover:border-purple-800 transition-colors shadow-xs flex flex-col justify-between">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
                                    <ShieldCheck className="size-5" />
                                </div>
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="size-3.5" /> 24 Rules Active
                                </span>
                            </div>
                            <CardTitle className="text-base font-bold mt-2">24 Seating Rules</CardTitle>
                            <CardDescription className="text-xs">
                                Strict course interleaving, roll-number sequences, no adjacent/diagonal same-course neighbors, and room capacity enforcement.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowRulesDialog(true)}
                                className="w-full text-xs font-semibold gap-1.5 border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                            >
                                <ShieldCheck className="size-3.5" />
                                <span>Inspect 24 Rules</span>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Card 2: Faculty Ratio Rules */}
                    <Card className="border hover:border-blue-300 dark:hover:border-blue-800 transition-colors shadow-xs flex flex-col justify-between">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
                                    <UserCheck className="size-5" />
                                </div>
                                <span className="text-[11px] font-semibold text-muted-foreground font-mono">
                                    1:{facultyStudentRules[0]?.maxStudents || 24} Ratio
                                </span>
                            </div>
                            <CardTitle className="text-base font-bold mt-2">Faculty Ratio & Reserves</CardTitle>
                            <CardDescription className="text-xs">
                                Configure teacher-to-student ratios, standby emergency reserves ({reservedCount} staff/session), and designation duty limits.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowFacultyDialog(true)}
                                className="w-full text-xs font-semibold gap-1.5 border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                            >
                                <UserCheck className="size-3.5" />
                                <span>Configure Ratio Rules</span>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Card 3: Faculty Time Requests */}
                    <Card className="border hover:border-amber-300 dark:hover:border-amber-800 transition-colors shadow-xs flex flex-col justify-between">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300">
                                    <Clock className="size-5" />
                                </div>
                                <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                                    activeFacultyTimeRequestsCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                                }`}>
                                    {activeFacultyTimeRequestsCount} Staff Requests
                                </span>
                            </div>
                            <CardTitle className="text-base font-bold mt-2">Staff Time Requests</CardTitle>
                            <CardDescription className="text-xs">
                                Record faculty who asked for certain times or shifts off (medical leave, morning-only, external viva). Allotment honors them automatically.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowTimeRequestsDialog(true)}
                                className="w-full text-xs font-semibold gap-1.5 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                            >
                                <Clock className="size-3.5" />
                                <span>Manage Time Requests</span>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Reports & Official Exports Section */}
            <Card className="border shadow-xs">
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <CardTitle className="text-lg font-bold">University Examination Reports</CardTitle>
                            <CardDescription className="text-xs">
                                Download official Excel and photo-format reports tailored for GEHU examination administration.
                            </CardDescription>
                        </div>
                        {fullAllotment ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                Allotment Ready for Export
                            </span>
                        ) : (
                            <span className="text-xs text-muted-foreground italic">
                                Run allotment to export reports
                            </span>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <Button
                            variant="outline"
                            onClick={handleExportMasterMatrixExcel}
                            disabled={!fullAllotment}
                            className="h-12 justify-start px-4 text-xs font-semibold hover:border-blue-500/50 transition-colors border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20"
                        >
                            <Sparkles className="mr-2.5 size-4 text-blue-600" />
                            <div className="text-left">
                                <div className="font-semibold text-blue-900 dark:text-blue-300">Master Matrix (Excel)</div>
                                <div className="text-[10px] text-muted-foreground font-normal">Room distribution grid</div>
                            </div>
                        </Button>

                        <Button
                            variant="outline"
                            onClick={handleExportMasterReport}
                            disabled={!fullAllotment}
                            className="h-12 justify-start px-4 text-xs font-semibold hover:border-primary/50 transition-colors"
                        >
                            <FileDown className="mr-2.5 size-4 text-primary" />
                            <div className="text-left">
                                <div className="font-semibold">Master Seating Report</div>
                                <div className="text-[10px] text-muted-foreground font-normal">Session-wise Excel</div>
                            </div>
                        </Button>

                        <Button
                            variant="outline"
                            onClick={handleExportDutyRoster}
                            disabled={!fullAllotment}
                            className="h-12 justify-start px-4 text-xs font-semibold hover:border-primary/50 transition-colors"
                        >
                            <FileDown className="mr-2.5 size-4 text-primary" />
                            <div className="text-left">
                                <div className="font-semibold">Invigilator Duty Roster</div>
                                <div className="text-[10px] text-muted-foreground font-normal">Department summary</div>
                            </div>
                        </Button>

                        <Button
                            variant="outline"
                            onClick={handleExportSessionRoster}
                            disabled={!fullAllotment}
                            className="h-12 justify-start px-4 text-xs font-semibold hover:border-primary/50 transition-colors"
                        >
                            <FileDown className="mr-2.5 size-4 text-primary" />
                            <div className="text-left">
                                <div className="font-semibold">Session Roster (Photo Format)</div>
                                <div className="text-[10px] text-muted-foreground font-normal">Classroom sheets</div>
                            </div>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Decluttered System Tools & Settings Bar */}
            <div className="p-4 rounded-xl border bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Database className="size-4 text-primary" />
                    <span>Database & Environment Tools:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsPriorityDialogOpen(true)}
                        disabled={classrooms.length === 0}
                        className="h-8 text-xs font-medium gap-1.5"
                    >
                        <Building className="size-3.5" />
                        Room Priorities
                    </Button>

                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsImportDialogOpen(true)}
                        className="h-8 text-xs font-medium gap-1.5"
                    >
                        <FileUp className="size-3.5" />
                        Bulk CSV Import
                    </Button>

                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsCustomMockDialogOpen(true)}
                        className="h-8 text-xs font-medium gap-1.5 text-primary border-primary/20 hover:bg-primary/5"
                    >
                        <Sparkles className="size-3.5" />
                        Setup Wizard
                    </Button>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5">
                                <Trash2 className="size-3.5" />
                                Clear Data
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Clear all local data?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will reset all students, classrooms, invigilators, and schedule data from the current browser session.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleClearAllData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Yes, Clear All
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            {/* Dialogs */}
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
                onGenerateCustom={(newStudents, newExams, wizardReservedCount) => {
                    setStudents(prev => [...prev, ...newStudents]);
                    setExamSchedule(prev => [...prev, ...newExams]);

                    let extraMsg = '';
                    if (wizardReservedCount !== undefined) {
                        setReservedCount(wizardReservedCount);
                    }
                    if (classrooms.length === 0) {
                        setClassrooms(generateMockClassrooms());
                        extraMsg += ' Added default classrooms.';
                    }
                    if (invigilators.length === 0) {
                        setInvigilators(generateMockInvigilators());
                        extraMsg += ' Added default invigilators.';
                    }

                    toast({
                        title: "Setup Complete",
                        description: `Successfully configured ${newStudents.length} students and ${newExams.length} exams.${extraMsg}`
                    });
                }}
                onGenerateRandom={(count) => {
                    handlePopulateMockData(count);
                }}
                onFloodAndGenerate={handleFloodAndGenerateAll}
            />

            {/* Governance & Rules Dialogs */}
            <AllotmentRulesDialog open={showRulesDialog} onOpenChange={setShowRulesDialog} />

            <FacultyAllocationDialog
                isOpen={showFacultyDialog}
                onClose={() => setShowFacultyDialog(false)}
                onConfirm={(newRules, newReserves) => {
                    setFacultyStudentRules(newRules);
                    setReservedCount(newReserves);
                    setShowFacultyDialog(false);
                    toast({ title: 'Faculty Rules Updated', description: 'Updated ratios and reserve staff allocations.' });
                }}
                initialRules={facultyStudentRules}
                initialReserveCount={reservedCount}
                confirmLabel="Save Rules"
            />

            <FacultyTimeRequestsDialog
                open={showTimeRequestsDialog}
                onOpenChange={setShowTimeRequestsDialog}
            />
        </div>
    );
}
