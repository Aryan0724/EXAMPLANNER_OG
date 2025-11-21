

import type { Student, Classroom, ExamSlot, SeatPlan, Invigilator, InvigilatorAssignment, Seat } from './types';

function getEligibleStudentsForExam(allStudents: Student[], exam: ExamSlot): Student[] {
    return allStudents.filter(s => {
        // Must be registered for the course and department of the exam
        const isTakingExam = s.course === exam.course && s.department === exam.department;
        if (!isTakingExam) {
            return false;
        }

        // If the exam is for a specific group (e.g., Physics/Chemistry cycle), match the student's group
        if (exam.group && s.group !== exam.group) {
            return false;
        }
        
        // Exclude debarred students
        if (s.isDebarred) {
            return false; 
        }

        // Exclude students specifically marked as ineligible for this subject
        const isSpecificallyIneligible = s.ineligibilityRecords?.some(r => r.subjectCode === exam.subjectCode);
        if (isSpecificallyIneligible) {
            return false;
        }

        // Exclude students who have marked themselves as unavailable for this specific exam slot
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
                .sort((a, b) => a.rollNo.localeCompare(b.rollNo)) // Strict roll-no sorting
        }))
        .filter(q => q.students.length > 0)
        .sort((a, b) => b.students.length - a.students.length);

    // 2. Filter and sort available classrooms (largest first)
    const availableClassrooms = classrooms
        .filter(room => !exams.some(exam => room.unavailableSlots.some(slot => slot.slotId === exam.id)))
        .sort((a, b) => b.capacity - a.capacity);
    
    let globalSeatNumber = 1;

    // 3. Process classrooms one by one, filling them completely
    for (const room of availableClassrooms) {
        if (studentQueues.every(q => q.students.length === 0)) break; // All students seated

        // Pick the two largest queues that are from different departments
        studentQueues.sort((a, b) => b.students.length - a.students.length);
        
        let queueA = studentQueues[0];
        let queueB = studentQueues.find(q => q.department !== queueA?.department);

        // If no different department queue is available, just take the next one
        if (!queueB && studentQueues.length > 1) {
            queueB = studentQueues[1];
        }

        if (!queueA) continue; // No more students left to seat

        const benchesInRoom = room.benchCapacities;

        // 4. Bench-based allotment
        for (let i = 0; i < benchesInRoom.length; i++) {
             const benchCapacity = benchesInRoom[i];
             if (benchCapacity < 2) {
                // For single-seater benches, just take from the largest queue
                if (queueA && queueA.students.length > 0) {
                     const student = queueA.students.shift()!;
                     finalAssignments.push({ student: student, classroom: room, seatNumber: globalSeatNumber++ });
                }
             } else {
                 // Left side of the bench
                if (queueA && queueA.students.length > 0) {
                    const student = queueA.students.shift()!;
                    finalAssignments.push({ student: student, classroom: room, seatNumber: globalSeatNumber++ });
                } else {
                     finalAssignments.push({ student: null, classroom: room, seatNumber: globalSeatNumber++ });
                }

                // Right side of the bench
                if (queueB && queueB.students.length > 0) {
                    const student = queueB.students.shift()!;
                    finalAssignments.push({ student: student, classroom: room, seatNumber: globalSeatNumber++ });
                } else {
                    finalAssignments.push({ student: null, classroom: room, seatNumber: globalSeatNumber++ });
                }

                // For 3-seaters, fill the middle seat from the larger queue
                if (benchCapacity === 3) {
                     if (queueA && queueA.students.length > 0) {
                        const student = queueA.students.shift()!;
                        finalAssignments.push({ student: student, classroom: room, seatNumber: globalSeatNumber++ });
                    } else {
                         finalAssignments.push({ student: null, classroom: room, seatNumber: globalSeatNumber++ });
                    }
                }
             }
             
             // After assigning for a bench, check if queues are empty and re-evaluate
             if (queueA && queueA.students.length === 0) {
                studentQueues = studentQueues.filter(q => q.exam.id !== queueA.exam.id);
                queueA = studentQueues[0];
                queueB = studentQueues.find(q => q?.department !== queueA?.department) || studentQueues[1];
             }
             if (queueB && queueB.students.length === 0) {
                studentQueues = studentQueues.filter(q => q.exam.id !== queueB.exam.id);
                queueB = studentQueues.find(q => q?.department !== queueA?.department) || studentQueues[1];
             }
        }
        
        // Remove empty queues from the list
        studentQueues = studentQueues.filter(q => q.students.length > 0);
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
        assignments: finalAssignments,
    };
    
    return { plan, updatedStudents: studentMasterList };
}



