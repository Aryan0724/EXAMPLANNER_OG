import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Import Tabs
import { Plus, Trash2, BookOpen, GraduationCap, Sparkles, Database, Info, Eraser, Lightbulb, FileUp, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExamSlot, Student } from '@/lib/types';
import { parsePasteSchedule, parsePasteBatches } from '@/lib/parsers';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
    onGenerateCustom: (students: Student[], exams: ExamSlot[]) => void;
    onGenerateRandom: (count: number) => void;
}

export function CustomMockDataDialog({ isOpen, onClose, onClearData, onGenerateCustom, onGenerateRandom }: CustomMockDataDialogProps) {
    const { toast } = useToast(); // Add toast
    const [activeTab, setActiveTab] = useState('random');
    const [randomStudentCount, setRandomStudentCount] = useState(200);
    const [isParsing, setIsParsing] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const [batches, setBatches] = useState<StudentBatch[]>([
        { id: '1', course: 'B.TECH', department: 'CSE', semester: '2', count: 100 }
    ]);
    const [exams, setExams] = useState<CustomExam[]>([
        { id: '1', subjectName: 'Mathematics II', subjectCode: 'TMA 201', date: '2025-06-01', time: '09:30', duration: 90, linkedBatchId: '1' }
    ]);

    const [showPasteInput, setShowPasteInput] = useState(false);
    const [pasteText, setPasteText] = useState('');

    const [showPasteBatches, setShowPasteBatches] = useState(false);
    const [pasteBatchesText, setPasteBatchesText] = useState('');

    const handlePasteBatchesProcess = () => {
        const parsedBatches = parsePasteBatches(pasteBatchesText);
        if (parsedBatches.length === 0) return;

        const newBatches: StudentBatch[] = parsedBatches.map(pb => ({
            id: Math.random().toString(),
            course: pb.course,
            department: pb.department,
            semester: pb.semester.toString(),
            count: pb.count
        }));

        setBatches([...batches, ...newBatches]);
        setPasteBatchesText('');
        setShowPasteBatches(false);
    };

    const handlePasteProcess = () => {
        const parsedExams = parsePasteSchedule(pasteText);
        processParsedExams(parsedExams);
        setPasteText('');
        setShowPasteInput(false);
    };

    const processParsedExams = (parsedExams: any[]) => {
        if (parsedExams.length === 0) return;

        // Smart Auto-Batching
        const newBatches: StudentBatch[] = [];
        const existingBatchMap = new Map<string, string>(); // key: Course-Dept-Sem, value: id

        // Pre-populate with current batches
        batches.forEach(b => {
            const key = `${b.course}-${b.department}-${b.semester}`.toLowerCase();
            existingBatchMap.set(key, b.id);
        });

        // Convert to CustomExam format and identify groups
        const newCustomExams: CustomExam[] = parsedExams.map(pe => {
            const groupKey = `${pe.course}-${pe.department}-${pe.semester}`.toLowerCase();
            let batchId = existingBatchMap.get(groupKey);

            // If group doesn't exist, create it auto-magically
            if (!batchId) {
                batchId = Math.random().toString();
                newBatches.push({
                    id: batchId,
                    course: pe.course || 'IMPORT',
                    department: pe.department || 'IMPORT',
                    semester: String(pe.semester || '1'),
                    count: 60 // Default mock population
                });
                existingBatchMap.set(groupKey, batchId);
            }

            return {
                id: Math.random().toString(),
                subjectName: pe.subjectName,
                subjectCode: pe.subjectCode,
                date: pe.date,
                time: pe.time,
                duration: pe.duration,
                linkedBatchId: batchId,
                course: pe.course,
                semester: pe.semester,
                department: pe.department
            };
        });

        setBatches([...batches, ...newBatches]);
        setExams([...exams, ...newCustomExams]);
        setStep(2); // Auto-advance to review step
    };

    const [step, setStep] = useState(1);

    const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsing(true);
        try {
            const parsedExams = await parseExamPDF(file);
            processParsedExams(parsedExams);
            toast({ title: "PDF Imported", description: `Detected ${parsedExams.length} exams and auto-magically matched student batches.` });
        } catch (err) {
            console.error("PDF Parsing Error:", err);
            toast({ variant: "destructive", title: "PDF Error", description: "Could not parse university format correctly." });
        } finally {
            setIsParsing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const addBatch = () => {
        setBatches([...batches, { id: Math.random().toString(), course: '', department: '', semester: '', count: 60 }]);
    };

    const removeBatch = (id: string) => {
        setBatches(batches.filter(b => b.id !== id));
    };

    const updateBatch = (id: string, field: keyof StudentBatch, value: any) => {
        setBatches(batches.map(b => b.id === id ? { ...b, [field]: value } : b));
    };

    const addExam = () => {
        // Auto-link to the most recently updated/added batch
        const lastBatchId = batches.length > 0 ? batches[batches.length - 1].id : undefined;
        
        setExams([...exams, {
            id: Math.random().toString(),
            subjectName: '',
            subjectCode: '',
            date: '2025-12-01',
            time: '09:30',
            duration: 90,
            linkedBatchId: lastBatchId
        }]);
    };

    const removeExam = (id: string) => {
        setExams(exams.filter(e => e.id !== id));
    };

    const updateExam = (id: string, field: keyof CustomExam, value: any) => {
        setExams(exams.map(e => e.id === id ? { ...e, [field]: value } : e));
    };

    const loadTemplate = () => {
        setBatches([
            { id: 'b1', course: 'B.Tech CSE', department: 'SOC', semester: '4', count: 60 },
            { id: 'b2', course: 'BBA', department: 'SOM', semester: '2', count: 40 }
        ]);
        setExams([
            { id: 'e1', subjectName: 'Operating Systems', subjectCode: 'TCS-401', date: '2025-12-01', time: '09:30', duration: 90, linkedBatchId: 'b1' },
            { id: 'e2', subjectName: 'Business Ethics', subjectCode: 'BBA-202', date: '2025-12-01', time: '09:30', duration: 90, linkedBatchId: 'b2' }
        ]);
    };

    const handleGenerateCustom = () => {
        const generatedStudents: Student[] = [];
        const generatedExams: ExamSlot[] = [];

        // Generate Students
        let globalIdCounter = 1;
        batches.forEach(batch => {
            for (let i = 0; i < batch.count; i++) {
                const yearPrefix = '25';
                const courseCode = batch.course.substring(0, 2).toUpperCase();
                const deptCode = batch.department.substring(0, 2).toUpperCase();
                const serial = String(globalIdCounter).padStart(3, '0');
                const rollNo = `${yearPrefix}${courseCode}${deptCode}${serial}`;

                generatedStudents.push({
                    id: `S${rollNo}`,
                    name: `Student ${globalIdCounter}`,
                    rollNo: rollNo,
                    course: batch.course.toUpperCase(),
                    department: batch.department.toUpperCase(),
                    semester: Number(batch.semester),
                    section: ['A', 'B', 'C'][i % 3],
                    ineligibilityRecords: [],
                    unavailableSlots: [],
                    seatAssignment: null,
                    isDebarred: false
                });
                globalIdCounter++;
            }
        });

        // Generate Exams
        exams.forEach((exam, index) => {
            // Link exams to the specific batch
            const targetBatch = batches.find(b => b.id === exam.linkedBatchId) || batches[0];

            // Safety check if no batches exist
            if (!targetBatch) return;

            generatedExams.push({
                id: `E${String(index + 1).padStart(4, '0')}`,
                date: exam.date,
                time: exam.time,
                course: targetBatch.course.toUpperCase(),
                department: targetBatch.department.toUpperCase(),
                semester: Number(targetBatch.semester),
                subjectName: exam.subjectName,
                subjectCode: exam.subjectCode.toUpperCase(),
                duration: exam.duration,
                shift: 1, // simplified
                group: 'All' as any
            });
        });

        onGenerateCustom(generatedStudents, generatedExams);
        onClose();
    };

    const handleGenerateRandom = () => {
        onGenerateRandom(randomStudentCount);
        onClose();
    };

    const steps = [
        { id: 1, title: 'Import Schedule', icon: FileUp },
        { id: 2, title: 'Review Batches', icon: GraduationCap },
        { id: 3, title: 'Finalize Exams', icon: BookOpen }
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
                <div className="bg-gradient-to-r from-primary/10 via-background to-indigo-50/30 p-6 border-b">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary rounded-xl shadow-lg shadow-primary/20">
                                <Sparkles className="h-6 w-6 text-primary-foreground" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-bold tracking-tight">Smart Setup Wizard</DialogTitle>
                                <DialogDescription className="text-sm font-medium text-muted-foreground/80">Configure your entire exam system in 3 simple steps</DialogDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={onClearData} className="text-muted-foreground hover:text-destructive transition-colors">
                                <Eraser className="h-4 w-4 mr-2" />
                                Reset Setup
                            </Button>
                            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-10 relative">
                        <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-muted -translate-y-1/2 z-0"></div>
                        {steps.map((s) => (
                            <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                    step >= s.id ? 'bg-primary border-primary text-primary-foreground shadow-md scale-110' : 'bg-background border-muted text-muted-foreground'
                                }`}>
                                    <s.icon className="h-5 w-5" />
                                </div>
                                <span className={`text-xs font-bold ${step >= s.id ? 'text-primary' : 'text-muted-foreground opacity-60'}`}>{s.title}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    {step === 1 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div 
                                    className="group relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all cursor-pointer overflow-hidden"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="absolute -top-12 -right-12 h-40 w-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/20 transition-all"></div>
                                    <div className="p-5 rounded-2xl bg-white shadow-xl mb-4 group-hover:scale-110 transition-transform">
                                        <FileUp className="h-10 w-10 text-primary" />
                                    </div>
                                    <h4 className="text-xl font-bold mb-2">Import University PDF</h4>
                                    <p className="text-sm text-center text-muted-foreground max-w-[250px]">
                                        Drop your exam schedule PDF here. We'll auto-detect courses, dates, and subjects.
                                    </p>
                                    <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={handlePDFUpload} />
                                    {isParsing && (
                                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                                            <Loader2 className="h-10 w-10 text-primary animate-spin" />
                                            <span className="font-bold text-primary">Analyzing PDF...</span>
                                        </div>
                                    )}
                                </div>

                                <div 
                                    className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50/50 transition-all cursor-pointer"
                                    onClick={() => setShowPasteInput(true)}
                                >
                                    <div className="p-5 rounded-2xl bg-white shadow-xl mb-4">
                                        <Sparkles className="h-10 w-10 text-indigo-600" />
                                    </div>
                                    <h4 className="text-xl font-bold mb-2">Manual Setup</h4>
                                    <p className="text-sm text-center text-muted-foreground max-w-[250px]">
                                        Paste data or start from scratch. Use our smart templates to speed up the process.
                                    </p>
                                </div>
                            </div>

                            {showPasteInput && (
                                <div className="p-6 border rounded-2xl bg-muted/20 animate-in zoom-in-95 duration-300">
                                    <div className="flex justify-between items-center mb-4">
                                        <Label className="text-lg font-bold">Paste Schedule Data</Label>
                                        <Button variant="ghost" size="sm" onClick={() => setShowPasteInput(false)}>Cancel</Button>
                                    </div>
                                    <textarea
                                        className="flex min-h-[200px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-mono shadow-inner focus:ring-2 focus:ring-primary/20 transition-all"
                                        placeholder="| Date | Shift | Code | Subject | Course | Dept | Sem |"
                                        value={pasteText}
                                        onChange={(e) => setPasteText(e.target.value)}
                                    />
                                    <Button className="mt-4 w-full h-12 text-md font-bold" onClick={handlePasteProcess} disabled={!pasteText.trim()}>
                                        Analyze & Process Data
                                    </Button>
                                </div>
                            )}

                            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-4 items-center">
                                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                    <Lightbulb className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-amber-900">Pro Tip</p>
                                    <p className="text-xs text-amber-700">Importing a schedule automatically creates student batches for you! No need to enter students manually.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <div className="flex items-center justify-between bg-secondary/10 p-4 rounded-2xl border border-secondary/20 mb-8">
                                <div className="flex items-center gap-3">
                                    <GraduationCap className="h-6 w-6 text-primary" />
                                    <div>
                                        <h3 className="text-lg font-bold">Review Student Batches</h3>
                                        <p className="text-xs text-muted-foreground">Adjust student counts for each detected course</p>
                                    </div>
                                </div>
                                <Button size="sm" onClick={addBatch} className="bg-primary shadow-lg shadow-primary/20">
                                    <Plus className="h-4 w-4 mr-2" /> Add Batch
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {batches.map((batch) => (
                                    <div key={batch.id} className="group flex flex-col md:flex-row gap-4 p-5 border rounded-2xl bg-background hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all relative">
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground px-1">Course Name</Label>
                                            <Input
                                                value={batch.course}
                                                onChange={(e) => updateBatch(batch.id, 'course', e.target.value)}
                                                className="border-none bg-muted/30 focus-visible:ring-0 text-md font-bold h-10"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground px-1">Department</Label>
                                            <Input
                                                value={batch.department}
                                                onChange={(e) => updateBatch(batch.id, 'department', e.target.value)}
                                                className="border-none bg-muted/30 focus-visible:ring-0 text-sm h-10"
                                            />
                                        </div>
                                        <div className="w-20 space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground px-1">Sem</Label>
                                            <Input
                                                type="number"
                                                value={batch.semester}
                                                onChange={(e) => updateBatch(batch.id, 'semester', e.target.value)}
                                                className="border-none bg-muted/30 focus-visible:ring-0 text-center font-bold h-10"
                                            />
                                        </div>
                                        <div className="w-32 space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground px-1">Students</Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    value={batch.count}
                                                    onChange={(e) => updateBatch(batch.id, 'count', Number(e.target.value))}
                                                    className="border-none bg-muted/30 focus-visible:ring-0 font-mono font-bold text-primary h-10"
                                                />
                                                <Button variant="ghost" size="icon" onClick={() => removeBatch(batch.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <div className="flex items-center justify-between bg-primary/5 p-4 rounded-2xl border border-primary/10 mb-8">
                                <div className="flex items-center gap-3">
                                    <BookOpen className="h-6 w-6 text-primary" />
                                    <div>
                                        <h3 className="text-lg font-bold">Finalize Exam Slots</h3>
                                        <p className="text-xs text-muted-foreground">Verify dates, times, and subject mapping</p>
                                    </div>
                                </div>
                                <Button size="sm" variant="outline" onClick={addExam} className="border-primary/20 text-primary">
                                    <Plus className="h-4 w-4 mr-2" /> Add Exam
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {exams.map((exam) => (
                                    <div key={exam.id} className="group grid grid-cols-12 gap-3 p-5 border rounded-2xl bg-background hover:border-primary/30 transition-all items-end">
                                        <div className="col-span-3 space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Target Batch</Label>
                                            <select
                                                className="w-full h-10 rounded-xl border-none bg-muted/30 px-3 text-xs font-bold focus:ring-0"
                                                value={exam.linkedBatchId}
                                                onChange={(e) => updateExam(exam.id, 'linkedBatchId', e.target.value)}
                                            >
                                                {batches.map(b => (
                                                    <option key={b.id} value={b.id}>
                                                        {b.course} ({b.semester})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-span-3 space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Subject Name</Label>
                                            <Input
                                                value={exam.subjectName}
                                                onChange={(e) => updateExam(exam.id, 'subjectName', e.target.value)}
                                                className="border-none bg-muted/30 h-10 text-xs font-bold"
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Date</Label>
                                            <Input
                                                type="date"
                                                value={exam.date}
                                                onChange={(e) => updateExam(exam.id, 'date', e.target.value)}
                                                className="border-none bg-muted/30 h-10 text-xs"
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Time</Label>
                                            <Input
                                                type="time"
                                                value={exam.time}
                                                onChange={(e) => updateExam(exam.id, 'time', e.target.value)}
                                                className="border-none bg-muted/30 h-10 text-xs"
                                            />
                                        </div>
                                        <div className="col-span-2 flex items-center justify-end">
                                            <Button variant="ghost" size="icon" onClick={() => removeExam(exam.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t bg-muted/10 flex justify-between items-center px-10">
                    <Button 
                        variant="ghost" 
                        onClick={() => setStep(prev => prev - 1)} 
                        disabled={step === 1}
                        className="font-bold"
                    >
                        Previous Step
                    </Button>
                    
                    <div className="flex gap-4">
                        <Button variant="outline" onClick={onClose} className="font-bold border-muted-foreground/20">
                            Save & Exit
                        </Button>
                        {step < 3 ? (
                            <Button 
                                onClick={() => setStep(prev => prev + 1)} 
                                disabled={exams.length === 0}
                                className="font-bold px-10 shadow-lg shadow-primary/20"
                            >
                                Next Step
                            </Button>
                        ) : (
                            <Button 
                                onClick={handleGenerateCustom} 
                                className="font-bold px-10 bg-gradient-to-r from-primary to-indigo-600 shadow-lg shadow-indigo-500/20"
                            >
                                Complete Setup & Generate Data
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
