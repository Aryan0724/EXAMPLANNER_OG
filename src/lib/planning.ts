

import type { Student, Classroom, ExamSlot, SeatPlan, Invigilator, InvigilatorAssignment, Seat } from './types';

function getEligibleStudentsForExam(allStudents: Student[], exam: ExamSlot): Student[] {
    return allStudents.filter(s => {
        // Debarred students are handled separately, but we still need to know they *would* have taken the exam
        // to reserve their seat.
        const isTakingExam = s.course === exam.course && s.department === exam.department;
        if (!isTakingExam) {
            return false;
        }

        // Handle group-based subjects
        if (exam.group && s.group !== exam.group) {
            return false;
        }
        
        // If debarred, they are eligible to have their seat reserved, but not to be seated.
        if (s.isDebarred) {
            return true; 
        }

        // Check for subject-specific ineligibility
        const isSpecificallyIneligible = s.ineligibilityRecords?.some(r => r.subjectCode === exam.subjectCode);
        if (isSpecificallyIneligible) {
            return false;
        }

        // Check for general unavailability for this slot
        const isUnavailable = s.unavailableSlots.some(slot => slot.slotId === exam.id);
        
        return !isUnavailable;
    });
}


export function generateSeatPlan(
    allStudents: Student[], 
    classrooms: Classroom[], 
    exams: ExamSlot[]
): { plan: SeatPlan; updatedStudents: Student[] } {
    let assignments: Seat[] = [];
    const studentMasterList = [...allStudents]; 

    // 1. Get all students for the current concurrent exam session(s)
    const eligibleStudentPool = exams.flatMap(exam =>
        getEligibleStudentsForExam(studentMasterList, exam).map(student => ({ ...student, exam: exam }))
    );

    const studentsToAssign: (Student & {exam: ExamSlot})[] = [];
    const assignedSeatsByLocation = new Map<string, Seat>(); // Key: 'classroomId-seatNumber'

    // 2. Process all students in the pool. If they have a seat, reserve it. If not, add them to the queue to be seated.
    for (const student of eligibleStudentPool) {
        if (student.seatAssignment) {
            const { classroomId, seatNumber } = student.seatAssignment;
            const classroom = classrooms.find(c => c.id === classroomId);
            if (classroom) {
                 const key = `${classroomId}-${seatNumber}`;
                 const seat: Seat = {
                     student: student.isDebarred ? null : student,
                     isDebarredSeat: student.isDebarred, // Mark seat as reserved for debarred student
                     classroom: classroom,
                     seatNumber: seatNumber
                 };
                 assignments.push(seat);
                 assignedSeatsByLocation.set(key, seat);
            }
        } else if (!student.isDebarred) { // Debarred students without a seat yet are just ignored for this session
            studentsToAssign.push(student);
        }
    }
    
    // 3. Sort classrooms and prepare for new assignments
    const sortedClassrooms = [...classrooms]
        .filter(room => !exams.some(exam => room.unavailableSlots.some(slot => slot.slotId === exam.id)))
        .sort((a, b) => a.capacity - b.capacity);

    // 4. Group students needing seats by their subject and course to ensure they are seated together.
    const studentsBySubject = studentsToAssign.reduce((acc, student) => {
        const key = `${student.exam.subjectCode}-${student.exam.course}`;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(student);
        return acc;
    }, {} as Record<string, (Student & { exam: ExamSlot })[]>);
    
    const subjectQueues = Object.values(studentsBySubject);
    let totalStudentsToSeat = studentsToAssign.length;
    
    // 5. Iterate through classrooms and benches to assign remaining students
    for (const room of sortedClassrooms) {
        if (totalStudentsToSeat === 0) break;

        let seatCounterInRoom = 0;
        for (let benchIndex = 0; benchIndex < room.benchCapacities.length; benchIndex++) {
            if (totalStudentsToSeat === 0) break;
            
            const benchCapacity = room.benchCapacities[benchIndex];
            
            for (let seatOnBench = 0; seatOnBench < benchCapacity; seatOnBench++) {
                seatCounterInRoom++;
                const seatKey = `${room.id}-${seatCounterInRoom}`;
                
                // If seat is already taken by a returning student, skip it
                if (assignedSeatsByLocation.has(seatKey)) {
                    continue;
                }

                if (totalStudentsToSeat === 0) break;

                // Sort queues to prioritize the one with the most students remaining
                subjectQueues.sort((a, b) => b.length - a.length);

                for (let i = 0; i < subjectQueues.length; i++) {
                    const currentQueue = subjectQueues[i];
                    if (currentQueue.length > 0) {
                        const studentToPlace = currentQueue.shift();
                        if (studentToPlace) {
                            // PERSIST the seat assignment back to the master list
                            const studentIndexInMaster = studentMasterList.findIndex(s => s.id === studentToPlace.id);
                            if (studentIndexInMaster !== -1) {
                                const newAssignment = {
                                    classroomId: room.id,
                                    seatNumber: seatCounterInRoom
                                };
                                studentMasterList[studentIndexInMaster].seatAssignment = newAssignment;
                                // Update student object for current plan as well
                                studentToPlace.seatAssignment = newAssignment;
                            }

                            const newSeat: Seat = {
                                student: studentToPlace,
                                classroom: room,
                                seatNumber: seatCounterInRoom
                            };
                            assignments.push(newSeat); // Add to final plan
                            assignedSeatsByLocation.set(seatKey, newSeat);
                            totalStudentsToSeat--;
                            break; // Move to the next seat
                        }
                    }
                }
            }
        }
    }

    const plan: SeatPlan = {
        exam: exams.length > 1 ? exams : exams[0],
        assignments,
    };
    
    return { plan, updatedStudents: studentMasterList };
}


