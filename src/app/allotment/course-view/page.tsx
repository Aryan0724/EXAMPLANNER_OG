'use client';

import { useState, useContext, useMemo } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BookOpen, MapPin, Calendar, User, Search, GraduationCap, Download, Printer, Loader2 } from 'lucide-react';
import { DataContext } from '@/context/DataContext';
import { AllotmentContext } from '@/context/AllotmentContext';
import { DEPARTMENTS } from '@/lib/data';
import { Student, ExamSlot } from '@/lib/types';

export default function CourseViewPage() {
    const { students, examSchedule, classrooms, isHydrated } = useContext(DataContext);
    const { fullAllotment } = useContext(AllotmentContext);

    const [selectedDept, setSelectedDept] = useState<string>(DEPARTMENTS[0]);

    const coursesInDept = useMemo(() => {
        const deptStudents = students.filter((s: Student) => s.department === selectedDept);
        return Array.from(new Set(deptStudents.map((s: Student) => s.course)));
    }, [students, selectedDept]);

    const [selectedCourse, setSelectedCourse] = useState<string>('');

    if (!isHydrated) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Establishing Course Data...</p>
                </div>
            </div>
        );
    }

    const semestersInCourse = useMemo(() => {
        if (!selectedCourse) return [];
        const courseStudents = students.filter((s: Student) => s.course === selectedCourse);
        return Array.from(new Set(courseStudents.map((s: Student) => s.semester))).sort((a: number, b: number) => a - b);
    }, [students, selectedCourse]);

    const [selectedSemester, setSelectedSemester] = useState<string>('');

    const filteredStudents = useMemo(() => {
        if (!selectedSemester) return [];
        return students.filter((s: Student) =>
            s.department === selectedDept &&
            s.course === selectedCourse &&
            s.semester === parseInt(selectedSemester)
        ).sort((a: Student, b: Student) => a.rollNo.localeCompare(b.rollNo));
    }, [students, selectedDept, selectedCourse, selectedSemester]);

    const studentExams = useMemo(() => {
        if (!selectedCourse || !selectedSemester) return [];
        return examSchedule.filter((e: ExamSlot) =>
            e.course === selectedCourse &&
            e.semester === parseInt(selectedSemester)
        ).sort((a: ExamSlot, b: ExamSlot) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
    }, [examSchedule, selectedCourse, selectedSemester]);

    const handleExportCSV = () => {
        if (filteredStudents.length === 0) return;

        const headers = ["Roll No", "Name", "Section", "Group", "Room", "Seat Number", "Status"];
        const rows = filteredStudents.map(student => {
            const room = student.seatAssignment ? classrooms.find(c => c.id === student.seatAssignment!.classroomId) : null;
            return [
                student.rollNo,
                student.name,
                student.section,
                student.group || 'N/A',
                room?.roomNo || 'N/A',
                student.seatAssignment?.seatNumber || 'N/A',
                student.isDebarred ? 'Debarred' : 'Active'
            ];
        });

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${selectedCourse}_Sem${selectedSemester}_Allotment.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <SidebarProvider>
            <div className="flex min-h-screen">
                <MainSidebar />
                <SidebarInset>
                    <div className="flex flex-col h-full">
                        <MainHeader />
                        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 no-print">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex flex-col gap-2">
                                        <h1 className="text-3xl font-bold tracking-tight">Course-wise Allotment View</h1>
                                        <p className="text-muted-foreground">View detailed allotment and schedule for specific course groups.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filteredStudents.length === 0}>
                                            <Download className="w-4 h-4 mr-2" />
                                            Export CSV
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={handlePrint} disabled={filteredStudents.length === 0}>
                                            <Printer className="w-4 h-4 mr-2" />
                                            Print PDF
                                        </Button>
                                    </div>
                                </div>

                                <Card className="bg-gradient-to-br from-background to-muted/30 border-primary/10">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Search className="w-5 h-5 text-primary" />
                                            Selection Filters
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Department</label>
                                            <Select onValueChange={(val: string) => { setSelectedDept(val); setSelectedCourse(''); setSelectedSemester(''); }} value={selectedDept}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Department" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {DEPARTMENTS.map(dept => (
                                                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Course</label>
                                            <Select onValueChange={(val: string) => { setSelectedCourse(val); setSelectedSemester(''); }} value={selectedCourse}>
                                                <SelectTrigger disabled={!selectedDept}>
                                                    <SelectValue placeholder="Select Course" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {coursesInDept.map(course => (
                                                        <SelectItem key={course} value={course}>{course}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Semester / Year</label>
                                            <Select onValueChange={setSelectedSemester} value={selectedSemester}>
                                                <SelectTrigger disabled={!selectedCourse}>
                                                    <SelectValue placeholder="Select Semester" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {semestersInCourse.map(sem => (
                                                        <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </CardContent>
                                </Card>

                                {filteredStudents.length > 0 ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                        <Card className="lg:col-span-1 border-primary/5">
                                            <CardHeader>
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <Calendar className="w-4 h-4" />
                                                    Exam Schedule
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                {studentExams.length > 0 ? (
                                                    studentExams.map(exam => (
                                                        <div key={exam.id} className="p-3 rounded-lg bg-muted/40 border text-xs relative overflow-hidden">
                                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                                                            <div className="font-bold mb-1">{exam.subjectName}</div>
                                                            <div className="text-muted-foreground flex items-center gap-1">
                                                                <Calendar className="w-3 h-3" /> {exam.date}
                                                            </div>
                                                            <div className="text-muted-foreground flex items-center gap-1">
                                                                <BookOpen className="w-3 h-3" /> {exam.subjectCode}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">No exams scheduled for this group.</p>
                                                )}
                                            </CardContent>
                                        </Card>

                                        <Card className="lg:col-span-3 border-primary/5 shadow-xl">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-base flex items-center gap-2">
                                                        <User className="w-4 h-4" />
                                                        Student Allotment List
                                                    </CardTitle>
                                                    <Badge variant="outline" className="font-mono">
                                                        {filteredStudents.length} Students
                                                    </Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="rounded-md border bg-card">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="bg-muted/50">
                                                                <TableHead className="w-[120px]">Roll No</TableHead>
                                                                <TableHead>Name</TableHead>
                                                                <TableHead className="text-center">Permanent Seat</TableHead>
                                                                <TableHead className="text-center">Room</TableHead>
                                                                <TableHead className="text-right">Status</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {filteredStudents.map((student: Student) => {
                                                                const room = student.seatAssignment ? classrooms.find(c => c.id === student.seatAssignment!.classroomId) : null;
                                                                return (
                                                                    <TableRow key={student.id} className="hover:bg-muted/30 transition-colors">
                                                                        <TableCell className="font-mono font-medium">{student.rollNo}</TableCell>
                                                                        <TableCell>
                                                                            <div className="flex flex-col">
                                                                                <span>{student.name}</span>
                                                                                <span className="text-[10px] text-muted-foreground">Section {student.section} {student.group ? `(Group ${student.group})` : ''}</span>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-center">
                                                                            {student.seatAssignment ? (
                                                                                <Badge variant="secondary" className="px-3 py-0.5">
                                                                                    Seat #{student.seatAssignment.seatNumber}
                                                                                </Badge>
                                                                            ) : (
                                                                                <span className="text-muted-foreground italic text-xs">Not Allotted</span>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="text-center">
                                                                            {room ? (
                                                                                <div className="flex items-center justify-center gap-1.5 font-semibold text-primary">
                                                                                    <MapPin className="w-3.5 h-3.5" />
                                                                                    {room.roomNo}
                                                                                </div>
                                                                            ) : (
                                                                                '--'
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                            {student.isDebarred ? (
                                                                                <Badge variant="destructive" className="animate-pulse">Debarred</Badge>
                                                                            ) : (
                                                                                <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/5">Active</Badge>
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                ) : (
                                    <Card className="border-dashed flex flex-col items-center justify-center py-20 text-center">
                                        <GraduationCap className="w-16 h-16 text-muted-foreground/30 mb-4" />
                                        <CardTitle className="text-muted-foreground">Selection Required</CardTitle>
                                        <CardDescription>Select a Department, Course, and Semester to view the seating plan.</CardDescription>
                                    </Card>
                                )}
                            </div>
                        </main>

                        {/* Printable Area */}
                        <div className="printable-only p-8">
                            <div className="flex flex-col gap-6">
                                <div className="text-center border-b-2 pb-6">
                                    <h1 className="text-4xl font-bold uppercase mb-2">Examination Seating Allotment</h1>
                                    <h2 className="text-2xl font-semibold text-primary">{selectedCourse}</h2>
                                    <p className="text-lg">Department: {selectedDept} | Semester: {selectedSemester}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm bg-muted/20 p-4 rounded-lg">
                                    <div>
                                        <p className="font-bold mb-2 underline">Exam Schedule:</p>
                                        {studentExams.map(exam => (
                                            <div key={exam.id} className="flex gap-2">
                                                <span className="font-mono">{exam.date}</span>
                                                <span className="font-bold">{exam.subjectCode}:</span>
                                                <span>{exam.subjectName}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold mb-2 underline">Student Count:</p>
                                        <p className="text-2xl font-bold">{filteredStudents.length} Students</p>
                                    </div>
                                </div>

                                <Table className="border text-xs">
                                    <TableHeader>
                                        <TableRow className="bg-muted/50 border-b-2">
                                            <TableHead className="border-r">Roll No</TableHead>
                                            <TableHead className="border-r">Name</TableHead>
                                            <TableHead className="border-r text-center">Room</TableHead>
                                            <TableHead className="text-center">Seat</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredStudents.map((student: Student) => {
                                            const room = student.seatAssignment ? classrooms.find(c => c.id === student.seatAssignment!.classroomId) : null;
                                            return (
                                                <TableRow key={student.id} className="border-b">
                                                    <TableCell className="font-mono font-bold border-r">{student.rollNo}</TableCell>
                                                    <TableCell className="border-r">{student.name}</TableCell>
                                                    <TableCell className="text-center border-r font-bold">{room?.roomNo || 'N/A'}</TableCell>
                                                    <TableCell className="text-center font-bold">{student.seatAssignment?.seatNumber || 'N/A'}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>

                                <div className="mt-12 grid grid-cols-2 gap-20">
                                    <div className="border-t border-black pt-2 text-center text-sm">Controller of Examinations</div>
                                    <div className="border-t border-black pt-2 text-center text-sm">Institute Seal</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}
