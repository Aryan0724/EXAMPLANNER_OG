
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Classroom } from '@/lib/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface BlockPriorityDialogProps {
    isOpen: boolean;
    onClose: () => void;
    currentPriority: string[];
    excludedBlocks: string[];
    excludedRooms: string[];
    availableBlocks: string[];
    classrooms: Classroom[];
    onSave: (priority: string[], exBlocks: string[], exRooms: string[]) => void;
}

export function BlockPriorityDialog({
    isOpen,
    onClose,
    currentPriority,
    excludedBlocks,
    excludedRooms,
    availableBlocks,
    classrooms,
    onSave,
}: BlockPriorityDialogProps) {
    const [priorityList, setPriorityList] = useState<string[]>([]);
    const [localExcludedBlocks, setLocalExcludedBlocks] = useState<string[]>([]);
    const [localExcludedRooms, setLocalExcludedRooms] = useState<string[]>([]);
    const [openBlocks, setOpenBlocks] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            const mergedSet = new Set([...currentPriority, ...availableBlocks]);
            const mergedList = Array.from(mergedSet).filter(b => availableBlocks.includes(b));
            setPriorityList(mergedList);
            setLocalExcludedBlocks(excludedBlocks);
            setLocalExcludedRooms(excludedRooms);
        }
    }, [isOpen, currentPriority, availableBlocks, excludedBlocks, excludedRooms]);

    const moveUp = (index: number) => {
        if (index === 0) return;
        const newList = [...priorityList];
        [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
        setPriorityList(newList);
    };

    const moveDown = (index: number) => {
        if (index === priorityList.length - 1) return;
        const newList = [...priorityList];
        [newList[index + 1], newList[index]] = [newList[index], newList[index + 1]];
        setPriorityList(newList);
    };

    const toggleBlockExclusion = (block: string) => {
        setLocalExcludedBlocks(prev =>
            prev.includes(block) ? prev.filter(b => b !== block) : [...prev, block]
        );
    };

    const toggleRoomExclusion = (roomId: string) => {
        setLocalExcludedRooms(prev =>
            prev.includes(roomId) ? prev.filter(r => r !== roomId) : [...prev, roomId]
        );
    };

    const toggleBlockOpen = (block: string) => {
        setOpenBlocks(prev =>
            prev.includes(block) ? prev.filter(b => b !== block) : [...prev, block]
        );
    };

    const handleSave = () => {
        onSave(priorityList, localExcludedBlocks, localExcludedRooms);
        onClose();
    };

    const getRoomsForBlock = (block: string) => {
        return classrooms.filter(c => c.building === block).sort((a, b) => a.roomNo.localeCompare(b.roomNo));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Allotment Settings</DialogTitle>
                    <DialogDescription>
                        Prioritize blocks and select specific classrooms for allotment. Unchecked items will be excluded.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-hidden py-2">
                    <ScrollArea className="h-[50vh] pr-4">
                        <div className="space-y-2">
                            {priorityList.map((block, index) => {
                                const rooms = getRoomsForBlock(block);
                                const isBlockExcluded = localExcludedBlocks.includes(block);
                                const isOpen = openBlocks.includes(block);

                                return (
                                    <div key={block} className="border rounded-md bg-card">
                                        <div className="flex items-center justify-between p-3">
                                            <div className="flex items-center gap-3">
                                                <Checkbox
                                                    checked={!isBlockExcluded}
                                                    onCheckedChange={() => toggleBlockExclusion(block)}
                                                />
                                                <Badge variant="outline" className="h-6 w-6 flex items-center justify-center rounded-full p-0">
                                                    {index + 1}
                                                </Badge>
                                                <span className={`font-medium ${isBlockExcluded ? 'text-muted-foreground line-through' : ''}`}>
                                                    {block}
                                                </span>
                                                <Badge variant="secondary" className="text-xs">
                                                    {rooms.length} Rooms
                                                </Badge>
                                            </div>
                                            <div className="flex gap-1 items-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    disabled={index === 0}
                                                    onClick={() => moveUp(index)}
                                                    title="Move Up"
                                                >
                                                    <ArrowUp className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    disabled={index === priorityList.length - 1}
                                                    onClick={() => moveDown(index)}
                                                    title="Move Down"
                                                >
                                                    <ArrowDown className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => toggleBlockOpen(block)}
                                                >
                                                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>

                                        {isOpen && (
                                            <div className="p-3 pt-0 pl-12 space-y-1 border-t bg-muted/20">
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    {rooms.map(room => {
                                                        const isRoomExcluded = localExcludedRooms.includes(room.id);
                                                        const isEffectiveExcluded = isBlockExcluded || isRoomExcluded;
                                                        return (
                                                            <div key={room.id} className="flex items-center space-x-2">
                                                                <Checkbox
                                                                    id={room.id}
                                                                    checked={!isRoomExcluded}
                                                                    disabled={isBlockExcluded}
                                                                    onCheckedChange={() => toggleRoomExclusion(room.id)}
                                                                />
                                                                <label
                                                                    htmlFor={room.id}
                                                                    className={`text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${isEffectiveExcluded ? 'text-muted-foreground' : ''}`}
                                                                >
                                                                    {room.roomNo} <span className="text-xs text-muted-foreground">({room.capacity})</span>
                                                                </label>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {priorityList.length === 0 && (
                                <div className="text-center text-muted-foreground py-8">
                                    No blocks found. Add classrooms first.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save Settings</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
