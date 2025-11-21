

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
    let finalAssignments: Seat[] = [];
    const studentMasterList = [...allStudents];
    
    // 1. Get all students needing a seat for this session, sorted by roll number
    const studentsNeedingSeats: (Student & { exam: ExamSlot })[] = [];
    for (const exam of exams) {
        const studentPoolForExam = getEligibleStudentsForExam(studentMasterList, exam)
            .map(s => ({ ...s, exam })) // Tag each student with their exam
            .filter(s => !s.isDebarred); // Debarred students don't get a seat

        studentsNeedingSeats.push(...studentPoolForExam);
    }
    // Sort all students for this session by roll number
    studentsNeedingSeats.sort((a, b) => a.rollNo.localeCompare(b.rollNo));

    // 2. Filter and sort available classrooms (largest first is more efficient)
    const availableClassrooms = classrooms
        .filter(room => !exams.some(exam => room.unavailableSlots.some(slot => slot.slotId === exam.id)))
        .sort((a, b) => b.capacity - a.capacity);

    // 3. Fill classrooms one by one
    let studentIndex = 0;
    for (const room of availableClassrooms) {
        if (studentIndex >= studentsNeedingSeats.length) {
            break; // All students have been seated
        }

        const seatsInRoom = room.capacity;
        let seatsFilled = 0;

        // Iterate through each seat in the current classroom
        for (let i = 0; i < seatsInRoom && studentIndex < studentsNeedingSeats.length; i++) {
            const student = studentsNeedingSeats[studentIndex];
            const seatNumber = i + 1;

            const newAssignment = { classroomId: room.id, seatNumber };
            
            // Update the master list of students with their new assignment
            const masterListIndex = studentMasterList.findIndex(s => s.id === student.id);
            if (masterListIndex !== -1) {
                studentMasterList[masterListIndex].seatAssignment = newAssignment;
            }

            finalAssignments.push({
                student,
                classroom: room,
                seatNumber,
            });

            studentIndex++;
            seatsFilled++;
        }
    }
    
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

