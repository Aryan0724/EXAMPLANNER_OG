

import type { Student, Classroom, ExamSlot, SeatPlan, Invigilator, InvigilatorAssignment, Seat } from './types';

function getEligibleStudentsForExam(allStudents: Student[], exam: ExamSlot): Student[] {
    return allStudents.filter(s => {
        const normalize = (str: string) => str ? str.trim().toLowerCase() : '';

        const courseMatch = normalize(s.course) === normalize(exam.course);
        const cleanDept = (d: string) => normalize(d).replace('department of ', '').trim();
        const deptMatch = cleanDept(s.department) === cleanDept(exam.department);

        if (!courseMatch || !deptMatch) {
            // console.log(`Mismatch: ${s.name} (${s.course}, ${s.department}) vs Exam (${exam.course}, ${exam.department})`);
            return false;
        }

        // Group Logic: 
        // If exam has no group or 'All', everyone is eligible.
        // If exam has a group, student MUST match that group.
        if (exam.group && (exam.group as string) !== 'All' && s.group !== exam.group) {
            return false;
        }

        if (Number(s.semester) !== Number(exam.semester)) {
            return false;
        }

        if (s.isDebarred) {
            return false;
        }

        const isSpecificallyIneligible = s.ineligibilityRecords?.some(r => r.subjectCode === exam.subjectCode);
        if (isSpecificallyIneligible) {
            return false;
        }

        const isUnavailable = s.unavailableSlots?.some(slot => slot.slotId === exam.id);

        return !isUnavailable;
    });
}

