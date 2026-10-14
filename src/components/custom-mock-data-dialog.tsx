import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, BookOpen, GraduationCap, Sparkles, Eraser, Lightbulb, FileUp, Loader2, UserCheck, Zap, CheckCircle2, ArrowRight, Database } from 'lucide-react';
import { ExamSlot, Student } from '@/lib/types';
import { parsePasteSchedule } from '@/lib/parsers';
import { parseExamPDF } from '@/lib/pdf-parser';

interface StudentBatch {
    id: string;
    course: string;
    department: string;
    semester: string;
    count: number;
}

interface CustomExam {
    id: string;
    subjectName: string;
    subjectCode: string;
    date: string;
    time: string;
    duration: number;
    linkedBatchId?: string;
    course?: string;
    semester?: string;
    department?: string;
}

interface CustomMockDataDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onClearData: () => void;
    onGenerateCustom: (students: Student[], exams: ExamSlot[], reservedCount?: number) => void;
    onGenerateRandom: (count: number) => void;
    onFloodAndGenerate?: () => void; // New: triggers flood + generate allotment
}

// --- Built-in Mock Preset ---
const MOCK_BATCHES: StudentBatch[] = [
    { id: 'mb1', course: 'B.Tech CSE', department: 'Computer Science and Engineering', semester: '2', count: 80 },
    { id: 'mb2', course: 'B.Tech CSE', department: 'Computer Science and Engineering', semester: '4', count: 75 },
    { id: 'mb3', course: 'B.Tech ME', department: 'Mechanical Engineering', semester: '2', count: 60 },
    { id: 'mb4', course: 'BBA', department: 'Management', semester: '2', count: 50 },
    { id: 'mb5', course: 'BCA', department: 'Computer Applications', semester: '4', count: 45 },
];

const MOCK_EXAMS: CustomExam[] = [
    { id: 'me1', subjectName: 'Mathematics II', subjectCode: 'TMA201', date: '2025-12-01', time: '09:30', duration: 90, linkedBatchId: 'mb1' },
    { id: 'me2', subjectName: 'Data Structures', subjectCode: 'TCS301', date: '2025-12-01', time: '09:30', duration: 90, linkedBatchId: 'mb2' },
    { id: 'me3', subjectName: 'Engineering Mechanics', subjectCode: 'TME201', date: '2025-12-01', time: '09:30', duration: 90, linkedBatchId: 'mb3' },
    { id: 'me4', subjectName: 'Business Communication', subjectCode: 'BBA201', date: '2025-12-01', time: '14:00', duration: 90, linkedBatchId: 'mb4' },
    { id: 'me5', subjectName: 'Programming in C', subjectCode: 'BCA201', date: '2025-12-02', time: '09:30', duration: 90, linkedBatchId: 'mb1' },
    { id: 'me6', subjectName: 'Database Management', subjectCode: 'TCS401', date: '2025-12-02', time: '09:30', duration: 90, linkedBatchId: 'mb2' },
    { id: 'me7', subjectName: 'Thermodynamics', subjectCode: 'TME301', date: '2025-12-02', time: '14:00', duration: 90, linkedBatchId: 'mb3' },
    { id: 'me8', subjectName: 'Web Technologies', subjectCode: 'BCA301', date: '2025-12-03', time: '09:30', duration: 90, linkedBatchId: 'mb5' },
];

