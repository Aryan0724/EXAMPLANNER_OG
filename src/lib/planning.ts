import type { Student, Classroom, ExamSlot, SeatPlan, Invigilator, InvigilatorAssignment } from './types';

// This is a simplified logic for demonstration purposes.
// It will be expanded upon based on the detailed algorithm provided.

export function generateSeatPlan(students: Student[], classrooms: Classroom[], exam: ExamSlot): SeatPlan {
  const assignments = [];

  // Filter students who are eligible for this exam (based on course, semester, and not debarred/unavailable)
  const eligibleStudents = students.filter(s => {
    const isDebarred = (s as any).isDebarred; // Temporary check for old data structure
    const isTakingExam = s.course === exam.course && s.semester === exam.semester;
    const isUnavailable = s.unavailableSlots.some(slot => slot.slotId === exam.id);
    return isTakingExam && !isDebarred && !isUnavailable;
  });

  // Prioritize students who already have a seat assignment
  const studentsWithPersistedSeats = eligibleStudents.filter(s => s.seatAssignment);
  const studentsToAssign = eligibleStudents.filter(s => !s.seatAssignment);

  let studentIndex = 0;

  // Simplified sorting of classrooms by capacity
  const sortedClassrooms = [...classrooms].sort((a, b) => b.capacity - a.capacity);

  for (const room of sortedClassrooms) {
    // Check if classroom is available
    if (room.unavailableSlots.some(slot => slot.slotId === exam.id)) {
      continue;
    }

    for (let seatNum = 1; seatNum <= room.capacity; seatNum++) {
      if (studentIndex < studentsToAssign.length) {
        const student = studentsToAssign[studentIndex];

        // This is where the complex adjacency logic will go.
        // For now, it's a simple sequential assignment.

        assignments.push({ student, classroom: room, seatNumber: seatNum });
        studentIndex++;
      } else {
        // Fill remaining seats as empty
        assignments.push({ student: null, classroom: room, seatNumber: seatNum });
      }
    }
  }

  // TODO: Handle students with persisted seats.
  // TODO: Handle unassigned students if capacity is exceeded.

  return { exam, assignments };
}


export function assignInvigilators(invigilators: Invigilator[], classroomsInUse: Classroom[], exam: ExamSlot): InvigilatorAssignment[] {
  const availableInvigilators = invigilators.filter(i => i.isAvailable && !i.unavailableSlots.some(slot => slot.slotId === exam.id));
  const assignments: InvigilatorAssignment[] = [];
  let invigilatorIndex = 0;

  // This is where invigilator assignment rules (count, non-consecutive) will be implemented.

  for (const room of classroomsInUse) {
    if (availableInvigilators.length > 0) {
      // Simplified rotation
      const invigilator = availableInvigilators[invigilatorIndex % availableInvigilators.length];
      assignments.push({
        exam,
        classroom: room,
        invigilator,
      });
      invigilatorIndex++;
    }
  }
  return assignments;
}