export function generateSeatPlan(
    allStudents: Student[],
    classrooms: Classroom[],
    exams: ExamSlot[],
    blockPriority: string[] = [] // Default to empty array if not provided
): { plan: SeatPlan; updatedStudents: Student[] } {
    const studentMasterList: Student[] = JSON.parse(JSON.stringify(allStudents));
    const finalAssignments: Seat[] = [];

    // 1. Identify all eligible students for today's exams
    const allEligibleEntries = exams.flatMap(exam =>
        getEligibleStudentsForExam(studentMasterList, exam).map(s => ({ ...s, exam }))
    );

    // Deduplicate
    const eligibleStudentsToday: (Student & { exam: ExamSlot })[] = [];
    const studentIdsProcessed = new Set<string>();
    for (const entry of allEligibleEntries) {
        if (!studentIdsProcessed.has(entry.id)) {
            studentIdsProcessed.add(entry.id);
            eligibleStudentsToday.push(entry);
        }
    }

    // 2. Filter available classrooms & Sort by Capacity (Descending) to fit large batches first
    const availableClassrooms = classrooms
        .filter(room => !exams.some(exam => room.unavailableSlots.some(slot => slot.slotId === exam.id)))
        .sort((a, b) => {
            // Priority Sort first
            const indexA = blockPriority.indexOf(a.building);
            const indexB = blockPriority.indexOf(b.building);
            if (indexA !== -1 && indexB !== -1 && indexA !== indexB) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;

            // Secondary: Capacity Descending
            return b.capacity - a.capacity;
        });

    // 3. Prepare Room-Seat Maps
    const roomSeatMaps = new Map<string, (Seat | null)[]>();
    availableClassrooms.forEach(room => {
        roomSeatMaps.set(room.id, Array(room.capacity).fill(null));
    });

    // 4. Group Students by Subject/Course to form "Batches"
    // We need to know which pools we have available to mix
    const studentPools = new Map<string, (Student & { exam: ExamSlot })[]>();

    eligibleStudentsToday.forEach(student => {
        // Check for persistent seat
        if (student.seatAssignment && roomSeatMaps.has(student.seatAssignment.classroomId)) {
            const map = roomSeatMaps.get(student.seatAssignment.classroomId)!;
            const index = student.seatAssignment.seatNumber - 1;
            if (index >= 0 && index < map.length && map[index] === null) {
                map[index] = {
                    student: student,
                    classroom: availableClassrooms.find(r => r.id === student.seatAssignment!.classroomId)!,
                    seatNumber: student.seatAssignment.seatNumber
                };
                return; // Handled
            }
        }

        // If not assigned/valid, add to pool
        const key = student.exam.subjectCode; // Group by subject code effectively
        if (!studentPools.has(key)) studentPools.set(key, []);
        studentPools.get(key)!.push(student);
    });

    // Sort pools by size (Descending)
    // We want to burn down the largest courses first using the largest rooms
    let sortedPoolKeys = Array.from(studentPools.keys()).sort((a, b) =>
        studentPools.get(b)!.length - studentPools.get(a)!.length
    );

    // 5. Assignment Loop
    // We iterate through rooms (Largest first).
    // For each room, we try to grab the two largest available pools and zipper them.

    // 5. Assignment Preparation
    // Sort pools by roll number (numeric-aware) so students sit in order
    const sortedPools = new Map<string, (Student & { exam: ExamSlot })[]>();
    studentPools.forEach((pool, key) => {
        const sorted = [...pool].sort((a, b) => 
            a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true, sensitivity: 'base' })
        );
        sortedPools.set(key, sorted);
    });

    const activePoolKeys = Array.from(sortedPools.keys()).sort((a, b) => 
        sortedPools.get(b)!.length - sortedPools.get(a)!.length
    );

    availableClassrooms.forEach(room => {
        const map = roomSeatMaps.get(room.id)!;
        
        // Build logical tracks for this room
        // Each bench has 'benchSize' seats. We want to fill vertically down the room.
        // A "Track" is the set of the same-positioned seats in all benches of a single column.
        
        // Find max bench size to determine how many 'sides' we have
        const maxBenchSize = Math.max(...room.benchCapacities);
        
        // Track the current course assigned to each vertical track for continuity
        const trackCourseMap = new Map<string, string | null>();

        // Iterate through columns first, then sides, then rows
        // This ensures the sequential flow (Col 1 Side A, then Col 1 Side B...)
        for (let col = 0; col < room.columns; col++) {
            for (let side = 0; side < maxBenchSize; side++) {
                const trackKey = `${col}-${side}`;

                for (let row = 0; row < room.rows; row++) {
                    const benchIdx = row * room.columns + col;
                    if (benchIdx >= room.benchCapacities.length) continue;
                    
                    const benchSize = room.benchCapacities[benchIdx];
                    if (side >= benchSize) continue;

                    // Calculate the flat index in the room's map
                    let flatIdx = 0;
                    for (let b = 0; b < benchIdx; b++) flatIdx += room.benchCapacities[b];
                    flatIdx += side;

                    if (map[flatIdx] !== null) continue; // Already handled (persistent seat)

                    // Adjacency Check: Left neighbor in same bench
                    const leftNeighborFlatIdx = side > 0 ? flatIdx - 1 : -1;
                    const leftNeighborSubject = (leftNeighborFlatIdx !== -1 && map[leftNeighborFlatIdx]) 
                        ? map[leftNeighborFlatIdx]?.student?.exam.subjectCode 
                        : null;

                    let poolKey: string | null = null;
                    
                    // Priority 1: Continuity - Check if current track already has a course locked
                    const currentLockedPool = trackCourseMap.get(trackKey);
                    if (currentLockedPool && sortedPools.get(currentLockedPool)!.length > 0 && currentLockedPool !== leftNeighborSubject) {
                        poolKey = currentLockedPool;
                    } else {
                        // Priority 2: Select a NEW course for this track
                        // Sort by remaining strength for stability
                        activePoolKeys.sort((a, b) => sortedPools.get(b)!.length - sortedPools.get(a)!.length);
                        const validPoolKeys = activePoolKeys.filter(k => 
                            sortedPools.get(k)!.length > 0 && k !== leftNeighborSubject
                        );

                        if (validPoolKeys.length > 0) {
                            poolKey = validPoolKeys[0];
                            trackCourseMap.set(trackKey, poolKey); // Lock this track to the new course
                        } else {
                            // No valid pools (possibly empty or only conflicting pools left)
                            trackCourseMap.set(trackKey, null);
                        }
                    }

                    if (poolKey) {
                        const student = sortedPools.get(poolKey)!.shift()!;
                        map[flatIdx] = {
                            student: student,
                            classroom: room,
                            seatNumber: flatIdx + 1
                        };
                    }
                }
            }
        }
    });

    // 8. Update Master List and Final Plan
    roomSeatMaps.forEach((seats, roomId) => {
        seats.forEach((seat, index) => {
            if (seat) {
                finalAssignments.push(seat);
                if (seat.student) {
                    const masterIdx = studentMasterList.findIndex(s => s.id === seat.student!.id);
                    if (masterIdx !== -1) {
                        studentMasterList[masterIdx].seatAssignment = {
                            classroomId: roomId,
                            seatNumber: index + 1
                        };
                    }
                }
            } else {
                finalAssignments.push({ student: null, classroom: availableClassrooms.find(r => r.id === roomId)!, seatNumber: index + 1 });
            }
        });
    });

    const plan: SeatPlan = {
        exam: exams.length > 1 ? exams : exams[0],
        assignments: finalAssignments,
    };

    return { plan, updatedStudents: studentMasterList };
}


