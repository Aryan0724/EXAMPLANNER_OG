

import type { Student, Classroom, ExamSlot, SeatPlan, Invigilator, InvigilatorAssignment, Seat } from './types';

function getEligibleStudentsForExam(allStudents: Student[], exam: ExamSlot): Student[] {
    return allStudents.filter(s => {
        const isTakingExam = s.course === exam.course && s.department === exam.department;
        if (!isTakingExam) {
            return false;
        }

        if (exam.group && s.group !== exam.group) {
            return false;
        }
        
        // A debarred student is still part of the "eligible" pool for planning purposes
        // so their seat can be reserved. They are filtered out from being *seated* later.
        if (s.isDebarred) {
            return true; 
        }

        const isSpecificallyIneligible = s.ineligibilityRecords?.some(r => r.subjectCode === exam.subjectCode);
        if (isSpecificallyIneligible) {
            return false;
        }

        const isUnavailable = s.unavailableSlots.some(slot => slot.slotId === exam.id);
        
        return !isUnavailable;
    });
}


export function generateSeatPlan(
    allStudents: Student[],
    classrooms: Classroom[],
    exams: ExamSlot[]
): { plan: SeatPlan; updatedStudents: Student[] } {
    const finalAssignments: Seat[] = [];
    let studentMasterList = JSON.parse(JSON.stringify(allStudents));

    // 1. Create sorted queues of students for each exam, largest first
    let studentQueues = exams.map(exam => ({
        exam,
        department: exam.department,
        students: getEligibleStudentsForExam(studentMasterList, exam)
            .filter(s => !s.isDebarred)
            .map(s => ({ ...s, exam })) // Tag student with their exam
            .sort((a, b) => a.rollNo.localeCompare(b.rollNo))
    })).sort((a, b) => b.students.length - a.students.length);

    // 2. Filter and sort available classrooms (largest first)
    const availableClassrooms = classrooms
        .filter(room => !exams.some(exam => room.unavailableSlots.some(slot => slot.slotId === exam.id)))
        .sort((a, b) => b.capacity - a.capacity);

    // 3. Process classrooms one by one
    for (const room of availableClassrooms) {
        if (studentQueues.every(q => q.students.length === 0)) {
            break; // All students seated
        }

        // 4. Pair courses for the current room
        const primaryQueue = studentQueues.find(q => q.students.length > 0);
        if (!primaryQueue) continue; // No more students to seat

        const secondaryQueue = studentQueues.find(q => q.students.length > 0 && q.department !== primaryQueue.department);
        
        let seatIndex = 0;
        
        // Iterate through benches
        for (const benchCapacity of room.benchCapacities) {
            if (benchCapacity >= 2 && primaryQueue.students.length > 0 && secondaryQueue && secondaryQueue.students.length > 0) {
                // --- PAIRING LOGIC ---
                // Left Side
                const studentA = primaryQueue.students.shift();
                if (studentA) {
                    finalAssignments.push({ student: studentA, classroom: room, seatNumber: seatIndex + 1 });
                }
                
                // Right Side
                const studentB = secondaryQueue.students.shift();
                if (studentB) {
                    finalAssignments.push({ student: studentB, classroom: room, seatNumber: seatIndex + 2 });
                }
                seatIndex += benchCapacity;

            } else {
                 // --- SINGLE FILE LOGIC ---
                 // If no secondary queue or bench capacity is 1, fill with primary queue
                 for(let i=0; i < benchCapacity; i++){
                    const student = primaryQueue.students.shift();
                    if(student) {
                        finalAssignments.push({ student: student, classroom: room, seatNumber: seatIndex + 1 });
                    }
                    seatIndex++;
                 }
            }

            if (primaryQueue.students.length === 0 && (!secondaryQueue || secondaryQueue.students.length === 0)) {
                 break; // Both queues are empty
            }
             // Filter out empty queues for the next room
            studentQueues = studentQueues.filter(q => q.students.length > 0);
        }
    }
    
    // Update master list with seat assignments
    finalAssignments.forEach(assignment => {
        if (assignment.student) {
            const masterListIndex = studentMasterList.findIndex((s: Student) => s.id === assignment.student!.id);
            if (masterListIndex !== -1) {
                studentMasterList[masterListIndex].seatAssignment = {
                    classroomId: assignment.classroom.id,
                    seatNumber: assignment.seatNumber,
                };
            }
        }
    });

    const plan: SeatPlan = {
        exam: exams.length > 1 ? exams : exams[0],
        assignments: finalAssignments.sort((a, b) => {
            if (a.classroom.id < b.classroom.id) return -1;
            if (a.classroom.id > b.classroom.id) return 1;
            return a.seatNumber - b.seatNumber;
        }),
    };
    
    return { plan, updatedStudents: studentMasterList };
}


export function assignInvigilators(
    invigilators: Invigilator[], 
    classroomsInUse: Classroom[], 
    exam: ExamSlot
): { assignments: InvigilatorAssignment[], updatedInvigilators: Invigilator[] } {
    const invigilatorMasterList = [...invigilators];

    // Filter invigilators who are generally available and not specifically unavailable for this slot
    let availablePool = invigilatorMasterList.filter(i => 
        i.isAvailable && 
        !i.unavailableSlots.some(slot => slot.slotId === exam.id)
    );

    // Sort the pool to prioritize those with the fewest total duties
    // This is the key change for balanced duty allocation over the whole schedule
    availablePool.sort((a, b) => {
        const aTotalDuties = a.assignedDuties.reduce((sum, duty) => sum + duty.count, 0);
        const bTotalDuties = b.assignedDuties.reduce((sum, duty) => sum + duty.count, 0);
        return aTotalDuties - bTotalDuties;
    });

    const assignments: InvigilatorAssignment[] = [];
    const assignedInThisSession = new Set<string>();

    for (const room of classroomsInUse) {
        const requiredInvigilators = room.capacity > 40 ? 2 : 1; // e.g. 2 invigilators for rooms with >40 capacity

        for (let i = 0; i < requiredInvigilators; i++) {
            // Find the next available invigilator who hasn't been assigned in this session yet
            const invigilatorToAssign = availablePool.find(inv => !assignedInThisSession.has(inv.id));

            if (invigilatorToAssign) {
                assignments.push({
                    exam,
                    classroom: room,
                    invigilator: invigilatorToAssign,
                });
                
                // Mark as assigned for this session to avoid re-assignment to another room
                assignedInThisSession.add(invigilatorToAssign.id);

                // Update the duty count in the master list
                const invigilatorInMaster = invigilatorMasterList.find(inv => inv.id === invigilatorToAssign.id);
                if (invigilatorInMaster) {
                    let dutyRecord = invigilatorInMaster.assignedDuties.find(d => d.date === exam.date);
                    if (dutyRecord) {
                        dutyRecord.count++;
                    } else {
                        invigilatorInMaster.assignedDuties.push({ date: exam.date, count: 1 });
                    }
                }
            } else {
                // If we run out of invigilators, we might have to re-use them.
                // For simplicity now, we stop. A more complex system could re-assign.
                console.warn(`Not enough invigilators for room ${room.id}.`);
                break;
            }
        }
    }
    return { assignments, updatedInvigilators: invigilatorMasterList };
}

