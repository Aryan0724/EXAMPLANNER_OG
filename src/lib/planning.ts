

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

    let seatNumberOffset = 0;

    for (const room of availableClassrooms) {
        if (studentQueues.every(q => q.students.length === 0)) break;

        // Find the best pair of queues for this room
        studentQueues.sort((a, b) => b.students.length - a.students.length);
        let queueA = studentQueues[0];
        let queueB = studentQueues.find(q => q.department !== queueA.department);

        if (!queueA) break; // No students left

        const assignmentsForThisRoom: Seat[] = [];
        const benches = Math.floor(room.capacity / 2); // Assuming 2-seater benches for simplicity here

        for (let i = 0; i < benches; i++) {
            const studentA = queueA.students.shift();
            const studentB = queueB ? queueB.students.shift() : undefined;

            const seatIndexA = i * 2;
            const seatIndexB = i * 2 + 1;
            
            // Seat from Course A
            if (studentA) {
                assignmentsForThisRoom[seatIndexA] = {
                    student: studentA,
                    classroom: room,
                    seatNumber: seatNumberOffset + seatIndexA + 1,
                };
            }

            // Seat from Course B
            if (studentB) {
                 assignmentsForThisRoom[seatIndexB] = {
                    student: studentB,
                    classroom: room,
                    seatNumber: seatNumberOffset + seatIndexB + 1,
                };
            }
        }
        
        // Fill up any remaining single seats if total capacity is odd
        if(room.capacity % 2 !== 0 && queueA.students.length > 0) {
            const studentA = queueA.students.shift();
            const seatIndex = room.capacity - 1;
            if(studentA){
                 assignmentsForThisRoom[seatIndex] = {
                    student: studentA,
                    classroom: room,
                    seatNumber: seatNumberOffset + seatIndex + 1,
                };
            }
        }


        // Fill placeholders for empty seats in this room
        for (let i = 0; i < room.capacity; i++) {
            if (!assignmentsForThisRoom[i]) {
                assignmentsForThisRoom[i] = {
                    student: null,
                    classroom: room,
                    seatNumber: seatNumberOffset + i + 1,
                };
            }
        }
        
        finalAssignments.push(...assignmentsForThisRoom);
        seatNumberOffset += room.capacity;

        // Remove empty queues
        studentQueues = studentQueues.filter(q => q.students.length > 0);
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
