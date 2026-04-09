'use client';

import { useState, useEffect } from 'react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Invigilator } from '@/lib/types';

interface InvigilatorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (invigilator: Invigilator) => void;
    invigilator: Invigilator | null;
    departments: string[];
}

export function InvigilatorDialog({
    isOpen,
    onClose,
    onSave,
    invigilator,
    departments,
}: InvigilatorDialogProps) {
    const [formData, setFormData] = useState<Partial<Invigilator>>({
        id: '',
        name: '',
        department: '',
        designation: 'Assistant Professor',
        gender: 'Male',
        isAvailable: true,
        unavailableSlots: [],
        assignedDuties: [],
    });

    useEffect(() => {
        if (invigilator) {
            setFormData(invigilator);
        } else {
            setFormData({
                id: `I${Math.floor(100 + Math.random() * 899)}`,
                name: '',
                department: departments[0] || '',
                designation: 'Assistant Professor',
                gender: 'Male',
                isAvailable: true,
                unavailableSlots: [],
                assignedDuties: [],
            });
        }
    }, [invigilator, isOpen, departments]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.name && formData.department && formData.designation && formData.gender) {
            onSave(formData as Invigilator);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{invigilator ? 'Edit Invigilator' : 'Add New Invigilator'}</DialogTitle>
                        <DialogDescription>
                            Enter the staff details below. All fields are required.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="id" className="text-right">ID</Label>
                            <Input
                                id="id"
                                value={formData.id}
                                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                                className="col-span-3 font-mono"
                                placeholder="e.g. I001"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="col-span-3"
                                placeholder="Dr. S. Sharma"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="dept" className="text-right">Dept.</Label>
                            <div className="col-span-3">
                                <Select
                                    value={formData.department}
                                    onValueChange={(val) => setFormData({ ...formData, department: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map((dept) => (
                                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="desig" className="text-right">Rank</Label>
                            <div className="col-span-3">
                                <Select
                                    value={formData.designation}
                                    onValueChange={(val: any) => setFormData({ ...formData, designation: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Designation" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Professor">Professor</SelectItem>
                                        <SelectItem value="Associate Professor">Associate Professor</SelectItem>
                                        <SelectItem value="Assistant Professor">Assistant Professor</SelectItem>
                                        <SelectItem value="Tutor">Tutor</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="gender" className="text-right">Gender</Label>
                            <div className="col-span-3">
                                <Select
                                    value={formData.gender}
                                    onValueChange={(val: any) => setFormData({ ...formData, gender: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Gender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
