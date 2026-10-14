

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
    exam: ExamSlot,
    reservedCount: number = 0
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

    const DESIGNATION_PRIORITY: Record<string, number> = {
        'Lecturer': 1,
        'Nursing Tutor': 1,
        'Teaching Associate': 1,
        'Teaching Assistant': 1,
        'Assistant Professor': 2,
        'Associate Professor': 3,
        'Professor': 4,
        'Lab Assistant': 5
    };

    const getPriority = (designation: string) => DESIGNATION_PRIORITY[designation] || 10;

    const DUTY_LIMITS: Record<string, number> = {
        'Professor': 5,
        'Associate Professor': 10,
        'Assistant Professor': 15,
        'Lecturer': 20,
        'Nursing Tutor': 20,
        'Teaching Associate': 20,
        'Teaching Assistant': 20,
        'Tutor': 20,
        'Lab Assistant': 20
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

    // Split into categories based on strict priority
    // Priority 1: Lec, NT, TA
    // Priority 2: AP
    // Priority 3: AsP
    // Priority 4: Others
    
    validInvigilators.sort((a, b) => {
        const pA = getPriority(a.designation);
        const pB = getPriority(b.designation);
        if (pA !== pB) return pA - pB;
        
        // Secondary: Load balance (those with fewer duties first)
        const dA = getTotalDuties(a);
        const dB = getTotalDuties(b);
        if (dA !== dB) return dA - dB;
        
        return Math.random() - 0.5;
    });

    let availablePool = [...validInvigilators];

    // The availablePool is already sorted by strict priority.


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
            // Check if we already have a Lab Assistant in this room
            const hasLabAssistant = sessionRoomAssignments.some(inv => inv.designation === 'Lab Assistant');

            // Filter candidates not already assigned in this slot
            const candidates = availablePool.filter(inv =>
                !assignments.some(a => a.invigilator.id === inv.id) &&
                !sessionRoomAssignments.some(sra => sra.id === inv.id) &&
                !(hasLabAssistant && inv.designation === 'Lab Assistant') // Strict Rule: Only 1 Lab Assistant
            );

            if (candidates.length === 0) break;

            const scoredCandidates = candidates.map(inv => {
                const currentDuties = getTotalDuties(inv);
                const limit = DUTY_LIMITS[inv.designation] || 10;
                const priority = getPriority(inv.designation);

                // 1. Priority score (Weighting priority extremely high)
                let score = priority * 100000;

                // 2. Load Balance score
                const loadRatio = (currentDuties) / limit;
                score += loadRatio * 10000;

                // 3. Gender Diversity Priority
                if (sessionRoomAssignments.length > 0) {
                    const existingGenders = new Set(sessionRoomAssignments.map(r => r.gender));
                    if (!existingGenders.has(inv.gender)) {
                        score -= 5000; 
                    }
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

    // --- RESERVED INVIGILATORS ALLOCATION ---
    if (reservedCount > 0) {
        for (let i = 0; i < reservedCount; i++) {
            // Find best remaining candidates
            const candidates = availablePool.filter(inv =>
                !assignments.some(a => a.invigilator.id === inv.id)
            );

            if (candidates.length === 0) break;

            const scoredCandidates = candidates.map(inv => {
                const priority = getPriority(inv.designation);
                let score = priority * 100000;
                
                const currentDuties = getTotalDuties(inv);
                const limit = DUTY_LIMITS[inv.designation] || 10;
                const loadRatio = (currentDuties) / limit;
                score += loadRatio * 10000;

                score += Math.random() * 50; // Jitter
                return { inv, score };
            });

            scoredCandidates.sort((a, b) => a.score - b.score);
            const winner = scoredCandidates[0].inv;

            assignments.push({
                exam,
                classroom: null, // Reserved staff don't have a specific room
                invigilator: winner,
                isReserved: true
            });

            // Update state
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

/**
 * Performs faculty assignment based on manual room and staff counts.
 * This is used when the user wants to bypass student-based logic and just say
 * "I need X rooms and Y invigilators".
 */
export function generateManualFacultyAllotment(
    invigilators: Invigilator[],
    classrooms: Classroom[],
    exam: ExamSlot,
    roomCount: number,
    activeStaffCount: number,
    reservedStaffCount: number,
    blockPriority: string[] = []
): { assignments: InvigilatorAssignment[], updatedInvigilators: Invigilator[] } {
    const invigilatorMasterList: Invigilator[] = JSON.parse(JSON.stringify(invigilators));
    const assignments: InvigilatorAssignment[] = [];
    
    const DESIGNATION_PRIORITY: Record<string, number> = {
        'Lecturer': 1,
        'Nursing Tutor': 1,
        'Teaching Associate': 1,
        'Teaching Assistant': 1,
        'Assistant Professor': 2,
        'Associate Professor': 3,
        'Professor': 4,
        'Lab Assistant': 5
    };
    const getPriority = (designation: string) => DESIGNATION_PRIORITY[designation] || 10;
    
    const DUTY_LIMITS: Record<string, number> = { 
        'Professor': 5, 
        'Associate Professor': 10, 
        'Assistant Professor': 15, 
        'Lecturer': 20,
        'Nursing Tutor': 20,
        'Teaching Associate': 20,
        'Teaching Assistant': 20,
        'Tutor': 20, 
        'Lab Assistant': 20 
    };
    const getTotalDuties = (inv: Invigilator) => inv.assignedDuties ? inv.assignedDuties.reduce((sum, duty) => sum + duty.count, 0) : 0;

    // 1. Pick Classrooms based on priority and count
    const sortedRooms = [...classrooms]
        .filter(room => !exam.unavailableSlots?.some(slot => slot.slotId === exam.id))
        .sort((a, b) => {
            const indexA = blockPriority.indexOf(a.building);
            const indexB = blockPriority.indexOf(b.building);
            if (indexA !== -1 && indexB !== -1 && indexA !== indexB) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return b.capacity - a.capacity;
        });

    const roomsToUse = sortedRooms.slice(0, roomCount);

    // 2. Prepare Invigilator Pool
    const validInvigilators = invigilatorMasterList.filter(i => 
        !i.unavailableSlots?.some(slot => slot.slotId === exam.id)
    );

    validInvigilators.sort((a, b) => {
        const pA = getPriority(a.designation);
        const pB = getPriority(b.designation);
        if (pA !== pB) return pA - pB;
        
        const dA = getTotalDuties(a);
        const dB = getTotalDuties(b);
        if (dA !== dB) return dA - dB;
        
        return Math.random() - 0.5;
    });

    const currentShift = exam.manualShiftIndex ?? (exam.id.includes('Shift II') ? 1 : 0);
    const currentDate = exam.date;

    const isJunior = (desig: string) => {
        const d = desig.toLowerCase();
        return d.includes('lecturer') || d.includes('nursing tutor') || d.includes('teaching associate') || d.includes('teaching assistant') || d.includes('lec') || d.includes('nt') || d.includes('ta');
    };

    // HARD PRE-FILTER: Remove anyone who worked the SAME SHIFT or a PREVIOUS SHIFT today
    // (Except Mid+Reg for Juniors, which we handle in the fallback)
    let availablePool = validInvigilators.filter(inv => {
        if (inv.lastAssignedDate === currentDate) {
            // Worked same shift? Block.
            if (Number(inv.lastAssignedShift) === currentShift) return false;
            
            // Worked previous shift? 
            if (Number(inv.lastAssignedShift) + 1 === currentShift) {
                // If they are not a Junior, block 001+01 too.
                // If they ARE a Junior, we keep them in availablePool but Pass 1 will filter them out.
                if (!isJunior(inv.designation)) return false;
                
                // If previous was NOT Mid, block them absolutely (even Juniors)
                const prevWasMid = inv.lastAssignedSlotId?.includes('-Mid');
                if (!prevWasMid) return false;
            }
        }
        return true;
    });

    // 3. Assignment Logic
    const performSelection = (room: Classroom | null, isReserved: boolean = false) => {
        if (availablePool.length === 0) return null;

        // PASS 1: The "Universal Law" - Strictly NO back-to-back duties and Respect Daily Limits
        const nonConsecutiveCandidates = availablePool.filter(inv => {
            // 1. Daily Session Limit Check
            const dutiesToday = inv.assignedDuties?.find(d => d.date === currentDate)?.count || 0;
            const maxSessions = inv.maxDailySessions || (isJunior(inv.designation) ? 2 : 1);
            if (dutiesToday >= maxSessions) return false;

            // 2. Consecutive Check
            if (inv.lastAssignedDate === currentDate) {
                // Same shift: Always block
                if (currentShift === Number(inv.lastAssignedShift)) return false;
                
                // Back-to-back shift:
                if (currentShift === Number(inv.lastAssignedShift) + 1) {
                    const prevWasMid = inv.lastAssignedSlotId?.includes('-Mid');
                    const currIsReg = exam.id?.includes('-Reg');
                    
                    // Allow 001 + 01 (Mid + Reg) ONLY in Pass 2 (fallback), so block it in Pass 1
                    return false; 
                }
            }
            return true;
        });
        
        let poolToUse = nonConsecutiveCandidates;
        let isFallback = false;

        // PASS 2: Emergency Fallback - ONLY allow 001 + 01 (Mid + Reg) for Juniors
        if (poolToUse.length === 0) {
            const juniorCandidates = availablePool.filter(inv => {
                if (!isJunior(inv.designation)) return false;
                
                // Still check daily limits
                const dutiesToday = inv.assignedDuties?.find(d => d.date === currentDate)?.count || 0;
                if (dutiesToday >= 2) return false;

                // Check for 001 + 01 sequence
                if (inv.lastAssignedDate === currentDate && Number(inv.lastAssignedShift) + 1 === currentShift) {
                    const prevWasMid = inv.lastAssignedSlotId?.includes('-Mid');
                    const currIsReg = exam.id?.includes('-Reg');
                    return prevWasMid && currIsReg; // This is the ONLY acceptable consecutive case
                }
                
                return true;
            });

            if (juniorCandidates.length > 0) {
                poolToUse = juniorCandidates;
                isFallback = true;
            } else {
                // ABSOLUTE BLOCK: We'd rather fail to allot than allow 01+01
                poolToUse = []; 
            }
        }

        const scoredCandidates = poolToUse.map(inv => {
            const priority = getPriority(inv.designation);
            let score = priority * 100000;

            const currentDuties = getTotalDuties(inv);
            const limit = DUTY_LIMITS[inv.designation] || 10;
            const loadRatio = currentDuties / limit;
            
            // Duty load balancing
            score += loadRatio * 20000;

            // SAME-DAY PENALTY: Prefer people who haven't worked at all today
            const workedToday = inv.assignedDuties?.some(d => d.date === currentDate && d.count > 0);
            if (workedToday) {
                score += 50000; // Large penalty but still keeps Junior (100k+50k) ahead of AP (200k)
            }

            // Massive penalty for breaking the "Universal Law" in fallback mode
            if (isFallback) {
                score += 500000; 
            }

            // Gender diversity
            if (room) {
                const existingGenders = new Set(assignments.filter(a => a.classroom?.id === room.id).map(a => a.invigilator.gender));
                if (existingGenders.size > 0 && !existingGenders.has(inv.gender)) score -= 5000;
            }

            score += Math.random() * 50;
            return { inv, score };
        });

        if (scoredCandidates.length === 0) return null;
        scoredCandidates.sort((a, b) => a.score - b.score);
        const winner = scoredCandidates[0].inv;

        // Update persistence records
        const invRecord = invigilatorMasterList.find(im => im.id === winner.id)!;
        if (!invRecord.assignedDuties) invRecord.assignedDuties = [];
        let dutyRecord = invRecord.assignedDuties.find(d => d.date === currentDate);
        if (dutyRecord) dutyRecord.count++;
        else invRecord.assignedDuties.push({ date: currentDate, count: 1 });

        // Update universal tracking
        invRecord.lastAssignedSlotId = exam.id;
        invRecord.lastAssignedDate = currentDate;
        invRecord.lastAssignedShift = String(currentShift);

        // Update pool
        availablePool = availablePool.filter(p => p.id !== winner.id);
        
        return winner;
    };

    // Distribute Active Staff
    const staffPerRoom = Math.floor(activeStaffCount / Math.max(1, roomsToUse.length));
    const extraStaff = activeStaffCount % Math.max(1, roomsToUse.length);

    for (let r = 0; r < roomsToUse.length; r++) {
        const room = roomsToUse[r];
        const count = staffPerRoom + (r < extraStaff ? 1 : 0);
        for (let i = 0; i < count; i++) {
            const winner = performSelection(room);
            if (winner) assignments.push({ exam, classroom: room, invigilator: winner });
        }
    }

    // Handle leftover active staff if roomCount was 0 or rounding errors
    while (assignments.length < activeStaffCount) {
        const winner = performSelection(null);
        if (winner) assignments.push({ exam, classroom: roomsToUse[0] || null, invigilator: winner });
        else break;
    }

    // Assign Reserved Staff
    for (let i = 0; i < reservedStaffCount; i++) {
        const winner = performSelection(null, true);
        if (winner) assignments.push({ exam, classroom: null as any, invigilator: winner, isReserved: true });
        else break;
    }

    // 4. FINAL VERIFICATION: Ensure the count is EXACT
    if (assignments.length !== (activeStaffCount + reservedStaffCount)) {
        console.warn(`Manual Allotment Mismatch: Requested ${activeStaffCount + reservedStaffCount}, got ${assignments.length}`);
    }

    return { assignments, updatedInvigilators: invigilatorMasterList };
}
