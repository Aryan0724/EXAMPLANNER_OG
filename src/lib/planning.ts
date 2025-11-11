

import type { Student, Classroom, ExamSlot, SeatPlan, Invigilator, InvigilatorAssignment, Seat } from './types';

function getEligibleStudentsForExam(allStudents: Student[], exam: ExamSlot): Student[] {
    return allStudents.filter(s => {
        if (s.isDebarred) {
            return false;
        }
        const isTakingExam = s.course === exam.course && s.department === exam.department;
        
        const isSpecificallyIneligible = s.ineligibilityRecords?.some(r => r.subjectCode === exam.subjectCode);
        if (isSpecificallyIneligible) {
            return false;
        }

        const isUnavailable = s.unavailableSlots.some(slot => slot.slotId === exam.id);
        
        return isTakingExam && !isUnavailable;
    });
}


export function generateSeatPlan(
    allStudents: Student[], 
    classrooms: Classroom[], 
    exams: ExamSlot[]
): { plan: SeatPlan; updatedStudents: Student[] } {
    let assignments: Seat[] = [];
    const studentMasterList = [...allStudents]; // Create a mutable copy

    // 1. Get all students for the current concurrent exam session from the master list
    const eligibleStudentPool = exams.flatMap(exam =>
        getEligibleStudentsForExam(studentMasterList, exam).map(student => ({ ...student, exam: exam }))
    );

    // 2. Separate students who already have a seat from those who don't
    const studentsWithSeats = eligibleStudentPool.filter(s => s.seatAssignment);
    const studentsToAssign = eligibleStudentPool.filter(s => !s.seatAssignment);

    // 3. Handle students who already have seats (including debarred ones)
    const assignedSeats = new Map<string, Seat>(); // classroomId-seatNumber -> Seat
    for (const student of studentsWithSeats) {
        if (student.seatAssignment) {
            const { classroomId, seatNumber } = student.seatAssignment;
            const classroom = classrooms.find(c => c.id === classroomId);
            if (classroom) {
                 const key = `${classroomId}-${seatNumber}`;
                 const seat: Seat = {
                     student: student.isDebarred ? null : student, // Show debarred student seat as empty
                     classroom: classroom,
                     seatNumber: seatNumber
                 };
                 assignments.push(seat);
                 assignedSeats.set(key, seat);
            }
        }
    }

    // 4. Sort classrooms and prepare for new assignments
    const sortedClassrooms = [...classrooms]
        .filter(room => !exams.some(exam => room.unavailableSlots.some(slot => slot.slotId === exam.id)))
        .sort((a, b) => a.capacity - b.capacity);

    // 5. Group students needing seats by course
    const studentsByCourse = studentsToAssign.reduce((acc, student) => {
        const courseKey = (student as any).exam.course;
        if (!acc[courseKey]) {
            acc[courseKey] = [];
        }
        acc[courseKey].push(student);
        return acc;
    }, {} as Record<string, (Student & { exam: ExamSlot })[]>);
    
    const courseQueues = Object.values(studentsByCourse);
    let totalStudentsToSeat = studentsToAssign.length;
    
    // 6. Iterate through classrooms and benches to assign remaining students
    for (const room of sortedClassrooms) {
        if (totalStudentsToSeat === 0) break;

        let seatCounterInRoom = 0;
        for (let benchIndex = 0; benchIndex < room.benchCapacities.length; benchIndex++) {
            if (totalStudentsToSeat === 0) break;
            
            const benchCapacity = room.benchCapacities[benchIndex];
            const benchAssignments: Seat[] = [];
            
            for (let seatOnBench = 0; seatOnBench < benchCapacity; seatOnBench++) {
                seatCounterInRoom++;
                const seatKey = `${room.id}-${seatCounterInRoom}`;
                
                // If seat is already taken by a returning student, skip it
                if (assignedSeats.has(seatKey)) {
                    continue;
                }

                if (totalStudentsToSeat === 0) break;

                // Sort queues to prioritize the one with the most students remaining
                courseQueues.sort((a, b) => b.length - a.length);

                let studentPlaced = false;
                for (let i = 0; i < courseQueues.length; i++) {
                    const currentQueue = courseQueues[i];
                    if (currentQueue.length > 0) {
                        const studentCoursesOnBench = benchAssignments.map(s => (s.student as any).exam.course);
                        const candidateStudent = currentQueue[0];
                        
                        // Ensure no two students from the same course are on the same bench
                        if (!studentCoursesOnBench.includes((candidateStudent as any).exam.course)) {
                            const studentToPlace = currentQueue.shift();
                            if (studentToPlace) {
                                // PERSIST the seat assignment back to the master list
                                const studentIndexInMaster = studentMasterList.findIndex(s => s.id === studentToPlace.id);
                                if (studentIndexInMaster !== -1) {
                                    studentMasterList[studentIndexInMaster].seatAssignment = {
                                        classroomId: room.id,
                                        seatNumber: seatCounterInRoom
                                    };
                                }

                                const newSeat: Seat = {
                                    student: studentToPlace,
                                    classroom: room,
                                    seatNumber: seatCounterInRoom
                                };
                                benchAssignments.push(newSeat);
                                assignments.push(newSeat); // Add to final plan
                                totalStudentsToSeat--;
                                studentPlaced = true;
                                break; 
                            }
                        }
                    }
                }
                 // If a student couldn't be placed (e.g., conflicts on bench), we'll leave the seat empty in the plan for this session.
                 // The seat remains available for the next session's generation.
            }
        }
    }

    const plan: SeatPlan = {
        exam: exams[0], // Representative exam
        assignments,
    };
    
    return { plan, updatedStudents: studentMasterList };
}


export function assignInvigilators(invigilators: Invigilator[], classroomsInUse: Classroom[], exam: ExamSlot): InvigilatorAssignment[] {
  const availableInvigilators = invigilators.filter(i => i.isAvailable && !i.unavailableSlots.some(slot => slot.slotId === exam.id));
  const assignments: InvigilatorAssignment[] = [];
  let invigilatorIndex = 0;

  for (const room of classroomsInUse) {
      // Basic invigilator count rule
      const studentCount = room.capacity; // This should be actual student count
      let requiredInvigilators = 1;
      if (studentCount > 90) requiredInvigilators = 4;
      else if (studentCount > 60) requiredInvigilators = 3;
      else if (studentCount > 19) requiredInvigilators = 2;

    for(let i=0; i < requiredInvigilators; i++) {
         if (availableInvigilators.length > 0) {
            const invigilator = availableInvigilators[invigilatorIndex % availableInvigilators.length];
            assignments.push({
                exam,
                classroom: room,
                invigilator,
            });
            invigilatorIndex++;
         }
    }
  }
  return assignments;
}
