
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { X, CalendarOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { EXAM_SCHEDULE } from '@/lib/data';
import { AvailabilitySlot, Classroom, Invigilator } from '@/lib/types';


interface AvailabilityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  resource: (Classroom | Invigilator) | null;
  resourceType: 'Classroom' | 'Invigilator';
  onSubmit: (slotId: string, reason: string) => void;
  onRemove: (slotId: string) => void;
}

export function AvailabilityDialog({ isOpen, onClose, resource, resourceType, onSubmit, onRemove }: AvailabilityDialogProps) {
  const [selectedSlot, setSelectedSlot] = useState('');
  const [reason, setReason] = useState('');

  if (!resource) return null;

  const handleSubmit = () => {
    if (!selectedSlot || !reason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select a time slot and provide a reason.',
      });
      return;
    }
    onSubmit(selectedSlot, reason);
    setSelectedSlot('');
    setReason('');
  };

  const getSlotLabel = (slotId: string) => {
    const slot = EXAM_SCHEDULE.find(s => s.id === slotId);
    return slot ? `${slot.date} @ ${slot.time} (${slot.subjectCode})` : 'Unknown Slot';
  }

  const resourceName = 'name' in resource ? resource.name : resource.id;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Availability for {resourceName}</DialogTitle>
          <DialogDescription>
            Mark this {resourceType.toLowerCase()} as unavailable for specific exam slots.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Card>
            <CardHeader>
              <CardTitle>Add Unavailability</CardTitle>
              <CardDescription>Select a slot and specify a reason for unavailability.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exam-slot">Exam Time Slot</Label>
                <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                  <SelectTrigger id="exam-slot">
                    <SelectValue placeholder="Select an exam slot..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAM_SCHEDULE.map(slot => (
                      <SelectItem key={slot.id} value={slot.id}>
                        {slot.date} @ {slot.time} ({slot.subjectCode} - {slot.subjectName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Unavailability</Label>
                <Textarea
                  id="reason"
                  placeholder="e.g., Scheduled Maintenance, Staff on leave"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
               <Button onClick={handleSubmit}>
                <CalendarOff className="mr-2 h-4 w-4" />
                Add Unavailability
              </Button>
            </CardContent>
          </Card>

          {resource.unavailableSlots.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Current Unavailability</CardTitle>
                <CardDescription>
                  This {resourceType.toLowerCase()} is currently marked as unavailable for the following slots.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {resource.unavailableSlots.map((slot: AvailabilitySlot) => (
                  <div key={slot.slotId} className="flex items-center justify-between p-2 border rounded-md">
                    <div>
                      <p className="font-semibold">{getSlotLabel(slot.slotId)}</p>
                      <p className="text-sm text-muted-foreground">{slot.reason}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => onRemove(slot.slotId)}>
                      <X className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Remove Unavailability</span>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
