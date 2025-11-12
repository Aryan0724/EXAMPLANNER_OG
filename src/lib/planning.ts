

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
    
    const assignedSeatsByLocation: Map<string, Seat> = new Map(); // "classroomId-seatNumber" -> Seat

    // 1. Pre-process students with existing assignments and debarred students
    const studentsNeedingSeats = new Map<string, (Student & { exam: ExamSlot })[]>();
    
    for (const exam of exams) {
        const studentPoolForExam = getEligibleStudentsForExam(studentMasterList, exam)
            .map(s => ({ ...s, exam: exam }))
            .sort((a, b) => a.rollNo.localeCompare(b.rollNo));

        for (const student of studentPoolForExam) {
            if (student.seatAssignment) {
                const { classroomId, seatNumber } = student.seatAssignment;
                const classroom = classrooms.find(c => c.id === classroomId);
                if (classroom) {
                    const key = `${classroomId}-${seatNumber}`;
                    const seat: Seat = {
                        student: student.isDebarred ? null : student,
                        isDebarredSeat: student.isDebarred,
                        classroom,
                        seatNumber
                    };
                    // Avoid duplicating assignments if already processed
                    if (!assignedSeatsByLocation.has(key)) {
                        finalAssignments.push(seat);
                        assignedSeatsByLocation.set(key, seat);
                    }
                }
            } else if (!student.isDebarred) {
                const subjectKey = `${student.exam.subjectCode}-${student.exam.course}`;
                if (!studentsNeedingSeats.has(subjectKey)) {
                    studentsNeedingSeats.set(subjectKey, []);
                }
                studentsNeedingSeats.get(subjectKey)?.push(student);
            }
        }
    }

    // 2. Pair up remaining course groups strategically
    const courseQueues = Array.from(studentsNeedingSeats.values());
    
    // Sort by department to group similar departments, then we'll pair first with last
    courseQueues.sort((a, b) => {
        const deptA = a[0].department;
        const deptB = b[0].department;
        if (deptA < deptB) return -1;
        if (deptA > deptB) return 1;
        return b.length - a.length;
    });

    const pairedQueues: ((Student & { exam: ExamSlot })[])[][] = [];
    while(courseQueues.length > 0) {
        if(courseQueues.length > 1) {
            // Pair the first (largest of one dept) with the last (likely different dept)
            pairedQueues.push([courseQueues.shift()!, courseQueues.pop()!]);
        } else {
             pairedQueues.push([courseQueues.shift()!]);
        }
    }

    // 3. Filter available classrooms
    const availableClassrooms = [...classrooms]
        .filter(room => !exams.some(exam => room.unavailableSlots.some(slot => slot.slotId === exam.id)))
        .sort((a, b) => a.capacity - b.capacity);

    // 4. Assign paired students to classrooms
    let currentClassroomIndex = 0;
    
    for (const pair of pairedQueues) {
        const queue1 = pair[0] || [];
        const queue2 = pair[1] || [];
        
        while (queue1.length > 0 || (queue2 && queue2.length > 0)) {
            if (currentClassroomIndex >= availableClassrooms.length) break; 
            const room = availableClassrooms[currentClassroomIndex];
            
            let filledSeatsInRoom = false;
            let roomIsFull = false;

            // Iterate through bench columns in the classroom
            for (let col = 0; col < room.columns; col++) {
                if (roomIsFull) break;

                for(let row = 0; row < room.rows; row++){
                    const benchIndex = row * room.columns + col;
                    const benchCapacity = room.benchCapacities[benchIndex] || 2;

                    for (let seatOnBench = 0; seatOnBench < benchCapacity; seatOnBench++) {
                        const seatNumber = (benchIndex * benchCapacity) + seatOnBench + 1;
                        const key = `${room.id}-${seatNumber}`;
                        
                        if (assignedSeatsByLocation.has(key)) {
                            continue; // Seat already taken
                        }
                        
                        // Alternate between queue1 and queue2 for seating
                        const currentQueue = (seatOnBench % 2 === 0) ? queue1 : (queue2 || []);
                        const studentToPlace = currentQueue.shift();

                        if (studentToPlace) {
                            const newAssignment = { classroomId: room.id, seatNumber };
                            studentToPlace.seatAssignment = newAssignment;
                            
                            const studentIndexInMaster = studentMasterList.findIndex(s => s.id === studentToPlace.id);
                            if(studentIndexInMaster !== -1) {
                                studentMasterList[studentIndexInMaster].seatAssignment = newAssignment;
                            }

                            const newSeat: Seat = { student: studentToPlace, classroom: room, seatNumber };
                            finalAssignments.push(newSeat);
                            assignedSeatsByLocation.set(key, newSeat);
                            filledSeatsInRoom = true;
                        }

                        if (assignedSeatsByLocation.size >= availableClassrooms.reduce((acc, cr) => acc + cr.capacity, 0)) {
                            roomIsFull = true;
                            break;
                        }
                    }
                    if(roomIsFull) break;
                }
                 if(roomIsFull) break;
            }

            if (filledSeatsInRoom) {
                currentClassroomIndex++;
            } else {
                // If we didn't fill any seats in this room, and there are still students, something is wrong.
                // For now, break to avoid infinite loops.
                break;
            }
        }
    }


    const plan: SeatPlan = {
        exam: exams.length > 1 ? exams : exams[0],
        assignments: finalAssignments.sort((a, b) => a.seatNumber - b.seatNumber),
    };
    
    return { plan, updatedStudents: studentMasterList };
}


