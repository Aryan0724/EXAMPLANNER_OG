import React, { useState, useContext, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Plus, Trash2, BookOpen, GraduationCap, Sparkles, Eraser, Lightbulb, FileUp,
    Loader2, UserCheck, Zap, CheckCircle2, ArrowRight, Database, Download,
    Search, ClipboardPaste, Building2, Check, ExternalLink, CalendarDays, Users
} from 'lucide-react';
import { ExamSlot, Student, Classroom, Invigilator, SessionAllotmentSummary } from '@/lib/types';
import { parsePasteSchedule, parsePasteBatches } from '@/lib/parsers';
import { parseExamPDF } from '@/lib/pdf-parser';
import { REVISED_NOV_2025_SCHEDULE, REVISED_NOV_2025_BATCHES, PredefinedBatch } from '@/lib/revisedScheduleNov2025';
import { generateFullBatchAllotment, generateStudentsFromBatches } from '@/lib/planning';
import { generateMockClassrooms, generateMockInvigilators } from '@/lib/data';
import { generateMasterReport, generateInvigilatorDutyRoster, generateSessionWiseInvigilationRoster } from '@/lib/report-generator';
import { DataContext } from '@/context/DataContext';
import { AllotmentContext } from '@/context/AllotmentContext';

export interface StudentBatch {
    id: string;
    course: string;
    department: string;
    semester: string;
    count: number;
}

interface CustomMockDataDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onClearData: () => void;
    onGenerateCustom?: (students: Student[], exams: ExamSlot[], reservedCount?: number) => void;
    onGenerateRandom?: (count: number) => void;
    onFloodAndGenerate?: () => void;
}

const MINI_PRESET_BATCHES: StudentBatch[] = [
    { id: 'mb1', course: 'B.Tech CSE', department: 'Computer Science and Engineering', semester: '2', count: 120 },
    { id: 'mb2', course: 'B.Tech CSE', department: 'Computer Science and Engineering', semester: '4', count: 100 },
    { id: 'mb3', course: 'B.Tech ME', department: 'Mechanical Engineering', semester: '2', count: 60 },
    { id: 'mb4', course: 'BBA', department: 'Management', semester: '2', count: 80 },
    { id: 'mb5', course: 'BCA', department: 'Computer Applications', semester: '4', count: 60 },
];

const MINI_PRESET_EXAMS: ExamSlot[] = [
    { id: 'me1', subjectName: 'Mathematics II', subjectCode: 'TMA201', date: '2025-12-01', time: '09:30', duration: 180, course: 'B.Tech CSE', department: 'Computer Science and Engineering', semester: 2, shift: 1, type: 'Theory', mode: 'Offline' },
    { id: 'me2', subjectName: 'Data Structures', subjectCode: 'TCS301', date: '2025-12-01', time: '09:30', duration: 180, course: 'B.Tech CSE', department: 'Computer Science and Engineering', semester: 4, shift: 1, type: 'Theory', mode: 'Offline' },
    { id: 'me3', subjectName: 'Engineering Mechanics', subjectCode: 'TME201', date: '2025-12-01', time: '09:30', duration: 180, course: 'B.Tech ME', department: 'Mechanical Engineering', semester: 2, shift: 1, type: 'Theory', mode: 'Offline' },
    { id: 'me4', subjectName: 'Business Communication', subjectCode: 'BBA201', date: '2025-12-01', time: '13:30', duration: 180, course: 'BBA', department: 'Management', semester: 2, shift: 2, type: 'Theory', mode: 'Offline' },
    { id: 'me5', subjectName: 'Programming in C', subjectCode: 'BCA201', date: '2025-12-02', time: '09:30', duration: 180, course: 'BCA', department: 'Computer Applications', semester: 4, shift: 1, type: 'Theory', mode: 'Offline' },
    { id: 'me6', subjectName: 'Database Management', subjectCode: 'TCS401', date: '2025-12-02', time: '09:30', duration: 180, course: 'B.Tech CSE', department: 'Computer Science and Engineering', semester: 4, shift: 1, type: 'Theory', mode: 'Offline' },
];

