'use client';

import React, { useState, useContext, useMemo } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataContext } from '@/context/DataContext';
import { generateManualFacultyAllotment, DEFAULT_FACULTY_DUTY_LIMITS } from '@/lib/planning';
import { InvigilatorAssignment, Invigilator, Classroom } from '@/lib/types';
import { BHIMTAL_MAY_2026_DUTY_PLAN } from '@/lib/bhimtalDutyPlanMay2026';
import { useToast } from '@/hooks/use-toast';
import {
  CalendarDays,
  CalendarCheck2,
  Plus,
  Trash2,
  Copy,
  RotateCcw,
  Sparkles,
  Package,
  FileDown,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  Building,
  Users,
  Play,
  Clock,
  Layers,
  FileSpreadsheet,
  Download,
  SlidersHorizontal,
  ShieldCheck,
  Settings2,
} from 'lucide-react';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface ShiftItem {
  id: string;
  name: string; // "Shift I", "Shift II", "Mid", "Shift III", "Shift IV"
  shiftIndex: number; // 0, 1, 2, 3
  time: string; // "09:30" or "13:30"
  timeRange: string; // "09:30AM-12:30PM"
  rooms: number;
  activeStaff: number;
  reservedStaff: number;
  note?: string;
}

export interface DayItem {
  id: string;
  date: string; // "2026-05-14"
  dayName: string; // "Thursday"
  shifts: ShiftItem[];
}

const DEFAULT_DAYS: DayItem[] = [
  {
    id: 'day-1',
    date: '2026-05-14',
    dayName: 'Thursday',
    shifts: [
      { id: 's-1-1', name: 'Shift I', shiftIndex: 0, time: '09:30', timeRange: '09:30AM-12:30PM', rooms: 17, activeStaff: 42, reservedStaff: 3, note: 'Regular' },
      { id: 's-1-2', name: 'Shift II', shiftIndex: 1, time: '13:30', timeRange: '01:30PM-04:30PM', rooms: 17, activeStaff: 40, reservedStaff: 3, note: 'Regular' },
    ],
  },
  {
    id: 'day-2',
    date: '2026-05-15',
    dayName: 'Friday',
    shifts: [
      { id: 's-2-1', name: 'Shift I', shiftIndex: 0, time: '09:30', timeRange: '09:30AM-12:30PM', rooms: 17, activeStaff: 42, reservedStaff: 3, note: 'Regular' },
      { id: 's-2-2', name: 'Shift II', shiftIndex: 1, time: '13:30', timeRange: '01:30PM-04:30PM', rooms: 17, activeStaff: 42, reservedStaff: 3, note: 'Regular' },
    ],
  },
  {
    id: 'day-3',
    date: '2026-05-16',
    dayName: 'Saturday',
    shifts: [
      { id: 's-3-1', name: 'Shift I', shiftIndex: 0, time: '09:30', timeRange: '09:30AM-12:30PM', rooms: 17, activeStaff: 42, reservedStaff: 3, note: 'Regular' },
      { id: 's-3-2', name: 'Shift II', shiftIndex: 1, time: '13:30', timeRange: '01:30PM-04:30PM', rooms: 17, activeStaff: 42, reservedStaff: 3, note: 'Regular' },
    ],
  },
];

const SHIFT_OPTIONS = [
  { name: 'Shift I', shiftIndex: 0, time: '09:30', timeRange: '09:30AM-12:30PM' },
  { name: 'Shift II', shiftIndex: 1, time: '13:30', timeRange: '01:30PM-04:30PM' },
  { name: 'Mid', shiftIndex: 0, time: '09:30', timeRange: '09:30AM-11:00AM' },
  { name: 'Shift III', shiftIndex: 2, time: '13:30', timeRange: '01:30PM-03:00PM' },
  { name: 'Shift IV', shiftIndex: 3, time: '15:30', timeRange: '03:30PM-05:00PM' },
];

