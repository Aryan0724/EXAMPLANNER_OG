'use client';

import React, { useState, useContext, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Sparkles, CheckCircle2, ArrowRight, ArrowLeft, Search,
    Building2, Users, CalendarDays, FileText, Upload,
    Check, RotateCcw, ClipboardPaste, BookOpen, Clock,
    Zap, Loader2, Layers, AlertCircle
} from 'lucide-react';
import { ExamSlot, Student, Classroom, Invigilator, SeatPlan, InvigilatorAssignment } from '@/lib/types';
import { generateMockClassrooms, generateMockInvigilators, generateMockStudents, generateMockExamSchedule } from '@/lib/data';
import { generateSeatPlan, assignInvigilators } from '@/lib/planning';
import { parseExamPDF } from '@/lib/pdf-parser';
import { parsePasteSchedule } from '@/lib/parsers';
import { REVISED_NOV_2025_SCHEDULE, REVISED_NOV_2025_BATCHES } from '@/lib/revisedScheduleNov2025';
import { BHIMTAL_MAY_2026_EXAM_SCHEDULE } from '@/lib/bhimtalDutyPlanMay2026';
import { DataContext } from '@/context/DataContext';
import { AllotmentContext } from '@/context/AllotmentContext';

interface CustomMockDataDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onClearData: () => void;
    onGenerateCustom?: (students: Student[], exams: ExamSlot[], reservedCount?: number) => void;
    onGenerateRandom?: (count: number) => void;
    onFloodAndGenerate?: () => void;
}

interface ActiveBatch {
    id: string;
    course: string;
    semester: number;
    department: string;
    examCount: number;
    count: number;
}

const FIRST_NAMES = [
    'Aarav', 'Aditi', 'Akash', 'Ananya', 'Aryan', 'Ayush', 'Bhavya', 'Deepak',
    'Divya', 'Gaurav', 'Ishita', 'Karan', 'Kavita', 'Manish', 'Neha', 'Nitin',
    'Pooja', 'Pranav', 'Priya', 'Rahul', 'Rhea', 'Rohan', 'Rohit', 'Sakshi',
    'Siddharth', 'Simran', 'Sneha', 'Tanvi', 'Varun', 'Vikas'
];

const LAST_NAMES = [
    'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Joshi', 'Pant', 'Bisht',
    'Pandey', 'Rawat', 'Tiwari', 'Bhatt', 'Mehta', 'Chauhan', 'Arya'
];

function generateStudentName(index: number): string {
    const first = FIRST_NAMES[index % FIRST_NAMES.length];
    const last = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
    return `${first} ${last}`;
}