export function assignInvigilators(
    invigilators: Invigilator[], 
    classroomsInUse: Classroom[], 
    exam: ExamSlot
): { assignments: InvigilatorAssignment[], updatedInvigilators: Invigilator[] } {
    const invigilatorMasterList = [...invigilators];

    const examDate = new Date(exam.date);
    const prevDate = new Date(examDate);
    prevDate.setDate(examDate.getDate() - 1);
    const prevDateString = prevDate.toISOString().split('T')[0];

    let availablePool = invigilatorMasterList.filter(i => 
        i.isAvailable && 
        !i.unavailableSlots.some(slot => slot.slotId === exam.id)
    );

    // Prioritize those who didn't work yesterday
    const primaryPool = availablePool.filter(i => !i.assignedDuties.some(d => d.date === prevDateString));
    const secondaryPool = availablePool.filter(i => i.assignedDuties.some(d => d.date === prevDateString));
    
    // Sort each pool by fewest duties today
    const sortByDuties = (a: Invigilator, b: Invigilator) => {
        const aDutiesToday = a.assignedDuties.find(d => d.date === exam.date)?.count || 0;
        const bDutiesToday = b.assignedDuties.find(d => d.date === exam.date)?.count || 0;
        return aDutiesToday - bDutiesToday;
    };
    
    primaryPool.sort(sortByDuties);
    secondaryPool.sort(sortByDuties);

    const finalPool = [...primaryPool, ...secondaryPool];

    const assignments: InvigilatorAssignment[] = [];
    let invigilatorIndex = 0;

    for (const room of classroomsInUse) {
        const requiredInvigilators = room.capacity > 30 ? 2 : 1;

        for (let i = 0; i < requiredInvigilators; i++) {
            if (finalPool.length > 0) {
                const invigilator = finalPool[invigilatorIndex % finalPool.length];
                
                assignments.push({
                    exam,
                    classroom: room,
                    invigilator,
                });
                
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
                 // Rotate to next invigilator to distribute duties
                if (invigilatorIndex >= finalPool.length) {
                    finalPool.sort(sortByDuties); // Re-sort pool after a full rotation
                    invigilatorIndex = 0;
                }
            }
        }
    }
    return { assignments, updatedInvigilators: invigilatorMasterList };
}

