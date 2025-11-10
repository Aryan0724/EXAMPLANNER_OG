import type { Student, Classroom, ExamSlot, SeatPlan, Invigilator, InvigilatorAssignment, Seat } from './types';

// This is a simplified logic for demonstration purposes.
// It will be expanded upon based on the detailed algorithm provided.

function getEligibleStudentsForExam(students: Student[], exam: ExamSlot): Student[] {
    return students.filter(s => {
        const isDebarred = (s as any).isDebarred;
        // A student is eligible if their course and semester match the exam
        const isTakingExam = s.course === exam.course && s.semester === exam.semester;
        // Or if the specific exam subject code is in their list of eligible subjects
        const isEligibleForSubject = s.eligibleSubjects.includes(exam.subjectCode);

        const isUnavailable = s.unavailableSlots.some(slot => slot.slotId === exam.id);
        
        return (isTakingExam || isEligibleForSubject) && !isDebarred && !isUnavailable;
    });
}


export function generateSeatPlan(students: Student[], classrooms: Classroom[], exams: ExamSlot[]): SeatPlan {
    const assignments: Seat[] = [];
    
    // This function now handles multiple exams happening at the same time.
    const allEligibleStudents = exams.flatMap(exam =>
        getEligibleStudentsForExam(students, exam).map(student => ({ ...student, exam: exam }))
    );

    // TODO: Implement seat retention logic here.
    // For now, we assign all students.
    const studentsToAssign = allEligibleStudents.filter(s => !s.seatAssignment);
    // const studentsWithPersistedSeats = allEligibleStudents.filter(s => s.seatAssignment);

    let studentIndex = 0;

    const sortedClassrooms = [...classrooms].sort((a, b) => a.capacity - b.capacity);

    for (const room of sortedClassrooms) {
        if (exams.some(exam => room.unavailableSlots.some(slot => slot.slotId === exam.id))) {
            continue; // Skip classroom if unavailable for any of the current exams
        }

        const roomSeats: Seat[] = [];

        // Pre-fill all seats as empty
        for (let seatNum = 1; seatNum <= room.capacity; seatNum++) {
            roomSeats.push({ student: null, classroom: room, seatNumber: seatNum });
        }

        // --- Start of New Bench-Aware and Course-Mixing Logic ---
        const benches: { seats: Seat[] }[] = [];
        for (let i = 0; i < room.rows * room.columns; i++) {
            const benchSeats = roomSeats.slice(i * room.benchCapacity, (i + 1) * room.benchCapacity);
            if (benchSeats.length > 0) {
                 benches.push({ seats: benchSeats });
            }
        }
        
        for (const bench of benches) {
            for (let i = 0; i < bench.seats.length; i++) {
                if (studentIndex >= studentsToAssign.length) break;

                const studentToPlace = studentsToAssign[studentIndex];
                const otherStudentsOnBench = bench.seats.map(s => s.student).filter(Boolean);

                // **RULE: Students on the same bench must be from different courses**
                const canPlace = otherStudentsOnBench.every(
                    // The "exam" property is added dynamically, so we need to cast to any
                    other => (other as any).exam.course !== (studentToPlace as any).exam.course
                );
                
                if (canPlace) {
                    // Find the first empty seat on the bench
                    const emptySeatIndex = bench.seats.findIndex(s => s.student === null);
                    if (emptySeatIndex !== -1) {
                        bench.seats[emptySeatIndex].student = studentToPlace;
                        studentIndex++;
                    }
                }
            }
        }
        
        assignments.push(...benches.flatMap(b => b.seats));
        if (studentIndex >= studentsToAssign.length) break; // All students seated
    }


    return {
        // Since this plan is for a single time slot, we can use the first exam as representative
        exam: exams[0],
        assignments,
    };
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