export function CustomMockDataDialog({
    isOpen,
    onClose,
    onClearData,
    onFloodAndGenerate
}: CustomMockDataDialogProps) {
    const { toast } = useToast();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        setClassrooms,
        setInvigilators,
        setExamSchedule,
        setStudents,
        blockPriority,
        facultyStudentRules
    } = useContext(DataContext);

    const { setFullAllotment } = useContext(AllotmentContext);

    // Wizard Step: 1 = Exam Schedule, 2 = Batch Student Counts, 3 = Generating
    const [step, setStep] = useState<1 | 2>(1);

    // Schedule state
    const [activeSchedule, setActiveSchedule] = useState<ExamSlot[]>(() => REVISED_NOV_2025_SCHEDULE.slice(0, 120));
    const [scheduleTitle, setScheduleTitle] = useState('Graphic Era Nov 2025 (Sample Set)');
    const [isParsingPDF, setIsParsingPDF] = useState(false);

    // Paste schedule drawer toggle
    const [showPasteBox, setShowPasteBox] = useState(false);
    const [pasteText, setPasteText] = useState('');

    // Active Batches state
    const [batchCounts, setBatchCounts] = useState<Record<string, number>>({});
    const [batchSearchQuery, setBatchSearchQuery] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Quick Paste for batch counts
    const [showBatchPasteBox, setShowBatchPasteBox] = useState(false);
    const [batchPasteText, setBatchPasteText] = useState('');

    // Extract unique active batches from the currently loaded schedule
    const activeBatches = useMemo<ActiveBatch[]>(() => {
        const batchMap = new Map<string, ActiveBatch>();

        activeSchedule.forEach(exam => {
            const courseName = exam.course?.trim() || 'General Course';
            const semesterNum = Number(exam.semester) || 1;
            const deptName = exam.department?.trim() || courseName;
            const key = `${courseName}__sem_${semesterNum}__dept_${deptName}`;

            if (!batchMap.has(key)) {
                // If we already have a user-entered count, keep it; else check REVISED_NOV_2025_BATCHES, else 60
                const predefined = REVISED_NOV_2025_BATCHES.find(
                    b => b.course.toLowerCase() === courseName.toLowerCase() && Number(b.semester) === semesterNum
                );
                const initialCount = batchCounts[key] ?? (predefined ? predefined.count : 60);

                batchMap.set(key, {
                    id: key,
                    course: courseName,
                    semester: semesterNum,
                    department: deptName,
                    examCount: 1,
                    count: initialCount
                });
            } else {
                batchMap.get(key)!.examCount += 1;
            }
        });

        return Array.from(batchMap.values()).sort((a, b) => a.course.localeCompare(b.course));
    }, [activeSchedule, batchCounts]);

    // Filtered batches for display in Step 2
    const filteredBatches = useMemo(() => {
        if (!batchSearchQuery.trim()) return activeBatches;
        const q = batchSearchQuery.toLowerCase();
        return activeBatches.filter(
            b => b.course.toLowerCase().includes(q) ||
                b.department.toLowerCase().includes(q) ||
                `sem ${b.semester}`.includes(q)
        );
    }, [activeBatches, batchSearchQuery]);

    // Total students across all batches
    const totalStudentsCount = useMemo(() => {
        return activeBatches.reduce((acc, b) => acc + (batchCounts[b.id] ?? b.count), 0);
    }, [activeBatches, batchCounts]);

    // Unique exam sessions
    const totalSessions = useMemo(() => {
        const set = new Set(activeSchedule.map(e => `${e.date} ${e.time}`));
        return set.size;
    }, [activeSchedule]);

    // ── 1-CLICK INSTANT FLOOD & GENERATE ──
    const handleInstantFloodAndGenerate = async () => {
        setIsGenerating(true);
        if (onFloodAndGenerate) {
            onFloodAndGenerate();
            onClose();
            setIsGenerating(false);
            router.push('/allotment');
            return;
        }

        toast({ title: '⚡ Flooding Mock Data...', description: 'Preparing classrooms, staff, students & schedule.' });
        await new Promise(resolve => setTimeout(resolve, 150));

        try {
            const freshStudents = generateMockStudents(120);
            const freshClassrooms = generateMockClassrooms();
            const freshInvigilators = generateMockInvigilators();
            const freshExams = generateMockExamSchedule();

            setClassrooms(freshClassrooms);
            setInvigilators(freshInvigilators);
            setExamSchedule(freshExams);

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
                    2,
                    facultyStudentRules
                );
                invigilatorMasterList = updatedInvigilators;
                generatedPlans[key] = { seatPlan: plan, invigilatorAssignments };
            }

            setStudents(studentMasterList);
            setInvigilators(invigilatorMasterList);
            setFullAllotment(generatedPlans);

            toast({
                title: '🎉 Allotment Ready!',
                description: 'Seating plans and duties successfully generated. Opening visualizer.'
            });

            onClose();
            router.push('/allotment');
        } catch (err: any) {
            console.error('Instant flood failed:', err);
            toast({ variant: 'destructive', title: 'Generation Failed', description: err.message || 'Error occurred.' });
        } finally {
            setIsGenerating(false);
        }
    };

    // ── STEP 1 ACTIONS ──
    const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsingPDF(true);
        try {
            const parsed = await parseExamPDF(file);
            if (parsed.length === 0) {
                toast({
                    variant: 'destructive',
                    title: 'No Exams Found',
                    description: 'Could not extract exam slots from this PDF. Please check the format or paste schedule text.'
                });
            } else {
                setActiveSchedule(parsed);
                setScheduleTitle(file.name.replace(/\.pdf$/i, ''));
                toast({
                    title: 'PDF Parsed Successfully ✅',
                    description: `Loaded ${parsed.length} exams from ${file.name}.`
                });
            }
        } catch (error: any) {
            console.error('PDF Parse Error:', error);
            toast({
                variant: 'destructive',
                title: 'PDF Parsing Failed',
                description: error.message || 'Error reading PDF.'
            });
        } finally {
            setIsParsingPDF(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleApplyPastedSchedule = () => {
        if (!pasteText.trim()) return;
        try {
            const parsed = parsePasteSchedule(pasteText);
            if (parsed.length === 0) {
                toast({ variant: 'destructive', title: 'Parsing Error', description: 'Could not parse schedule. Ensure Date and Subject Code columns exist.' });
                return;
            }
            setActiveSchedule(parsed);
            setScheduleTitle('Custom Pasted Schedule');
            setShowPasteBox(false);
            setPasteText('');
            toast({ title: 'Schedule Loaded ✅', description: `Parsed ${parsed.length} exam slots.` });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message || 'Could not parse text.' });
        }
    };

    const handleSelectPresetSchedule = (type: 'nov2025' | 'may2026' | 'sample') => {
        if (type === 'nov2025') {
            setActiveSchedule(REVISED_NOV_2025_SCHEDULE);
            setScheduleTitle('Graphic Era Odd Sem (Nov 2025) — 794 Exams');
        } else if (type === 'may2026') {
            setActiveSchedule(BHIMTAL_MAY_2026_EXAM_SCHEDULE);
            setScheduleTitle('GEHU Bhimtal End Term (May 2026) — 189 Exams');
        } else {
            setActiveSchedule(generateMockExamSchedule());
            setScheduleTitle('Mid-Term Sample Schedule — 2 Exams');
        }
        toast({ title: 'Preset Loaded', description: 'Schedule updated.' });
    };

    // ── STEP 2 ACTIONS: BATCH STRENGTH ADJUSTMENTS ──
    const handleSetAllBatchCounts = (value: number) => {
        const next: Record<string, number> = {};
        activeBatches.forEach(b => {
            next[b.id] = value;
        });
        setBatchCounts(next);
        toast({ title: 'Batch Strengths Updated', description: `All ${activeBatches.length} batches set to ${value} students.` });
    };

    const handleSingleBatchCountChange = (batchId: string, value: number) => {
        setBatchCounts(prev => ({
            ...prev,
            [batchId]: Math.max(0, value)
        }));
    };

    const handleApplyBatchPaste = () => {
        if (!batchPasteText.trim()) return;
        const lines = batchPasteText.split('\n');
        const next = { ...batchCounts };
        let updatedCount = 0;

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;
            // Match "Course Name, Count" or "Course Name : Count" or "Count"
            const parts = trimmed.split(/[,:\t]/);
            if (parts.length >= 2) {
                const searchName = parts[0].trim().toLowerCase();
                const countNum = parseInt(parts[1].trim(), 10);
                if (!isNaN(countNum)) {
                    const match = activeBatches.find(b => b.course.toLowerCase().includes(searchName));
                    if (match) {
                        next[match.id] = countNum;
                        updatedCount++;
                    }
                }
            } else if (!isNaN(parseInt(trimmed, 10)) && updatedCount < activeBatches.length) {
                // Positional paste
                next[activeBatches[updatedCount].id] = parseInt(trimmed, 10);
                updatedCount++;
            }
        });

        setBatchCounts(next);
        setShowBatchPasteBox(false);
        setBatchPasteText('');
        toast({ title: 'Batch Counts Pasted', description: `Updated ${updatedCount} batch counts.` });
    };

    // ── STEP 3: RUN THE ALLOTMENT ALGORITHM ──
    const handleRunAllotment = async () => {
        if (activeSchedule.length === 0) {
            toast({ variant: 'destructive', title: 'Schedule Missing', description: 'Please load an exam schedule first.' });
            return;
        }

        setIsGenerating(true);
        toast({
            title: '🚀 Generating Complete Allotment...',
            description: 'Synthesizing students, seating alternate desks & assigning faculty duties.'
        });
        await new Promise(resolve => setTimeout(resolve, 150));

        try {
            // 1. Generate Students for every batch according to specified counts
            const synthesizedStudents: Student[] = [];
            let globalCounter = 0;

            activeBatches.forEach((batch) => {
                const studentCount = batchCounts[batch.id] ?? batch.count;
                // Generate realistic roll numbers
                const deptCode = batch.department.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'CS';
                for (let i = 1; i <= studentCount; i++) {
                    globalCounter++;
                    const rollNo = `23${deptCode}${String(i).padStart(3, '0')}`;
                    synthesizedStudents.push({
                        id: `STU-${batch.id}-${i}`,
                        name: generateStudentName(globalCounter),
                        rollNo: rollNo,
                        course: batch.course,
                        department: batch.department,
                        semester: batch.semester,
                        section: i <= 60 ? 'A' : (i <= 120 ? 'B' : 'C'),
                        ineligibilityRecords: [],
                        unavailableSlots: [],
                        seatAssignment: null,
                        isDebarred: false
                    });
                }
            });

            // 2. Load Hardcoded Classrooms (Blocks C, D, E with 42, 60, 66, 120 seats)
            const hardcodedClassrooms = generateMockClassrooms();

            // 3. Load Hardcoded Faculty Invigilators
            const hardcodedInvigilators = generateMockInvigilators();

            // 4. Group Schedule into Sessions (${date} ${time})
            const examSlotsByTime = activeSchedule.reduce((acc, exam) => {
                const key = `${exam.date} ${exam.time}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(exam);
                return acc;
            }, {} as Record<string, ExamSlot[]>);

            let studentMasterList: Student[] = JSON.parse(JSON.stringify(synthesizedStudents));
            let invigilatorMasterList: Invigilator[] = JSON.parse(JSON.stringify(hardcodedInvigilators));
            const classroomMasterList = JSON.parse(JSON.stringify(hardcodedClassrooms));

            const generatedPlans: Record<string, { seatPlan: SeatPlan, invigilatorAssignments: InvigilatorAssignment[] }> = {};
            const sortedSessionKeys = Object.keys(examSlotsByTime).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

            for (const key of sortedSessionKeys) {
                const concurrentExams = examSlotsByTime[key];
                if (!concurrentExams || concurrentExams.length === 0) continue;

                // Alternate seating algorithm across benches
                const { plan, updatedStudents } = generateSeatPlan(studentMasterList, classroomMasterList, concurrentExams, blockPriority);
                studentMasterList = updatedStudents;

                // Seniority and 2 invigilator per room assignment + 2 reserve staff
                const { assignments: invigilatorAssignments, updatedInvigilators } = assignInvigilators(
                    invigilatorMasterList,
                    plan,
                    concurrentExams[0],
                    2,
                    facultyStudentRules
                );
                invigilatorMasterList = updatedInvigilators;

                generatedPlans[key] = { seatPlan: plan, invigilatorAssignments };
            }

            // 5. Atomic Global State Persistence
            setStudents(studentMasterList);
            setClassrooms(classroomMasterList);
            setInvigilators(invigilatorMasterList);
            setExamSchedule(activeSchedule);
            setFullAllotment(generatedPlans);

            toast({
                title: '🎉 Allotment Generated Successfully!',
                description: `Created seating plans for ${sortedSessionKeys.length} session(s) across ${activeBatches.length} batches.`
            });

            // 6. Close Modal & Navigate to /allotment Seating Visualizer
            onClose();
            router.push('/allotment');
        } catch (err: any) {
            console.error('Allotment generation error:', err);
            toast({
                variant: 'destructive',
                title: 'Generation Failed',
                description: err.message || 'An error occurred while generating seating plans.'
            });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
                {/* Header */}
                <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-primary/5 via-background to-secondary/30">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                Exam Allotment & Planning Wizard
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-1">
                                Follow the university procedure: Upload schedule → specify batch student counts → generate classroom seating.
                            </DialogDescription>
                        </div>

                        {/* Step indicator */}
                        <div className="flex items-center gap-2 text-xs font-medium">
                            <span className={`px-2.5 py-1 rounded-full flex items-center gap-1.5 ${step === 1 ? 'bg-primary text-primary-foreground font-bold' : 'bg-muted text-muted-foreground'}`}>
                                <span>1</span> Schedule
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className={`px-2.5 py-1 rounded-full flex items-center gap-1.5 ${step === 2 ? 'bg-primary text-primary-foreground font-bold' : 'bg-muted text-muted-foreground'}`}>
                                <span>2</span> Batch Counts
                            </span>
                        </div>
                    </div>

                    {/* TOP 1-CLICK INSTANT FLOOD BUTTON */}
                    <div className="mt-4 pt-3 border-t border-border/40">
                        <Button
                            onClick={handleInstantFloodAndGenerate}
                            disabled={isGenerating}
                            className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-semibold shadow-md py-2.5 h-auto text-sm flex items-center justify-center gap-2"
                        >
                            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-current" />}
                            <span>⚡ One-Click Flood Mock Data & Generate Allotment (Instant Test)</span>
                        </Button>
                    </div>
                </DialogHeader>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* STEP 1: EXAM SCHEDULE */}
                    {step === 1 && (
                        <div className="space-y-6">
                            {/* Schedule Selection Methods */}
                            <div>
                                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-foreground">
                                    <CalendarDays className="h-4 w-4 text-primary" />
                                    Step 1: Input University Exam Schedule
                                </h3>
                                <p className="text-xs text-muted-foreground mb-4">
                                    Upload the exam schedule PDF, paste table rows, or select from preloaded university exam calendars.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {/* Upload PDF */}
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-primary/30 hover:border-primary rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-primary/5 hover:bg-primary/10 gap-2"
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".pdf"
                                            className="hidden"
                                            onChange={handlePDFUpload}
                                        />
                                        {isParsingPDF ? (
                                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                        ) : (
                                            <Upload className="h-8 w-8 text-primary" />
                                        )}
                                        <div className="text-xs font-semibold">Upload Schedule PDF</div>
                                        <div className="text-[11px] text-muted-foreground">Click to select .pdf file</div>
                                    </div>

                                    {/* Paste Text */}
                                    <div
                                        onClick={() => setShowPasteBox(!showPasteBox)}
                                        className="border rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors hover:border-primary bg-card hover:bg-muted/30 gap-2"
                                    >
                                        <ClipboardPaste className="h-8 w-8 text-muted-foreground hover:text-primary" />
                                        <div className="text-xs font-semibold">Paste Schedule Text</div>
                                        <div className="text-[11px] text-muted-foreground">Tabular or pipe format</div>
                                    </div>

                                    {/* Preloaded Presets */}
                                    <div className="border rounded-xl p-4 flex flex-col justify-between bg-card gap-2">
                                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Presets</div>
                                        <div className="flex flex-col gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleSelectPresetSchedule('nov2025')}
                                                className="text-left text-xs px-2 py-1.5 rounded hover:bg-muted font-medium transition-colors text-primary flex items-center justify-between"
                                            >
                                                <span>Nov 2025 (794 Exams)</span>
                                                <ArrowRight className="h-3 w-3" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleSelectPresetSchedule('may2026')}
                                                className="text-left text-xs px-2 py-1.5 rounded hover:bg-muted font-medium transition-colors text-primary flex items-center justify-between"
                                            >
                                                <span>May 2026 (189 Exams)</span>
                                                <ArrowRight className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Paste Box Drawer */}
                            {showPasteBox && (
                                <Card className="p-4 border-primary/30 bg-muted/20">
                                    <div className="text-xs font-semibold mb-1">Paste Schedule Rows:</div>
                                    <div className="text-[11px] text-muted-foreground mb-2">Columns: Date | Shift/Time | Subject Code | Subject Name | Course | Dept | Sem</div>
                                    <textarea
                                        value={pasteText}
                                        onChange={e => setPasteText(e.target.value)}
                                        placeholder="2025-12-06 | 09:30 | TCS301 | Logic Design | B.Tech CSE | CSE | 3"
                                        rows={4}
                                        className="w-full text-xs font-mono p-2.5 rounded-md border bg-background"
                                    />
                                    <div className="flex justify-end gap-2 mt-2">
                                        <Button variant="outline" size="sm" onClick={() => setShowPasteBox(false)}>Cancel</Button>
                                        <Button size="sm" onClick={handleApplyPastedSchedule}>Apply Pasted Schedule</Button>
                                    </div>
                                </Card>
                            )}

                            {/* Active Loaded Schedule Summary */}
                            <Card className="border-border/60 bg-card/60">
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            <span className="text-sm font-semibold">{scheduleTitle}</span>
                                        </div>
                                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                            Ready for Batch Mapping
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border/40 text-center">
                                        <div className="p-2 bg-muted/40 rounded-lg">
                                            <div className="text-xs text-muted-foreground">Total Exams</div>
                                            <div className="text-lg font-bold text-foreground">{activeSchedule.length}</div>
                                        </div>
                                        <div className="p-2 bg-muted/40 rounded-lg">
                                            <div className="text-xs text-muted-foreground">Exam Sessions</div>
                                            <div className="text-lg font-bold text-foreground">{totalSessions}</div>
                                        </div>
                                        <div className="p-2 bg-muted/40 rounded-lg">
                                            <div className="text-xs text-muted-foreground">Batches Identified</div>
                                            <div className="text-lg font-bold text-foreground">{activeBatches.length}</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Infrastructure info banner */}
                            <div className="p-3 bg-muted/40 rounded-lg border text-xs text-muted-foreground flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-primary" />
                                    <span><strong>Hardcoded Infrastructure:</strong> Blocks C, D, E (18 Classrooms, 954 seats/shift) + University Faculty Pool</span>
                                </div>
                                <span className="text-emerald-600 font-medium">Preloaded</span>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: BATCH STUDENT COUNTS */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                                    <Users className="h-4 w-4 text-primary" />
                                    Step 2: Enter Student Strength for Each Batch
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    The algorithm will seat students from these batches into classrooms following alternate seating rules.
                                </p>
                            </div>

                            {/* Bulk Action Toolbar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg border">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-muted-foreground">Quick Fill All:</span>
                                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleSetAllBatchCounts(60)}>60</Button>
                                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleSetAllBatchCounts(120)}>120</Button>
                                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleSetAllBatchCounts(40)}>40</Button>
                                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleSetAllBatchCounts(30)}>30</Button>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowBatchPasteBox(!showBatchPasteBox)}>
                                        <ClipboardPaste className="h-3 w-3 mr-1" /> Paste Counts
                                    </Button>
                                </div>

                                {/* Search filter */}
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Search courses..."
                                        value={batchSearchQuery}
                                        onChange={e => setBatchSearchQuery(e.target.value)}
                                        className="h-8 pl-8 text-xs"
                                    />
                                </div>
                            </div>

                            {/* Batch Paste Box Drawer */}
                            {showBatchPasteBox && (
                                <Card className="p-3 border-primary/30 bg-muted/20">
                                    <div className="text-xs font-semibold mb-1">Paste Batch Strengths:</div>
                                    <div className="text-[11px] text-muted-foreground mb-2">Format: `Course Name, Count` or one number per line</div>
                                    <textarea
                                        value={batchPasteText}
                                        onChange={e => setBatchPasteText(e.target.value)}
                                        placeholder="B.Tech Computer Science, 120&#10;BCA, 60&#10;MBA, 60"
                                        rows={3}
                                        className="w-full text-xs font-mono p-2 rounded-md border bg-background"
                                    />
                                    <div className="flex justify-end gap-2 mt-2">
                                        <Button variant="outline" size="sm" onClick={() => setShowBatchPasteBox(false)}>Cancel</Button>
                                        <Button size="sm" onClick={handleApplyBatchPaste}>Apply Counts</Button>
                                    </div>
                                </Card>
                            )}

                            {/* Batch Table List */}
                            <div className="border rounded-xl overflow-hidden bg-card">
                                <div className="max-h-[300px] overflow-y-auto divide-y">
                                    {filteredBatches.map((batch) => {
                                        const currentVal = batchCounts[batch.id] ?? batch.count;
                                        return (
                                            <div key={batch.id} className="p-3 flex items-center justify-between hover:bg-muted/20 transition-colors gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-xs text-foreground truncate">{batch.course}</span>
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-primary/5 text-primary">
                                                            Sem {batch.semester}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                                        <span>{batch.department}</span>
                                                        <span>•</span>
                                                        <span>{batch.examCount} exam slot(s)</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">Students:</span>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={1000}
                                                        value={currentVal}
                                                        onChange={e => handleSingleBatchCountChange(batch.id, parseInt(e.target.value, 10) || 0)}
                                                        className="w-20 h-8 text-xs font-semibold text-center"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {filteredBatches.length === 0 && (
                                        <div className="p-8 text-center text-xs text-muted-foreground">
                                            No batches match &quot;{batchSearchQuery}&quot;
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Bottom summary strip */}
                            <div className="p-3 bg-muted/40 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-4">
                                    <span>Active Batches: <strong>{activeBatches.length}</strong></span>
                                    <span>Total Students: <strong className="text-primary">{totalStudentsCount.toLocaleString()}</strong></span>
                                </div>
                                <span className="text-muted-foreground text-[11px]">Alternate seating will be applied per bench</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-4 border-t bg-muted/20 flex items-center justify-between">
                    <div>
                        {step === 2 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setStep(1)}
                                disabled={isGenerating}
                                className="flex items-center gap-1.5"
                            >
                                <ArrowLeft className="h-4 w-4" /> Back to Schedule
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={onClose} disabled={isGenerating}>
                            Cancel
                        </Button>

                        {step === 1 ? (
                            <Button
                                onClick={() => setStep(2)}
                                disabled={activeSchedule.length === 0}
                                className="flex items-center gap-1.5"
                            >
                                <span>Continue to Batch Counts</span>
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleRunAllotment}
                                disabled={isGenerating || activeBatches.length === 0}
                                className="bg-primary text-primary-foreground font-semibold flex items-center gap-2 shadow-sm"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Running Allotment Algorithm...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4" />
                                        <span>Generate Allotment & View Classrooms</span>
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
