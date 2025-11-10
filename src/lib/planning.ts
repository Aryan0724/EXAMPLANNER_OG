
import type { Student, Classroom, ExamSlot, SeatPlan, Invigilator, InvigilatorAssignment, Seat } from './types';

// This is a simplified logic for demonstration purposes.
// It will be expanded upon based on the detailed algorithm provided.

function getEligibleStudentsForExam(students: Student[], exam: ExamSlot): Student[] {
    return students.filter(s => {
        if (s.isDebarred) {
            return false;
        }
        // A student is eligible if their course and semester match the exam
        const isTakingExam = s.course === exam.course && s.semester === exam.semester;
        
        // If eligibleSubjects is defined and not empty, they MUST be on the list for this subject
        const isEligibleForSubject = s.eligibleSubjects.length > 0 
            ? s.eligibleSubjects.includes(exam.subjectCode)
            : true; // If list is empty/undefined, assume eligible for all in their course

        const isUnavailable = s.unavailableSlots.some(slot => slot.slotId === exam.id);
        
        return isTakingExam && isEligibleForSubject && !isUnavailable;
    });
}


export function generateSeatPlan(students: Student[], classrooms: Classroom[], exams: ExamSlot[]): SeatPlan {
    let assignments: Seat[] = [];
    
    // 1. Get all students for the current concurrent exam session
    const allEligibleStudents = exams.flatMap(exam =>
        getEligibleStudentsForExam(students, exam).map(student => ({ ...student, exam: exam }))
    );

    // TODO: Implement seat retention logic here. For now, we assign all.
    const studentsToAssign = allEligibleStudents.filter(s => !s.seatAssignment);
    
    // Handle debarred students - find them and reserve their seats
    const debarredStudents = students.filter(s => s.isDebarred && s.seatAssignment);
    for (const debarred of debarredStudents) {
         // This logic is simple for now. A full implementation would need to look up the classroom from seatAssignment.
    }


    // 2. Group students by course
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

    // 3. Sort classrooms by capacity (smallest to largest to fill them up first)
    const sortedClassrooms = [...classrooms]
        .filter(room => !exams.some(exam => room.unavailableSlots.some(slot => slot.slotId === exam.id)))
        .sort((a, b) => a.capacity - b.capacity);

    // 4. Iterate through classrooms and fill them completely
    for (const room of sortedClassrooms) {
        if (totalStudentsToSeat === 0) break;

        const roomAssignments: Seat[] = [];
        const totalBenches = room.rows * room.columns;

        // Iterate through each bench in the classroom
        for (let benchIndex = 0; benchIndex < totalBenches; benchIndex++) {
            if (totalStudentsToSeat === 0) break;

            const bench: Seat[] = [];
            
            // Try to fill the bench with students from different courses
            for (let seatOnBench = 0; seatOnBench < room.benchCapacity; seatOnBench++) {
                 // Sort queues to prioritize the one with the most students remaining
                courseQueues.sort((a, b) => b.length - a.length);

                let studentPlaced = false;
                for (let i = 0; i < courseQueues.length; i++) {
                    const currentQueue = courseQueues[i];
                    if (currentQueue.length > 0) {
                        const studentCoursesOnBench = bench.map(s => (s.student as any).exam.course);
                        const candidateStudent = currentQueue[0];
                        
                        if (!studentCoursesOnBench.includes((candidateStudent as any).exam.course)) {
                            const student = currentQueue.shift(); // Take student from queue
                            if (student) {
                                bench.push({
                                    student: student,
                                    classroom: room,
                                    seatNumber: (benchIndex * room.benchCapacity) + seatOnBench + 1
                                });
                                totalStudentsToSeat--;
                                studentPlaced = true;
                                break; // Student found and placed, move to next seat on bench
                            }
                        }
                    }
                }
                 if (!studentPlaced && bench.length < room.benchCapacity) {
                    // Could not find a student from a different course, but bench is not full.
                    // This can happen if only one course is left. For now, we leave the seat empty.
                }
            }

             // Fill remaining seats on the bench as empty if needed, then add to room
            const filledSeats = bench.length;
            for (let i = 0; i < room.benchCapacity - filledSeats; i++) {
                bench.push({
                    student: null,
                    classroom: room,
                    seatNumber: (benchIndex * room.benchCapacity) + filledSeats + i + 1,
                });
            }
            roomAssignments.push(...bench);
        }
        assignments.push(...roomAssignments);
    }
    
    // Add reserved seats for debarred students to the final assignments
    const debarredSeats = students.filter(s => s.isDebarred).map(s => ({
        student: s,
        // This is a simplification; we'd need to find the correct classroom
        classroom: classrooms[0], 
        seatNumber: -1, // Indicates a reserved but unplaced (in this plan) seat
    }));


    return {
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
