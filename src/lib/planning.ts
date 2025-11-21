

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

    // 1. Create sorted student queues for each exam
    let studentQueues = exams
        .map(exam => ({
            exam,
            department: exam.department,
            students: getEligibleStudentsForExam(studentMasterList, exam)
                .map(s => ({ ...s, exam })) // Tag student with their exam
                .sort((a, b) => a.rollNo.localeCompare(b.rollNo))
        }))
        .filter(q => q.students.length > 0)
        .sort((a, b) => b.students.length - a.students.length);

    // 2. Filter and sort available classrooms
    const availableClassrooms = classrooms
        .filter(room => !exams.some(exam => room.unavailableSlots.some(slot => slot.slotId === exam.id)))
        .sort((a, b) => a.capacity - b.capacity); // Start with smaller rooms to fill them up

    // 3. Fill classrooms one by one
    for (const room of availableClassrooms) {
        if (studentQueues.every(q => q.students.length === 0)) break;

        const assignmentsForThisRoom: Seat[] = [];
        const roomGrid: ((Student & { exam: ExamSlot }) | null)[] = Array(room.capacity).fill(null);

        // Keep track of which queues are being used in this room
        const queuesInRoom = [];

        // Fill the room column by column
        for (let c = 0; c < room.columns; c++) {
            // Find a queue for this column
            let currentQueue;
            // Try to find a new queue not already in this room, from a different department than the previous column
            const lastDept = queuesInRoom[queuesInRoom.length - 1]?.department;
            
            studentQueues.sort((a, b) => b.students.length - a.students.length); // Keep queues sorted by remaining size

            currentQueue = studentQueues.find(q => q.department !== lastDept);

            if (!currentQueue || currentQueue.students.length === 0) {
                 // If no suitable different-department queue, or all queues are empty, try any available queue
                 currentQueue = studentQueues.find(q => q.students.length > 0);
            }

            if (!currentQueue) continue; // No more students to seat

            // Add to room's queue list if it's new
            if (!queuesInRoom.find(q => q.exam.id === currentQueue.exam.id)) {
                queuesInRoom.push(currentQueue);
            }

            // Fill the current column `c`
            for (let r = 0; r < room.rows; r++) {
                const benchIndex = r * room.columns + c;
                const benchCapacity = room.benchCapacities[benchIndex];

                for (let seatInBench = 0; seatInBench < benchCapacity; seatInBench++) {
                     // This calculation needs to be column-major
                    let seatIndex = 0;
                    for (let i = 0; i < c; i++) {
                        for(let j = 0; j < room.rows; j++){
                           seatIndex += room.benchCapacities[j * room.columns + i];
                        }
                    }
                    for(let j = 0; j < r; j++) {
                        seatIndex += room.benchCapacities[j * room.columns + c];
                    }
                    seatIndex += seatInBench;

                    if (seatIndex < room.capacity && roomGrid[seatIndex] === null) {
                        const studentToSeat = currentQueue.students.shift();
                        if (studentToSeat) {
                            roomGrid[seatIndex] = studentToSeat;
                        } else {
                            // Current queue is empty, break from inner loops for this column
                            r = room.rows;
                            break;
                        }
                    }
                }
            }
            // After filling a column, re-filter the main queues
            studentQueues = studentQueues.filter(q => q.students.length > 0);
        }

        // Convert the grid into final assignment objects
        for (let i = 0; i < room.capacity; i++) {
            const student = roomGrid[i];
            assignmentsForThisRoom.push({
                student: student || null,
                classroom: room,
                seatNumber: i + 1,
            });
        }
        
        finalAssignments.push(...assignmentsForThisRoom);
    }
    
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

    let availablePool = invigilatorMasterList.filter((i: Invigilator) => 
        i.isAvailable && 
        !i.unavailableSlots.some(slot => slot.slotId === exam.id)
    );

    availablePool.sort((a: Invigilator, b: Invigilator) => {
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
                 if (availablePool.length === 0) {
                    console.error("No available invigilators to assign for room " + room.id);
                    break; 
                 }
                 console.warn(`Re-using invigilators as pool was exhausted. Room ${room.id} may have unbalanced duties for this session.`);
                 sessionPool = [...availablePool];
                 sessionPool.sort((a,b) => {
                     const aAssigned = assignments.filter(as => as.invigilator.id === a.id).length;
                     const bAssigned = assignments.filter(as => as.invigilator.id === b.id).length;
                     return aAssigned - bAssigned;
                 })
            }
            
            const invigilatorToAssign = sessionPool.shift()!;
            
            assignments.push({
                exam,
                classroom: room,
                invigilator: invigilatorToAssign,
            });
            
            const invigilatorInMaster = invigilatorMasterList.find((inv: Invigilator) => inv.id === invigilatorToAssign.id);
            if (invigilatorInMaster) {
                let dutyRecord = invigilatorInMaster.assignedDuties.find((d: { date: string; }) => d.date === exam.date);
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
