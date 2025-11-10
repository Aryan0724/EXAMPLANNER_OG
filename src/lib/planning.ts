import type { Student, Classroom, Exam, SeatPlan, Invigilator, InvigilatorAssignment } from './types';

// This is a simplified logic for demonstration purposes.

export function generateSeatPlan(students: Student[], classrooms: Classroom[], exam: Exam): SeatPlan {
  const assignments = [];
  const availableStudents = students.filter(s => s.department === exam.department);

  let studentIndex = 0;

  for (const room of classrooms) {
    for (let seatNum = 1; seatNum <= room.capacity; seatNum++) {
      if (studentIndex < availableStudents.length) {
        const student = availableStudents[studentIndex];
        if (student.isDebarred) {
          // Reserve seat for debarred student, but don't assign
          assignments.push({ student: null, classroom: room, seatNumber: seatNum });
          studentIndex++; // Move to next student, but they don't get this seat
          continue;
        }
        assignments.push({ student, classroom: room, seatNumber: seatNum });
        studentIndex++;
      } else {
        // Fill remaining seats as empty
        assignments.push({ student: null, classroom: room, seatNumber: seatNum });
      }
    }
  }

  return { exam, assignments };
}

export function assignInvigilators(invigilators: Invigilator[], classroomsInUse: Classroom[], exam: Exam): InvigilatorAssignment[] {
  const availableInvigilators = invigilators.filter(i => i.isAvailable);
  const assignments: InvigilatorAssignment[] = [];
  let invigilatorIndex = 0;

  for (const room of classroomsInUse) {
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
  return assignments;
}
