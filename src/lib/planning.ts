

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
    
    const assignedSeatsByLocation: Map<string, Seat> = new Map();

    const studentsNeedingSeats = new Map<string, (Student & { exam: ExamSlot })[]>();
    
    // 1. Pre-process students: handle permanent seats and queue up others
    for (const exam of exams) {
        const studentPoolForExam = getEligibleStudentsForExam(studentMasterList, exam)
            .map(s => ({ ...s, exam: exam }))
            .sort((a, b) => a.rollNo.localeCompare(b.rollNo));

        for (const student of studentPoolForExam) {
            // Handle permanent seat assignments first
            if (student.seatAssignment) {
                const { classroomId, seatNumber } = student.seatAssignment;
                const classroom = classrooms.find(c => c.id === classroomId);
                if (classroom) {
                    const key = `${classroomId}-${seatNumber}`;
                    // The seat is reserved. If student is debarred, mark it but leave student null.
                    const seat: Seat = {
                        student: student.isDebarred ? null : student,
                        isDebarredSeat: student.isDebarred,
                        classroom,
                        seatNumber
                    };
                    if (!assignedSeatsByLocation.has(key)) {
                        finalAssignments.push(seat);
                        assignedSeatsByLocation.set(key, seat);
                    }
                }
            } else if (student.isDebarred) {
                // This debarred student has no fixed seat, so they don't get one.
                // We don't add them to the seating queue.
                // Their status is known, but they don't occupy a seat in the plan.
                continue;
            }
            else {
                // If student has no fixed seat and is not debarred, add to queue.
                const subjectKey = `${student.exam.subjectCode}-${student.exam.course}`;
                if (!studentsNeedingSeats.has(subjectKey)) {
                    studentsNeedingSeats.set(subjectKey, []);
                }
                studentsNeedingSeats.get(subjectKey)?.push(student);
            }
        }
    }

    // 2. Group the queues of students by department for strategic pairing.
    const queuesByDept = new Map<string, (Student & { exam: ExamSlot })[][]>();
    for (const queue of studentsNeedingSeats.values()) {
        if (queue.length > 0) {
            const dept = queue[0].department;
            if (!queuesByDept.has(dept)) {
                queuesByDept.set(dept, []);
            }
            queuesByDept.get(dept)?.push(queue);
        }
    }
    
    // Convert map to array and sort departments to have a consistent order
    const departmentGroups = Array.from(queuesByDept.values()).sort((a,b) => b.flat().length - a.flat().length);

    const pairedQueues: ((Student & { exam: ExamSlot })[])[][] = [];
    
    // 3. Create pairs of course queues from DIFFERENT departments.
    while (departmentGroups.length > 1) {
        const group1 = departmentGroups[0];
        const group2 = departmentGroups[departmentGroups.length - 1]; // Pair first with last
        
        const courseQueue1 = group1.shift();
        const courseQueue2 = group2.shift();

        if (courseQueue1 && courseQueue2) {
             pairedQueues.push([courseQueue1, courseQueue2]);
        } else if (courseQueue1) {
             group1.unshift(courseQueue1); // Put it back if its partner is missing
        } else if (courseQueue2) {
             group2.unshift(courseQueue2); // Put it back
        }

        // Clean up empty department groups
        if (group1.length === 0) departmentGroups.shift();
        if (group2.length === 0) departmentGroups.pop();
    }

    // Add any remaining single-department course queues
    if (departmentGroups.length > 0) {
        for(const queue of departmentGroups[0]) {
            pairedQueues.push([queue]);
        }
    }


    // 4. Filter available classrooms
    const availableClassrooms = [...classrooms]
        .filter(room => !exams.some(exam => room.unavailableSlots.some(slot => slot.slotId === exam.id)))
        .sort((a, b) => a.capacity - b.capacity); // Start with smaller rooms

    // 5. Assign paired students to classrooms
    let currentClassroomIndex = 0;
    
    for (const pair of pairedQueues) {
        const queue1 = pair[0] || [];
        const queue2 = pair[1] || [];
        
        while (queue1.length > 0 || (queue2 && queue2.length > 0)) {
            if (currentClassroomIndex >= availableClassrooms.length) break; 
            const room = availableClassrooms[currentClassroomIndex];
            
            let filledSeatsInRoom = false;

            // Iterate column by column, then row by row to fill seats
            for (let col = 0; col < room.columns; col++) {
                for (let row = 0; row < room.rows; row++) {
                    const benchIndex = row * room.columns + col;
                    const benchCapacity = room.benchCapacities[benchIndex] || 2; // Assuming 2-seaters mainly

                    // Seat on the left side of the bench
                    const seatNumberA = benchIndex * 2 + 1;
                    const keyA = `${room.id}-${seatNumberA}`;
                    
                    if (!assignedSeatsByLocation.has(keyA)) {
                        const studentToPlace = queue1.shift();
                        if (studentToPlace) {
                             const newAssignment = { classroomId: room.id, seatNumber: seatNumberA };
                            studentToPlace.seatAssignment = newAssignment;
                            
                            const studentIndexInMaster = studentMasterList.findIndex(s => s.id === studentToPlace.id);
                            if(studentIndexInMaster !== -1) {
                                studentMasterList[studentIndexInMaster].seatAssignment = newAssignment;
                            }

                            const newSeat: Seat = { student: studentToPlace, classroom: room, seatNumber: seatNumberA };
                            finalAssignments.push(newSeat);
                            assignedSeatsByLocation.set(keyA, newSeat);
                            filledSeatsInRoom = true;
                        }
                    }

                    // Seat on the right side of the bench
                    if (benchCapacity > 1) {
                        const seatNumberB = benchIndex * 2 + 2;
                        const keyB = `${room.id}-${seatNumberB}`;
                        if (!assignedSeatsByLocation.has(keyB)) {
                             const studentToPlace = queue2 ? queue2.shift() : undefined;
                             if (studentToPlace) {
                                const newAssignment = { classroomId: room.id, seatNumber: seatNumberB };
                                studentToPlace.seatAssignment = newAssignment;

                                 const studentIndexInMaster = studentMasterList.findIndex(s => s.id === studentToPlace.id);
                                if(studentIndexInMaster !== -1) {
                                    studentMasterList[studentIndexInMaster].seatAssignment = newAssignment;
                                }

                                const newSeat: Seat = { student: studentToPlace, classroom: room, seatNumber: seatNumberB };
                                finalAssignments.push(newSeat);
                                assignedSeatsByLocation.set(keyB, newSeat);
                                filledSeatsInRoom = true;
                            }
                        }
                    }
                }
            }

            if (filledSeatsInRoom) {
                currentClassroomIndex++;
            } else if (queue1.length > 0 || (queue2 && queue2.length > 0)) {
                // If we didn't fill seats but students remain, it means the current room is full.
                currentClassroomIndex++;
            } else {
                 break;
            }
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
                // Ensure we don't assign the same invigilator twice to the same room in one go
                let invigilator = finalPool[invigilatorIndex % finalPool.length];
                let loopGuard = 0;
                while(assignments.some(a => a.classroom.id === room.id && a.invigilator.id === invigilator.id) && loopGuard < finalPool.length) {
                    invigilatorIndex++;
                    invigilator = finalPool[invigilatorIndex % finalPool.length];
                    loopGuard++;
                }

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
                 // Re-sort the pool if we have rotated through everyone, to re-evaluate duty counts
                if (invigilatorIndex >= finalPool.length) {
                    finalPool.sort(sortByDuties);
                    invigilatorIndex = 0;
                }
            }
        }
    }
    return { assignments, updatedInvigilators: invigilatorMasterList };
}

