'use client';

import { useState, useMemo, useContext, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    CalendarDays, Sparkles, Loader2, Search, PlusCircle, MoreHorizontal,
    UserCheck, UploadCloud, FileSpreadsheet, ClipboardPaste, Trash2,
    Download, CheckCircle2, ArrowRight, GraduationCap, Building2, Users,
    FileText, AlertCircle, RefreshCw
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { COURSES, DEPARTMENTS } from '@/lib/data';
import type { ExamSlot, InvigilatorAssignment, SeatPlan, Student, Classroom, Invigilator, FacultyStudentRule } from '@/lib/types';
import { generateSeatPlan, assignInvigilators } from '@/lib/planning';
import { AllotmentContext } from '@/context/AllotmentContext';
import { DataContext } from '@/context/DataContext';
import { ExamDialog } from '@/components/exam-dialog';
import { FacultyAllocationDialog } from '@/components/faculty-allocation-dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
    parseExamScheduleFile,
    parsePastedExamSchedule,
    downloadSampleExamScheduleExcel
} from '@/lib/schedule-importer';

export default function SchedulePage() {
    const router = useRouter();
    const {
        students, setStudents,
        classrooms,
        invigilators, setInvigilators,
        examSchedule, setExamSchedule,
        blockPriority,
        isHydrated,
        reservedCount, setReservedCount,
        facultyStudentRules, setFacultyStudentRules,
        clearExamSchedule,
        loadSampleExamSchedule
    } = useContext(DataContext);

    const { fullAllotment, setFullAllotment } = useContext(AllotmentContext);

    const [searchQuery, setSearchQuery] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [autoAllotOnImport, setAutoAllotOnImport] = useState(true);

    const [showFacultyDialog, setShowFacultyDialog] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [isClearScheduleAlertOpen, setIsClearScheduleAlertOpen] = useState(false);
    const [isPasteDialogOpen, setIsPasteDialogOpen] = useState(false);
    const [pasteText, setPasteText] = useState('');

    const [selectedExam, setSelectedExam] = useState<ExamSlot | null>(null);
    const [examToDelete, setExamToDelete] = useState<string | null>(null);

    const [generationSuccessInfo, setGenerationSuccessInfo] = useState<{
        sessionsCount: number;
        totalExams: number;
    } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const filteredSchedule = useMemo(() => {
        if (!searchQuery) return examSchedule;
        const q = searchQuery.toLowerCase();
        return examSchedule.filter(exam =>
            exam.subjectName.toLowerCase().includes(q) ||
            exam.subjectCode.toLowerCase().includes(q) ||
            exam.department.toLowerCase().includes(q) ||
            exam.course.toLowerCase().includes(q) ||
            exam.date.toLowerCase().includes(q)
        );
    }, [searchQuery, examSchedule]);

    const distinctDates = useMemo(() => {
        return Array.from(new Set(examSchedule.map(e => e.date)));
    }, [examSchedule]);

    const distinctCourses = useMemo(() => {
        return Array.from(new Set(examSchedule.map(e => e.course)));
    }, [examSchedule]);

    if (!isHydrated) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Initializing Exam Planner...</p>
                </div>
            </div>
        );
    }

    // --- Core 1-Click Allotment Generator ---
    const executeGenerateAll = async (
        rules: FacultyStudentRule[] = facultyStudentRules,
        reserveCount: number = reservedCount,
        scheduleToProcess: ExamSlot[] = examSchedule
    ) => {
        if (scheduleToProcess.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No Exam Schedule Found',
                description: 'Please upload or paste an exam schedule before generating allotment.',
            });
            return;
        }

        setIsGenerating(true);
        toast({
            title: 'Generating Full Allotment...',
            description: `Processing ${scheduleToProcess.length} exam slots across all 18 official classrooms...`
        });

        // Small delay to allow UI spinner to render smoothly
        await new Promise(resolve => setTimeout(resolve, 150));

        try {
            let studentMasterList: Student[] = JSON.parse(JSON.stringify(students));
            let invigilatorMasterList: Invigilator[] = JSON.parse(JSON.stringify(invigilators));
            let classroomMasterList = JSON.parse(JSON.stringify(classrooms));

            const examSlotsByTime = scheduleToProcess.reduce((acc, exam) => {
                const key = `${exam.date} ${exam.time}`;
                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push(exam);
                return acc;
            }, {} as Record<string, ExamSlot[]>);

            const generatedPlans: Record<string, { seatPlan: SeatPlan, invigilatorAssignments: InvigilatorAssignment[] }> = {};
            const sortedSessionKeys = Object.keys(examSlotsByTime).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

            for (const key of sortedSessionKeys) {
                const concurrentExams = examSlotsByTime[key];
                if (!concurrentExams || concurrentExams.length === 0) continue;

                // 1. Generate Seat Plan for this slot
                const { plan, updatedStudents } = generateSeatPlan(
                    studentMasterList,
                    classroomMasterList,
                    concurrentExams,
                    blockPriority
                );
                studentMasterList = updatedStudents;

                // 2. Assign Invigilators using student-faculty ratio rules & reserves
                const { assignments: invigilatorAssignments, updatedInvigilators } = assignInvigilators(
                    invigilatorMasterList,
                    plan,
                    concurrentExams[0],
                    reserveCount,
                    rules
                );
                invigilatorMasterList = updatedInvigilators;

                generatedPlans[key] = { seatPlan: plan, invigilatorAssignments };
            }

            setStudents(studentMasterList);
            setInvigilators(invigilatorMasterList);
            setFullAllotment(generatedPlans);

            setGenerationSuccessInfo({
                sessionsCount: sortedSessionKeys.length,
                totalExams: scheduleToProcess.length
            });

            toast({
                title: 'Allotment Generated! 🎉',
                description: `Full allotment generated for ${sortedSessionKeys.length} session(s) using configured faculty allocation rules.`,
                action: (
                    <Button onClick={() => router.push('/allotment')} className="bg-primary text-white">
                        View Allotment
                    </Button>
                ),
                duration: 12000
            });

        } catch (error: any) {
            console.error('Allotment generation error:', error);
            toast({
                variant: 'destructive',
                title: 'Generation Failed',
                description: error.message || 'An error occurred during allotment generation.',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleConfirmGeneration = (rules: FacultyStudentRule[], reserveCount: number) => {
        setShowFacultyDialog(false);
        setFacultyStudentRules(rules);
        setReservedCount(reserveCount);
        executeGenerateAll(rules, reserveCount);
    };

    // --- File Upload Processing ---
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await processUploadedFile(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const processUploadedFile = async (file: File) => {
        setIsImporting(true);
        try {
            const parsedExams = await parseExamScheduleFile(file);
            setExamSchedule(parsedExams);

            toast({
                title: 'Exam Schedule Imported!',
                description: `Successfully loaded ${parsedExams.length} exam slots from "${file.name}".`
            });

            if (autoAllotOnImport) {
                await executeGenerateAll(facultyStudentRules, reservedCount, parsedExams);
            }
        } catch (err: any) {
            console.error(err);
            toast({
                variant: 'destructive',
                title: 'Import Failed',
                description: err.message || 'Could not parse exam schedule file. Please check file format.'
            });
        } finally {
            setIsImporting(false);
        }
    };

    // Drag and drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            await processUploadedFile(file);
        }
    };

    // Text Paste Processing
    const handlePasteSubmit = async () => {
        if (!pasteText.trim()) {
            toast({ variant: 'destructive', title: 'Paste text is empty' });
            return;
        }

        try {
            const parsedExams = parsePastedExamSchedule(pasteText);
            if (parsedExams.length === 0) {
                throw new Error('No valid exam rows could be parsed. Check column format.');
            }

            setExamSchedule(parsedExams);
            setIsPasteDialogOpen(false);
            setPasteText('');

            toast({
                title: 'Pasted Schedule Imported',
                description: `Loaded ${parsedExams.length} exam slots.`
            });

            if (autoAllotOnImport) {
                await executeGenerateAll(facultyStudentRules, reservedCount, parsedExams);
            }
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Paste Import Failed',
                description: err.message || 'Unable to parse pasted content.'
            });
        }
    };

    const handleSaveExam = (exam: ExamSlot) => {
        if (selectedExam) {
            setExamSchedule(prev => prev.map(e => e.id === exam.id ? exam : e));
            toast({ title: "Exam Updated", description: `Subject ${exam.subjectCode} updated.` });
        } else {
            setExamSchedule(prev => [...prev, exam]);
            toast({ title: "Exam Added", description: `Subject ${exam.subjectCode} added to schedule.` });
        }
        setIsDialogOpen(false);
        setSelectedExam(null);
    };

    const handleDeleteExam = () => {
        if (examToDelete) {
            const exam = examSchedule.find(e => e.id === examToDelete);
            setExamSchedule(prev => prev.filter(e => e.id !== examToDelete));
            toast({ title: "Exam Deleted", description: `Subject ${exam?.subjectCode} removed.` });
            setExamToDelete(null);
            setIsAlertOpen(false);
        }
    };

    const handleClearAllSchedule = () => {
        clearExamSchedule();
        setFullAllotment(null);
        setGenerationSuccessInfo(null);
        setIsClearScheduleAlertOpen(false);
        toast({
            title: "Schedule Cleared",
            description: "The exam schedule has been reset. You can now upload a new CSV or Excel schedule."
        });
    };

    return (
        <>
            {/* Hidden native file input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".xlsx,.xls,.csv"
                className="hidden"
            />

            {/* Exam Add/Edit Dialog */}
            <ExamDialog
                isOpen={isDialogOpen}
                onClose={() => { setIsDialogOpen(false); setSelectedExam(null); }}
                onSave={handleSaveExam}
                exam={selectedExam}
                departments={DEPARTMENTS}
                coursesByDept={COURSES}
            />

            {/* Delete Confirmation Alert */}
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove this exam slot from the active schedule.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setExamToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteExam}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Clear Entire Schedule Alert */}
            <AlertDialog open={isClearScheduleAlertOpen} onOpenChange={setIsClearScheduleAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Clear Current Exam Schedule?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove all {examSchedule.length} exam slots from the current schedule so you can upload a new one. Official classrooms, students, and faculty remain completely safe and ready.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsClearScheduleAlertOpen(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearAllSchedule} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Clear Schedule
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Paste Schedule Dialog */}
            <Dialog open={isPasteDialogOpen} onOpenChange={setIsPasteDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ClipboardPaste className="h-5 w-5 text-primary" />
                            Paste Exam Schedule
                        </DialogTitle>
                        <DialogDescription>
                            Copy and paste rows directly from Excel, Google Sheets, or CSV text.
                            Columns expected: Date, Time/Shift, Subject Code, Subject Name, Course, Department (optional), Semester (optional).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <Textarea
                            placeholder={"2026-05-14\t09:30\tTMA201\tEngineering Mathematics-II\tB.Tech CSE\tComputer Science and Engineering\tIII\n2026-05-14\t09:30\tBBA201\tOrganisational Behavior\tBBA\tSchool of Management\tIII"}
                            rows={8}
                            value={pasteText}
                            onChange={(e) => setPasteText(e.target.value)}
                            className="font-mono text-xs"
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Tab, comma, or pipe separated rows supported</span>
                            <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs"
                                onClick={() => downloadSampleExamScheduleExcel()}
                            >
                                <Download className="h-3 w-3 mr-1" />
                                Download sample format
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPasteDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handlePasteSubmit} className="bg-primary">
                            Import Schedule
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Generation Success Dialog */}
            <Dialog open={!!generationSuccessInfo} onOpenChange={(open) => !open && setGenerationSuccessInfo(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-2">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <DialogTitle className="text-center text-xl">Allotment Generated Successfully!</DialogTitle>
                        <DialogDescription className="text-center">
                            Full seating plans and invigilator duties have been created in 1 click across all {generationSuccessInfo?.sessionsCount} examination session(s).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm border">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Exam Slots Covered:</span>
                            <span className="font-semibold">{generationSuccessInfo?.totalExams} exams</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Classrooms Utilized:</span>
                            <span className="font-semibold">{classrooms.length} Official Rooms (1,147 seats)</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Student Cohorts:</span>
                            <span className="font-semibold">{students.length} Students (16 Batches)</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Faculty Allocation:</span>
                            <span className="font-semibold">Applied with {reservedCount} Reserves</span>
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-between gap-2">
                        <Button variant="outline" onClick={() => setGenerationSuccessInfo(null)}>
                            Close
                        </Button>
                        <Button
                            onClick={() => router.push('/allotment')}
                            className="bg-gradient-to-r from-primary to-indigo-600 font-semibold text-white"
                        >
                            View Full Allotment
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <SidebarProvider>
                <div className="flex min-h-screen">
                    <MainSidebar />
                    <SidebarInset>
                        <div className="flex flex-col h-full">
                            <MainHeader />
                            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">

                                {/* Top Ready-Resources Banner */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-card border rounded-xl p-4 flex items-center gap-3 shadow-sm hover:border-primary/50 transition-colors">
                                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                            <Building2 className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-sm font-semibold">{classrooms.length} Official Classrooms</p>
                                                <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">Ready</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground">1,147 seats (Block A, C, D, E)</p>
                                        </div>
                                    </div>

                                    <div className="bg-card border rounded-xl p-4 flex items-center gap-3 shadow-sm hover:border-primary/50 transition-colors">
                                        <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                                            <GraduationCap className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-sm font-semibold">{students.length} Official Students</p>
                                                <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">Ready</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground">16 batches (Nursing, CSE, BBA, etc.)</p>
                                        </div>
                                    </div>

                                    <div className="bg-card border rounded-xl p-4 flex items-center gap-3 shadow-sm hover:border-primary/50 transition-colors">
                                        <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                                            <Users className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-sm font-semibold">{invigilators.length} Faculty Members</p>
                                                <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">Ready</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground">GEHU Bhimtal invigilator pool</p>
                                        </div>
                                    </div>

                                    <div className="bg-card border rounded-xl p-4 flex items-center gap-3 shadow-sm hover:border-primary/50 transition-colors">
                                        <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                                            <UserCheck className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-semibold truncate">Faculty Ratio Rules</p>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-1.5 text-xs text-primary"
                                                    onClick={() => setShowFacultyDialog(true)}
                                                >
                                                    Edit
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate">
                                                0-20: 1 | 21-45: 2 | 46-70: 3 ({reservedCount} reserves)
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Schedule Card */}
                                <Card className="border-border shadow-sm">
                                    <CardHeader className="border-b bg-card/50 pb-4">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <CalendarDays className="h-6 w-6 text-primary" />
                                                    <CardTitle className="text-xl">Exam Schedule</CardTitle>
                                                    {examSchedule.length > 0 && (
                                                        <Badge variant="outline" className="font-mono text-xs">
                                                            {examSchedule.length} Exams Loaded
                                                        </Badge>
                                                    )}
                                                </div>
                                                <CardDescription className="mt-1">
                                                    {examSchedule.length === 0
                                                        ? 'Input your exam date sheet in CSV or Excel format to generate all seating & faculty allotments in one click.'
                                                        : `Covering ${distinctDates.length} date(s) across ${distinctCourses.length} academic courses.`}
                                                </CardDescription>
                                            </div>

                                            {/* Action Buttons Toolbar */}
                                            <div className="flex flex-wrap items-center gap-2.5">
                                                {/* Upload Excel/CSV Button */}
                                                <Button
                                                    variant="outline"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={isImporting || isGenerating}
                                                    className="border-primary/30 hover:bg-primary/5"
                                                >
                                                    {isImporting ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                                                    ) : (
                                                        <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                                                    )}
                                                    {examSchedule.length === 0 ? 'Upload Excel / CSV' : 'Replace Schedule'}
                                                </Button>

                                                {/* Paste Schedule Button */}
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setIsPasteDialogOpen(true)}
                                                    disabled={isImporting || isGenerating}
                                                >
                                                    <ClipboardPaste className="mr-2 h-4 w-4 text-primary" />
                                                    Paste Schedule
                                                </Button>

                                                {/* Faculty Ratio Rules */}
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setShowFacultyDialog(true)}
                                                    className="border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                                                >
                                                    <UserCheck className="mr-2 h-4 w-4" />
                                                    Ratio Rules
                                                </Button>

                                                {/* Add New Exam Manually */}
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleOpenDialog()}
                                                >
                                                    <PlusCircle className="mr-2 h-4 w-4" />
                                                    Add Exam
                                                </Button>

                                                {/* Clear Schedule Button (Visible when schedule is loaded) */}
                                                {examSchedule.length > 0 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setIsClearScheduleAlertOpen(true)}
                                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                        title="Clear Schedule"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}

                                                {/* 1-Click Allotment Generation Button */}
                                                <Button
                                                    onClick={() => executeGenerateAll()}
                                                    disabled={isGenerating || examSchedule.length === 0}
                                                    className="bg-gradient-to-r from-primary via-indigo-600 to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white font-semibold shadow-md"
                                                >
                                                    {isGenerating ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Generating Allotment...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Sparkles className="mr-2 h-4 w-4" />
                                                            ⚡ Generate Full Allotment (1-Click)
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="p-6">
                                        {/* EMPTY STATE: Clean Slate & Interactive Import Launchpad */}
                                        {examSchedule.length === 0 ? (
                                            <div className="space-y-6 py-4">
                                                <div
                                                    onDragOver={handleDragOver}
                                                    onDragLeave={handleDragLeave}
                                                    onDrop={handleDrop}
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className={`border-2 border-dashed rounded-2xl p-10 md:p-14 text-center cursor-pointer transition-all duration-200 ${
                                                        isDragging
                                                            ? 'border-primary bg-primary/5 scale-[0.99]'
                                                            : 'border-muted-foreground/25 hover:border-primary/60 hover:bg-accent/40 bg-card'
                                                    }`}
                                                >
                                                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 shadow-sm">
                                                        {isImporting ? (
                                                            <Loader2 className="h-8 w-8 animate-spin" />
                                                        ) : (
                                                            <UploadCloud className="h-8 w-8" />
                                                        )}
                                                    </div>

                                                    <h3 className="text-xl font-bold tracking-tight mb-2">
                                                        Upload Exam Schedule (.xlsx, .xls, or .csv)
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-6">
                                                        Drag and drop your exam timetable spreadsheet here, or click to browse files.
                                                        All 18 classrooms, 1,147 students, and faculty invigilators are already loaded and ready.
                                                    </p>

                                                    <div className="flex flex-wrap items-center justify-center gap-3">
                                                        <Button
                                                            size="lg"
                                                            className="bg-primary hover:bg-primary/90 font-semibold shadow"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                fileInputRef.current?.click();
                                                            }}
                                                        >
                                                            <FileSpreadsheet className="mr-2 h-5 w-5" />
                                                            Browse Excel / CSV File
                                                        </Button>

                                                        <Button
                                                            size="lg"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setIsPasteDialogOpen(true);
                                                            }}
                                                        >
                                                            <ClipboardPaste className="mr-2 h-5 w-5" />
                                                            Paste Schedule Text
                                                        </Button>

                                                        <Button
                                                            size="lg"
                                                            variant="secondary"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                downloadSampleExamScheduleExcel();
                                                            }}
                                                        >
                                                            <Download className="mr-2 h-5 w-5" />
                                                            Download Template (.xlsx)
                                                        </Button>
                                                    </div>

                                                    {/* Auto-Allot Option */}
                                                    <div
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="mt-8 pt-6 border-t max-w-md mx-auto flex items-center justify-center gap-2 text-sm text-muted-foreground"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            id="autoAllotToggle"
                                                            checked={autoAllotOnImport}
                                                            onChange={(e) => setAutoAllotOnImport(e.target.checked)}
                                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                                        />
                                                        <label htmlFor="autoAllotToggle" className="cursor-pointer font-medium select-none">
                                                            ⚡ Automatically run 1-Click Allotment immediately upon file upload
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* Demo / Sample Helper */}
                                                <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-muted/40 border text-xs text-muted-foreground gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <AlertCircle className="h-4 w-4 text-blue-500 shrink-0" />
                                                        <span>
                                                            Supported columns in your Excel: <strong>Date</strong>, <strong>Time / Shift</strong>, <strong>Subject Code</strong>, <strong>Subject Name</strong>, <strong>Course</strong> (e.g. B.Tech CSE, BBA, B.Sc Nursing), <strong>Semester</strong>.
                                                        </span>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            loadSampleExamSchedule();
                                                            toast({ title: "Sample Exam Schedule Loaded", description: "You can now test 1-click allotment." });
                                                        }}
                                                        className="h-7 text-xs text-primary whitespace-nowrap hover:bg-primary/10"
                                                    >
                                                        <RefreshCw className="mr-1 h-3 w-3" />
                                                        Load Sample Schedule for Demo
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* LOADED SCHEDULE TABLE VIEW */
                                            <div className="space-y-4">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div className="w-full max-w-sm relative">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        <Input
                                                            placeholder="Search by subject, code, course, or date..."
                                                            value={searchQuery}
                                                            onChange={(e) => setSearchQuery(e.target.value)}
                                                            className="pl-9"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <span>Showing <strong>{filteredSchedule.length}</strong> of <strong>{examSchedule.length}</strong> exam slots</span>
                                                    </div>
                                                </div>

                                                <div className="border rounded-lg overflow-hidden shadow-xs">
                                                    <Table>
                                                        <TableHeader className="bg-muted/40">
                                                            <TableRow>
                                                                <TableHead className="w-[120px]">Date</TableHead>
                                                                <TableHead className="w-[90px]">Time</TableHead>
                                                                <TableHead className="w-[90px]">Shift</TableHead>
                                                                <TableHead>Subject Name</TableHead>
                                                                <TableHead className="w-[110px]">Code</TableHead>
                                                                <TableHead className="w-[140px]">Course</TableHead>
                                                                <TableHead className="w-[70px]">Sem</TableHead>
                                                                <TableHead className="w-[80px]">Group</TableHead>
                                                                <TableHead className="text-right w-[70px]">Actions</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {filteredSchedule.map((exam, index) => (
                                                                <TableRow key={`${exam.id}-${index}`} className="hover:bg-muted/30">
                                                                    <TableCell className="font-mono text-xs">{exam.date}</TableCell>
                                                                    <TableCell className="font-mono text-xs">{exam.time}</TableCell>
                                                                    <TableCell>
                                                                        <Badge variant="secondary" className="text-[11px] font-normal">
                                                                            {exam.shift ? `Shift ${exam.shift}` : 'Shift 1'}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell className="font-medium text-sm">
                                                                        {exam.subjectName}
                                                                    </TableCell>
                                                                    <TableCell className="font-mono text-xs font-semibold text-primary">
                                                                        {exam.subjectCode}
                                                                    </TableCell>
                                                                    <TableCell className="text-xs">
                                                                        <span className="font-medium">{exam.course}</span>
                                                                    </TableCell>
                                                                    <TableCell className="text-xs font-mono">
                                                                        Sem {exam.semester || 3}
                                                                    </TableCell>
                                                                    <TableCell className="text-xs">
                                                                        {exam.group || 'All'}
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                                                    <span className="sr-only">Open menu</span>
                                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end">
                                                                                <DropdownMenuItem onClick={() => handleOpenDialog(exam)}>
                                                                                    Edit Exam
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem
                                                                                    onClick={() => openDeleteAlert(exam.id)}
                                                                                    className="text-destructive focus:text-destructive"
                                                                                >
                                                                                    Delete
                                                                                </DropdownMenuItem>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>

                                                    {filteredSchedule.length === 0 && (
                                                        <div className="text-center p-8 text-muted-foreground text-sm">
                                                            No exam slots matching "{searchQuery}".
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>

                                    {examSchedule.length > 0 && (
                                        <CardFooter className="border-t bg-muted/20 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                            <div className="text-xs text-muted-foreground">
                                                All {classrooms.length} official classrooms (1,147 seats) and {students.length} students are ready to be allotted.
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => downloadSampleExamScheduleExcel()}
                                                >
                                                    <Download className="mr-1.5 h-3.5 w-3.5" />
                                                    Download Template
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => executeGenerateAll()}
                                                    disabled={isGenerating}
                                                    className="bg-primary hover:bg-primary/90 font-semibold"
                                                >
                                                    {isGenerating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
                                                    Run 1-Click Allotment
                                                </Button>
                                            </div>
                                        </CardFooter>
                                    )}
                                </Card>
                            </main>
                        </div>
                    </SidebarInset>
                </div>
            </SidebarProvider>

            <FacultyAllocationDialog
                isOpen={showFacultyDialog}
                onClose={() => setShowFacultyDialog(false)}
                onConfirm={handleConfirmGeneration}
                initialRules={facultyStudentRules}
                initialReserveCount={reservedCount}
                title="Faculty Allocation Rules (Full Schedule)"
                description="Configure how many invigilators/faculty to allot per classroom based on student count before generating the full examination schedule."
            />
        </>
    );

    function handleOpenDialog(exam?: ExamSlot) {
        setSelectedExam(exam || null);
        setIsDialogOpen(true);
    }

    function openDeleteAlert(examId: string) {
        setExamToDelete(examId);
        setIsAlertOpen(true);
    }
}
