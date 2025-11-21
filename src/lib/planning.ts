

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
        
        if (s.isDebarred) {
            return false; 
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
    const studentMasterList = JSON.parse(JSON.stringify(allStudents));

    // 1. Create sorted queues of students for each exam, largest first
    let studentQueues = exams
        .map(exam => ({
            exam,
            department: exam.department,
            students: getEligibleStudentsForExam(studentMasterList, exam)
                .map(s => ({ ...s, exam })) // Tag student with their exam
                .sort((a, b) => a.rollNo.localeCompare(b.rollNo))
        }))
        .sort((a, b) => b.students.length - a.students.length);

    // 2. Filter and sort available classrooms (largest first)
    const availableClassrooms = classrooms
        .filter(room => !exams.some(exam => room.unavailableSlots.some(slot => slot.slotId === exam.id)))
        .sort((a, b) => b.capacity - a.capacity);
    
    let globalSeatIndex = 0;

    // 3. Process classrooms one by one
    for (const room of availableClassrooms) {
        if (studentQueues.every(q => q.students.length === 0)) break; // All students seated

        let roomSeatIndex = 0;
        const benchesInRoom = room.benchCapacities.length;
        
        for (let benchIndex = 0; benchIndex < benchesInRoom; benchIndex++) {
            const benchCapacity = room.benchCapacities[benchIndex];
            if (benchCapacity < 2) continue; // Skip benches that can't be paired

            // Re-sort queues to always pick the largest two
            studentQueues.sort((a, b) => b.students.length - a.students.length);
            
            const queueA = studentQueues[0];
            const queueB = studentQueues[1];

            // --- PAIRING LOGIC ---
            // Left Side
            if (queueA && queueA.students.length > 0) {
                const studentA = queueA.students.shift();
                if (studentA) {
                    finalAssignments.push({ student: studentA, classroom: room, seatNumber: globalSeatIndex + 1 });
                }
            }
            
            // Right Side
            if (queueB && queueB.students.length > 0) {
                const studentB = queueB.students.shift();
                if (studentB) {
                    finalAssignments.push({ student: studentB, classroom: room, seatNumber: globalSeatIndex + 2 });
                }
            } else if (queueA && queueA.students.length > 0) {
                // If no more students in B, fill with A
                const studentA2 = queueA.students.shift();
                if (studentA2) {
                     finalAssignments.push({ student: studentA2, classroom: room, seatNumber: globalSeatIndex + 2 });
                }
            }
            globalSeatIndex += benchCapacity;
             // Remove empty queues
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
    availablePool.sort((a, b) => {
        const aTotalDuties = a.assignedDuties.reduce((sum, duty) => sum + duty.count, 0);
        const bTotalDuties = b.assignedDuties.reduce((sum, duty) => sum + duty.count, 0);
        return aTotalDuties - bTotalDuties;
    });

    const assignments: InvigilatorAssignment[] = [];
    const assignedInThisSession = new Set<string>();

    for (const room of classroomsInUse) {
        const requiredInvigilators = room.capacity > 40 ? 2 : 1; 

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
                console.warn(`Not enough invigilators for room ${room.id}.`);
                break;
            }
        }
    }
    return { assignments, updatedInvigilators: invigilatorMasterList };
}