export function CustomMockDataDialog({
    isOpen,
    onClose,
    onClearData,
    onGenerateCustom,
    onGenerateRandom,
    onFloodAndGenerate
}: CustomMockDataDialogProps) {
    const { toast } = useToast();
    const router = useRouter();

    const {
        classrooms, setClassrooms,
        invigilators, setInvigilators,
        setStudents, setExamSchedule,
        reservedCount, setReservedCount,
        blockPriority, excludedBlocks, excludedRooms
    } = useContext(DataContext);

    const { setFullAllotment } = useContext(AllotmentContext);

    // Wizard navigation
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isParsing, setIsParsing] = useState(false);
    const [isComputingAllotment, setIsComputingAllotment] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Step 1 Schedule state
    const [exams, setExams] = useState<ExamSlot[]>(REVISED_NOV_2025_SCHEDULE);
    const [scheduleSourceLabel, setScheduleSourceLabel] = useState('Graphic Era Revised Odd Sem 2025 (794 Exams)');
    const [showPasteSchedule, setShowPasteSchedule] = useState(false);
    const [pasteScheduleText, setPasteScheduleText] = useState('');

    // Step 2 Batches state
    const [batches, setBatches] = useState<StudentBatch[]>(() =>
        REVISED_NOV_2025_BATCHES.map(b => ({ ...b }))
    );
    const [batchSearch, setBatchSearch] = useState('');
    const [showPasteBatches, setShowPasteBatches] = useState(false);
    const [pasteBatchesText, setPasteBatchesText] = useState('');

    // Step 3 Allotment results state
    const [sessionSummaries, setSessionSummaries] = useState<Record<string, SessionAllotmentSummary>>({});
    const [selectedSessionKey, setSelectedSessionKey] = useState<string>('');
    const [generatedStats, setGeneratedStats] = useState<{ totalStudents: number; totalRooms: number; totalSessions: number } | null>(null);

    // ── Helper: Extract unique batches from any list of exams ─────────────────────
    const extractBatchesFromExams = (examList: ExamSlot[]): StudentBatch[] => {
        const batchMap = new Map<string, StudentBatch>();
        examList.forEach(e => {
            const key = `${e.course}-${e.semester}`.toLowerCase();
            if (!batchMap.has(key)) {
                // Determine sensible default count
                const cLower = e.course.toLowerCase();
                let count = 60;
                if (cLower.includes('b.tech cse') || cLower.includes('b tech cse')) count = 180;
                else if (cLower.includes('b.tech') || cLower.includes('b tech')) count = 120;
                else if (cLower.includes('bca') || cLower.includes('bba') || cLower.includes('b.com')) count = 80;
                else if (cLower.includes('mca') || cLower.includes('mba')) count = 60;
                else if (cLower.includes('m.sc') || cLower.includes('m sc') || cLower.includes('m.tech') || cLower.includes('m tech')) count = 30;
                else if (cLower.includes('diploma')) count = 50;
                else count = 40;

                batchMap.set(key, {
                    id: `batch-${Math.random().toString(36).substr(2, 7)}`,
                    course: e.course,
                    department: e.department || e.course.split('(')[0].trim() || 'General',
                    semester: String(e.semester || 1),
                    count
                });
            }
        });
        return Array.from(batchMap.values());
    };

    // ── Step 1 Actions ──────────────────────────────────────────────────────────
    const handleLoadRevisedSchedule = () => {
        setExams(REVISED_NOV_2025_SCHEDULE);
        setBatches(REVISED_NOV_2025_BATCHES.map(b => ({ ...b })));
        setScheduleSourceLabel('Graphic Era Revised Odd Sem 2025 (794 Exams)');
        toast({
            title: 'Revised Schedule Loaded',
            description: `Loaded 794 exams across 144 student batches from the university schedule.`
        });
        setStep(2);
    };

    const handleLoadMiniPreset = () => {
        setExams(MINI_PRESET_EXAMS);
        setBatches(MINI_PRESET_BATCHES.map(b => ({ ...b })));
        setScheduleSourceLabel('Sample Mini Preset (6 Exams, 5 Batches)');
        toast({
            title: 'Sample Preset Loaded',
            description: `Loaded 6 sample exams across 5 batches for quick testing.`
        });
        setStep(2);
    };

    const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsing(true);
        try {
            const parsedExams = await parseExamPDF(file);
            if (parsedExams.length === 0) {
                toast({ variant: 'destructive', title: 'PDF Parsing Failed', description: 'No valid examination rows found in the uploaded file.' });
                return;
            }
            const detectedBatches = extractBatchesFromExams(parsedExams);
            setExams(parsedExams);
            setBatches(detectedBatches);
            setScheduleSourceLabel(`${file.name} (${parsedExams.length} Exams)`);
            toast({
                title: 'PDF Imported Successfully',
                description: `Extracted ${parsedExams.length} exams and identified ${detectedBatches.length} student batches.`
            });
            setStep(2);
        } catch (err: any) {
            console.error('PDF Parsing Error:', err);
            toast({ variant: 'destructive', title: 'PDF Error', description: err.message || 'Could not parse the PDF timetable format.' });
        } finally {
            setIsParsing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handlePasteScheduleProcess = () => {
        const parsedExams = parsePasteSchedule(pasteScheduleText);
        if (parsedExams.length === 0) {
            toast({ variant: 'destructive', title: 'Parse Failed', description: 'Could not extract valid exams from pasted text.' });
            return;
        }
        const detectedBatches = extractBatchesFromExams(parsedExams);
        setExams(parsedExams);
        setBatches(detectedBatches);
        setScheduleSourceLabel(`Pasted Schedule (${parsedExams.length} Exams)`);
        setPasteScheduleText('');
        setShowPasteSchedule(false);
        toast({
            title: 'Schedule Processed',
            description: `Extracted ${parsedExams.length} exams across ${detectedBatches.length} student batches.`
        });
        setStep(2);
    };

    // ── Step 2 Batch Actions ────────────────────────────────────────────────────
    const updateBatchCount = (id: string, count: number) => {
        setBatches(prev => prev.map(b => b.id === id ? { ...b, count: Math.max(0, count) } : b));
    };

    const handleApplyPastedBatches = () => {
        const parsed = parsePasteBatches(pasteBatchesText);
        if (parsed.length === 0) {
            toast({ variant: 'destructive', title: 'No Batches Found', description: 'Could not parse batches. Use format: "Course Sem X: Count" or tabular.' });
            return;
        }

        let updatedCount = 0;
        setBatches(prev => {
            const next = [...prev];
            parsed.forEach(pb => {
                const match = next.find(b =>
                    b.course.toLowerCase().includes(pb.course.toLowerCase()) &&
                    Number(b.semester) === Number(pb.semester)
                );
                if (match) {
                    match.count = pb.count;
                    updatedCount++;
                } else {
                    // Add new batch if not existing
                    next.push({
                        id: `batch-${Math.random().toString(36).substr(2, 7)}`,
                        course: pb.course,
                        department: pb.department || pb.course.split('(')[0].trim() || 'General',
                        semester: String(pb.semester),
                        count: pb.count
                    });
                    updatedCount++;
                }
            });
            return next;
        });

        toast({
            title: 'Batches Updated',
            description: `Successfully updated / matched ${updatedCount} student batch counts.`
        });
        setPasteBatchesText('');
        setShowPasteBatches(false);
    };

    const handleFillRealisticCounts = () => {
        setBatches(prev => prev.map(b => {
            const cLower = b.course.toLowerCase();
            let count = 60;
            if (cLower.includes('b.tech cse') || cLower.includes('b tech cse')) count = 180;
            else if (cLower.includes('b.tech') || cLower.includes('b tech')) count = 120;
            else if (cLower.includes('bca') || cLower.includes('bba') || cLower.includes('b.com')) count = 80;
            else if (cLower.includes('mca') || cLower.includes('mba')) count = 60;
            else if (cLower.includes('m.sc') || cLower.includes('m sc') || cLower.includes('m.tech') || cLower.includes('m tech')) count = 30;
            else if (cLower.includes('diploma')) count = 50;
            else count = 40;
            return { ...b, count };
        }));
        toast({ title: 'Realistic Counts Applied', description: 'Student numbers scaled by course size (B.Tech: 120-180, BCA/BBA: 80, M.Tech/M.Sc: 30).' });
    };

    const handleSetAllCounts = (count: number) => {
        setBatches(prev => prev.map(b => ({ ...b, count })));
        toast({ title: 'Counts Updated', description: `All ${batches.length} batches set to ${count} students.` });
    };

    const addCustomBatch = () => {
        setBatches(prev => [
            { id: `b-${Date.now()}`, course: 'New Course', department: 'General', semester: '1', count: 60 },
            ...prev
        ]);
    };

    const removeBatch = (id: string) => {
        setBatches(prev => prev.filter(b => b.id !== id));
    };

    // Filtered batches for display
    const filteredBatches = useMemo(() => {
        if (!batchSearch.trim()) return batches;
        const q = batchSearch.toLowerCase();
        return batches.filter(b =>
            b.course.toLowerCase().includes(q) ||
            b.department.toLowerCase().includes(q) ||
            `sem ${b.semester}`.includes(q) ||
            `semester ${b.semester}`.includes(q)
        );
    }, [batches, batchSearch]);

    const totalStudents = useMemo(() => batches.reduce((sum, b) => sum + (Number(b.count) || 0), 0), [batches]);

    // ── Step 3 Allotment Generation ─────────────────────────────────────────────
    const handleRunRoomAllotment = async () => {
        if (batches.length === 0 || exams.length === 0) {
            toast({ variant: 'destructive', title: 'Cannot Run Allotment', description: 'Schedule and batches are required.' });
            return;
        }

        setIsComputingAllotment(true);
        toast({ title: 'Matching Classrooms & Invigilators...', description: 'Algorithm is allocating batches to rooms session by session.' });

        await new Promise(r => setTimeout(r, 150));

        try {
            // Ensure classrooms and invigilators exist in context
            let currentClassrooms = classrooms;
            if (currentClassrooms.length === 0) {
                currentClassrooms = generateMockClassrooms();
                setClassrooms(currentClassrooms);
            }

            let currentInvigilators = invigilators;
            if (currentInvigilators.length === 0) {
                currentInvigilators = generateMockInvigilators();
                setInvigilators(currentInvigilators);
            }

            // Run the Room Allotment Engine
            const result = generateFullBatchAllotment(
                batches,
                currentClassrooms,
                currentInvigilators,
                exams,
                {
                    reservedCount: reservedCount || 2,
                    blockPriority,
                    excludedBlocks,
                    excludedRooms
                }
            );

            // Update application contexts so the rest of the app (Dashboard, Allotment, Reports) has the data
            setExamSchedule(exams);
            setStudents(result.updatedStudents);
            setInvigilators(result.updatedInvigilators);
            setFullAllotment(result.fullAllotment);

            setSessionSummaries(result.sessionSummaries);
            const sessionKeys = Object.keys(result.sessionSummaries);
            if (sessionKeys.length > 0) {
                setSelectedSessionKey(sessionKeys[0]);
            }

            // Calculate overall stats
            let totalRoomsAcrossSessions = 0;
            Object.values(result.sessionSummaries).forEach(s => {
                totalRoomsAcrossSessions += s.totalRooms;
            });

            setGeneratedStats({
                totalStudents: result.updatedStudents.length,
                totalRooms: totalRoomsAcrossSessions,
                totalSessions: sessionKeys.length
            });

            setStep(3);

            toast({
                title: '🎉 Room Allotment Complete!',
                description: `Successfully allocated rooms for ${sessionKeys.length} session(s) across ${result.updatedStudents.length} students.`
            });
        } catch (err: any) {
            console.error('Allotment Generation Error:', err);
            toast({ variant: 'destructive', title: 'Allotment Failed', description: err.message || 'Error occurred during room allocation.' });
        } finally {
            setIsComputingAllotment(false);
        }
    };

    // ── Excel Export Handlers in Step 3 ─────────────────────────────────────────
    const handleDownloadMasterReport = () => {
        try {
            const currentClassrooms = classrooms.length > 0 ? classrooms : generateMockClassrooms();
            const currentInvigilators = invigilators.length > 0 ? invigilators : generateMockInvigilators();
            const currentStudents = generateStudentsFromBatches(batches);

            // Fetch latest allotment from context or run
            const { fullAllotment } = generateFullBatchAllotment(batches, currentClassrooms, currentInvigilators, exams);
            generateMasterReport(fullAllotment, currentStudents, currentClassrooms, currentInvigilators);
            toast({ title: 'Master Report Downloaded', description: 'Detailed room-wise examination plan saved as Excel.' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Export Failed', description: e.message || 'Error creating Master Report.' });
        }
    };

    const handleDownloadDutyChart = () => {
        try {
            const currentClassrooms = classrooms.length > 0 ? classrooms : generateMockClassrooms();
            const currentInvigilators = invigilators.length > 0 ? invigilators : generateMockInvigilators();
            const { fullAllotment } = generateFullBatchAllotment(batches, currentClassrooms, currentInvigilators, exams);
            generateInvigilatorDutyRoster(fullAllotment, currentInvigilators);
            toast({ title: 'Duty Roster Downloaded', description: 'Faculty duty chart saved as Excel.' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Export Failed', description: e.message || 'Error creating Duty Roster.' });
        }
    };

    const handleDownloadSessionRoster = () => {
        try {
            const currentClassrooms = classrooms.length > 0 ? classrooms : generateMockClassrooms();
            const currentInvigilators = invigilators.length > 0 ? invigilators : generateMockInvigilators();
            const { fullAllotment } = generateFullBatchAllotment(batches, currentClassrooms, currentInvigilators, exams);
            generateSessionWiseInvigilationRoster(fullAllotment, currentClassrooms);
            toast({ title: 'Session Roster Downloaded', description: 'Shift-wise invigilation roster saved as Excel.' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Export Failed', description: e.message || 'Error creating Session Roster.' });
        }
    };

    const handleOpenInViewer = () => {
        onClose();
        router.push('/allotment');
    };

    // ── One-click Flood everything ──────────────────────────────────────────────
    const handleOneClickFlood = async () => {
        if (onFloodAndGenerate) {
            onClose();
            onFloodAndGenerate();
        } else {
            handleLoadRevisedSchedule();
            await handleRunRoomAllotment();
        }
    };

    const steps = [
        { id: 1, title: '1. Input Schedule', icon: FileUp },
        { id: 2, title: '2. Batch Student Counts', icon: Users },
        { id: 3, title: '3. Room Allotment Output', icon: Building2 },
    ];

    const currentSessionSummary = sessionSummaries[selectedSessionKey];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[1050px] max-h-[92vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-3xl">

                {/* ── Dialog Header ── */}
                <div className="bg-gradient-to-r from-primary/10 via-background to-indigo-50/40 p-6 border-b">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary rounded-2xl shadow-lg shadow-primary/20 text-white">
                                <Sparkles className="h-6 w-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-bold tracking-tight">University Room Allotment Wizard</DialogTitle>
                                <DialogDescription className="text-sm font-medium text-muted-foreground/90">
                                    Input schedule → Set student numbers per batch → Match with classrooms &amp; generate university duty charts
                                </DialogDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    onClearData();
                                    setBatches(REVISED_NOV_2025_BATCHES.map(b => ({ ...b })));
                                    setExams(REVISED_NOV_2025_SCHEDULE);
                                    setStep(1);
                                }}
                                className="text-muted-foreground hover:text-destructive text-xs"
                            >
                                <Eraser className="h-4 w-4 mr-1" /> Reset
                            </Button>
                        </div>
                    </div>

                    {/* Step Navigation Pill Indicator */}
                    <div className="flex items-center justify-between px-8 relative">
                        <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-muted -translate-y-1/2 z-0" />
                        {steps.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setStep(s.id as 1 | 2 | 3)}
                                className="relative z-10 flex flex-col items-center gap-1.5 group cursor-pointer"
                            >
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                    step >= s.id
                                        ? 'bg-primary border-primary text-primary-foreground shadow-md scale-105'
                                        : 'bg-background border-muted text-muted-foreground'
                                }`}>
                                    <s.icon className="h-5 w-5" />
                                </div>
                                <span className={`text-xs font-bold ${step >= s.id ? 'text-primary' : 'text-muted-foreground opacity-60'}`}>
                                    {s.title}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Dialog Body ── */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8">

                    {/* ══════════════════════════════════════════════════════════
                        STEP 1: INPUT SCHEDULE
                       ══════════════════════════════════════════════════════════ */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in duration-400">

                            {/* Prominent One-Click Flood Banner */}
                            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-6 text-white shadow-xl">
                                <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 justify-between">
                                    <div className="space-y-1.5">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider text-indigo-100">
                                            <Zap className="h-3.5 w-3.5 text-yellow-300" /> Recommended One-Click
                                        </div>
                                        <h3 className="text-2xl font-extrabold tracking-tight">Load Revised University Schedule</h3>
                                        <p className="text-indigo-100/90 text-sm max-w-xl">
                                            Loads Graphic Era End (Odd) Semester Nov 2025 timetable (52 pages, 794 exams, 144 student batches).
                                            You can immediately customize student counts in the next step.
                                        </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                                        <Button
                                            size="lg"
                                            onClick={handleLoadRevisedSchedule}
                                            className="bg-white text-indigo-700 hover:bg-indigo-50 font-extrabold px-6 h-12 rounded-xl shadow-lg shadow-black/20 text-sm"
                                        >
                                            <CalendarDays className="mr-2 h-4 w-4 text-indigo-600" />
                                            Load &amp; Configure Batches
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                                <div className="flex-1 h-px bg-border" />
                                <span>Or Choose Another Source</span>
                                <div className="flex-1 h-px bg-border" />
                            </div>

                            {/* Schedule Input Methods */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* PDF Upload */}
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="group relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all cursor-pointer text-center"
                                >
                                    <div className="p-4 rounded-xl bg-white shadow-md mb-3 group-hover:scale-110 transition-transform">
                                        <FileUp className="h-7 w-7 text-primary" />
                                    </div>
                                    <h4 className="text-base font-bold">Upload Schedule PDF</h4>
                                    <p className="text-xs text-muted-foreground mt-1">Tolerance parser detects all 52 pages, dates, times, and course codes</p>
                                    <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={handlePDFUpload} />
                                    {isParsing && (
                                        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 rounded-2xl">
                                            <Loader2 className="h-7 w-7 text-primary animate-spin" />
                                            <span className="font-bold text-xs text-primary">Parsing PDF pages...</span>
                                        </div>
                                    )}
                                </div>

                                {/* Paste Timetable */}
                                <div
                                    onClick={() => setShowPasteSchedule(true)}
                                    className="group flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/80 transition-all cursor-pointer text-center"
                                >
                                    <div className="p-4 rounded-xl bg-white shadow-md mb-3 group-hover:scale-110 transition-transform">
                                        <ClipboardPaste className="h-7 w-7 text-indigo-600" />
                                    </div>
                                    <h4 className="text-base font-bold">Paste Schedule Table</h4>
                                    <p className="text-xs text-muted-foreground mt-1">Paste markdown table, tab-separated text, or CSV schedule lines</p>
                                </div>

                                {/* Mini Sample Preset */}
                                <div
                                    onClick={handleLoadMiniPreset}
                                    className="group flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/80 transition-all cursor-pointer text-center"
                                >
                                    <div className="p-4 rounded-xl bg-white shadow-md mb-3 group-hover:scale-110 transition-transform">
                                        <Database className="h-7 w-7 text-emerald-600" />
                                    </div>
                                    <h4 className="text-base font-bold">Mini Sample Schedule</h4>
                                    <p className="text-xs text-muted-foreground mt-1">Quick 6-exam, 5-batch sample for fast verification</p>
                                </div>
                            </div>

                            {/* Paste Schedule Textarea Modal/Section */}
                            {showPasteSchedule && (
                                <div className="p-5 border rounded-2xl bg-muted/20 animate-in zoom-in-95 duration-200 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-sm font-bold">Paste Timetable Data</Label>
                                        <Button variant="ghost" size="sm" onClick={() => setShowPasteSchedule(false)} className="text-xs">Cancel</Button>
                                    </div>
                                    <textarea
                                        className="w-full h-36 rounded-xl border border-input bg-background p-3 text-xs font-mono shadow-inner outline-none focus:ring-2 focus:ring-primary/20"
                                        placeholder="| Date | Day | Time | Course | Sem | Subject Name | Code |&#10;| 25-11-2025 | Tue | 09:30 AM - 12:30 PM | B Tech CSE | 3 | Data Structures | TCS302 |"
                                        value={pasteScheduleText}
                                        onChange={(e) => setPasteScheduleText(e.target.value)}
                                    />
                                    <Button className="w-full font-bold" onClick={handlePasteScheduleProcess} disabled={!pasteScheduleText.trim()}>
                                        Parse &amp; Extract Batches
                                    </Button>
                                </div>
                            )}

                            {/* Active Schedule Info */}
                            <div className="bg-secondary/20 border border-secondary/40 rounded-2xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                    <div>
                                        <p className="text-xs font-bold text-foreground">Current Schedule Selected</p>
                                        <p className="text-xs text-muted-foreground">{scheduleSourceLabel} — {exams.length} exams ready for room allotment</p>
                                    </div>
                                </div>
                                <Button size="sm" onClick={() => setStep(2)} className="font-bold">
                                    Next: Set Student Counts <ArrowRight className="ml-1.5 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════════════
                        STEP 2: BATCH STUDENT COUNTS (THE USER'S FIRST ALLOTMENT REQUIREMENT)
                       ══════════════════════════════════════════════════════════ */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in duration-400">

                            {/* Top info and action bar */}
                            <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                        <Users className="h-5 w-5 text-primary" />
                                        Enter Student Numbers per Batch
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Total: <strong className="text-primary font-bold">{totalStudents.toLocaleString()} enrolled students</strong> across {batches.length} batches.
                                        Type numbers, paste a list, or auto-fill with standard sizes.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button size="sm" variant="outline" onClick={handleFillRealisticCounts} className="text-xs font-bold border-primary/30 text-primary hover:bg-primary/10">
                                        <Zap className="h-3.5 w-3.5 mr-1" /> Auto-Fill Standard Counts
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setShowPasteBatches(!showPasteBatches)} className="text-xs font-bold">
                                        <ClipboardPaste className="h-3.5 w-3.5 mr-1" /> Paste Counts
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => handleSetAllCounts(60)} className="text-xs font-bold">
                                        All = 60
                                    </Button>
                                    <Button size="sm" onClick={addCustomBatch} className="text-xs font-bold">
                                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Batch
                                    </Button>
                                </div>
                            </div>

                            {/* Paste Batches Section */}
                            {showPasteBatches && (
                                <div className="p-4 border rounded-2xl bg-muted/20 animate-in zoom-in-95 duration-200 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <Label className="text-xs font-bold uppercase tracking-wider">Paste Batches &amp; Counts</Label>
                                            <p className="text-[11px] text-muted-foreground">Accepts formats like: "B.Tech CSE Sem 3: 120" or "| B.Tech CSE | 3 | 120 |" or CSV "B.Tech CSE, 3, 120"</p>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => setShowPasteBatches(false)} className="text-xs">Close</Button>
                                    </div>
                                    <textarea
                                        className="w-full h-28 rounded-xl border border-input bg-background p-3 text-xs font-mono shadow-inner outline-none focus:ring-2 focus:ring-primary/20"
                                        placeholder="B.Tech core Sem 1: 180&#10;B.Tech CSE Sem 3: 180&#10;BCA Sem 1: 60&#10;BBA Sem 1: 60"
                                        value={pasteBatchesText}
                                        onChange={(e) => setPasteBatchesText(e.target.value)}
                                    />
                                    <Button size="sm" className="font-bold w-full" onClick={handleApplyPastedBatches} disabled={!pasteBatchesText.trim()}>
                                        Apply Pasted Student Numbers
                                    </Button>
                                </div>
                            )}

                            {/* Search Filter */}
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by course name, department, or semester (e.g. BTech, CSE, Sem 3)..."
                                        value={batchSearch}
                                        onChange={(e) => setBatchSearch(e.target.value)}
                                        className="pl-9 bg-muted/30 border-none h-10 text-xs rounded-xl"
                                    />
                                </div>
                                <span className="text-xs text-muted-foreground font-medium shrink-0">
                                    Showing {filteredBatches.length} of {batches.length} batches
                                </span>
                            </div>

                            {/* Batch Student Count Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
                                {filteredBatches.map(batch => {
                                    // Count how many exams this batch has in schedule
                                    const examCount = exams.filter(e =>
                                        e.course.toLowerCase().trim() === batch.course.toLowerCase().trim() &&
                                        Number(e.semester) === Number(batch.semester)
                                    ).length;

                                    return (
                                        <div
                                            key={batch.id}
                                            className="p-3.5 border rounded-2xl bg-card hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between gap-2"
                                        >
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="space-y-0.5">
                                                    <h4 className="text-xs font-bold text-foreground leading-tight line-clamp-1" title={batch.course}>
                                                        {batch.course}
                                                    </h4>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 font-bold">
                                                            Sem {batch.semester}
                                                        </Badge>
                                                        <span className="text-[10px] text-muted-foreground truncate max-w-[120px]" title={batch.department}>
                                                            {batch.department}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeBatch(batch.id)}
                                                    className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-40 hover:opacity-100 shrink-0"
                                                    title="Remove batch"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>

                                            <div className="flex items-center justify-between pt-1 border-t border-border/40">
                                                <span className="text-[11px] text-muted-foreground">
                                                    {examCount > 0 ? `${examCount} exam${examCount > 1 ? 's' : ''}` : 'No exams'}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Students:</Label>
                                                    <Input
                                                        type="number"
                                                        value={batch.count}
                                                        onChange={(e) => updateBatchCount(batch.id, parseInt(e.target.value) || 0)}
                                                        className="w-20 h-8 text-xs font-bold font-mono text-center bg-muted/40 border-none rounded-lg focus-visible:ring-1 focus-visible:ring-primary/40"
                                                        min="0"
                                                        max="1000"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Batch Bottom Action Bar */}
                            <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 flex flex-col md:flex-row items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500 rounded-xl text-white">
                                        <Building2 className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-emerald-950">Ready to Match Classrooms</p>
                                        <p className="text-[11px] text-emerald-700">
                                            The room matching algorithm will allocate these {totalStudents.toLocaleString()} students across Block D (120/66/60 cap) &amp; Blocks C/E (42 cap), and assign faculty invigilators.
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    size="lg"
                                    onClick={handleRunRoomAllotment}
                                    disabled={isComputingAllotment || batches.length === 0}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 h-11 rounded-xl shadow-md shadow-emerald-200 text-xs shrink-0"
                                >
                                    {isComputingAllotment ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Allotting Rooms...</>
                                    ) : (
                                        <><Sparkles className="mr-2 h-4 w-4" /> Allot Rooms &amp; Generate Charts <ArrowRight className="ml-1.5 h-4 w-4" /></>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════════════
                        STEP 3: ROOM ALLOTMENT OUTPUT (UNIVERSITY FORMAT)
                       ══════════════════════════════════════════════════════════ */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in duration-400">

                            {/* KPI Metrics */}
                            {generatedStats && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20">
                                        <p className="text-[10px] font-bold uppercase text-primary tracking-wider">Exam Sessions</p>
                                        <p className="text-xl font-extrabold text-foreground">{generatedStats.totalSessions}</p>
                                    </div>
                                    <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200">
                                        <p className="text-[10px] font-bold uppercase text-indigo-700 tracking-wider">Total Enrolled</p>
                                        <p className="text-xl font-extrabold text-indigo-950">{generatedStats.totalStudents.toLocaleString()}</p>
                                    </div>
                                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                                        <p className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider">Total Room Shifts</p>
                                        <p className="text-xl font-extrabold text-emerald-950">{generatedStats.totalRooms}</p>
                                    </div>
                                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                                        <p className="text-[10px] font-bold uppercase text-amber-700 tracking-wider">Standby Staff / Shift</p>
                                        <p className="text-xl font-extrabold text-amber-950">{reservedCount || 2}</p>
                                    </div>
                                </div>
                            )}

                            {/* Session Selector & Room Allotment Table */}
                            <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase">Select Session:</Label>
                                        <select
                                            value={selectedSessionKey}
                                            onChange={(e) => setSelectedSessionKey(e.target.value)}
                                            className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-bold shadow-sm outline-none focus:ring-2 focus:ring-primary/20"
                                        >
                                            {Object.keys(sessionSummaries).map(key => {
                                                const s = sessionSummaries[key];
                                                return (
                                                    <option key={key} value={key}>
                                                        {s.date} @ {s.time} ({s.shift}) — {s.totalStudents} students, {s.totalRooms} rooms
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    {/* Excel Export Buttons */}
                                    <div className="flex flex-wrap gap-2">
                                        <Button size="sm" variant="outline" onClick={handleDownloadMasterReport} className="text-xs font-bold">
                                            <Download className="mr-1.5 h-3.5 w-3.5 text-primary" /> Master Report (Excel)
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={handleDownloadDutyChart} className="text-xs font-bold">
                                            <Download className="mr-1.5 h-3.5 w-3.5 text-indigo-600" /> Duty Roster (Excel)
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={handleDownloadSessionRoster} className="text-xs font-bold">
                                            <Download className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Session Chart
                                        </Button>
                                    </div>
                                </div>

                                {/* Current Session Room Table */}
                                {currentSessionSummary && (
                                    <div className="border rounded-2xl overflow-hidden bg-card shadow-sm">
                                        <div className="bg-muted/40 p-3 border-b flex items-center justify-between">
                                            <span className="text-xs font-bold text-foreground">
                                                Rooms Allotted for {currentSessionSummary.date} ({currentSessionSummary.time}) — {currentSessionSummary.totalStudents} Students in {currentSessionSummary.totalRooms} Rooms
                                            </span>
                                            {currentSessionSummary.reservedInvigilators.length > 0 && (
                                                <span className="text-[11px] text-muted-foreground">
                                                    Reserved Staff: {currentSessionSummary.reservedInvigilators.map(r => r.name).join(', ')}
                                                </span>
                                            )}
                                        </div>

                                        <div className="max-h-[320px] overflow-y-auto">
                                            <table className="w-full text-xs text-left border-collapse">
                                                <thead className="bg-muted/20 text-[10px] uppercase font-bold text-muted-foreground tracking-wider border-b sticky top-0 bg-background">
                                                    <tr>
                                                        <th className="p-2.5 pl-4">Room No (Block)</th>
                                                        <th className="p-2.5">Capacity</th>
                                                        <th className="p-2.5">Students</th>
                                                        <th className="p-2.5">Occupancy</th>
                                                        <th className="p-2.5">Allotted Batches &amp; Subjects</th>
                                                        <th className="p-2.5 pr-4">Invigilator(s) on Duty</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/40">
                                                    {currentSessionSummary.rooms.map(room => (
                                                        <tr key={room.roomId} className="hover:bg-muted/20 transition-colors">
                                                            <td className="p-2.5 pl-4 font-bold text-foreground">
                                                                {room.roomNo}
                                                                <span className="block text-[10px] text-muted-foreground font-normal">{room.building}</span>
                                                            </td>
                                                            <td className="p-2.5 text-muted-foreground font-mono">{room.capacity}</td>
                                                            <td className="p-2.5 font-bold font-mono text-primary">{room.allocatedCount}</td>
                                                            <td className="p-2.5">
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                                                                        <div
                                                                            className={`h-full rounded-full ${
                                                                                room.occupancyPercent >= 90 ? 'bg-emerald-500' : 'bg-primary'
                                                                            }`}
                                                                            style={{ width: `${Math.min(100, room.occupancyPercent)}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-[10px] font-mono text-muted-foreground">{room.occupancyPercent}%</span>
                                                                </div>
                                                            </td>
                                                            <td className="p-2.5 space-y-1">
                                                                {room.batches.map((b, i) => (
                                                                    <div key={i} className="flex items-center gap-1.5 flex-wrap">
                                                                        <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 font-bold bg-primary/5 text-primary border-primary/20">
                                                                            {b.subjectCode}
                                                                        </Badge>
                                                                        <span className="text-[11px] font-medium">{b.course} (Sem {b.semester}):</span>
                                                                        <span className="text-[11px] font-bold text-foreground">[{b.studentCount} students]</span>
                                                                        {b.rollNoRange && (
                                                                            <span className="text-[10px] text-muted-foreground font-mono">({b.rollNoRange})</span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </td>
                                                            <td className="p-2.5 pr-4 space-y-0.5">
                                                                {room.invigilators.length > 0 ? (
                                                                    room.invigilators.map(inv => (
                                                                        <div key={inv.id} className="text-[11px] font-medium text-foreground flex items-center gap-1">
                                                                            <UserCheck className="h-3 w-3 text-emerald-600 shrink-0" />
                                                                            <span>{inv.name}</span>
                                                                            <span className="text-[10px] text-muted-foreground">({inv.department})</span>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-[11px] text-muted-foreground italic">Pending assignment</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Viewer Transition Button */}
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold text-indigo-950">Switch Between Allotment Modes</p>
                                    <p className="text-[11px] text-indigo-700">
                                        You can view both <strong>Mode 1 (Room &amp; Batch Allotment)</strong> and <strong>Mode 2 (Detailed Desk Seating Plan)</strong> anytime in the Allotment Viewer.
                                    </p>
                                </div>
                                <Button
                                    onClick={handleOpenInViewer}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-6 h-10 rounded-xl shadow-md shrink-0"
                                >
                                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                    Open Allotment Viewer
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Dialog Footer Navigation ── */}
                <div className="p-4 md:p-5 border-t bg-muted/10 flex justify-between items-center px-6 md:px-8">
                    <Button
                        variant="ghost"
                        onClick={() => setStep(prev => (prev === 3 ? 2 : 1) as 1 | 2 | 3)}
                        disabled={step === 1}
                        className="font-bold text-xs"
                    >
                        ← Back
                    </Button>

                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose} className="font-bold text-xs border-muted-foreground/20">
                            Close
                        </Button>

                        {step === 1 && (
                            <Button
                                onClick={() => setStep(2)}
                                className="font-bold text-xs px-6 shadow-md shadow-primary/20"
                            >
                                Next: Set Student Numbers <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                            </Button>
                        )}

                        {step === 2 && (
                            <Button
                                onClick={handleRunRoomAllotment}
                                disabled={isComputingAllotment || batches.length === 0}
                                className="font-bold text-xs px-6 bg-gradient-to-r from-emerald-600 to-teal-600 shadow-md shadow-emerald-200"
                            >
                                {isComputingAllotment ? (
                                    <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Matching...</>
                                ) : (
                                    <><Sparkles className="mr-1.5 h-3.5 w-3.5" /> Match Classrooms &amp; Allot <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></>
                                )}
                            </Button>
                        )}

                        {step === 3 && (
                            <Button
                                onClick={handleOpenInViewer}
                                className="font-bold text-xs px-6 bg-primary shadow-md shadow-primary/20"
                            >
                                <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View in Allotment Page
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