export function CustomMockDataDialog({ isOpen, onClose, onClearData, onGenerateCustom, onGenerateRandom, onFloodAndGenerate }: CustomMockDataDialogProps) {
    const { toast } = useToast();
    const [isParsing, setIsParsing] = useState(false);
    const [isFlooding, setIsFlooding] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const [batches, setBatches] = useState<StudentBatch[]>([
        { id: '1', course: 'B.TECH CSE', department: 'CSE', semester: '2', count: 100 }
    ]);
    const [exams, setExams] = useState<CustomExam[]>([
        { id: '1', subjectName: 'Mathematics II', subjectCode: 'TMA 201', date: '2025-12-01', time: '09:30', duration: 90, linkedBatchId: '1' }
    ]);

    const [showPasteInput, setShowPasteInput] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const [wizardReservedCount, setWizardReservedCount] = useState(1);
    const [step, setStep] = useState(1);
    const [floodDone, setFloodDone] = useState(false);

    // ── One-click: load mock preset ──────────────────────────────────────
    const handleLoadMockPreset = () => {
        setBatches(MOCK_BATCHES);
        setExams(MOCK_EXAMS);
        toast({ title: 'Mock Data Loaded', description: `${MOCK_BATCHES.length} batches and ${MOCK_EXAMS.length} exams pre-filled. Review and proceed.` });
        setStep(2);
    };

    // ── One-click: flood everything + generate allotment ─────────────────
    const handleFloodAndGenerate = async () => {
        setIsFlooding(true);
        toast({ title: '⚡ Flooding Mock Data...', description: 'Loading students, classrooms, invigilators & schedule.' });
        onGenerateRandom(200);
        await new Promise(r => setTimeout(r, 300));
        setIsFlooding(false);
        setFloodDone(true);
        toast({ title: '✅ Data Flooded!', description: 'All mock data loaded. Generating full allotment now...' });
        // Give state time to settle, then trigger allotment
        await new Promise(r => setTimeout(r, 800));
        if (onFloodAndGenerate) {
            onClose();
            onFloodAndGenerate();
        } else {
            onClose();
        }
    };

    const processParsedExams = (parsedExams: any[]) => {
        if (parsedExams.length === 0) return;
        const newBatches: StudentBatch[] = [];
        const existingBatchMap = new Map<string, string>();
        batches.forEach(b => {
            const key = `${b.course}-${b.department}-${b.semester}`.toLowerCase();
            existingBatchMap.set(key, b.id);
        });
        const newCustomExams: CustomExam[] = parsedExams.map(pe => {
            const groupKey = `${pe.course}-${pe.department}-${pe.semester}`.toLowerCase();
            let batchId = existingBatchMap.get(groupKey);
            if (!batchId) {
                batchId = Math.random().toString();
                newBatches.push({ id: batchId, course: pe.course || 'IMPORT', department: pe.department || 'IMPORT', semester: String(pe.semester || '1'), count: 60 });
                existingBatchMap.set(groupKey, batchId);
            }
            return { id: Math.random().toString(), subjectName: pe.subjectName, subjectCode: pe.subjectCode, date: pe.date, time: pe.time, duration: pe.duration, linkedBatchId: batchId, course: pe.course, semester: pe.semester, department: pe.department };
        });
        setBatches(prev => [...prev, ...newBatches]);
        setExams(prev => [...prev, ...newCustomExams]);
        setStep(2);
    };

    const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsParsing(true);
        try {
            const parsedExams = await parseExamPDF(file);
            processParsedExams(parsedExams);
            toast({ title: 'PDF Imported', description: `Detected ${parsedExams.length} exams. Batches auto-created.` });
        } catch (err) {
            toast({ variant: 'destructive', title: 'PDF Error', description: 'Could not parse the university schedule format.' });
        } finally {
            setIsParsing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handlePasteProcess = () => {
        const parsedExams = parsePasteSchedule(pasteText);
        processParsedExams(parsedExams);
        setPasteText('');
        setShowPasteInput(false);
    };

    const addBatch = () => setBatches(prev => [...prev, { id: Math.random().toString(), course: '', department: '', semester: '', count: 60 }]);
    const removeBatch = (id: string) => setBatches(prev => prev.filter(b => b.id !== id));
    const updateBatch = (id: string, field: keyof StudentBatch, value: any) => setBatches(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));

    const addExam = () => {
        const lastBatchId = batches.length > 0 ? batches[batches.length - 1].id : undefined;
        setExams(prev => [...prev, { id: Math.random().toString(), subjectName: '', subjectCode: '', date: '2025-12-01', time: '09:30', duration: 90, linkedBatchId: lastBatchId }]);
    };
    const removeExam = (id: string) => setExams(prev => prev.filter(e => e.id !== id));
    const updateExam = (id: string, field: keyof CustomExam, value: any) => setExams(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));

    const getBatchSubjects = (batchId: string) => exams.filter(e => e.linkedBatchId === batchId).map(e => e.subjectCode).filter(Boolean);

    // ── Build and emit data, then optionally trigger allotment ────────────
    const buildAndEmit = (andGenerate = false) => {
        const generatedStudents: Student[] = [];
        const generatedExams: ExamSlot[] = [];
        let globalIdCounter = 1;
        batches.forEach(batch => {
            for (let i = 0; i < batch.count; i++) {
                const yearPrefix = '25';
                const courseCode = batch.course.substring(0, 2).toUpperCase();
                const deptCode = batch.department.substring(0, 2).toUpperCase();
                const serial = String(globalIdCounter).padStart(3, '0');
                const rollNo = `${yearPrefix}${courseCode}${deptCode}${serial}`;
                generatedStudents.push({ id: `S${rollNo}`, name: `Student ${globalIdCounter}`, rollNo, course: batch.course.toUpperCase(), department: batch.department.toUpperCase(), semester: Number(batch.semester), section: ['A', 'B', 'C'][i % 3], ineligibilityRecords: [], unavailableSlots: [], seatAssignment: null, isDebarred: false });
                globalIdCounter++;
            }
        });
        exams.forEach((exam, index) => {
            const targetBatch = batches.find(b => b.id === exam.linkedBatchId) || batches[0];
            if (!targetBatch) return;
            generatedExams.push({ id: `E${String(index + 1).padStart(4, '0')}`, date: exam.date, time: exam.time, course: targetBatch.course.toUpperCase(), department: targetBatch.department.toUpperCase(), semester: Number(targetBatch.semester), subjectName: exam.subjectName, subjectCode: exam.subjectCode.toUpperCase(), duration: exam.duration, shift: 1, group: 'All' as any });
        });
        onGenerateCustom(generatedStudents, generatedExams, wizardReservedCount);
        if (andGenerate && onFloodAndGenerate) {
            onClose();
            setTimeout(() => onFloodAndGenerate(), 400);
        } else {
            onClose();
        }
    };

    const steps = [
        { id: 1, title: 'Import Schedule', icon: FileUp },
        { id: 2, title: 'Review Batches', icon: GraduationCap },
        { id: 3, title: 'Finalize & Generate', icon: BookOpen },
    ];

    const totalStudents = batches.reduce((s, b) => s + b.count, 0);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[1000px] max-h-[92vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-3xl">

                {/* ── Header ── */}
                <div className="bg-gradient-to-r from-primary/10 via-background to-indigo-50/30 p-6 border-b">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary rounded-xl shadow-lg shadow-primary/20">
                                <Sparkles className="h-6 w-6 text-primary-foreground" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-bold tracking-tight">Smart Setup Wizard</DialogTitle>
                                <DialogDescription className="text-sm font-medium text-muted-foreground/80">Configure your entire exam system in 3 steps</DialogDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => { onClearData(); setBatches([{ id: '1', course: 'B.TECH CSE', department: 'CSE', semester: '2', count: 100 }]); setExams([{ id: '1', subjectName: 'Mathematics II', subjectCode: 'TMA 201', date: '2025-12-01', time: '09:30', duration: 90, linkedBatchId: '1' }]); setStep(1); }} className="text-muted-foreground hover:text-destructive transition-colors text-xs">
                                <Eraser className="h-4 w-4 mr-1" /> Reset
                            </Button>
                        </div>
                    </div>

                    {/* Step Indicators */}
                    <div className="flex items-center justify-between px-10 relative">
                        <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-muted -translate-y-1/2 z-0" />
                        {steps.map((s) => (
                            <button key={s.id} onClick={() => setStep(s.id)} className="relative z-10 flex flex-col items-center gap-2 group">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${step >= s.id ? 'bg-primary border-primary text-primary-foreground shadow-md scale-110' : 'bg-background border-muted text-muted-foreground'}`}>
                                    <s.icon className="h-5 w-5" />
                                </div>
                                <span className={`text-xs font-bold ${step >= s.id ? 'text-primary' : 'text-muted-foreground opacity-60'}`}>{s.title}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto p-8">

                    {/* ════════ STEP 1: Import ════════ */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                            {/* ONE-CLICK FLOOD BUTTON — most prominent */}
                            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white shadow-2xl">
                                <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
                                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 justify-between">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Zap className="h-5 w-5 text-yellow-300" />
                                            <span className="text-sm font-bold uppercase tracking-wider text-indigo-200">Instant Setup</span>
                                        </div>
                                        <h3 className="text-2xl font-extrabold">⚡ Flood Mock Data & Generate Allotment</h3>
                                        <p className="text-indigo-200 text-sm">Populates ~200 students, 18 classrooms, 70+ invigilators, and 2 exam slots — then immediately runs the full allotment algorithm.</p>
                                    </div>
                                    <Button
                                        size="lg"
                                        disabled={isFlooding}
                                        onClick={handleFloodAndGenerate}
                                        className="bg-white text-indigo-700 hover:bg-indigo-50 font-extrabold px-8 h-14 rounded-2xl shadow-xl shadow-black/20 shrink-0 min-w-[200px] text-base"
                                    >
                                        {isFlooding ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Flooding...</> : <><Zap className="mr-2 h-5 w-5 text-indigo-600" /> One-Click Flood</>}
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-muted-foreground text-sm font-medium">
                                <div className="flex-1 h-px bg-border" />
                                <span>OR set up manually</span>
                                <div className="flex-1 h-px bg-border" />
                            </div>

                            {/* Manual import options */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Load Mock Preset */}
                                <div
                                    onClick={handleLoadMockPreset}
                                    className="group flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-400 transition-all cursor-pointer"
                                >
                                    <div className="p-4 rounded-xl bg-white shadow-lg mb-3 group-hover:scale-110 transition-transform">
                                        <Database className="h-8 w-8 text-emerald-500" />
                                    </div>
                                    <h4 className="text-base font-bold text-center">Load Sample Preset</h4>
                                    <p className="text-xs text-center text-muted-foreground mt-1">{MOCK_BATCHES.length} batches · {MOCK_EXAMS.length} exams · Pre-filled &amp; editable</p>
                                </div>

                                {/* PDF Upload */}
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="group relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all cursor-pointer"
                                >
                                    <div className="p-4 rounded-xl bg-white shadow-lg mb-3 group-hover:scale-110 transition-transform">
                                        <FileUp className="h-8 w-8 text-primary" />
                                    </div>
                                    <h4 className="text-base font-bold text-center">Import University PDF</h4>
                                    <p className="text-xs text-center text-muted-foreground mt-1">Auto-detects courses, dates &amp; subjects</p>
                                    <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={handlePDFUpload} />
                                    {isParsing && (
                                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 rounded-2xl">
                                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                            <span className="font-bold text-primary text-sm">Analyzing PDF...</span>
                                        </div>
                                    )}
                                </div>

                                {/* Paste */}
                                <div
                                    onClick={() => setShowPasteInput(true)}
                                    className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50/60 transition-all cursor-pointer"
                                >
                                    <div className="p-4 rounded-xl bg-white shadow-lg mb-3">
                                        <Sparkles className="h-8 w-8 text-indigo-500" />
                                    </div>
                                    <h4 className="text-base font-bold text-center">Paste Schedule Text</h4>
                                    <p className="text-xs text-center text-muted-foreground mt-1">Smart parser — paste table data directly</p>
                                </div>
                            </div>

                            {showPasteInput && (
                                <div className="p-6 border rounded-2xl bg-muted/20 animate-in zoom-in-95 duration-300">
                                    <div className="flex justify-between items-center mb-4">
                                        <Label className="text-lg font-bold">Paste Schedule Data</Label>
                                        <Button variant="ghost" size="sm" onClick={() => setShowPasteInput(false)}>Cancel</Button>
                                    </div>
                                    <textarea
                                        className="flex min-h-[160px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-mono shadow-inner focus:ring-2 focus:ring-primary/20 transition-all"
                                        placeholder="| Date | Shift | Code | Subject | Course | Dept | Sem |"
                                        value={pasteText}
                                        onChange={(e) => setPasteText(e.target.value)}
                                    />
                                    <Button className="mt-4 w-full h-12 text-md font-bold" onClick={handlePasteProcess} disabled={!pasteText.trim()}>
                                        Analyze &amp; Process Data
                                    </Button>
                                </div>
                            )}

                            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-4 items-center">
                                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                                    <Lightbulb className="h-5 w-5" />
                                </div>
                                <p className="text-xs text-amber-700"><strong className="text-amber-900">Pro Tip:</strong> Use "Load Sample Preset" to jump straight to Step 2 with editable mock data, or "One-Click Flood" to skip the wizard entirely and get results instantly.</p>
                            </div>
                        </div>
                    )}

                    {/* ════════ STEP 2: Batches ════════ */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <div className="flex items-center justify-between bg-secondary/10 p-4 rounded-2xl border border-secondary/20">
                                <div className="flex items-center gap-3">
                                    <GraduationCap className="h-6 w-6 text-primary" />
                                    <div>
                                        <h3 className="text-lg font-bold">Review Student Batches</h3>
                                        <p className="text-xs text-muted-foreground">Total: <strong>{totalStudents} students</strong> across {batches.length} batches</p>
                                    </div>
                                </div>
                                <Button size="sm" onClick={addBatch} className="bg-primary shadow-lg shadow-primary/20">
                                    <Plus className="h-4 w-4 mr-2" /> Add Batch
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {batches.map((batch) => (
                                    <div key={batch.id} className="group flex flex-col md:flex-row gap-3 p-4 border rounded-2xl bg-background hover:border-primary/30 hover:shadow-md transition-all">
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground px-1">Course</Label>
                                            <Input value={batch.course} onChange={(e) => updateBatch(batch.id, 'course', e.target.value)} className="border-none bg-muted/30 focus-visible:ring-0 text-sm font-bold h-10" placeholder="e.g. B.Tech CSE" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground px-1">Department</Label>
                                            <Input value={batch.department} onChange={(e) => updateBatch(batch.id, 'department', e.target.value)} className="border-none bg-muted/30 focus-visible:ring-0 text-sm h-10" placeholder="e.g. CSE" />
                                        </div>
                                        <div className="w-20 space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground px-1">Sem</Label>
                                            <Input type="number" value={batch.semester} onChange={(e) => updateBatch(batch.id, 'semester', e.target.value)} className="border-none bg-muted/30 focus-visible:ring-0 text-center font-bold h-10" />
                                        </div>
                                        <div className="w-28 space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground px-1">Students</Label>
                                            <Input type="number" value={batch.count} onChange={(e) => updateBatch(batch.id, 'count', Number(e.target.value))} className="border-none bg-muted/30 focus-visible:ring-0 font-mono font-bold text-primary h-10" />
                                        </div>
                                        <div className="flex flex-wrap gap-1 items-center pt-2 md:pt-6">
                                            {getBatchSubjects(batch.id).map((code, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-md border border-primary/20">{code}</span>
                                            ))}
                                            <Button variant="ghost" size="icon" onClick={() => removeBatch(batch.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity ml-auto h-8 w-8">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ════════ STEP 3: Exams + Generate ════════ */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                                <div className="col-span-2 flex items-center justify-between bg-primary/5 p-4 rounded-2xl border border-primary/10">
                                    <div className="flex items-center gap-3">
                                        <BookOpen className="h-6 w-6 text-primary" />
                                        <div>
                                            <h3 className="text-lg font-bold">Finalize Exam Slots</h3>
                                            <p className="text-xs text-muted-foreground">{exams.length} exam slots · Verify dates, times, subject mapping</p>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={addExam} className="border-primary/20 text-primary">
                                        <Plus className="h-4 w-4 mr-2" /> Add Exam
                                    </Button>
                                </div>
                                <div className="bg-indigo-600 rounded-2xl p-4 text-white shadow-xl shadow-indigo-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <UserCheck className="h-4 w-4" />
                                        <h4 className="text-sm font-bold">Reserved Staff</h4>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Input type="number" value={wizardReservedCount} onChange={(e) => setWizardReservedCount(parseInt(e.target.value) || 0)} className="bg-white/20 border-white/30 text-white font-bold h-10 focus-visible:ring-white/20 w-20" />
                                        <span className="text-xs text-indigo-100 italic">standby per session</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 pb-4">
                                {exams.map((exam) => (
                                    <div key={exam.id} className="group grid grid-cols-12 gap-3 p-4 border rounded-2xl bg-background hover:border-primary/30 transition-all items-end">
                                        <div className="col-span-3 space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Target Batch</Label>
                                            <select
                                                className="w-full h-10 rounded-xl border-none bg-muted/30 px-3 text-xs font-bold focus:ring-0 outline-none"
                                                value={exam.linkedBatchId}
                                                onChange={(e) => updateExam(exam.id, 'linkedBatchId', e.target.value)}
                                            >
                                                {batches.map(b => <option key={b.id} value={b.id}>{b.course} (Sem {b.semester})</option>)}
                                            </select>
                                        </div>
                                        <div className="col-span-3 space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Subject Name</Label>
                                            <Input value={exam.subjectName} onChange={(e) => updateExam(exam.id, 'subjectName', e.target.value)} className="border-none bg-muted/30 h-10 text-xs font-bold" placeholder="Subject name" />
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Subject Code</Label>
                                            <Input value={exam.subjectCode} onChange={(e) => updateExam(exam.id, 'subjectCode', e.target.value)} className="border-none bg-muted/30 h-10 text-xs font-mono" placeholder="TCS301" />
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Date</Label>
                                            <Input type="date" value={exam.date} onChange={(e) => updateExam(exam.id, 'date', e.target.value)} className="border-none bg-muted/30 h-10 text-xs" />
                                        </div>
                                        <div className="col-span-1 space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Time</Label>
                                            <Input type="time" value={exam.time} onChange={(e) => updateExam(exam.id, 'time', e.target.value)} className="border-none bg-muted/30 h-10 text-xs" />
                                        </div>
                                        <div className="col-span-1 flex items-center justify-end">
                                            <Button variant="ghost" size="icon" onClick={() => removeExam(exam.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Summary + Action banner */}
                            <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-5 flex flex-col md:flex-row items-center gap-4 justify-between">
                                <div className="flex items-center gap-4">
                                    <CheckCircle2 className="h-8 w-8 text-emerald-500 shrink-0" />
                                    <div>
                                        <p className="font-bold text-emerald-900">Ready to Generate!</p>
                                        <p className="text-xs text-emerald-700">{totalStudents} students · {exams.length} exam slots · {batches.length} batches configured</p>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                                    <Button
                                        variant="outline"
                                        onClick={() => buildAndEmit(false)}
                                        className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold"
                                    >
                                        Save Data Only
                                    </Button>
                                    <Button
                                        onClick={() => buildAndEmit(true)}
                                        disabled={exams.length === 0 || batches.length === 0}
                                        className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold px-6 shadow-lg shadow-emerald-200"
                                    >
                                        <Zap className="mr-2 h-4 w-4" /> Generate Allotment Now
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Footer Navigation ── */}
                <div className="p-5 border-t bg-muted/10 flex justify-between items-center px-8">
                    <Button
                        variant="ghost"
                        onClick={() => setStep(prev => Math.max(1, prev - 1))}
                        disabled={step === 1}
                        className="font-bold"
                    >
                        ← Previous
                    </Button>

                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose} className="font-bold border-muted-foreground/20">
                            Close
                        </Button>
                        {step < 3 ? (
                            <Button
                                onClick={() => setStep(prev => prev + 1)}
                                className="font-bold px-8 shadow-lg shadow-primary/20"
                            >
                                Next Step <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                onClick={() => buildAndEmit(true)}
                                disabled={exams.length === 0 || batches.length === 0}
                                className="font-bold px-8 bg-gradient-to-r from-primary to-indigo-600 shadow-lg shadow-indigo-500/20"
                            >
                                <Zap className="mr-2 h-4 w-4" /> Generate Allotment
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