export function assignInvigilators(
    invigilators: Invigilator[], 
    classroomsInUse: Classroom[], 
    exam: ExamSlot
): { assignments: InvigilatorAssignment[], updatedInvigilators: Invigilator[] } {
    const invigilatorMasterList = JSON.parse(JSON.stringify(invigilators));

    // Filter invigilators who are generally available and not specifically unavailable for this slot
    let availablePool = invigilatorMasterList.filter((i: Invigilator) => 
        i.isAvailable && 
        !i.unavailableSlots.some(slot => slot.slotId === exam.id)
    );

    // Sort the pool to prioritize those with the fewest total duties
    availablePool.sort((a: Invigilator, b: Invigilator) => {
        const aTotalDuties = a.assignedDuties.reduce((sum, duty) => sum + duty.count, 0);
        const bTotalDuties = b.assignedDuties.reduce((sum, duty) => sum + duty.count, 0);
        return aTotalDuties - bTotalDuties;
    });

    const assignments: InvigilatorAssignment[] = [];
    const assignedInThisSession = new Set<string>();
    let poolIndex = 0;

    for (const room of classroomsInUse) {
        const requiredInvigilators = room.capacity > 40 ? 2 : 1; 

        for (let i = 0; i < requiredInvigilators; i++) {
            if (poolIndex >= availablePool.length) {
                console.warn(`Not enough invigilators for all rooms. Room ${room.id} may be unstaffed.`);
                break; // Break from the inner loop if we run out of invigilators
            }
            
            const invigilatorToAssign = availablePool[poolIndex];
            
            assignments.push({
                exam,
                classroom: room,
                invigilator: invigilatorToAssign,
            });
            
            // Update the duty count for the assigned invigilator in the master list AND the pool
            const invigilatorInMaster = invigilatorMasterList.find((inv: Invigilator) => inv.id === invigilatorToAssign.id);
            if (invigilatorInMaster) {
                let dutyRecord = invigilatorInMaster.assignedDuties.find((d: { date: string; }) => d.date === exam.date);
                if (dutyRecord) {
                    dutyRecord.count++;
                } else {
                    invigilatorInMaster.assignedDuties.push({ date: exam.date, count: 1 });
                }
            }
            // Also update the pool object to ensure correct sorting for the next round
            let poolDutyRecord = invigilatorToAssign.assignedDuties.find((d: { date: string; }) => d.date === exam.date);
            if(poolDutyRecord) {
                poolDutyRecord.count++;
            } else {
                invigilatorToAssign.assignedDuties.push({ date: exam.date, count: 1 });
            }


            poolIndex++; // Move to the next invigilator in the sorted pool
        }

        // After assigning for a room, re-sort the remaining pool to maintain fairness
        if (poolIndex < availablePool.length) {
             const remainingPool = availablePool.slice(poolIndex);
             remainingPool.sort((a: Invigilator, b: Invigilator) => {
                const aTotalDuties = a.assignedDuties.reduce((sum, duty) => sum + duty.count, 0);
                const bTotalDuties = b.assignedDuties.reduce((sum, duty) => sum + duty.count, 0);
                return aTotalDuties - bTotalDuties;
            });
            availablePool = [...availablePool.slice(0, poolIndex), ...remainingPool];
        }
    }
    return { assignments, updatedInvigilators: invigilatorMasterList };
}