export function assignInvigilators(
    invigilators: Invigilator[], 
    classroomsInUse: Classroom[], 
    exam: ExamSlot
): { assignments: InvigilatorAssignment[], updatedInvigilators: Invigilator[] } {
    const invigilatorMasterList = [...invigilators];

    // Find the date of the previous day
    const examDate = new Date(exam.date);
    const prevDate = new Date(examDate);
    prevDate.setDate(examDate.getDate() - 1);
    const prevDateString = prevDate.toISOString().split('T')[0];

    // Filter available invigilators: must be generally available, not unavailable for this slot, and preferably didn't work yesterday.
    let primaryPool = invigilatorMasterList.filter(i => 
        i.isAvailable && 
        !i.unavailableSlots.some(slot => slot.slotId === exam.id) &&
        !i.assignedDuties.some(d => d.date === prevDateString)
    );

    // If not enough, use a secondary pool of anyone available, even if they worked yesterday.
    if (primaryPool.length < classroomsInUse.length * 2) { // rough estimate of need
        primaryPool = invigilatorMasterList.filter(i => 
            i.isAvailable && 
            !i.unavailableSlots.some(slot => slot.slotId === exam.id)
        );
    }
    
    // Sort by fewest duties on the current day to distribute work evenly.
    primaryPool.sort((a, b) => {
        const aDutiesToday = a.assignedDuties.find(d => d.date === exam.date)?.count || 0;
        const bDutiesToday = b.assignedDuties.find(d => d.date === exam.date)?.count || 0;
        return aDutiesToday - bDutiesToday;
    });

    const assignments: InvigilatorAssignment[] = [];
    let invigilatorIndex = 0;

    for (const room of classroomsInUse) {
        // Basic invigilator count rule
        const requiredInvigilators = room.capacity > 30 ? 2 : 1;

        for (let i = 0; i < requiredInvigilators; i++) {
            if (primaryPool.length > 0) {
                const invigilator = primaryPool[invigilatorIndex % primaryPool.length];
                
                assignments.push({
                    exam,
                    classroom: room,
                    invigilator,
                });
                
                // Update the master list record for this invigilator
                const invigilatorInMaster = invigilatorMasterList.find(inv => inv.id === invigilator.id);
                if (invigilatorInMaster) {
                    let dutyRecord = invigilatorInMaster.assignedDuties.find(d => d.date === exam.date);
                    if (dutyRecord) {
                        dutyRecord.count++;
                    } else {
                        invigilatorInMaster.assignedDuties.push({ date: exam.date, count: 1 });
                    }
                }
                
                invigilatorIndex++;
            }
        }
    }
    return { assignments, updatedInvigilators: invigilatorMasterList };
}
