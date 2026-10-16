'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Classroom, createClassroom } from '@/lib/types';
import { Building, Grid, Users, Sparkles } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ClassroomEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  classroom: Classroom | null;
  onSave: (savedRoom: Classroom) => void;
  existingClassrooms: Classroom[];
}

const COMMON_BLOCKS = [
  'Admin Block A',
  'Academic Block C',
  'Academic Block D',
  'Academic Block E',
];

export function ClassroomEditDialog({
  isOpen,
  onClose,
  classroom,
  onSave,
  existingClassrooms,
}: ClassroomEditDialogProps) {
  const isEditing = !!classroom;

  const [roomNo, setRoomNo] = useState('');
  const [building, setBuilding] = useState('Academic Block C');
  const [rows, setRows] = useState(6);
  const [columns, setColumns] = useState(4);
  const [totalSitting, setTotalSitting] = useState(42);

  useEffect(() => {
    if (classroom) {
      setRoomNo(classroom.roomNo);
      setBuilding(classroom.building);
      setRows(classroom.rows || 6);
      setColumns(classroom.columns || 4);
      setTotalSitting(classroom.capacity || 42);
    } else {
      setRoomNo('');
      setBuilding('Academic Block C');
      setRows(6);
      setColumns(4);
      setTotalSitting(42);
    }
  }, [classroom, isOpen]);

  const benchCount = Math.max(1, rows * columns);
  const basePerBench = Math.floor(totalSitting / benchCount);
  const remainder = totalSitting % benchCount;

  const handleSave = () => {
    const trimmedNo = roomNo.trim();
    if (!trimmedNo) {
      toast({
        variant: 'destructive',
        title: 'Room Number Required',
        description: 'Please specify a room number (e.g. C001, A007).',
      });
      return;
    }

    if (totalSitting <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Capacity',
        description: 'Total sitting capacity must be at least 1.',
      });
      return;
    }

    if (rows <= 0 || columns <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Grid Layout',
        description: 'Rows and columns must be at least 1.',
      });
      return;
    }

    // Check for duplicate room number (excluding self)
    const isDuplicate = existingClassrooms.some(
      c => c.roomNo.toLowerCase() === trimmedNo.toLowerCase() && c.id !== classroom?.id
    );

    if (isDuplicate) {
      toast({
        variant: 'destructive',
        title: 'Duplicate Room Number',
        description: `Classroom ${trimmedNo} already exists in the system.`,
      });
      return;
    }

    // Construct bench capacities
    const benchCapacities: number[] = [];
    for (let i = 0; i < benchCount; i++) {
      benchCapacities.push(i < remainder ? basePerBench + 1 : basePerBench);
    }

    const roomId = classroom?.id || `CR_${trimmedNo.replace(/[^a-zA-Z0-9]/g, '_')}`;

    const newClassroom = createClassroom({
      id: roomId,
      roomNo: trimmedNo,
      building: building.trim() || 'Academic Block C',
      rows,
      columns,
      benchCapacities,
      unavailableSlots: classroom?.unavailableSlots || [],
      departmentBlock: building.trim() || 'Academic Block C',
    });

    onSave(newClassroom);
    toast({
      title: isEditing ? 'Classroom Updated' : 'Classroom Added',
      description: `Room ${trimmedNo} (${building}) configured with ${totalSitting} sitting seats (${rows}×${columns} grid).`,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            {isEditing ? `Edit Classroom: ${classroom?.roomNo}` : 'Add New Classroom'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update grid layout dimensions, block location, and total examination sitting capacity.'
              : 'Add an examination room with customized layout and capacity.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Room Number */}
          <div className="space-y-1.5">
            <Label htmlFor="roomNo" className="text-xs font-semibold">Room Number *</Label>
            <Input
              id="roomNo"
              placeholder="e.g. C001, A007, D103"
              value={roomNo}
              onChange={e => setRoomNo(e.target.value.toUpperCase())}
              className="font-mono font-bold"
            />
          </div>

          {/* Building Block */}
          <div className="space-y-1.5">
            <Label htmlFor="building" className="text-xs font-semibold">Building / Block *</Label>
            <Input
              id="building"
              value={building}
              onChange={e => setBuilding(e.target.value)}
              placeholder="e.g. Academic Block C"
            />
            <div className="flex flex-wrap gap-1 mt-1">
              {COMMON_BLOCKS.map(block => (
                <button
                  key={block}
                  type="button"
                  onClick={() => setBuilding(block)}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                    building === block
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/40 hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {block}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Layout Rows and Columns */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rows" className="text-xs font-semibold flex items-center gap-1">
                <Grid className="h-3.5 w-3.5" />
                Rows
              </Label>
              <Input
                id="rows"
                type="number"
                min={1}
                max={30}
                value={rows}
                onChange={e => setRows(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="columns" className="text-xs font-semibold flex items-center gap-1">
                <Grid className="h-3.5 w-3.5" />
                Columns
              </Label>
              <Input
                id="columns"
                type="number"
                min={1}
                max={20}
                value={columns}
                onChange={e => setColumns(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>

          {/* Total Students Sitting Capacity */}
          <div className="space-y-1.5">
            <Label htmlFor="capacity" className="text-xs font-semibold flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-primary" />
              Total Students Sitting Capacity *
            </Label>
            <Input
              id="capacity"
              type="number"
              min={1}
              max={500}
              value={totalSitting}
              onChange={e => setTotalSitting(Math.max(1, parseInt(e.target.value) || 1))}
              className="text-base font-bold text-primary"
            />
          </div>

          {/* Distribution Summary Info */}
          <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-500" />
              Bench Layout Preview:
            </div>
            <p className="text-muted-foreground">
              <strong>{benchCount} total benches</strong> ({rows} rows × {columns} columns).
            </p>
            <p className="text-muted-foreground">
              {remainder > 0 ? (
                <>
                  <strong className="text-foreground">{remainder} benches</strong> with {basePerBench + 1} students, and{' '}
                  <strong className="text-foreground">{benchCount - remainder} benches</strong> with {basePerBench} students.
                </>
              ) : (
                <>
                  All benches configured with <strong className="text-foreground">{basePerBench} students</strong> each.
                </>
              )}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {isEditing ? 'Save Changes' : 'Add Classroom'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
