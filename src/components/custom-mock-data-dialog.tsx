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
    linkedBatchId?: string; // New field to link to a batch
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
                linkedBatchId: batchId
            };
        });

        setBatches([...batches, ...newBatches]);
        setExams([...exams, ...newCustomExams]);
    };

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

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <DialogTitle className="text-2xl flex items-center gap-2">
                                <Database className="h-6 w-6 text-primary" />
                                Mock Data Generator
                            </DialogTitle>
                            <DialogDescription>Generate sample data to instantly test the allotment engine without heavy imports.</DialogDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={onClearData} className="text-destructive border-destructive/20 hover:bg-destructive/10">
                            <Eraser className="h-4 w-4 mr-2" />
                            Clear Existing Data
                        </Button>
                    </div>
                </DialogHeader>

                <Alert className="bg-primary/5 border-primary/20">
                    <Info className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-primary font-semibold">Pro Tip for Beginners</AlertTitle>
                    <AlertDescription className="text-xs">
                        This tool simulates a <b>"Schedule-First"</b> workflow. Simply paste your real exam schedule, and the system will automatically <b>"Smart-Mock"</b> matching student batches for you!
                    </AlertDescription>
                </Alert>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="random">Random Data</TabsTrigger>
                        <TabsTrigger value="custom">Custom Data</TabsTrigger>
                    </TabsList>

                    <TabsContent value="random" className="space-y-4 py-4">
                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg space-y-4 bg-muted/20">
                            <div className="p-4 rounded-full bg-primary/10 text-primary">
                                <Sparkles className="h-8 w-8" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-semibold">Generate Full Random Dataset</h3>
                                <p className="text-sm text-muted-foreground max-w-sm">
                                    Create a complete set of Students, Classrooms, Invigilators, and Exams with randomized values.
                                </p>
                            </div>

                            <div className="flex items-center gap-4 w-full max-w-xs">
                                <Label className="whitespace-nowrap">Number of Students:</Label>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Input
                                                type="number"
                                                value={randomStudentCount}
                                                onChange={(e) => setRandomStudentCount(Number(e.target.value))}
                                                className="font-mono"
                                            />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>This will generate students across all GEHU courses/departments defined in the library.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>

                            <Button onClick={handleGenerateRandom} className="w-full max-w-xs">
                                <Database className="mr-2 h-4 w-4" />
                                Generate Random Data
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="custom" className="space-y-6 py-4">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-md font-semibold flex items-center gap-2">
                                    <GraduationCap className="h-4 w-4" /> Student Batches
                                </h3>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={loadTemplate} className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100">
                                        <Lightbulb className="h-3 w-3 mr-1" /> Load Template
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setShowPasteBatches(!showPasteBatches)}>
                                        {showPasteBatches ? 'Cancel Paste' : 'Paste Batches'}
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={addBatch}>
                                        <Plus className="h-3 w-3 mr-1" /> Add Batch
                                    </Button>
                                </div>
                            </div>

                            {showPasteBatches && (
                                <div className="p-4 border rounded-md bg-muted/30 space-y-2">
                                    <Label>Paste Batch Data (Format: | Course | Dept | Sem | Count |)</Label>
                                    <textarea
                                        className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        placeholder="| B.Tech | CSE | 4 | 60 |"
                                        value={pasteBatchesText}
                                        onChange={(e) => setPasteBatchesText(e.target.value)}
                                    />
                                    <Button size="sm" onClick={handlePasteBatchesProcess} disabled={!pasteBatchesText.trim()}>
                                        Process & Add Batches
                                    </Button>
                                    <p className="text-xs text-muted-foreground">Batches will be appended to the list below.</p>
                                </div>
                            )}

                            {batches.map((batch, index) => (
                                <div key={batch.id} className="grid grid-cols-12 gap-2 items-end border p-3 rounded-md bg-muted/20">
                                    <div className="col-span-3">
                                        <Label className="text-xs">Course</Label>
                                        <Input
                                            value={batch.course}
                                            onChange={(e) => updateBatch(batch.id, 'course', e.target.value)}
                                            placeholder="B.TECH"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <Label className="text-xs">Dept</Label>
                                        <Input
                                            value={batch.department}
                                            onChange={(e) => updateBatch(batch.id, 'department', e.target.value)}
                                            placeholder="CSE"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-xs">Sem</Label>
                                        <Input
                                            type="number"
                                            value={batch.semester}
                                            onChange={(e) => updateBatch(batch.id, 'semester', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <Label className="text-xs">Count</Label>
                                        <Input
                                            type="number"
                                            value={batch.count}
                                            onChange={(e) => updateBatch(batch.id, 'count', Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <Button variant="ghost" size="icon" onClick={() => removeBatch(batch.id)} className="text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            <div className="p-3 bg-muted/30 rounded-md border border-dashed text-[10px] text-muted-foreground">
                                <p className="font-semibold uppercase flex items-center gap-1 mb-1"><Info className="h-3 w-3" /> Roll Number Generation Logic</p>
                                <p>Generated Roll No: <b>25</b> (Batch) + <b>{batches[0]?.course?.substring(0, 2).toUpperCase() || 'XX'}</b> (Course) + <b>{batches[0]?.department?.substring(0, 2).toUpperCase() || 'YY'}</b> (Dept) + <b>001</b> (Serial)</p>
                            </div>
                        </div>

                        {/* Exams Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-md font-semibold flex items-center gap-2">
                                    <BookOpen className="h-4 w-4" /> Exam Slots
                                </h3>
                                <div className="flex gap-2">
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handlePDFUpload}
                                    />
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isParsing}
                                        className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                                    >
                                        {isParsing ? (
                                            <>
                                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                Parsing...
                                            </>
                                        ) : (
                                            <>
                                                <FileUp className="h-3 w-3 mr-1" />
                                                Import PDF
                                            </>
                                        )}
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setShowPasteInput(!showPasteInput)}>
                                        {showPasteInput ? 'Cancel Paste' : 'Paste Schedule'}
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={addExam}>
                                        <Plus className="h-3 w-3 mr-1" /> Add Exam
                                    </Button>
                                </div>
                            </div>

                            {showPasteInput && (
                                <div className="p-4 border rounded-md bg-muted/30 space-y-2">
                                    <Label>Paste Table Data (Advanced Format: | Date | Shift | Code | Subject | Course | Dept | Sem |)</Label>
                                    <textarea
                                        className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        placeholder="| 2025-12-01 | 09:30 AM | TCS-401 | OS | B.Tech | CSE | 4 |"
                                        value={pasteText}
                                        onChange={(e) => setPasteText(e.target.value)}
                                    />
                                    <Button size="sm" onClick={handlePasteProcess} disabled={!pasteText.trim()}>
                                        Process & Smart-Allot Mock Students
                                    </Button>
                                    <p className="text-xs text-muted-foreground font-medium">🔥 Smart Mapper: Detected groups will automatically create mock batches.</p>
                                </div>
                            )}

                            {exams.map((exam) => (
                                <div key={exam.id} className="grid grid-cols-12 gap-2 items-end border p-3 rounded-md bg-muted/20">
                                    <div className="col-span-3">
                                        <Label className="text-xs">For Batch</Label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={exam.linkedBatchId}
                                            onChange={(e) => updateExam(exam.id, 'linkedBatchId', e.target.value)}
                                        >
                                            {batches.map(b => (
                                                <option key={b.id} value={b.id}>
                                                    {b.course} - {b.department} ({b.semester})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-xs">Subject</Label>
                                        <Input
                                            value={exam.subjectName}
                                            onChange={(e) => updateExam(exam.id, 'subjectName', e.target.value)}
                                            placeholder="Maths"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-xs">Code</Label>
                                        <Input
                                            value={exam.subjectCode}
                                            onChange={(e) => updateExam(exam.id, 'subjectCode', e.target.value)}
                                            placeholder="Code"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-xs">Date</Label>
                                        <Input
                                            type="date"
                                            value={exam.date}
                                            onChange={(e) => updateExam(exam.id, 'date', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-xs">Time</Label>
                                        <Input
                                            type="time"
                                            value={exam.time}
                                            onChange={(e) => updateExam(exam.id, 'time', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <Button variant="ghost" size="icon" onClick={() => removeExam(exam.id)} className="text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={onClose}>Cancel</Button>
                            <Button onClick={handleGenerateCustom}>Generate Custom Data</Button>
                        </DialogFooter>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

}