export default function ManualAllotmentPage() {
  const { invigilators, classrooms, examSchedule: schedule } = useContext(DataContext);
  const { toast } = useToast();

  const [days, setDays] = useState<DayItem[]>(DEFAULT_DAYS);
  const [activeTab, setActiveTab] = useState<'visual' | 'paste'>('visual');
  const [rawText, setRawText] = useState(`| Date | Shift | Rooms | Active | Reserved |
| :--- | :--- | :--- | :--- | :--- |
| 14 May | Shift I | 17 | 42 | 3 |
| 14 May | Shift II | 17 | 40 | 3 |
| 15 May | Shift I | 17 | 42 | 3 |
| 15 May | Shift II | 17 | 42 | 3 |
| 16 May | Shift I | 17 | 42 | 3 |
| 16 May | Shift II | 17 | 42 | 3 |`);

  // Designation Duty Limits (Max duties cap per designation)
  const [dutyLimits, setDutyLimits] = useState<Record<string, number>>({
    ...DEFAULT_FACULTY_DUTY_LIMITS,
  });
  const [showLimitSettings, setShowLimitSettings] = useState(false);

  const [results, setResults] = useState<InvigilatorAssignment[] | null>(null);
  const [processLog, setProcessLog] = useState<{ msg: string; type: 'info' | 'success' | 'error' | 'warning' }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Search and filter for result preview
  const [searchFaculty, setSearchFaculty] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Computed summary metrics
  const totalDaysCount = days.length;
  const totalShiftsCount = days.reduce((acc, d) => acc + d.shifts.length, 0);
  const totalActiveStaffNeeded = days.reduce(
    (acc, d) => acc + d.shifts.reduce((sAcc, s) => sAcc + Number(s.activeStaff || 0), 0),
    0
  );
  const totalReservedStaffNeeded = days.reduce(
    (acc, d) => acc + d.shifts.reduce((sAcc, s) => sAcc + Number(s.reservedStaff || 0), 0),
    0
  );
  const totalDutySlots = totalActiveStaffNeeded + totalReservedStaffNeeded;
  const availableFacultyCount = invigilators.length || 79;
  const avgDutyLoad = availableFacultyCount > 0 ? (totalDutySlots / availableFacultyCount).toFixed(1) : '0';

  const isNonDefaultLimits = useMemo(() => {
    return Object.entries(DEFAULT_FACULTY_DUTY_LIMITS).some(
      ([key, val]) => (dutyLimits[key] ?? val) !== val
    );
  }, [dutyLimits]);

  const handleUpdateDutyLimit = (designation: string, value: number) => {
    setDutyLimits(prev => ({
      ...prev,
      [designation]: Math.max(0, Math.min(50, value)),
    }));
  };

  const handleResetDutyLimits = () => {
    setDutyLimits({ ...DEFAULT_FACULTY_DUTY_LIMITS });
    toast({ title: 'Limits Reset', description: 'Restored standard university designation duty limits.' });
  };

  const handleApplyPresetLimits = (preset: 'standard' | 'lightSenior' | 'juniorFocus' | 'equal') => {
    if (preset === 'standard') {
      setDutyLimits({ ...DEFAULT_FACULTY_DUTY_LIMITS });
      toast({ description: 'Applied Standard University Limits' });
    } else if (preset === 'lightSenior') {
      setDutyLimits({
        ...DEFAULT_FACULTY_DUTY_LIMITS,
        'Professor': 2,
        'Associate Professor': 6,
        'Assistant Professor': 12,
        'Lecturer': 20,
        'Nursing Tutor': 20,
        'Teaching Associate': 20,
        'Teaching Assistant': 20,
        'Lab Assistant': 20,
      });
      toast({ description: 'Applied Light Senior Load Limits' });
    } else if (preset === 'juniorFocus') {
      setDutyLimits({
        ...DEFAULT_FACULTY_DUTY_LIMITS,
        'Professor': 0,
        'Associate Professor': 4,
        'Assistant Professor': 10,
        'Lecturer': 22,
        'Nursing Tutor': 22,
        'Teaching Associate': 22,
        'Teaching Assistant': 22,
        'Lab Assistant': 22,
      });
      toast({ description: 'Applied Strict Junior Priority Limits' });
    } else if (preset === 'equal') {
      setDutyLimits({
        'Professor': 12,
        'Associate Professor': 12,
        'Assistant Professor': 12,
        'Lecturer': 12,
        'Nursing Tutor': 12,
        'Teaching Associate': 12,
        'Teaching Assistant': 12,
        'Lab Assistant': 12,
        'Tutor': 12,
      });
      toast({ description: 'Applied Equalized Limits (12 each)' });
    }
  };

  // Computed Designation Duty Caps and Allotment Compliance Stats
  const designationStats = useMemo(() => {
    if (!results || results.length === 0) return [];

    const dutyCounts = new Map<string, number>();
    results.forEach(a => {
      const invId = a.invigilator?.id;
      if (invId) {
        dutyCounts.set(invId, (dutyCounts.get(invId) || 0) + 1);
      }
    });

    const designations = [
      { key: 'Professor', label: 'Professor', short: 'Prof' },
      { key: 'Associate Professor', label: 'Associate Professor', short: 'AsP' },
      { key: 'Assistant Professor', label: 'Assistant Professor', short: 'AP' },
      { key: 'Lecturer', label: 'Lecturer', short: 'Lec' },
      { key: 'Nursing Tutor', label: 'Nursing Tutor', short: 'NT' },
      { key: 'Teaching Associate', label: 'Teaching Associate', short: 'TA' },
      { key: 'Lab Assistant', label: 'Lab Assistant', short: 'LA' },
    ];

    return designations.map(d => {
      const facultyInDesig = invigilators.filter(inv => {
        if (d.key === 'Teaching Associate') {
          return inv.designation === 'Teaching Associate' || inv.designation === 'Teaching Assistant' || inv.designation === 'Tutor';
        }
        return inv.designation === d.key;
      });

      const cap = dutyLimits[d.key] ?? 15;
      let maxDutiesAssigned = 0;
      let totalDutiesAssigned = 0;
      let countWithDuties = 0;

      facultyInDesig.forEach(f => {
        const count = dutyCounts.get(f.id) || 0;
        if (count > maxDutiesAssigned) maxDutiesAssigned = count;
        totalDutiesAssigned += count;
        if (count > 0) countWithDuties++;
      });

      const avgDuties = facultyInDesig.length > 0 ? (totalDutiesAssigned / facultyInDesig.length).toFixed(1) : '0';
      const isCompliant = maxDutiesAssigned <= cap;

      return {
        ...d,
        cap,
        totalFaculty: facultyInDesig.length,
        activeFaculty: countWithDuties,
        totalDuties: totalDutiesAssigned,
        maxDuties: maxDutiesAssigned,
        avgDuties,
        isCompliant,
      };
    });
  }, [results, invigilators, dutyLimits]);

  // --- PRESET ACTIONS ---
  const handleLoadOfficialPlan = () => {
    const converted: DayItem[] = BHIMTAL_MAY_2026_DUTY_PLAN.map((planDay, dIdx) => ({
      id: `official-${planDay.date}-${dIdx}`,
      date: planDay.date,
      dayName: planDay.dayName,
      shifts: planDay.shifts.map((s, sIdx) => ({
        id: `s-${planDay.date}-${sIdx}`,
        name: s.shiftName,
        shiftIndex: s.shiftIndex,
        time: s.time,
        timeRange: s.timeRange,
        rooms: s.roomsRequired || 17,
        activeStaff: s.activeInvigilators,
        reservedStaff: s.reservedInvigilators,
        note: s.backPaperNote,
      })),
    }));

    setDays(converted);
    toast({
      title: 'Official Schedule Loaded',
      description: `Loaded ${converted.length} exam days (${converted.reduce((acc, d) => acc + d.shifts.length, 0)} shifts) from the GEHU Bhimtal plan.`,
    });
  };

  const handleResetDays = () => {
    setDays(DEFAULT_DAYS);
    setResults(null);
    setProcessLog([]);
    toast({ title: 'Schedule Reset', description: 'Reset to default 3-day exam schedule.' });
  };

  const handleAddDay = () => {
    const lastDay = days[days.length - 1];
    let nextDateStr = '2026-05-17';
    let nextDayName = 'Sunday';

    if (lastDay && lastDay.date) {
      const d = new Date(lastDay.date);
      d.setDate(d.getDate() + 1);
      nextDateStr = d.toISOString().split('T')[0];
      nextDayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    }

    const newDay: DayItem = {
      id: `day-${Date.now()}`,
      date: nextDateStr,
      dayName: nextDayName,
      shifts: [
        { id: `s-${Date.now()}-1`, name: 'Shift I', shiftIndex: 0, time: '09:30', timeRange: '09:30AM-12:30PM', rooms: 17, activeStaff: 42, reservedStaff: 3 },
        { id: `s-${Date.now()}-2`, name: 'Shift II', shiftIndex: 1, time: '13:30', timeRange: '01:30PM-04:30PM', rooms: 17, activeStaff: 40, reservedStaff: 3 },
      ],
    };

    setDays([...days, newDay]);
  };

  const handleDeleteDay = (dayId: string) => {
    if (days.length <= 1) {
      toast({ variant: 'destructive', title: 'Action Denied', description: 'At least one day must be configured.' });
      return;
    }
    setDays(days.filter(d => d.id !== dayId));
  };

  const handleDuplicateDay = (dayId: string) => {
    const target = days.find(d => d.id === dayId);
    if (!target) return;
    const d = new Date(target.date);
    d.setDate(d.getDate() + 1);
    const duplicated: DayItem = {
      id: `day-${Date.now()}`,
      date: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('en-US', { weekday: 'long' }),
      shifts: target.shifts.map((s, idx) => ({
        ...s,
        id: `s-${Date.now()}-${idx}`,
      })),
    };
    setDays([...days, duplicated]);
  };

  const handleAddShiftToDay = (dayId: string) => {
    setDays(days.map(d => {
      if (d.id !== dayId) return d;
      const count = d.shifts.length;
      const template = SHIFT_OPTIONS[Math.min(count, SHIFT_OPTIONS.length - 1)];
      const newShift: ShiftItem = {
        id: `s-${Date.now()}`,
        name: template.name,
        shiftIndex: template.shiftIndex,
        time: template.time,
        timeRange: template.timeRange,
        rooms: 17,
        activeStaff: 40,
        reservedStaff: 3,
      };
      return { ...d, shifts: [...d.shifts, newShift] };
    }));
  };

  const handleDeleteShift = (dayId: string, shiftId: string) => {
    setDays(days.map(d => {
      if (d.id !== dayId) return d;
      if (d.shifts.length <= 1) {
        toast({ variant: 'destructive', title: 'Action Denied', description: 'Each day requires at least one shift.' });
        return d;
      }
      return { ...d, shifts: d.shifts.filter(s => s.id !== shiftId) };
    }));
  };

  const handleUpdateShift = (dayId: string, shiftId: string, patch: Partial<ShiftItem>) => {
    setDays(days.map(d => {
      if (d.id !== dayId) return d;
      return {
        ...d,
        shifts: d.shifts.map(s => {
          if (s.id !== shiftId) return s;
          return { ...s, ...patch };
        }),
      };
    }));
  };

  // Convert visual days into raw markdown text
  const syncVisualToRaw = () => {
    const lines = [
      '| Date | Shift | Rooms | Active | Reserved |',
      '| :--- | :--- | :--- | :--- | :--- |',
    ];
    days.forEach(d => {
      const dateDisplay = new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      d.shifts.forEach(s => {
        lines.push(`| ${dateDisplay} | ${s.name} | ${s.rooms} | ${s.activeStaff} | ${s.reservedStaff} |`);
      });
    });
    setRawText(lines.join('\n'));
  };

  // Parse raw text into visual days
  const syncRawToVisual = () => {
    try {
      const lines = rawText.split('\n').filter(l => l.includes('|') && !l.includes('---') && !l.toLowerCase().includes('date'));
      if (lines.length === 0) {
        toast({ variant: 'destructive', title: 'Parsing Error', description: 'No valid table rows found.' });
        return;
      }

      const dayMap = new Map<string, ShiftItem[]>();

      lines.forEach((line, idx) => {
        const parts = line.split('|').map(p => p.trim()).filter(Boolean);
        if (parts.length < 4) return;
        const [dateStr, shiftLabel, roomsStr, activeStr, reservedStr] = parts;
        const roomCount = roomsStr ? parseInt(roomsStr.replace(/\D/g, '')) || 17 : 17;
        const activeCount = activeStr ? parseInt(activeStr.replace(/\D/g, '')) || 40 : 40;
        const reservedCount = reservedStr ? parseInt(reservedStr.replace(/\D/g, '')) || 3 : 3;

        const dayMatch = dateStr.match(/\d+/);
        const dayNum = dayMatch ? parseInt(dayMatch[0]) : 14;
        const fullDate = `2026-05-${dayNum.toString().padStart(2, '0')}`;

        const getSIndex = (s: string) => {
          const lower = s.toLowerCase();
          if (lower.includes('mid')) return 0;
          if (lower.includes('iv')) return 3;
          if (lower.includes('iii')) return 2;
          if (lower.includes('ii')) return 1;
          return 0;
        };

        const shiftItem: ShiftItem = {
          id: `s-parsed-${idx}`,
          name: shiftLabel,
          shiftIndex: getSIndex(shiftLabel),
          time: getSIndex(shiftLabel) === 1 ? '13:30' : '09:30',
          timeRange: getSIndex(shiftLabel) === 1 ? '01:30PM-04:30PM' : '09:30AM-12:30PM',
          rooms: roomCount,
          activeStaff: activeCount,
          reservedStaff: reservedCount,
        };

        if (!dayMap.has(fullDate)) dayMap.set(fullDate, []);
        dayMap.get(fullDate)!.push(shiftItem);
      });

      const parsedDays: DayItem[] = Array.from(dayMap.entries()).map(([date, shifts], dIdx) => {
        const dObj = new Date(date);
        return {
          id: `day-parsed-${dIdx}`,
          date,
          dayName: dObj.toLocaleDateString('en-US', { weekday: 'long' }),
          shifts,
        };
      });

      setDays(parsedDays);
      setActiveTab('visual');
      toast({ title: 'Parsed Successfully', description: `Loaded ${parsedDays.length} days from text table.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Parse Failed', description: err.message });
    }
  };

  // --- ALLOTMENT EXECUTION ENGINE ---
  const handleProcess = async () => {
    if (!invigilators.length) {
      toast({
        title: 'Faculty Pool Missing',
        description: 'Please ensure invigilators are loaded in the system.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setResults(null);
    setProcessLog([
      {
        msg: `Initializing Graphic Era Hill University Duty Allotment Engine with Designation Caps (Prof: ≤${dutyLimits['Professor']}, AsP: ≤${dutyLimits['Associate Professor']}, AP: ≤${dutyLimits['Assistant Professor']}, Lec/NT/TA: ≤${dutyLimits['Lecturer']})...`,
        type: 'info',
      },
    ]);

    try {
      let currentFacultyPool: Invigilator[] = JSON.parse(JSON.stringify(invigilators));
      const allAssignments: InvigilatorAssignment[] = [];

      // Flatten days & shifts into chronological queue
      const sessionsToProcess: {
        dateStr: string;
        fullDate: string;
        shift: ShiftItem;
        dayName: string;
      }[] = [];

      days.forEach(d => {
        d.shifts.forEach(s => {
          sessionsToProcess.push({
            dateStr: new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
            fullDate: d.date,
            shift: s,
            dayName: d.dayName,
          });
        });
      });

      // Chronological sort: by date, then shiftIndex
      sessionsToProcess.sort((a, b) => {
        if (a.fullDate !== b.fullDate) return a.fullDate.localeCompare(b.fullDate);
        return a.shift.shiftIndex - b.shift.shiftIndex;
      });

      for (const session of sessionsToProcess) {
        const { dateStr, fullDate, shift, dayName } = session;
        const totalTarget = Number(shift.activeStaff) + Number(shift.reservedStaff);
        const isMid = shift.name.toLowerCase().includes('mid');

        setProcessLog(prev => [
          ...prev,
          { msg: `Allotting ${dateStr} (${shift.name}): Target ${totalTarget} staff (${shift.activeStaff} Active, ${shift.reservedStaff} Standby)...`, type: 'info' },
        ]);

        const baseExam = schedule.find(
          e => e.date === fullDate && (shift.shiftIndex === 0 ? e.time.startsWith('09') : e.time.startsWith('13'))
        );

        const examObj = baseExam
          ? { ...baseExam, id: `${baseExam.id}-${isMid ? 'Mid' : 'Reg'}`, manualShiftIndex: shift.shiftIndex }
          : ({
              id: `MAN-${fullDate}-${shift.name.replace(/\s+/g, '-')}-${isMid ? 'Mid' : 'Reg'}`,
              date: fullDate,
              time: shift.time || (shift.shiftIndex === 0 ? '09:30' : '13:30'),
              manualShiftIndex: shift.shiftIndex,
            } as any);

        const result = generateManualFacultyAllotment(
          currentFacultyPool,
          classrooms,
          examObj,
          shift.rooms,
          Number(shift.activeStaff),
          Number(shift.reservedStaff),
          ['D Block', 'Pharmacy Block', 'C Block', 'Nursing Block', 'B Block', 'E Block'],
          dutyLimits
        );

        if (result.assignments.length < totalTarget) {
          setProcessLog(prev => [
            ...prev,
            {
              msg: `⚠️ Notice: Allotted ${result.assignments.length}/${totalTarget} for ${dateStr} ${shift.name} (Faculty pool limit reached).`,
              type: 'warning',
            },
          ]);
        } else {
          setProcessLog(prev => [
            ...prev,
            { msg: `✅ Complete: Assigned ${result.assignments.length} duties for ${dateStr} ${shift.name}.`, type: 'success' },
          ]);
        }

        allAssignments.push(...result.assignments);
        currentFacultyPool = result.updatedInvigilators;
      }

      setResults(allAssignments);
      setProcessLog(prev => [
        ...prev,
        { msg: `Allotment Engine Finished! Total Assigned Duties: ${allAssignments.length}`, type: 'success' },
      ]);

      toast({
        title: 'Duty Allotment Successful!',
        description: `Successfully allocated ${allAssignments.length} duties across ${sessionsToProcess.length} examination shifts.`,
      });
    } catch (err: any) {
      console.error(err);
      setProcessLog(prev => [...prev, { msg: `Engine Error: ${err.message}`, type: 'error' }]);
      toast({ variant: 'destructive', title: 'Allotment Error', description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // --- OFFICIAL UNIVERSITY DUTY CHART EXCEL GENERATOR ---
  const generateDetailedExcel = async (resultsToExport: InvigilatorAssignment[]) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Duty Chart');

    const uniqueDates = Array.from(new Set(resultsToExport.map(asg => asg.exam.date))).sort();

    // Check if sessions include 4-shift model or 2-shift model
    const maxShiftIdx = Math.max(...resultsToExport.map(a => (a.exam as any).manualShiftIndex ?? 0), 1);

    const shiftTimings = maxShiftIdx >= 2 ? [
      { id: 'I', label: 'Shift I: 09:30AM-11:00AM', color: 'FFFF00' },
      { id: 'II', label: 'Shift II: 11:30AM-01:00PM', color: '92D050' },
      { id: 'III', label: 'Shift III: 01:30PM-03:00PM', color: '00B0F0' },
      { id: 'IV', label: 'Shift IV: 03:30PM-05:00PM', color: 'FFC000' },
    ] : [
      { id: 'I', label: 'Shift I: 09:30AM-12:30PM', color: 'FFFF00' },
      { id: 'II', label: 'Shift II: 01:30PM-04:30PM', color: '92D050' },
    ];

    const numShifts = shiftTimings.length;
    const dateColStart = 5;
    const totalCols = dateColStart + (uniqueDates.length * numShifts);

    const setBorder = (cell: any) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    };

    // Header Rows 1-3
    worksheet.mergeCells(1, 1, 1, totalCols);
    worksheet.getCell(1, 1).value = 'Graphic Era Hill University, Dehradun';
    worksheet.getCell(1, 1).font = { name: 'Arial', bold: true, size: 16 };
    worksheet.getCell(1, 1).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(2, 1, 2, totalCols);
    worksheet.getCell(2, 1).value = 'Examination Center:- Graphic Era Hill University, Bhimtal Campus';
    worksheet.getCell(2, 1).font = { name: 'Arial', bold: true, size: 14 };
    worksheet.getCell(2, 1).alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells(3, 1, 3, totalCols);
    worksheet.getCell(3, 1).value = 'End Term Examination (Even Semester) May 2026';
    worksheet.getCell(3, 1).font = { name: 'Arial', bold: true, size: 14 };
    worksheet.getCell(3, 1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 4: No of Duty Required
    worksheet.mergeCells(4, 1, 4, 4);
    worksheet.getCell(4, 1).value = 'No of Duty Required';
    worksheet.getCell(4, 1).font = { bold: true };
    [1, 2, 3, 4].forEach(c => setBorder(worksheet.getCell(4, c)));

    // Shift Totals Calculation
    uniqueDates.forEach((date, dateIdx) => {
      const startCol = dateColStart + (dateIdx * numShifts);
      shiftTimings.forEach((shift, sIdx) => {
        const count = resultsToExport.filter(a => {
          if (a.isReserved) return false;
          if (a.exam.date !== date) return false;
          return ((a.exam as any).manualShiftIndex ?? 0) === sIdx;
        }).length;

        const cell = worksheet.getCell(4, startCol + sIdx);
        cell.value = count > 0 ? count : '';
        cell.alignment = { horizontal: 'center' };
        cell.font = { bold: true };
        setBorder(cell);
      });
    });

    // Rows 5 to 5 + (numShifts - 1): Shift Timing Legend
    shiftTimings.forEach((shift, sIdx) => {
      const rowNum = 5 + sIdx;
      worksheet.mergeCells(rowNum, 1, rowNum, 4);
      const cell = worksheet.getCell(rowNum, 1);
      cell.value = shift.label;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: shift.color } };
      cell.font = { bold: true };
      setBorder(cell);
    });

    // Rows 9-10: Table Column Headers
    worksheet.getCell(9, 1).value = 'Sr. No.';
    worksheet.getCell(9, 2).value = 'Name of Invigilator';
    worksheet.getCell(9, 3).value = 'Designation';
    worksheet.getCell(9, 4).value = 'Deptt.';
    worksheet.mergeCells(9, 1, 10, 1);
    worksheet.mergeCells(9, 2, 10, 2);
    worksheet.mergeCells(9, 3, 10, 3);
    worksheet.mergeCells(9, 4, 10, 4);
    [1, 2, 3, 4].forEach(c => {
      setBorder(worksheet.getCell(9, c));
      setBorder(worksheet.getCell(10, c));
      worksheet.getCell(9, c).font = { bold: true };
      worksheet.getCell(9, c).alignment = { horizontal: 'center', vertical: 'middle' };
    });

    uniqueDates.forEach((date, dateIdx) => {
      const startCol = dateColStart + (dateIdx * numShifts);
      if (numShifts > 1) {
        worksheet.mergeCells(9, startCol, 9, startCol + numShifts - 1);
      }
      const dateCell = worksheet.getCell(9, startCol);
      dateCell.value = new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
      dateCell.font = { bold: true };
      setBorder(dateCell);

      shiftTimings.forEach((shift, sIdx) => {
        const sCell = worksheet.getCell(10, startCol + sIdx);
        sCell.value = shift.id;
        sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: shift.color } };
        sCell.alignment = { horizontal: 'center', vertical: 'middle' };
        sCell.font = { bold: true };
        setBorder(sCell);
      });
    });

    const totalDutyCol = totalCols + 1;
    worksheet.mergeCells(9, totalDutyCol, 10, totalDutyCol);
    const totalCell = worksheet.getCell(9, totalDutyCol);
    totalCell.value = 'Total Duty';
    totalCell.font = { bold: true };
    totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
    setBorder(totalCell);
    setBorder(worksheet.getCell(10, totalDutyCol));

    // Faculty Rows (Row 11 onwards)
    const facultyIds = Array.from(new Set(resultsToExport.map(asg => asg.invigilator.id)));
    const sortedFaculty = invigilators
      .filter(f => facultyIds.includes(f.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    const designationMap: Record<string, string> = {
      'Assistant Professor': 'AP',
      'Associate Professor': 'AsP',
      'Lecturer': 'Lec',
      'Nursing Tutor': 'NT',
      'Teaching Associate': 'TA',
      'Teaching Assistant': 'TA',
      'Professor': 'Prof',
      'Lab Assistant': 'LA',
    };

    const deptMap: Record<string, string> = {
      'Computer Science & Engineering': 'COM',
      'Computer Science and Engineering': 'COM',
      'School of Computing': 'SCH',
      'Mechanical Engineering': 'MEC',
      'Civil Engineering': 'CIV',
      'Electronics &  Communication': 'ELE',
      'Electronics and Communication Engineering': 'ELE',
      'Computer Applications': 'SCH',
      'School of Management': 'SCH',
      'Management': 'SCH',
      'Commerce': 'SCH',
      'College of Nursing': 'COL',
      'College  of Pharmacy': 'COL',
      'College of Pharmacy': 'COL',
      'PDP/PC': 'PDP',
      'Allied Science (Chemistry)': 'ALL',
      'Allied Science (Mathematics)': 'ALL',
      'Allied Science(Mathematics)': 'ALL',
      'Allied Science (Physics)': 'ALL',
      'Allied Science(Environment)': 'ALL',
      'Polytechnic': 'COL',
    };

    sortedFaculty.forEach((inv, idx) => {
      const rowNum = 11 + idx;
      worksheet.getCell(rowNum, 1).value = idx + 1;
      worksheet.getCell(rowNum, 2).value = inv.name;
      worksheet.getCell(rowNum, 3).value = designationMap[inv.designation] || inv.designation;
      worksheet.getCell(rowNum, 4).value = deptMap[inv.department] || inv.department.substring(0, 3).toUpperCase();
      [1, 2, 3, 4].forEach(c => setBorder(worksheet.getCell(rowNum, c)));

      let total = 0;
      uniqueDates.forEach((date, dateIdx) => {
        const startCol = dateColStart + (dateIdx * numShifts);
        shiftTimings.forEach((shift, sIdx) => {
          const cell = worksheet.getCell(rowNum, startCol + sIdx);
          setBorder(cell);
          cell.alignment = { horizontal: 'center' };

          const asgs = resultsToExport.filter(a => {
            if (a.invigilator.id !== inv.id || a.exam.date !== date) return false;
            return ((a.exam as any).manualShiftIndex ?? 0) === sIdx;
          });

          if (asgs.length > 0) {
            const isReserved = asgs.some(a => a.isReserved);
            const isMid = asgs.some(a => a.exam.id.toLowerCase().includes('mid'));
            if (!isReserved) {
              cell.value = isMid ? '001' : '01';
              total++;
            }
          }
        });
      });

      worksheet.getCell(rowNum, totalDutyCol).value = total;
      worksheet.getCell(rowNum, totalDutyCol).alignment = { horizontal: 'center' };
      setBorder(worksheet.getCell(rowNum, totalDutyCol));
    });

    // Column Widths
    worksheet.columns.forEach((col, idx) => {
      const cIdx = idx + 1;
      if (cIdx === 1) col.width = 6;
      else if (cIdx === 2) col.width = 28;
      else if (cIdx === 3) col.width = 8;
      else if (cIdx === 4) col.width = 8;
      else if (cIdx >= dateColStart && cIdx <= totalCols) col.width = 6;
      else if (cIdx === totalDutyCol) col.width = 10;
    });

    // Summary Section below faculty
    const summaryStartRow = 13 + sortedFaculty.length;
    worksheet.mergeCells(summaryStartRow, 1, summaryStartRow, 4);
    worksheet.getCell(summaryStartRow, 1).value = 'DUTY SUMMARY REPORT';
    worksheet.getCell(summaryStartRow, 1).font = { bold: true };

    worksheet.getCell(summaryStartRow + 1, 1).value = 'Date';
    worksheet.getCell(summaryStartRow + 1, 2).value = 'Shift';
    worksheet.getCell(summaryStartRow + 1, 3).value = 'Total Faculty Allotted';
    worksheet.getCell(summaryStartRow + 1, 4).value = 'Reserved Staff';
    [1, 2, 3, 4].forEach(c => {
      setBorder(worksheet.getCell(summaryStartRow + 1, c));
      worksheet.getCell(summaryStartRow + 1, c).font = { bold: true };
    });

    let sRowIdx = 0;
    uniqueDates.forEach(date => {
      shiftTimings.forEach((shift, sIdx) => {
        const shiftResults = resultsToExport.filter(a => {
          if (a.exam.date !== date) return false;
          return ((a.exam as any).manualShiftIndex ?? 0) === sIdx;
        });

        if (shiftResults.length > 0) {
          const rNum = summaryStartRow + 2 + sRowIdx;
          worksheet.getCell(rNum, 1).value = date;
          worksheet.getCell(rNum, 2).value = shift.label;
          worksheet.getCell(rNum, 3).value = shiftResults.filter(r => !r.isReserved).length;
          worksheet.getCell(rNum, 4).value = shiftResults.filter(r => r.isReserved).length;
          [1, 2, 3, 4].forEach(c => setBorder(worksheet.getCell(rNum, c)));
          sRowIdx++;
        }
      });
    });

    // Abbreviations Legend
    const legendRow = summaryStartRow + 4 + sRowIdx;
    worksheet.mergeCells(legendRow, 1, legendRow, 4);
    worksheet.getCell(legendRow, 1).value = 'DEPARTMENT ABBREVIATIONS:';
    worksheet.getCell(legendRow, 1).font = { bold: true };

    const legendItems = [
      { abbr: 'ALL', name: 'Allied Sciences (Physics, Chemistry, Maths, EVS)' },
      { abbr: 'COL', name: 'College of Pharmacy / College of Nursing / Polytechnic' },
      { abbr: 'CIV', name: 'Civil Engineering' },
      { abbr: 'SCH', name: 'School of Computing / School of Management / CA / Commerce' },
      { abbr: 'COM', name: 'Computer Science & Engineering' },
      { abbr: 'MEC', name: 'Mechanical Engineering' },
      { abbr: 'ELE', name: 'Electronics & Communication Engineering' },
      { abbr: 'PDP', name: 'PDP / Personal Development Program' },
    ];

    legendItems.forEach((item, lIdx) => {
      const rNum = legendRow + 1 + lIdx;
      worksheet.getCell(rNum, 1).value = item.abbr;
      worksheet.getCell(rNum, 1).font = { bold: true };
      worksheet.mergeCells(rNum, 2, rNum, 6);
      worksheet.getCell(rNum, 2).value = item.name;
    });

    // Footer Signature
    const footerRow = legendRow + legendItems.length + 3;
    worksheet.mergeCells(footerRow, totalDutyCol - 4, footerRow, totalDutyCol);
    worksheet.getCell(footerRow, totalDutyCol - 4).value = 'Superintendent of Examination GEHU, Bhimtal Campus';
    worksheet.getCell(footerRow, totalDutyCol - 4).font = { bold: true };
    worksheet.getCell(footerRow, totalDutyCol - 4).alignment = { horizontal: 'right' };

    return await workbook.xlsx.writeBuffer();
  };

  const handleDownloadDutyChart = async () => {
    if (!results) return;
    setIsProcessing(true);
    try {
      const buffer = await generateDetailedExcel(results);
      const today = new Date().toISOString().split('T')[0];
      saveAs(new Blob([buffer]), `Detailed_University_Duty_Chart_${today}.xlsx`);
      toast({
        title: 'Duty Chart Exported',
        description: 'The official University Duty Chart has been downloaded.',
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Export Failed', description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadAllReports = async () => {
    if (!results) return;
    setIsProcessing(true);
    try {
      const fullAllotment: Record<string, { seatPlan: any; invigilatorAssignments: InvigilatorAssignment[] }> = {};

      results.forEach(asg => {
        const sessionKey = `${asg.exam.date} ${asg.exam.time}`;
        if (!fullAllotment[sessionKey]) {
          fullAllotment[sessionKey] = {
            seatPlan: { exam: asg.exam, assignments: [] },
            invigilatorAssignments: [],
          };
        }
        fullAllotment[sessionKey].invigilatorAssignments.push(asg);

        if (
          asg.classroom &&
          !fullAllotment[sessionKey].seatPlan.assignments.some((s: any) => s.classroom?.id === asg.classroom!.id)
        ) {
          fullAllotment[sessionKey].seatPlan.assignments.push({
            classroom: asg.classroom,
            seatNumber: 1,
          });
        }
      });

      const { generateMasterReport, generateInvigilatorDutyRoster, generateVisualSeatPlanExcel } = await import(
        '@/lib/report-generator'
      );

      const zip = new JSZip();
      const today = new Date().toISOString().split('T')[0];

      // 1. Detailed duty chart
      const detailedBuf = await generateDetailedExcel(results);
      zip.file('1_Official_University_Duty_Chart.xlsx', detailedBuf);

      // 2. Master Report
      const masterBuf = await generateMasterReport(fullAllotment, [], classrooms, invigilators, true);
      zip.file('2_Exam_Master_Report.xlsx', masterBuf);

      // 3. Duty Roster
      const rosterBuf = await generateInvigilatorDutyRoster(fullAllotment, invigilators, true);
      zip.file('3_Invigilator_Duty_Roster.xlsx', rosterBuf);

      // 4. Visual Seat Plan
      const visualBuf = await generateVisualSeatPlanExcel(fullAllotment, classrooms, true);
      zip.file('4_Visual_Seat_Plans.xlsx', visualBuf);

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `GEHU_Bhimtal_Exam_Package_${today}.zip`);

      toast({
        title: 'Package Downloaded',
        description: 'All official university reports bundled into ZIP file.',
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Export Failed', description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // --- RESULT VIEW CALCULATIONS ---
  const uniqueDatesList = useMemo(() => {
    if (!results) return [];
    return Array.from(new Set(results.map(a => a.exam.date))).sort();
  }, [results]);

  const uniqueShiftsList = useMemo(() => {
    return [
      { id: 0, label: 'Shift I', color: 'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300' },
      { id: 1, label: 'Shift II', color: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-300' },
    ];
  }, []);

  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    invigilators.forEach(i => set.add(i.department));
    return ['ALL', ...Array.from(set).sort()];
  }, [invigilators]);

  const filteredFacultyResults = useMemo(() => {
    if (!results) return [];
    const facultyIds = Array.from(new Set(results.map(a => a.invigilator.id)));
    let facultyList = invigilators.filter(f => facultyIds.includes(f.id));

    if (selectedDept !== 'ALL') {
      facultyList = facultyList.filter(f => f.department === selectedDept);
    }

    if (searchFaculty.trim()) {
      const q = searchFaculty.toLowerCase();
      facultyList = facultyList.filter(f => f.name.toLowerCase().includes(q) || f.department.toLowerCase().includes(q));
    }

    return facultyList.sort((a, b) => a.name.localeCompare(b.name));
  }, [results, invigilators, selectedDept, searchFaculty]);

  const complianceStats = useMemo(() => {
    if (!results) return [];
    const desigs = [
      { key: 'Professor', label: 'Professor', short: 'Prof' },
      { key: 'Associate Professor', label: 'Associate Professor', short: 'AsP' },
      { key: 'Assistant Professor', label: 'Assistant Professor', short: 'AP' },
      { key: 'Lecturer', label: 'Lecturer', short: 'Lec' },
      { key: 'Nursing Tutor', label: 'Nursing Tutor', short: 'NT' },
      { key: 'Teaching Associate', label: 'Teaching Associate', short: 'TA' },
      { key: 'Lab Assistant', label: 'Lab Assistant', short: 'LA' },
    ];

    return desigs.map(d => {
      const facultyInDesig = invigilators.filter(i => {
        const des = i.designation.toLowerCase();
        if (d.key === 'Teaching Associate') {
          return des.includes('teaching') || (des.includes('associate') && !des.includes('professor'));
        }
        return des.includes(d.key.toLowerCase());
      });

      const dutiesCounts = facultyInDesig.map(f => {
        return results.filter(a => a.invigilator.id === f.id && !a.isReserved).length;
      });

      const maxAssigned = dutiesCounts.length > 0 ? Math.max(...dutiesCounts) : 0;
      const avgAssigned = dutiesCounts.length > 0 ? (dutiesCounts.reduce((a, b) => a + b, 0) / dutiesCounts.length).toFixed(1) : '0';
      const configuredLimit = dutyLimits[d.key] ?? 15;
      const isCompliant = maxAssigned <= configuredLimit;

      return {
        ...d,
        facultyCount: facultyInDesig.length,
        maxAssigned,
        avgAssigned,
        configuredLimit,
        isCompliant,
      };
    });
  }, [results, invigilators, dutyLimits]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <MainSidebar />
        <SidebarInset>
          <div className="flex flex-col h-full">
            <MainHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
              {/* Header Title & Actions */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                      Faculty Shift Allotment
                    </h1>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-bold">
                      University Engine
                    </Badge>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">
                    Set required invigilator counts per day & shift. Automatically allocates faculty and outputs the official GEHU Duty Chart.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {results && (
                    <>
                      <Button
                        onClick={handleDownloadDutyChart}
                        disabled={isProcessing}
                        className="h-10 text-xs font-semibold gap-1.5 shadow-xs"
                      >
                        <FileDown className="size-4" />
                        Download Duty Chart (.xlsx)
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleDownloadAllReports}
                        disabled={isProcessing}
                        className="h-10 text-xs font-semibold gap-1.5"
                      >
                        <Package className="size-4" />
                        Download All Reports (.zip)
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Requirement Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-xl border bg-card/70 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Exam Days</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold">{totalDaysCount}</span>
                    <CalendarDays className="size-4 text-primary opacity-60" />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border bg-card/70 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Configured Shifts</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold">{totalShiftsCount}</span>
                    <Clock className="size-4 text-emerald-500 opacity-60" />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border bg-card/70 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Duty Slots Required</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold">{totalDutySlots}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      ({totalActiveStaffNeeded} Act + {totalReservedStaffNeeded} Res)
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border bg-card/70 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Faculty Pool</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold">{availableFacultyCount}</span>
                    <Users className="size-4 text-indigo-500 opacity-60" />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border bg-card/70 flex flex-col justify-between col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Target Load</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold">~{avgDutyLoad}</span>
                    <span className="text-[10px] text-muted-foreground">Duties / staff</span>
                  </div>
                </div>
              </div>

              {/* Requirement Input Workspace */}
              <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <TabsList className="bg-muted/70 p-1">
                    <TabsTrigger value="visual" className="text-xs font-medium gap-1.5">
                      <Layers className="size-3.5" />
                      Visual Day & Shift Builder
                    </TabsTrigger>
                    <TabsTrigger value="paste" className="text-xs font-medium gap-1.5">
                      <FileSpreadsheet className="size-3.5" />
                      Raw Table / Paste Mode
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLoadOfficialPlan}
                      className="h-8 text-xs font-semibold gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                    >
                      <Sparkles className="size-3.5" />
                      Load Official May 2026 Plan
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetDays}
                      className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                    >
                      <RotateCcw className="size-3.5" />
                      Reset
                    </Button>
                  </div>
                </div>

                {/* Tab 1: Visual Interactive Matrix */}
                <TabsContent value="visual" className="space-y-4 m-0">
                  <div className="space-y-4">
                    {days.map((day, dIdx) => (
                      <Card key={day.id} className="border shadow-xs overflow-hidden">
                        <div className="px-4 py-3 bg-muted/40 border-b flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="size-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                              {dIdx + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              <Input
                                type="date"
                                value={day.date}
                                onChange={e => {
                                  const val = e.target.value;
                                  const d = new Date(val);
                                  const name = !isNaN(d.getTime())
                                    ? d.toLocaleDateString('en-US', { weekday: 'long' })
                                    : day.dayName;
                                  setDays(days.map(dItem => (dItem.id === day.id ? { ...dItem, date: val, dayName: name } : dItem)));
                                }}
                                className="h-8 w-36 text-xs font-semibold font-mono"
                              />
                              <span className="text-xs font-medium text-muted-foreground">({day.dayName})</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddShiftToDay(day.id)}
                              className="h-7 text-[11px] font-medium gap-1"
                            >
                              <Plus className="size-3" />
                              Add Shift
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDuplicateDay(day.id)}
                              className="h-7 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                            >
                              <Copy className="size-3" />
                              Duplicate
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteDay(day.id)}
                              className="h-7 text-[11px] text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>

                        <CardContent className="p-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {day.shifts.map((shift, sIdx) => (
                              <div
                                key={shift.id}
                                className="p-3.5 rounded-xl border bg-card flex flex-col justify-between space-y-3 relative group"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Select
                                      value={shift.name}
                                      onValueChange={val => {
                                        const opt = SHIFT_OPTIONS.find(o => o.name === val) || SHIFT_OPTIONS[0];
                                        handleUpdateShift(day.id, shift.id, {
                                          name: val,
                                          shiftIndex: opt.shiftIndex,
                                          time: opt.time,
                                          timeRange: opt.timeRange,
                                        });
                                      }}
                                    >
                                      <SelectTrigger className="h-7 text-xs font-bold w-28">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {SHIFT_OPTIONS.map(opt => (
                                          <SelectItem key={opt.name} value={opt.name} className="text-xs">
                                            {opt.name} ({opt.timeRange})
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <span className="text-[11px] text-muted-foreground font-mono">{shift.timeRange}</span>
                                  </div>

                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteShift(day.id, shift.id)}
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="size-3" />
                                  </Button>
                                </div>

                                <div className="grid grid-cols-3 gap-2 pt-1 border-t">
                                  <div>
                                    <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                                      Active Faculty
                                    </label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={shift.activeStaff}
                                      onChange={e =>
                                        handleUpdateShift(day.id, shift.id, {
                                          activeStaff: parseInt(e.target.value) || 0,
                                        })
                                      }
                                      className="h-8 text-xs font-bold text-center font-mono"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                                      Standby Staff
                                    </label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={shift.reservedStaff}
                                      onChange={e =>
                                        handleUpdateShift(day.id, shift.id, {
                                          reservedStaff: parseInt(e.target.value) || 0,
                                        })
                                      }
                                      className="h-8 text-xs font-bold text-center font-mono"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                                      Rooms
                                    </label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={shift.rooms}
                                      onChange={e =>
                                        handleUpdateShift(day.id, shift.id, {
                                          rooms: parseInt(e.target.value) || 1,
                                        })
                                      }
                                      className="h-8 text-xs font-bold text-center font-mono"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    <Button
                      variant="outline"
                      onClick={handleAddDay}
                      className="w-full h-11 border-dashed font-semibold text-xs gap-2 hover:border-primary hover:text-primary"
                    >
                      <Plus className="size-4" />
                      Add New Examination Day
                    </Button>
                  </div>
                </TabsContent>

                {/* Tab 2: Raw Text / Markdown Paste */}
                <TabsContent value="paste" className="space-y-4 m-0">
                  <Card className="border shadow-xs">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-bold">Paste Tabular Requirements</CardTitle>
                          <CardDescription className="text-xs">
                            Paste pipe-separated or tab-separated text from Excel.
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={syncVisualToRaw} className="h-8 text-xs">
                            Export Visual Table to Text
                          </Button>
                          <Button size="sm" onClick={syncRawToVisual} className="h-8 text-xs font-semibold">
                            Parse into Visual Builder
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={rawText}
                        onChange={e => setRawText(e.target.value)}
                        placeholder="| Date | Shift | Rooms | Active | Reserved |"
                        className="font-mono text-xs min-h-[220px]"
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Designation Duty Limits (Max Duties Cap) Configuration Panel */}
              <Card className="border border-primary/25 bg-card/70 shadow-xs overflow-hidden">
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-muted/30">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="size-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">
                        Designation Duty Limits (Max Duties Cap)
                      </h3>
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/25 font-semibold">
                        Pre-Allotment Controls
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Set maximum duties permitted per faculty member based on their academic rank before running the allotment.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant={showLimitSettings ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShowLimitSettings(!showLimitSettings)}
                      className="h-8 text-xs font-semibold gap-1.5"
                    >
                      <SlidersHorizontal className="size-3.5" />
                      {showLimitSettings ? 'Collapse Controls' : 'Customize Duty Caps'}
                    </Button>
                    {isNonDefaultLimits && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetDutyLimits}
                        className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
                      >
                        <RotateCcw className="size-3" />
                        Reset
                      </Button>
                    )}
                  </div>
                </div>

                {/* Active Caps Preview Strip */}
                <div className="px-4 py-2.5 bg-card flex flex-wrap items-center gap-2 border-t text-xs">
                  <span className="text-[11px] font-semibold text-muted-foreground">Active Caps:</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[11px] font-mono">
                    Prof: <strong className="text-primary font-bold">{dutyLimits['Professor']}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[11px] font-mono">
                    AsP: <strong className="text-primary font-bold">{dutyLimits['Associate Professor']}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[11px] font-mono">
                    AP: <strong className="text-primary font-bold">{dutyLimits['Assistant Professor']}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[11px] font-mono">
                    Lecturer: <strong className="text-primary font-bold">{dutyLimits['Lecturer']}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[11px] font-mono">
                    Nursing Tutor: <strong className="text-primary font-bold">{dutyLimits['Nursing Tutor']}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[11px] font-mono">
                    TA: <strong className="text-primary font-bold">{dutyLimits['Teaching Associate']}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[11px] font-mono">
                    Lab Asst: <strong className="text-primary font-bold">{dutyLimits['Lab Assistant']}</strong>
                  </span>
                </div>

                {/* Expanded Interactive Stepper Panel */}
                {showLimitSettings && (
                  <div className="p-4 border-t bg-muted/15 space-y-4 animate-in fade-in duration-200">
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                      {[
                        { key: 'Professor', label: 'Professor', short: 'Prof', desc: 'Senior faculty / HODs' },
                        { key: 'Associate Professor', label: 'Associate Prof', short: 'AsP', desc: 'Senior academic tier' },
                        { key: 'Assistant Professor', label: 'Assistant Prof', short: 'AP', desc: 'Core teaching faculty' },
                        { key: 'Lecturer', label: 'Lecturer', short: 'Lec', desc: 'Primary invigilation tier' },
                        { key: 'Nursing Tutor', label: 'Nursing Tutor', short: 'NT', desc: 'College of Nursing' },
                        { key: 'Teaching Associate', label: 'Teaching Assoc', short: 'TA', desc: 'Associates & TAs' },
                        { key: 'Lab Assistant', label: 'Lab Assistant', short: 'LA', desc: 'Laboratory technical staff' },
                      ].map(item => (
                        <div key={item.key} className="p-3 rounded-xl border bg-card flex flex-col justify-between space-y-2">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold">{item.short}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">Max</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground block truncate">{item.desc}</span>
                          </div>

                          <div className="flex items-center gap-1 pt-1 border-t">
                            <button
                              type="button"
                              onClick={() => handleUpdateDutyLimit(item.key, (dutyLimits[item.key] ?? 15) - 1)}
                              className="size-7 rounded border bg-secondary/80 hover:bg-secondary font-bold text-xs flex items-center justify-center"
                            >
                              -
                            </button>
                            <Input
                              type="number"
                              min="0"
                              max="50"
                              value={dutyLimits[item.key] ?? 15}
                              onChange={e => handleUpdateDutyLimit(item.key, parseInt(e.target.value) || 0)}
                              className="h-7 text-xs font-bold text-center font-mono p-0"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateDutyLimit(item.key, (dutyLimits[item.key] ?? 15) + 1)}
                              className="size-7 rounded border bg-secondary/80 hover:bg-secondary font-bold text-xs flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Sparkles className="size-3.5 text-primary" />
                        <span>Quick Presets:</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApplyPresetLimits('standard')}
                          className="h-7 text-[11px]"
                        >
                          University Standard (5/10/15/20)
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApplyPresetLimits('lightSenior')}
                          className="h-7 text-[11px]"
                        >
                          Senior Relief (Prof: 2, AsP: 6)
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApplyPresetLimits('juniorFocus')}
                          className="h-7 text-[11px]"
                        >
                          Junior Priority (Prof: 0, AsP: 4)
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApplyPresetLimits('equal')}
                          className="h-7 text-[11px]"
                        >
                          Equalized (12 each)
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Execution Action Button */}
              <div className="flex justify-center pt-2">
                <Button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  size="lg"
                  className="w-full sm:w-auto px-8 h-12 font-bold text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-md gap-2.5"
                >
                  <Play className="size-4 fill-current" />
                  {isProcessing ? 'Generating Duty Allotment...' : `Generate Faculty Allotment (${totalDutySlots} Duties)`}
                </Button>
              </div>

              {/* Results & Verification Section */}
              {results && (
                <div className="space-y-6 pt-4 animate-in fade-in duration-500">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b">
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <CheckCircle2 className="size-5 text-emerald-500" />
                        Allotment Results & Duty Chart Preview
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Interactive matrix matching the official Graphic Era Hill University examination duty chart.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleDownloadDutyChart}
                        className="h-9 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                      >
                        <Download className="size-3.5" />
                        Download Duty Chart Excel
                      </Button>
                    </div>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border bg-card/60">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search faculty name..."
                          value={searchFaculty}
                          onChange={e => setSearchFaculty(e.target.value)}
                          className="h-8 pl-8 text-xs"
                        />
                      </div>
                      <Select value={selectedDept} onValueChange={setSelectedDept}>
                        <SelectTrigger className="h-8 text-xs w-48">
                          <SelectValue placeholder="All Departments" />
                        </SelectTrigger>
                        <SelectContent>
                          {departmentsList.map(dept => (
                            <SelectItem key={dept} value={dept} className="text-xs">
                              {dept === 'ALL' ? 'All Departments' : dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Showing <span className="font-bold text-foreground">{filteredFacultyResults.length}</span> faculty members
                    </div>
                  </div>

                  {/* Duty Chart Grid Matrix */}
                  <Card className="border shadow-xs overflow-hidden">
                    <div className="overflow-x-auto max-h-[500px]">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="sticky top-0 bg-secondary/95 backdrop-blur-md z-10 text-[11px] uppercase tracking-wider font-bold">
                          <tr className="border-b">
                            <th className="p-3 w-12 text-center border-r">Sr.</th>
                            <th className="p-3 min-w-[200px] border-r">Name of Invigilator</th>
                            <th className="p-3 w-20 text-center border-r">Desig</th>
                            <th className="p-3 w-20 text-center border-r">Dept</th>
                            {uniqueDatesList.map(date => (
                              <th
                                key={date}
                                colSpan={uniqueShiftsList.length}
                                className="p-2 text-center border-r bg-muted/60"
                              >
                                {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                              </th>
                            ))}
                            <th className="p-3 w-20 text-center bg-primary/10 text-primary">Total</th>
                          </tr>
                          <tr className="border-b text-[10px]">
                            <th className="p-1 border-r"></th>
                            <th className="p-1 border-r"></th>
                            <th className="p-1 border-r"></th>
                            <th className="p-1 border-r"></th>
                            {uniqueDatesList.map(date =>
                              uniqueShiftsList.map(shift => (
                                <th
                                  key={`${date}-${shift.id}`}
                                  className={`p-1 text-center border-r font-mono ${
                                    shift.id === 0 ? 'bg-amber-100/70 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200' : 'bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200'
                                  }`}
                                >
                                  {shift.label}
                                </th>
                              ))
                            )}
                            <th className="p-1 text-center bg-primary/15 text-primary">Duty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredFacultyResults.map((inv, idx) => {
                            let total = 0;
                            return (
                              <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                                <td className="p-2 text-center font-mono border-r text-muted-foreground">{idx + 1}</td>
                                <td className="p-2 font-semibold border-r text-foreground">{inv.name}</td>
                                <td className="p-2 text-center border-r">
                                  <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
                                    {inv.designation.includes('Assistant')
                                      ? 'AP'
                                      : inv.designation.includes('Associate')
                                      ? 'AsP'
                                      : inv.designation.includes('Lecturer')
                                      ? 'Lec'
                                      : inv.designation.includes('Tutor')
                                      ? 'NT'
                                      : inv.designation.includes('Professor')
                                      ? 'Prof'
                                      : 'TA'}
                                  </span>
                                </td>
                                <td className="p-2 text-center border-r font-mono text-[10px] text-muted-foreground">
                                  {inv.department.substring(0, 3).toUpperCase()}
                                </td>
                                {uniqueDatesList.map(date =>
                                  uniqueShiftsList.map(shift => {
                                    const asgs = results.filter(a => {
                                      if (a.invigilator.id !== inv.id || a.exam.date !== date) return false;
                                      return ((a.exam as any).manualShiftIndex ?? 0) === shift.id;
                                    });

                                    const isAssigned = asgs.length > 0;
                                    const isReserved = asgs.some(a => a.isReserved);
                                    const isMid = asgs.some(a => a.exam.id.toLowerCase().includes('mid'));

                                    if (isAssigned && !isReserved) total++;

                                    return (
                                      <td key={`${date}-${shift.id}`} className="p-1.5 text-center border-r font-mono">
                                        {isAssigned ? (
                                          isReserved ? (
                                            <span className="px-1 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[9px] font-bold">
                                              RES
                                            </span>
                                          ) : (
                                            <span
                                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                isMid
                                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                              }`}
                                            >
                                              {isMid ? '001' : '01'}
                                            </span>
                                          )
                                        ) : (
                                          <span className="text-muted-foreground/30">-</span>
                                        )}
                                      </td>
                                    );
                                  })
                                )}
                                <td className="p-2 text-center font-bold font-mono text-primary bg-primary/5">
                                  {total}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  {/* Designation Duty Caps Compliance Verification Card */}
                  <Card className="border shadow-xs">
                    <CardHeader className="pb-3 border-b bg-muted/10">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <ShieldCheck className="size-4 text-primary" />
                            Designation Duty Caps &amp; Compliance Verification
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            Verifies that actual duties assigned to Professors, Associate Professors, Lecturers, etc. are strictly within configured limits.
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1.5 w-fit">
                          <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                          100% Policy Compliant
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold border-b">
                            <tr>
                              <th className="p-3">Designation Rank</th>
                              <th className="p-3 text-center">Configured Cap</th>
                              <th className="p-3 text-center">Faculty Pool</th>
                              <th className="p-3 text-center">Faculty Deployed</th>
                              <th className="p-3 text-center">Total Duties</th>
                              <th className="p-3 text-center">Max Assigned</th>
                              <th className="p-3 text-center">Avg Load</th>
                              <th className="p-3 text-right">Verification Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {designationStats.map(stat => (
                              <tr key={stat.key} className="hover:bg-muted/20 transition-colors">
                                <td className="p-3 font-medium">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                                      {stat.short}
                                    </Badge>
                                    <span>{stat.label}</span>
                                  </div>
                                </td>
                                <td className="p-3 text-center font-mono font-bold text-primary">
                                  &le; {stat.cap}
                                </td>
                                <td className="p-3 text-center font-mono text-muted-foreground">
                                  {stat.totalFaculty}
                                </td>
                                <td className="p-3 text-center font-mono">
                                  {stat.activeFaculty} / {stat.totalFaculty}
                                </td>
                                <td className="p-3 text-center font-mono font-semibold">
                                  {stat.totalDuties}
                                </td>
                                <td className="p-3 text-center font-mono font-bold">
                                  <span className={stat.maxDuties > stat.cap ? 'text-destructive font-black' : 'text-emerald-600 dark:text-emerald-400'}>
                                    {stat.maxDuties}
                                  </span>
                                  <span className="text-muted-foreground/60 text-[10px]"> / {stat.cap}</span>
                                </td>
                                <td className="p-3 text-center font-mono text-muted-foreground">
                                  {stat.avgDuties}
                                </td>
                                <td className="p-3 text-right">
                                  {stat.isCompliant ? (
                                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-mono">
                                      Max {stat.maxDuties} &le; {stat.cap} &#10003;
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive" className="text-[10px] font-mono">
                                      Exceeded ({stat.maxDuties} &gt; {stat.cap})
                                    </Badge>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Summary Breakdown Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Shift Allotment Breakdown */}
                    <Card className="border shadow-xs">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-emerald-500" />
                          Shift Staffing Verification
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Target vs. actual allocated invigilators per session.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {uniqueDatesList.map(date => {
                          return uniqueShiftsList.map(shift => {
                            const shiftAsgs = results.filter(
                              a => a.exam.date === date && ((a.exam as any).manualShiftIndex ?? 0) === shift.id
                            );
                            if (shiftAsgs.length === 0) return null;
                            const activeCount = shiftAsgs.filter(a => !a.isReserved).length;
                            const reservedCount = shiftAsgs.filter(a => a.isReserved).length;

                            return (
                              <div
                                key={`${date}-${shift.id}`}
                                className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 text-xs"
                              >
                                <div>
                                  <span className="font-semibold">{date}</span>
                                  <span className="text-muted-foreground ml-2">({shift.label})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                    {activeCount} Active
                                  </Badge>
                                  {reservedCount > 0 && (
                                    <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                      {reservedCount} Standby
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })}
                      </CardContent>
                    </Card>

                    {/* Execution Log */}
                    <Card className="border shadow-xs">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <Info className="size-4 text-primary" />
                          Engine Execution Diagnostics
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Chronological allocation log and constraint validation.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-black/5 dark:bg-black/40 rounded-xl border p-3 font-mono text-[10px] max-h-60 overflow-y-auto space-y-1">
                          {processLog.map((log, i) => (
                            <div
                              key={i}
                              className={`
                                ${log.type === 'success' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}
                                ${log.type === 'warning' ? 'text-amber-600 dark:text-amber-400 font-bold' : ''}
                                ${log.type === 'error' ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}
                                ${log.type === 'info' ? 'text-muted-foreground' : ''}
                              `}
                            >
                              {log.msg}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
