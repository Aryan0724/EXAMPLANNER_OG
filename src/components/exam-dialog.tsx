
'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExamSlot } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

const examSchema = z.object({
  date: z.string().optional(),
  time: z.string().optional(),
  subjectName: z.string().min(3, 'Subject name is required'),
  subjectCode: z.string().min(3, 'Subject code is required'),
  department: z.string().min(1, 'Department is required'),
  course: z.string().min(1, 'Course is required'),
  semester: z.coerce.number().min(1, 'Semester is required'),
  duration: z.coerce.number().min(30, 'Duration must be at least 30 minutes').optional(),
  group: z.string().optional(),
});

type ExamFormValues = z.infer<typeof examSchema>;

interface ExamDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (exam: ExamSlot) => void;
  exam: ExamSlot | null;
  departments: string[];
  coursesByDept: Record<string, string[]>;
  defaultDepartment?: string;
  defaultCourse?: string;
  isExplorerContext?: boolean; // New prop
}

export function ExamDialog({ 
    isOpen, 
    onClose, 
    onSave, 
    exam, 
    departments, 
    coursesByDept, 
    defaultDepartment, 
    defaultCourse,
    isExplorerContext = false // Default to false
}: ExamDialogProps) {
  const { register, handleSubmit, control, watch, reset, setValue, formState: { errors } } = useForm<ExamFormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      date: '',
      time: '',
      subjectName: '',
      subjectCode: '',
      department: defaultDepartment || '',
      course: defaultCourse || '',
      semester: 1,
      duration: 90,
      group: '',
    }
  });

  const selectedDepartment = watch('department');

  useEffect(() => {
    if (isOpen) {
      if (exam) {
        reset({
          ...exam,
          group: exam.group || '',
        });
      } else {
        reset({
          date: '',
          time: '',
          subjectName: '',
          subjectCode: '',
          department: defaultDepartment || '',
          course: defaultCourse || '',
          semester: 1,
          duration: 90,
          group: '',
        });
      }
    }
  }, [exam, reset, isOpen, defaultDepartment, defaultCourse]);
  
  useEffect(() => {
      // When the department changes, reset the course if it's not valid for the new dept
      if (selectedDepartment && !coursesByDept[selectedDepartment]?.includes(watch('course'))) {
          setValue('course', '');
      }
  }, [selectedDepartment, coursesByDept, watch, setValue]);

  const onSubmit = (data: ExamFormValues) => {
    // If in explorer context, provide default values for hidden fields
    const finalData = isExplorerContext ? {
      ...data,
      date: data.date || '1970-01-01', // Default placeholder date
      time: data.time || '00:00', // Default placeholder time
      duration: data.duration || 90,
    } : data;


    if (!finalData.date || !finalData.time || !finalData.duration) {
        toast({ variant: 'destructive', title: 'Error', description: 'Date, time, and duration are required.' });
        return;
    }

    const examData: ExamSlot = {
      id: exam?.id || `E${Date.now()}`,
      ...finalData,
      date: finalData.date,
      time: finalData.time,
      duration: finalData.duration,
      group: finalData.group === 'All' || !finalData.group ? undefined : (finalData.group as 'A' | 'B'),
    };
    onSave(examData);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{exam ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
          <DialogDescription>
            {exam ? 'Update the details for this subject.' : 'Fill in the details for the new subject.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
         {!isExplorerContext && (
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" {...register('date')} />
                {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
                </div>
                <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input id="time" type="time" {...register('time')} />
                {errors.time && <p className="text-xs text-destructive">{errors.time.message}</p>}
                </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subjectName">Subject Name</Label>
              <Input id="subjectName" {...register('subjectName')} />
              {errors.subjectName && <p className="text-xs text-destructive">{errors.subjectName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="subjectCode">Subject Code</Label>
              <Input id="subjectCode" {...register('subjectCode')} />
              {errors.subjectCode && <p className="text-xs text-destructive">{errors.subjectCode.message}</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Controller
                    control={control}
                    name="department"
                    render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                        <SelectContent>
                        {departments.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    )}
                />
                 {errors.department && <p className="text-xs text-destructive">{errors.department.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="course">Course</Label>
                <Controller
                    control={control}
                    name="course"
                    render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedDepartment}>
                        <SelectTrigger><SelectValue placeholder="Select Course" /></SelectTrigger>
                        <SelectContent>
                        {(coursesByDept[selectedDepartment] || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    )}
                />
                 {errors.course && <p className="text-xs text-destructive">{errors.course.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
                <Label htmlFor="semester">Semester</Label>
                <Input id="semester" type="number" {...register('semester')} />
                {errors.semester && <p className="text-xs text-destructive">{errors.semester.message}</p>}
            </div>
            {!isExplorerContext && (
                <div className="space-y-2">
                    <Label htmlFor="duration">Duration (mins)</Label>
                    <Input id="duration" type="number" {...register('duration')} />
                    {errors.duration && <p className="text-xs text-destructive">{errors.duration.message}</p>}
                </div>
            )}
             <div className="space-y-2">
                <Label htmlFor="group">Group</Label>
                 <Controller
                    control={control}
                    name="group"
                    render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                        <SelectTrigger><SelectValue placeholder="Select Group" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All</SelectItem>
                            <SelectItem value="A">Group A</SelectItem>
                            <SelectItem value="B">Group B</SelectItem>
                        </SelectContent>
                    </Select>
                    )}
                />
            </div>
          </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save Subject</Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
