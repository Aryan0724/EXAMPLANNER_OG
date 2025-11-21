

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
    let studentMasterList: Student[] = JSON.parse(JSON.stringify(allStudents));
    const finalAssignments: Seat[] = [];

    let studentQueues = exams
        .map(exam => ({
            exam,
            department: exam.department,
            students: getEligibleStudentsForExam(studentMasterList, exam)
                .map(s => ({ ...s, exam }))
                .sort((a, b) => a.rollNo.localeCompare(b.rollNo))
        }))
        .filter(q => q.students.length > 0)
        .sort((a, b) => b.students.length - a.students.length);

    const availableClassrooms = classrooms
        .filter(room => !exams.some(exam => room.unavailableSlots.some(slot => slot.slotId === exam.id)))
        .sort((a, b) => b.capacity - a.capacity); // Start with largest rooms

    let globalSeatNumber = 1;

    for (const room of availableClassrooms) {
        if (studentQueues.length === 0) break;
        
        const assignmentsForThisRoom: Seat[] = [];

        // Determine the number of benches based on 2-seater benches
        const benchesInRoom = Math.floor(room.capacity / 2);
        if (benchesInRoom === 0) continue;

        // Find a valid pair of queues (different departments)
        let queueA = studentQueues[0];
        let queueB = null;

        for (let i = 1; i < studentQueues.length; i++) {
            if (studentQueues[i].department !== queueA.department) {
                queueB = studentQueues[i];
                break;
            }
        }
        
        // If no valid pair can be found, we can't use the A | B logic. 
        // We'll fill with a single course if that's all that's left.
        if (!queueB) {
            const studentsToSeat = queueA.students.splice(0, room.capacity);
            for(let i=0; i<studentsToSeat.length; i++) {
                 assignmentsForThisRoom.push({
                    student: studentsToSeat[i],
                    classroom: room,
                    seatNumber: globalSeatNumber++,
                });
            }
        } else {
            // Valid A | B pairing
            for (let i = 0; i < benchesInRoom; i++) {
                const studentA = queueA.students.shift();
                const studentB = queueB.students.shift();

                // Left seat
                if (studentA) {
                    assignmentsForThisRoom.push({ student: studentA, classroom: room, seatNumber: globalSeatNumber++ });
                } else {
                     assignmentsForThisRoom.push({ student: null, classroom: room, seatNumber: globalSeatNumber++ });
                }

                // Right seat
                if (studentB) {
                     assignmentsForThisRoom.push({ student: studentB, classroom: room, seatNumber: globalSeatNumber++ });
                } else {
                     assignmentsForThisRoom.push({ student: null, classroom: room, seatNumber: globalSeatNumber++ });
                }
            }
             // Handle odd capacity if exists
            if (room.capacity % 2 !== 0) {
                 const studentA = queueA.students.shift();
                 if (studentA) {
                     assignmentsForThisRoom.push({ student: studentA, classroom: room, seatNumber: globalSeatNumber++ });
                 } else {
                      assignmentsForThisRoom.push({ student: null, classroom: room, seatNumber: globalSeatNumber++ });
                 }
            }
        }
        
        finalAssignments.push(...assignmentsForThisRoom);
        
        // Clean up empty queues and re-sort for the next room
        studentQueues = studentQueues.filter(q => q.students.length > 0).sort((a, b) => b.students.length - a.students.length);
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
    const invigilatorMasterList: Invigilator[] = JSON.parse(JSON.stringify(invigilators));

    const availablePool = invigilatorMasterList.filter((i: Invigilator) => 
        i.isAvailable && 
        !i.unavailableSlots.some(slot => slot.slotId === exam.id)
    );

    // Sort by total duties to balance load across the whole schedule
    availablePool.sort((a, b) => {
        const aTotalDuties = a.assignedDuties.reduce((sum, duty) => sum + duty.count, 0);
        const bTotalDuties = b.assignedDuties.reduce((sum, duty) => sum + duty.count, 0);
        return aTotalDuties - bTotalDuties;
    });

    const assignments: InvigilatorAssignment[] = [];
    let sessionPool = [...availablePool];

    for (const room of classroomsInUse) {
        const requiredInvigilators = room.capacity > 40 ? 2 : 1;

        for (let i = 0; i < requiredInvigilators; i++) {
            if (sessionPool.length === 0) {
                console.warn(`Invigilator pool exhausted for session ${exam.id}. Re-using invigilators. Duty balance may be affected for this session.`);
                // If pool is empty, re-populate it with the initial available invigilators for this session
                // This is a fallback to ensure all rooms get an invigilator
                sessionPool = [...availablePool].sort((a,b) => {
                     const aAssignedThisSession = assignments.filter(as => as.invigilator.id === a.id).length;
                     const bAssignedThisSession = assignments.filter(as => as.invigilator.id === b.id).length;
                     if(aAssignedThisSession !== bAssignedThisSession) return aAssignedThisSession - bAssignedThisSession;
                     // If equal duties in this session, fall back to total duties
                    const aTotalDuties = a.assignedDuties.reduce((sum, duty) => sum + duty.count, 0);
                    const bTotalDuties = b.assignedDuties.reduce((sum, duty) => sum + duty.count, 0);
                    return aTotalDuties - bTotalDuties;
                });
                
                if (sessionPool.length === 0) {
                    console.error("CRITICAL: No available invigilators to assign for room " + room.id);
                    break;
                }
            }
            
            const invigilatorToAssign = sessionPool.shift()!;
            
            assignments.push({
                exam,
                classroom: room,
                invigilator: invigilatorToAssign,
            });
            
            // Find and update the invigilator in the master list
            const invigilatorInMaster = invigilatorMasterList.find(inv => inv.id === invigilatorToAssign.id);
            if (invigilatorInMaster) {
                let dutyRecord = invigilatorInMaster.assignedDuties.find(d => d.date === exam.date);
                if (dutyRecord) {
                    dutyRecord.count++;
                } else {
                    invigilatorInMaster.assignedDuties.push({ date: exam.date, count: 1 });
                }
            }
        }
    }
    return { assignments, updatedInvigilators: invigilatorMasterList };
}