export function assignInvigilators(
    invigilators: Invigilator[],
    seatPlan: SeatPlan,
    exam: ExamSlot
): { assignments: InvigilatorAssignment[], updatedInvigilators: Invigilator[] } {
    if (!invigilators || !Array.isArray(invigilators)) {
        console.error("assignInvigilators: invigilators is invalid", invigilators);
        return { assignments: [], updatedInvigilators: [] };
    }
    if (!seatPlan || !seatPlan.assignments || !Array.isArray(seatPlan.assignments)) {
        console.error("assignInvigilators: seatPlan is invalid", seatPlan);
        return { assignments: [], updatedInvigilators: invigilators };
    }
    if (!exam) {
        console.error("assignInvigilators: exam is undefined");
        return { assignments: [], updatedInvigilators: invigilators };
    }

    const invigilatorMasterList: Invigilator[] = JSON.parse(JSON.stringify(invigilators));

    const DUTY_LIMITS = {
        'Professor': 5,
        'Assistant Professor': 10,
        'Associate Professor': 15,
        'Tutor': 15,
        'Lab Assistant': 15
    };

    const getTotalDuties = (inv: Invigilator) =>
        inv.assignedDuties ? inv.assignedDuties.reduce((sum, duty) => sum + duty.count, 0) : 0;

    const isUnderLimit = (inv: Invigilator) => {
        const currentCount = getTotalDuties(inv);
        const limit = DUTY_LIMITS[inv.designation] || 10;
        return currentCount < limit;
    };

    // Filter available candidates
    let validInvigilators = invigilatorMasterList.filter((i: Invigilator) =>
        i.isAvailable &&
        i.unavailableSlots && !i.unavailableSlots.some(slot => slot.slotId === exam.id) &&
        isUnderLimit(i)
    );

    // Fallback if short on staff
    if (validInvigilators.length < 10) {
        validInvigilators = invigilatorMasterList.filter((i: Invigilator) =>
            i.isAvailable &&
            i.unavailableSlots && !i.unavailableSlots.some(slot => slot.slotId === exam.id)
        );
    }

    // Split into categories
    const faculty = validInvigilators.filter(i => i.designation !== 'Lab Assistant' && i.designation !== 'Tutor');
    const assistants = validInvigilators.filter(i => i.designation === 'Lab Assistant' || i.designation === 'Tutor');

    // Shuffle both pools for randomness within categories
    faculty.sort(() => Math.random() - 0.5);
    assistants.sort(() => Math.random() - 0.5);

    // 4:1 Mixing Logic (4 Faculty, then 1 Assistant)
    let availablePool: Invigilator[] = [];
    let fIdx = 0, aIdx = 0;

    while (fIdx < faculty.length || aIdx < assistants.length) {
        // Take up to 4 faculty
        for (let i = 0; i < 4 && fIdx < faculty.length; i++) {
            availablePool.push(faculty[fIdx++]);
        }
        // Take 1 assistant
        if (aIdx < assistants.length) {
            availablePool.push(assistants[aIdx++]);
        }
        // If we ran out of one, the loop continues and just adds the rest of the other
    }


    const assignments: InvigilatorAssignment[] = [];

    // Derive Classrooms and Student Counts from SeatPlan
    const roomStudentCounts = new Map<string, number>();
    const classroomMap = new Map<string, Classroom>();

    seatPlan.assignments.forEach(seat => {
        if (seat.student && seat.classroom) {
            const count = roomStudentCounts.get(seat.classroom.id) || 0;
            roomStudentCounts.set(seat.classroom.id, count + 1);
            if (!classroomMap.has(seat.classroom.id)) {
                classroomMap.set(seat.classroom.id, seat.classroom);
            }
        }
    });

    const classroomsInUse = Array.from(classroomMap.values());

    for (const room of classroomsInUse) {
        const studentCount = roomStudentCounts.get(room.id) || 0;
        let requiredInvigilators = 1;
        if (studentCount < 20) {
            requiredInvigilators = 1;
        } else if (studentCount < 60) {
            requiredInvigilators = 2;
        } else if (studentCount < 90) {
            requiredInvigilators = 3;
        } else if (studentCount < 120) {
            requiredInvigilators = 4;
        } else {
            requiredInvigilators = Math.ceil(studentCount / 30); // Fallback for very large halls
        }

        const sessionRoomAssignments: Invigilator[] = [];

        for (let i = 0; i < requiredInvigilators; i++) {
            // Filter candidates not already assigned in this slot
            const candidates = availablePool.filter(inv =>
                !assignments.some(a => a.invigilator.id === inv.id) &&
                !sessionRoomAssignments.some(sra => sra.id === inv.id)
            );

            if (candidates.length === 0) break;

            const scoredCandidates = candidates.map(inv => {
                const currentDuties = getTotalDuties(inv);
                const limit = DUTY_LIMITS[inv.designation] || 10;

                // 1. Load Balance score (0 - 10000)
                const loadRatio = (currentDuties + 1) / limit;
                let score = loadRatio * 10000;

                // 2. Gender Diversity Priority (High Priority)
                // If we already have someone in the room, try to pick opposite gender
                if (sessionRoomAssignments.length > 0) {
                    const existingGenders = new Set(sessionRoomAssignments.map(r => r.gender));
                    // If we don't have this gender yet, huge preference
                    if (!existingGenders.has(inv.gender)) {
                        score -= 5000; // Lower score is better (wait, previous logic was SORT ASCENDING??)
                        // Checking previous logic: "scoredCandidates.sort((a, b) => a.score - b.score);"
                        // Yes, lower score was better?
                        // Let's re-read:
                        // loadRatio = (current + 1) / limit. 0 is empty, 1 is full.
                        // score = loadRatio * 10000. So 0 is best.
                        // YES. Lower score is better.
                    }
                }

                // 3. Designation/Role Logic
                // If it's the 1st person (Lead), prefer Professor/Assoc (-score)
                if (i === 0) {
                    if (inv.designation === 'Professor') score -= 200;
                    else if (inv.designation === 'Associate Professor') score -= 100;
                    else if (inv.designation === 'Assistant Professor') score += 100;
                    else if (inv.designation === 'Tutor' || inv.designation === 'Lab Assistant') score += 300;
                } else {
                    // Support roles: Tutor/Asst preferred
                    if (inv.designation === 'Tutor' || inv.designation === 'Lab Assistant') score -= 200;
                    else if (inv.designation === 'Assistant Professor') score -= 100;
                    else if (inv.designation === 'Associate Professor') score += 100;
                    else if (inv.designation === 'Professor') score += 300;
                }

                score += Math.random() * 10; // Jitter

                return { inv, score };
            });

            scoredCandidates.sort((a, b) => a.score - b.score);
            const winner = scoredCandidates[0].inv;

            sessionRoomAssignments.push(winner);
            assignments.push({
                exam,
                classroom: room,
                invigilator: winner,
            });

            // Update state for loop consistency
            const invRecord = invigilatorMasterList.find(im => im.id === winner.id);
            if (invRecord) {
                let dutyRecord = invRecord.assignedDuties.find(d => d.date === exam.date);
                if (dutyRecord) dutyRecord.count++;
                else invRecord.assignedDuties.push({ date: exam.date, count: 1 });
            }

            const poolIdx = availablePool.findIndex(p => p.id === winner.id);
            if (poolIdx !== -1) availablePool[poolIdx] = JSON.parse(JSON.stringify(invRecord));
        }
    }

    return { assignments, updatedInvigilators: invigilatorMasterList };
}
