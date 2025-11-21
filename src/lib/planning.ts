

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
                .sort((a, b) => a.rollNo.localeCompare(b.rollNo))
        }))
        .filter(q => q.students.length > 0)
        .sort((a, b) => b.students.length - a.students.length);

    // 2. Filter and sort available classrooms (largest first)
    const availableClassrooms = classrooms
        .filter(room => !exams.some(exam => room.unavailableSlots.some(slot => slot.slotId === exam.id)))
        .sort((a, b) => b.capacity - a.capacity);
    
    // 3. Iterate through classrooms and fill them completely one by one
    for (const room of availableClassrooms) {
        if (studentQueues.every(q => q.students.length === 0)) break; // All students seated

        studentQueues.sort((a, b) => b.students.length - a.students.length);

        const assignmentsForThisRoom: Seat[] = [];
        let totalSeatsInRoom = room.benchCapacities.reduce((a, b) => a + b, 0);

        // This creates an array representing all seats in the room, e.g., [1, 2, 3, ...]
        const seatNumbersInRoom = Array.from({ length: totalSeatsInRoom }, (_, i) => i + 1);
        
        for (const seatNumber of seatNumbersInRoom) {
            // Re-sort queues every time to pick the current largest
            studentQueues.sort((a, b) => b.students.length - a.students.length);

            let queueA = studentQueues[0];
            let queueB = studentQueues.find(q => q.department !== queueA?.department) ?? studentQueues[1];

            // Alternate between Course A and Course B for each seat
            // Odd seat numbers try to pull from queue A, Even from queue B
            let studentToAssign: (Student & { exam: ExamSlot }) | undefined;
            if (seatNumber % 2 !== 0) { // Odd seats -> try Course A first
                studentToAssign = queueA?.students.shift();
                if (!studentToAssign) { // If A is empty, try B
                    studentToAssign = queueB?.students.shift();
                }
            } else { // Even seats -> try Course B first
                 studentToAssign = queueB?.students.shift();
                 if (!studentToAssign) { // If B is empty, try A
                    studentToAssign = queueA?.students.shift();
                 }
            }
            
            if (studentToAssign) {
                assignmentsForThisRoom.push({ student: studentToAssign, classroom: room, seatNumber });
            } else {
                // If no student can be assigned, the seat is empty
                assignmentsForThisRoom.push({ student: null, classroom: room, seatNumber });
            }
            
            // Clean up empty queues
            studentQueues = studentQueues.filter(q => q.students.length > 0);
        }
        
        finalAssignments.push(...assignmentsForThisRoom);
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
    let poolIndex = 0;

    for (const room of classroomsInUse) {
        const requiredInvigilators = room.capacity > 40 ? 2 : 1; 

        for (let i = 0; i < requiredInvigilators; i++) {
            if (poolIndex >= availablePool.length) {
                // If we run out, reset and reuse invigilators to ensure all rooms are staffed
                poolIndex = 0; 
                console.warn(`Re-using invigilators as pool was exhausted. Room ${room.id} may have unbalanced duties.`);
                 if (availablePool.length === 0) {
                    console.error("No available invigilators to assign.");
                    break;
                 }
            }
            
            const invigilatorToAssign = availablePool[poolIndex];
            
            assignments.push({
                exam,
                classroom: room,
                invigilator: invigilatorToAssign,
            });
            
            // Update the duty count for the assigned invigilator in the master list
            const invigilatorInMaster = invigilatorMasterList.find((inv: Invigilator) => inv.id === invigilatorToAssign.id);
            if (invigilatorInMaster) {
                let dutyRecord = invigilatorInMaster.assignedDuties.find((d: { date: string; }) => d.date === exam.date);
                if (dutyRecord) {
                    dutyRecord.count++;
                } else {
                    invigilatorInMaster.assignedDuties.push({ date: exam.date, count: 1 });
                }
            }
          
            poolIndex++;
        }

        // Re-sort the entire pool after each room assignment to always pick the one with least duties
         availablePool.sort((a: Invigilator, b: Invigilator) => {
            const aTotalDuties = a.assignedDuties.reduce((sum, duty) => sum + duty.count, 0);
            const bTotalDuties = b.assignedDuties.reduce((sum, duty) => sum + duty.count, 0);
            return aTotalDuties - bTotalDuties;
        });
        poolIndex = 0; // Reset index to start from the new "least-dutied" invigilator for the next room
    }
    return { assignments, updatedInvigilators: invigilatorMasterList };
}
