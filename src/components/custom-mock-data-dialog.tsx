'use client';

import React, { useState, useContext, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Sparkles, CheckCircle2, ArrowRight, Download, Search,
    Building2, Users, CalendarDays, FileSpreadsheet,
    FileText, Check, RotateCcw, ClipboardPaste, BookOpen, Clock, ShieldCheck,
    Zap, Loader2
} from 'lucide-react';
import { ExamSlot, Student, Classroom, Invigilator, SeatPlan, InvigilatorAssignment } from '@/lib/types';
import { generateMockClassrooms, generateMockInvigilators, generateMockStudents, generateMockExamSchedule } from '@/lib/data';
import { generateSeatPlan, assignInvigilators } from '@/lib/planning';
import {
    generateMasterReport,
    generateDetailedInvigilatorDutyChart,
    generateSessionWiseInvigilationRoster
} from '@/lib/report-generator';
import {
    BHIMTAL_MAY_2026_DUTY_PLAN,
    BHIMTAL_MAY_2026_EXAM_SCHEDULE,
    DutyPlanDay,
    mapDutyPlanAndSchedule
} from '@/lib/bhimtalDutyPlanMay2026';
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

export function CustomMockDataDialog({
    isOpen,
    onClose,
    onClearData,
    onFloodAndGenerate
}: CustomMockDataDialogProps) {
    const { toast } = useToast();
    const router = useRouter();

    const {
        classrooms, setClassrooms,
        invigilators, setInvigilators,
        examSchedule, setExamSchedule,
        setStudents,
        setReservedCount,
        blockPriority
    } = useContext(DataContext);

    const { fullAllotment, setFullAllotment } = useContext(AllotmentContext);

    // Active wizard step: 1 = Duty Plan & Schedule, 2 = College Format Exports
    const [wizardStep, setWizardStep] = useState<1 | 2>(1);

    // Editable Duty Plan state (initialized to Bhimtal May 2026 official document)
    const [dutyPlan, setDutyPlan] = useState<DutyPlanDay[]>(BHIMTAL_MAY_2026_DUTY_PLAN);
    const [activeSchedule, setActiveSchedule] = useState<ExamSlot[]>(BHIMTAL_MAY_2026_EXAM_SCHEDULE);
    const [activePlanTitle, setActivePlanTitle] = useState('GEHU Bhimtal End Term (May 2026)');

    // Filter/Search in table
    const [searchQuery, setSearchQuery] = useState('');

    // Paste box drawer toggle
    const [showPasteBox, setShowPasteBox] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const [isFlooding, setIsFlooding] = useState(false);

    // Mapping metrics
    const [mappingStats, setMappingStats] = useState<{
        totalSessions: number;
        totalDuties: number;
        totalRooms: number;
    } | null>(null);

    // ── PRIMARY 1-CLICK FLOOD & GENERATE ──
    const handleDirectFloodAndGenerate = async () => {
        setIsFlooding(true);
        if (onFloodAndGenerate) {
            onFloodAndGenerate();
            onClose();
            setIsFlooding(false);
            return;
        }

        toast({ title: '⚡ Flooding Mock Data...', description: 'Generating students, classrooms, invigilators & schedule.' });
        await new Promise(resolve => setTimeout(resolve, 150));
        try {
            const freshStudents = generateMockStudents(200);
            const freshClassrooms = generateMockClassrooms();
            const freshInvigilators = generateMockInvigilators();
            const freshExams = generateMockExamSchedule();

            setStudents(freshStudents);
            setClassrooms(freshClassrooms);
            setInvigilators(freshInvigilators);
            setExamSchedule(freshExams);
            setReservedCount(3);

            const examSlotsMap = freshExams.reduce((acc, exam) => {
                const key = `${exam.date} ${exam.time}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(exam);
                return acc;
            }, {} as Record<string, ExamSlot[]>);

            const generatedPlans: Record<string, { seatPlan: SeatPlan, invigilatorAssignments: InvigilatorAssignment[] }> = {};
            const sortedSessionKeys = Object.keys(examSlotsMap).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

            let studentMasterList: Student[] = JSON.parse(JSON.stringify(freshStudents));
            let invigilatorMasterList: Invigilator[] = JSON.parse(JSON.stringify(freshInvigilators));
            const classroomMasterList = JSON.parse(JSON.stringify(freshClassrooms));

            for (const key of sortedSessionKeys) {
                const concurrentExams = examSlotsMap[key];
                if (!concurrentExams || concurrentExams.length === 0) continue;
                const { plan, updatedStudents } = generateSeatPlan(studentMasterList, classroomMasterList, concurrentExams, blockPriority || ['Academic Block C', 'Academic Block D', 'Academic Block E']);
                studentMasterList = updatedStudents;
                const { assignments: invAsg, updatedInvigilators } = assignInvigilators(invigilatorMasterList, plan, concurrentExams[0], 3);
                invigilatorMasterList = updatedInvigilators;
                generatedPlans[key] = { seatPlan: plan, invigilatorAssignments: invAsg };
            }

            setStudents(studentMasterList);
            setInvigilators(invigilatorMasterList);
            setFullAllotment(generatedPlans);

            toast({
                title: "🎉 Allotment Ready!",
                description: `Complete seating generated for ${sortedSessionKeys.length} session(s). Redirecting...`
            });

            onClose();
            router.push('/allotment');
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Generation Failed', description: e.message });
        } finally {
            setIsFlooding(false);
        }
    };

    // Flatten shifts for easy table viewing
    const flattenedShifts = useMemo(() => {
        const rows: {
            dayIndex: number;
            shiftIndex: number;
            date: string;
            dateDisplay: string;
            dayName: string;
            shiftName: string;
            time: string;
            timeRange: string;
            roomsRequired: number;
            totalInvigilators: number;
            activeInvigilators: number;
            reliefInvigilators: number;
            reservedInvigilators: number;
            backPaperNote?: string;
        }[] = [];

        dutyPlan.forEach((day, dIdx) => {
            day.shifts.forEach((shift, sIdx) => {
                rows.push({
                    dayIndex: dIdx,
                    shiftIndex: sIdx,
                    date: day.date,
                    dateDisplay: day.dateDisplay,
                    dayName: day.dayName,
                    shiftName: shift.shiftName,
                    time: shift.time,
                    timeRange: shift.timeRange,
                    roomsRequired: shift.roomsRequired,
                    totalInvigilators: shift.totalInvigilators,
                    activeInvigilators: shift.activeInvigilators,
                    reliefInvigilators: shift.reliefInvigilators,
                    reservedInvigilators: shift.reservedInvigilators,
                    backPaperNote: shift.backPaperNote
                });
            });
        });

        return rows;
    }, [dutyPlan]);

    // Filtered rows for table
    const filteredRows = useMemo(() => {
        if (!searchQuery.trim()) return flattenedShifts;
        const q = searchQuery.toLowerCase();
        return flattenedShifts.filter(r =>
            r.dateDisplay.toLowerCase().includes(q) ||
            r.shiftName.toLowerCase().includes(q) ||
            (r.backPaperNote && r.backPaperNote.toLowerCase().includes(q))
        );
    }, [flattenedShifts, searchQuery]);

    // High level metrics
    const planMetrics = useMemo(() => {
        const daysCount = dutyPlan.length;
        const shiftsCount = flattenedShifts.length;
        const maxRooms = Math.max(...flattenedShifts.map(s => s.roomsRequired), 0);
        const maxInvig = Math.max(...flattenedShifts.map(s => s.totalInvigilators), 0);
        return { daysCount, shiftsCount, maxRooms, maxInvig };
    }, [dutyPlan, flattenedShifts]);

    // Handle inline update of room/invigilator count
    const handleUpdateShift = (dayIndex: number, shiftIndex: number, field: 'roomsRequired' | 'totalInvigilators', value: number) => {
        setDutyPlan(prev => {
            const next = [...prev];
            const updatedShifts = [...next[dayIndex].shifts];
            updatedShifts[shiftIndex] = {
                ...updatedShifts[shiftIndex],
                [field]: Math.max(0, value)
            };
            next[dayIndex] = { ...next[dayIndex], shifts: updatedShifts };
            return next;
        });
    };

    // 1-Click Load Official Bhimtal Even Sem (May 2026)
    const handleLoadBhimtalMay2026 = () => {
        setDutyPlan(BHIMTAL_MAY_2026_DUTY_PLAN);
        setActiveSchedule(BHIMTAL_MAY_2026_EXAM_SCHEDULE);
        setActivePlanTitle('GEHU Bhimtal End Term (May 2026)');
        toast({
            title: "May 2026 Examination Plan Loaded",
            description: "Loaded 14 examination days, 33 shifts & schedule from Superintendent of Examination, Bhimtal Campus."
        });
    };

    // Handle Quick Paste
    const handleApplyPasteText = () => {
        if (!pasteText.trim()) return;
        const lines = pasteText.split('\n').filter(l => l.trim().length > 0);
        let updatedCount = 0;

        setDutyPlan(prev => {
            const next = [...prev];
            lines.forEach(line => {
                const parts = line.split(/[,\t]+/).map(s => s.trim());
                if (parts.length >= 4) {
                    const [pDate, pShift, pRooms, pInvig] = parts;
                    const dayIdx = next.findIndex(d => d.date === pDate || d.dateDisplay.includes(pDate));
                    if (dayIdx !== -1) {
                        const shiftIdx = next[dayIdx].shifts.findIndex(s => s.shiftName.toLowerCase().includes(pShift.toLowerCase()));
                        if (shiftIdx !== -1) {
                            next[dayIdx].shifts[shiftIdx].roomsRequired = parseInt(pRooms) || next[dayIdx].shifts[shiftIdx].roomsRequired;
                            next[dayIdx].shifts[shiftIdx].totalInvigilators = parseInt(pInvig) || next[dayIdx].shifts[shiftIdx].totalInvigilators;
                            updatedCount++;
                        }
                    }
                }
            });
            return next;
        });

        toast({
            title: "Pasted Data Applied",
            description: `Updated requirements for ${updatedCount} examination shifts.`
        });
        setShowPasteBox(false);
        setPasteText('');
    };

    // Map Exam Schedule & Duty Required List
    const handleMapAndGenerateAllotment = () => {
        const availableClassrooms = classrooms && classrooms.length > 0 ? classrooms : generateMockClassrooms();
        const availableInvigilators = invigilators && invigilators.length > 0 ? invigilators : generateMockInvigilators();

        if (!classrooms || classrooms.length === 0) setClassrooms(availableClassrooms);
        if (!invigilators || invigilators.length === 0) setInvigilators(availableInvigilators);

        setExamSchedule(activeSchedule);
        setReservedCount(3);

        const { fullAllotment: generatedAllotment, totalDutiesAssigned, totalRoomsAllotted } = mapDutyPlanAndSchedule(
            dutyPlan,
            activeSchedule,
            availableClassrooms,
            availableInvigilators
        );

        setFullAllotment(generatedAllotment);

        // Synthesize student body matching the allotted rooms for visualizer compatibility
        const generatedStudents: Student[] = [];
        Object.values(generatedAllotment).forEach(session => {
            session.seatPlan.assignments.forEach(asg => {
                if (asg.student && !generatedStudents.some(s => s.rollNo === asg.student!.rollNo)) {
                    generatedStudents.push(asg.student);
                }
            });
        });
        setStudents(generatedStudents);

        setMappingStats({
            totalSessions: Object.keys(generatedAllotment).length,
            totalDuties: totalDutiesAssigned,
            totalRooms: totalRoomsAllotted
        });

        setWizardStep(2);

        toast({
            title: "College Allotment Generated!",
            description: `Mapped ${Object.keys(generatedAllotment).length} sessions across ${totalRoomsAllotted} room allocations and ${totalDutiesAssigned} invigilator duties.`
        });
    };

    // ── Direct College Downloads ──
    const handleDownloadOfficialDutyChart = async () => {
        if (!fullAllotment) return;
        const currentInvigilators = invigilators && invigilators.length > 0 ? invigilators : generateMockInvigilators();
        try {
            await generateDetailedInvigilatorDutyChart(fullAllotment, currentInvigilators);
            toast({
                title: "Official Duty Chart Downloaded",
                description: "Exported styled Excel duty matrix with 'No of Duty Required' and Superintendent signature."
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Export Failed', description: e.message });
        }
    };

    const handleDownloadSessionRosters = async () => {
        if (!fullAllotment) return;
        const currentRooms = classrooms && classrooms.length > 0 ? classrooms : generateMockClassrooms();
        try {
            await generateSessionWiseInvigilationRoster(fullAllotment, currentRooms);
            toast({
                title: "Shift Rosters Downloaded",
                description: "Exported room-by-room duty chart and answer script sheets."
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Export Failed', description: e.message });
        }
    };

    const handleDownloadMasterReport = () => {
        if (!fullAllotment) return;
        const currentRooms = classrooms && classrooms.length > 0 ? classrooms : generateMockClassrooms();
        const currentInvigilators = invigilators && invigilators.length > 0 ? invigilators : generateMockInvigilators();
        try {
            generateMasterReport(fullAllotment, [], currentRooms, currentInvigilators);
            toast({
                title: "Master Seating Plan Downloaded",
                description: "Exported session-wise room seating chart with invigilators and signature spaces."
            });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Export Failed', description: e.message });
        }
    };

    const handleProceedToAllotment = () => {
        onClose();
        router.push('/allotment');
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl border-slate-700 bg-slate-950 text-slate-100">
                
                {/* ── HEADER ── */}
                <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs px-2.5 py-0.5">
                                GEHU Bhimtal Campus
                            </Badge>
                            <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 text-xs">
                                {activePlanTitle}
                            </Badge>
                        </div>
                        <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                            Examination Duty &amp; Room Allotment Wizard
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs mt-0.5">
                            Map the examination schedule directly with the Duty Required List to produce official college rosters.
                        </DialogDescription>
                    </div>

                    {/* Step Indicator Tabs */}
                    <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800 shrink-0">
                        <button
                            onClick={() => setWizardStep(1)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                wizardStep === 1
                                    ? 'bg-indigo-600 text-white shadow'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            1. Duty List &amp; Schedule
                        </button>
                        <button
                            onClick={() => {
                                if (fullAllotment && Object.keys(fullAllotment).length > 0) setWizardStep(2);
                            }}
                            disabled={!fullAllotment || Object.keys(fullAllotment).length === 0}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                wizardStep === 2
                                    ? 'bg-indigo-600 text-white shadow'
                                    : 'text-slate-500 cursor-not-allowed'
                            }`}
                        >
                            2. College Format Output
                        </button>
                    </div>
                </div>

                {/* ── 1-CLICK FLOOD BANNER (ALWAYS PROMINENT AT TOP) ── */}
                <div className="mx-5 mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-primary/20 to-indigo-600/20 border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-black/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                            <Zap className="h-6 w-6 fill-amber-400 text-amber-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-extrabold text-white text-sm">One-Click Mock Allotment</span>
                                <Badge className="bg-amber-500 text-slate-950 font-extrabold text-[10px] px-1.5 py-0">INSTANT</Badge>
                            </div>
                            <p className="text-xs text-slate-300 mt-0.5">
                                Populate 200 students, 18 classrooms, invigilators &amp; schedule and open the live desk seating visualizer immediately!
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={handleDirectFloodAndGenerate}
                        disabled={isFlooding}
                        className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-extrabold text-xs px-6 h-10 shadow-md shrink-0"
                    >
                        {isFlooding ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Zap className="w-4 h-4 mr-1.5 fill-current" />}
                        Flood &amp; Generate Allotment
                    </Button>
                </div>

                {/* ── STEP 1: DUTY LIST & SCHEDULE ── */}
                {wizardStep === 1 && (
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        
                        {/* Quick Presets & Controls Banner */}
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    size="sm"
                                    onClick={handleLoadBhimtalMay2026}
                                    className="bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-sm h-8"
                                >
                                    <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-200" />
                                    1-Click May 2026 Plan (Bhimtal Document)
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowPasteBox(!showPasteBox)}
                                    className="border-slate-700 hover:bg-slate-800 text-xs h-8 text-slate-300"
                                >
                                    <ClipboardPaste className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                                    {showPasteBox ? 'Close Paste' : 'Paste Custom List'}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={onClearData}
                                    className="text-slate-400 hover:text-red-400 text-xs h-8"
                                >
                                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                    Reset
                                </Button>
                            </div>

                            {/* Plan Stat Pills */}
                            <div className="flex items-center gap-3 text-xs text-slate-300">
                                <span className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                                    <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
                                    <b>{planMetrics.daysCount}</b> Days
                                </span>
                                <span className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                                    <b>{planMetrics.shiftsCount}</b> Shifts
                                </span>
                                <span className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                                    <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                                    Up to <b>{planMetrics.maxRooms}</b> Rooms/Shift
                                </span>
                                <span className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                                    <Users className="w-3.5 h-3.5 text-purple-400" />
                                    Up to <b>{planMetrics.maxInvig}</b> Invigilators
                                </span>
                            </div>
                        </div>

                        {/* Paste Drawer */}
                        {showPasteBox && (
                            <div className="bg-slate-900 border border-indigo-900/50 p-4 rounded-xl space-y-2.5 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-indigo-300">
                                        Paste Format: YYYY-MM-DD, Shift, Rooms Required, Invigilators Required
                                    </span>
                                    <span className="text-slate-400">e.g. 2026-05-14, Shift I, 17, 49</span>
                                </div>
                                <textarea
                                    rows={4}
                                    value={pasteText}
                                    onChange={(e) => setPasteText(e.target.value)}
                                    placeholder="2026-05-14, Shift I, 17, 49&#10;2026-05-14, Shift II, 17, 44&#10;2026-05-15, Shift I, 17, 49"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                />
                                <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => setShowPasteBox(false)} className="text-xs h-7">
                                        Cancel
                                    </Button>
                                    <Button size="sm" onClick={handleApplyPasteText} className="bg-indigo-600 hover:bg-indigo-500 text-xs h-7">
                                        Apply Values
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Search & Header Row */}
                        <div className="flex items-center justify-between gap-3 pt-1">
                            <div className="relative w-72">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Filter by date, shift, or back paper..."
                                    className="pl-8 h-8 text-xs bg-slate-900 border-slate-800 text-slate-200"
                                />
                            </div>
                            <div className="text-xs text-slate-400">
                                Showing <b>{filteredRows.length}</b> examination shifts
                            </div>
                        </div>

                        {/* Duty Required Table */}
                        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60 max-h-[340px] overflow-y-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-950 text-slate-400 font-semibold sticky top-0 border-b border-slate-800 z-10">
                                    <tr>
                                        <th className="py-2.5 px-3">Date of Examination</th>
                                        <th className="py-2.5 px-3">Shift &amp; Timing</th>
                                        <th className="py-2.5 px-3 text-center">No. of Rooms Req.</th>
                                        <th className="py-2.5 px-3 text-center">Total Invigilators Req.</th>
                                        <th className="py-2.5 px-3">Breakdown (Active + Relief + Reserve)</th>
                                        <th className="py-2.5 px-3">Back Paper / Note</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 font-medium">
                                    {filteredRows.map((row, idx) => (
                                        <tr key={`${row.date}-${row.shiftName}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                                            <td className="py-2.5 px-3 text-slate-200">
                                                <div className="font-semibold">{row.dayName}</div>
                                                <div className="text-[11px] text-slate-400">{row.date}</div>
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] px-2 py-0.5 border ${
                                                        row.shiftName === 'Shift I'
                                                            ? 'border-amber-500/40 text-amber-300 bg-amber-500/10'
                                                            : row.shiftName === 'Shift II'
                                                            ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                                                            : 'border-sky-500/40 text-sky-300 bg-sky-500/10'
                                                    }`}
                                                >
                                                    {row.shiftName}: {row.timeRange}
                                                </Badge>
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                                <Input
                                                    type="number"
                                                    value={row.roomsRequired}
                                                    onChange={(e) => handleUpdateShift(row.dayIndex, row.shiftIndex, 'roomsRequired', parseInt(e.target.value) || 0)}
                                                    className="w-16 h-7 text-center mx-auto text-xs bg-slate-950 border-slate-700 text-slate-100 font-bold"
                                                />
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                                <Input
                                                    type="number"
                                                    value={row.totalInvigilators}
                                                    onChange={(e) => handleUpdateShift(row.dayIndex, row.shiftIndex, 'totalInvigilators', parseInt(e.target.value) || 0)}
                                                    className="w-16 h-7 text-center mx-auto text-xs bg-slate-950 border-slate-700 text-amber-300 font-bold"
                                                />
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-300">
                                                {row.activeInvigilators > 0 ? (
                                                    <span className="text-[11px] font-mono bg-slate-950/80 px-2 py-1 rounded border border-slate-800 text-slate-300">
                                                        {row.activeInvigilators} active + {row.reliefInvigilators} relief + {row.reservedInvigilators} reserve
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500 text-[11px]">-</span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3 text-[11px]">
                                                {row.backPaperNote ? (
                                                    <span className="text-amber-400 font-mono bg-amber-950/30 px-2 py-0.5 rounded border border-amber-800/40">
                                                        {row.backPaperNote}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── STEP 2: COLLEGE FORMAT OUTPUT ── */}
                {wizardStep === 2 && (
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        
                        {/* Success Callout */}
                        <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-4 flex items-center gap-3">
                            <div className="p-2 rounded-full bg-emerald-500/20 text-emerald-400">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white">College Allotment Successfully Generated!</h4>
                                <p className="text-xs text-emerald-300/90 mt-0.5">
                                    The exam schedule has been matched with the required room counts and invigilator duties across all sessions.
                                </p>
                            </div>
                        </div>

                        {/* KPI Highlights */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                                <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                                    <Clock className="w-3.5 h-3.5 text-sky-400" /> Total Sessions
                                </div>
                                <div className="text-2xl font-bold text-white">{mappingStats?.totalSessions || 0}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">Examination Shifts</div>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                                <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                                    <Building2 className="w-3.5 h-3.5 text-emerald-400" /> Room Allocations
                                </div>
                                <div className="text-2xl font-bold text-emerald-400">{mappingStats?.totalRooms || 0}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">Across Blocks C, D &amp; E</div>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                                <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                                    <Users className="w-3.5 h-3.5 text-purple-400" /> Duties Assigned
                                </div>
                                <div className="text-2xl font-bold text-purple-400">{mappingStats?.totalDuties || 0}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">Active Faculty Duties</div>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
                                <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Reserved Staff
                                </div>
                                <div className="text-2xl font-bold text-amber-400">Ready</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">Standby per Session</div>
                            </div>
                        </div>

                        {/* College Format Download Cards */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-slate-200">
                                Download Required College Format Reports:
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                
                                {/* 1. Official Invigilator Duty Chart */}
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-amber-500/50 transition-colors">
                                    <div>
                                        <div className="p-2 w-fit rounded-lg bg-amber-500/10 text-amber-400 mb-3">
                                            <FileSpreadsheet className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-bold text-sm text-white">Official Duty Chart (Excel)</h4>
                                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                                            Official GEHU Bhimtal matrix with "No of Duty Required", colored shift headers, faculty codes &amp; Superintendent signature block.
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleDownloadOfficialDutyChart}
                                        className="mt-4 w-full bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs h-9"
                                    >
                                        <Download className="w-3.5 h-3.5 mr-1.5" />
                                        Download Official Chart
                                    </Button>
                                </div>

                                {/* 2. Shift-Wise Duty Roster */}
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-sky-500/50 transition-colors">
                                    <div>
                                        <div className="p-2 w-fit rounded-lg bg-sky-500/10 text-sky-400 mb-3">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-bold text-sm text-white">Shift-Wise Duty Roster</h4>
                                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                                            Shift-by-shift room rosters with classroom details, answer script issued/returned columns, and standby staff.
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleDownloadSessionRosters}
                                        className="mt-4 w-full bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs h-9"
                                    >
                                        <Download className="w-3.5 h-3.5 mr-1.5" />
                                        Download Shift Rosters
                                    </Button>
                                </div>

                                {/* 3. Master Seating Report */}
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-500/50 transition-colors">
                                    <div>
                                        <div className="p-2 w-fit rounded-lg bg-emerald-500/10 text-emerald-400 mb-3">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-bold text-sm text-white">Master Seating Plan</h4>
                                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                                            Full university seating report with room capacities, student numbers, scheduled subjects, and signature blanks.
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleDownloadMasterReport}
                                        className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-9"
                                    >
                                        <Download className="w-3.5 h-3.5 mr-1.5" />
                                        Download Master Report
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── FOOTER ACTIONS ── */}
                <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
                    <div>
                        {wizardStep === 2 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setWizardStep(1)}
                                className="text-slate-400 hover:text-white text-xs"
                            >
                                ← Back to Duty Plan
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                            className="border-slate-800 hover:bg-slate-900 text-slate-300 text-xs"
                        >
                            Close
                        </Button>

                        {wizardStep === 1 ? (
                            <Button
                                size="sm"
                                onClick={handleMapAndGenerateAllotment}
                                className="bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-semibold text-xs px-5 shadow-lg shadow-indigo-900/30"
                            >
                                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                                Map Schedule &amp; Generate Allotment
                                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                onClick={handleProceedToAllotment}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5"
                            >
                                <Building2 className="w-3.5 h-3.5 mr-1.5" />
                                Open Allotment Workspace
                                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                            </Button>
                        )}
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
}
