

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

// Function to get the seat index for column-wise filling
function getSeatIndex(row: number, col: number, numRows: number): number {
    return col * numRows + row;
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
        .sort((a, b) => b.capacity - a.capacity);

    // 3. Fill classrooms one by one
    for (const room of availableClassrooms) {
        if (studentQueues.every(q => q.students.length === 0)) break; // All students seated

        // Identify the top 2 departments with the most students remaining
        const sortedQueues = studentQueues.sort((a, b) => b.students.length - a.students.length);
        const queueA = sortedQueues[0];
        const queueB = sortedQueues.find(q => q.department !== queueA?.department);

        const queuesForRoom = [queueA, queueB].filter(Boolean);
        if (queuesForRoom.length === 0) continue;

        const assignmentsForThisRoom: Seat[] = [];
        
        // Create an empty seating grid for the classroom
        const roomGrid: ((Student & { exam: ExamSlot }) | null)[] = Array(room.capacity).fill(null);
        let seatCounter = 0;

        // Assign students column by column
        for (let c = 0; c < room.columns; c++) {
            for (let r = 0; r < room.rows; r++) {
                 const benchIndexInGrid = r * room.columns + c;
                 const seatsInBench = room.benchCapacities[benchIndexInGrid];

                 for (let s = 0; s < seatsInBench; s++) {
                     if (seatCounter >= room.capacity) continue;

                     // Alternate which queue is assigned based on the column
                     const currentQueue = c % 2 === 0 ? queuesForRoom[0] : (queuesForRoom[1] || queuesForRoom[0]);
                     
                     if (currentQueue && currentQueue.students.length > 0) {
                         const student = currentQueue.students.shift();
                         if (student) {
                             roomGrid[seatCounter] = student;
                         }
                     }
                     seatCounter++;
                 }
            }
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
        
        // Clean up empty queues
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
    
    // Create a temporary pool for this session to track assignments
    let sessionPool = [...availablePool];

    for (const room of classroomsInUse) {
        const requiredInvigilators = room.capacity > 40 ? 2 : 1;

        for (let i = 0; i < requiredInvigilators; i++) {
            // If the pool runs out, reset it but continue assigning.
            if (sessionPool.length === 0) {
                 if (availablePool.length === 0) {
                    console.error("No available invigilators to assign for room " + room.id);
                    break; 
                 }
                 console.warn(`Re-using invigilators as pool was exhausted. Room ${room.id} may have unbalanced duties for this session.`);
                 sessionPool = [...availablePool]; // Reset from the main available pool
                 // Re-sort session pool based on duties already assigned in this session
                 sessionPool.sort((a,b) => {
                     const aAssigned = assignments.filter(as => as.invigilator.id === a.id).length;
                     const bAssigned = assignments.filter(as => as.invigilator.id === b.id).length;
                     return aAssigned - bAssigned;
                 })
            }
            
            const invigilatorToAssign = sessionPool.shift()!; // Remove from session pool
            
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
