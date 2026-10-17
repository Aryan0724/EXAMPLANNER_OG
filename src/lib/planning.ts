

import type { Student, Classroom, ExamSlot, SeatPlan, Invigilator, InvigilatorAssignment, Seat, BatchRoomAllocation, SessionAllotmentSummary, RoomBatchDistribution, FacultyStudentRule } from './types';
import { DEFAULT_FACULTY_STUDENT_RULES } from './types';
import { isCourseMatch, canonicalizeCourse } from './course-utils';

/**
 * Calculates the required number of invigilators/faculty for a classroom based on student count
 * and user-specified ranges (e.g. 0-20 students: 1, 21-50 students: 2, etc.)
 */
export function getRequiredFacultyCount(
    studentCount: number,
    rules: FacultyStudentRule[] = DEFAULT_FACULTY_STUDENT_RULES
): number {
    if (studentCount <= 0) return 0;

    const activeRules = rules && rules.length > 0 ? rules : DEFAULT_FACULTY_STUDENT_RULES;
    const matched = activeRules.find(r => studentCount >= r.minStudents && studentCount <= r.maxStudents);
    if (matched) return Math.max(1, matched.facultyCount);

    const sorted = [...activeRules].sort((a, b) => a.minStudents - b.minStudents);
    if (studentCount < sorted[0].minStudents) return Math.max(1, sorted[0].facultyCount);
    if (studentCount > sorted[sorted.length - 1].maxStudents) return Math.max(1, sorted[sorted.length - 1].facultyCount);

    return 2;
}

function getEligibleStudentsForExam(allStudents: Student[], exam: ExamSlot): Student[] {
    return allStudents.filter(s => {
        const normalize = (str: string) => str ? str.trim().toLowerCase() : '';

        const courseMatch = isCourseMatch(s.course, exam.course) || normalize(s.course) === normalize(exam.course);
        const cleanDept = (d: string) => normalize(d).replace(/department of |school of |college of /g, '').trim();

        const examDeptClean = cleanDept(exam.department);
        const studentDeptClean = cleanDept(s.department);
        const deptMatch = !examDeptClean || 
                          !studentDeptClean || 
                          studentDeptClean === examDeptClean ||
                          studentDeptClean.includes(examDeptClean) ||
                          examDeptClean.includes(studentDeptClean) ||
                          courseMatch;

        if (!courseMatch || !deptMatch) {
            return false;
        }

        // Group Logic: 
        // If exam has no group or 'All', everyone is eligible.
        // If exam has a group, student MUST match that group.
        if (exam.group && (exam.group as string) !== 'All' && s.group !== exam.group) {
            return false;
        }

        if (exam.semester && Number(exam.semester) > 0 && Number(s.semester) !== Number(exam.semester)) {
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

/**
 * Evaluates whether two students conflict and therefore CANNOT sit on the same bench.
 * Under university examination regulations:
 * 1. Students taking the same examination paper (subject code) cannot sit together.
 * 2. Students from the same course / program / degree (e.g. B.Tech CSE) cannot sit together.
 * 3. Students from the same department and semester cannot sit together.
 */
export function isStudentConflict(
    s1: { course: string; department?: string; semester?: number | string; exam?: { subjectCode?: string; course?: string } },
    s2: { course: string; department?: string; semester?: number | string; exam?: { subjectCode?: string; course?: string } }
): boolean {
    if (!s1 || !s2) return false;

    // 1. Same subject code (case-insensitive & whitespace trimmed)
    const sub1 = (s1.exam?.subjectCode || '').trim().toLowerCase();
    const sub2 = (s2.exam?.subjectCode || '').trim().toLowerCase();
    if (sub1 && sub2 && sub1 === sub2) {
        return true;
    }

    // 2. Direct course match or alias match (e.g. B.Tech CSE and B.Tech Computer Science and Engineering)
    if (isCourseMatch(s1.course, s2.course)) {
        return true;
    }
    if (s1.exam?.course && s2.exam?.course && isCourseMatch(s1.exam.course, s2.exam.course)) {
        return true;
    }
    if (s2.exam?.course && isCourseMatch(s1.course, s2.exam.course)) {
        return true;
    }
    if (s1.exam?.course && isCourseMatch(s2.course, s1.exam.course)) {
        return true;
    }

    // 3. Canonical course string comparison
    const canon1 = canonicalizeCourse(s1.course || s1.exam?.course);
    const canon2 = canonicalizeCourse(s2.course || s2.exam?.course);
    if (canon1 && canon2 && canon1.toLowerCase() === canon2.toLowerCase()) {
        return true;
    }

    // 4. Same department AND same semester check
    if (s1.department && s2.department && s1.semester && s2.semester) {
        const clean = (d: string) => d.trim().toLowerCase().replace(/department of |school of |college of /g, '').trim();
        const d1 = clean(s1.department);
        const d2 = clean(s2.department);
        if (d1 && d2 && d1 === d2 && Number(s1.semester) === Number(s2.semester)) {
            return true;
        }
    }

    return false;
}

/**
 * Checks if a candidate student conflicts with any already seated student on the same bench.
 */
export function doesCandidateConflictWithBench(
    candidate: Student & { exam: ExamSlot },
    benchFlatIdxBase: number,
    benchSize: number,
    currentFlatIdx: number,
    map: (Seat | null)[]
): boolean {
    for (let s = 0; s < benchSize; s++) {
        const otherFlatIdx = benchFlatIdxBase + s;
        if (otherFlatIdx === currentFlatIdx) continue;
        const otherSeat = map[otherFlatIdx];
        if (otherSeat && otherSeat.student) {
            if (isStudentConflict(candidate, otherSeat.student)) {
                return true;
            }
        }
    }
    return false;
}

export interface BenchViolationDetail {
    classroomId: string;
    roomNo: string;
    benchIndex: number;
    seatNumber1: number;
    seatNumber2: number;
    student1: Student;
    student2: Student;
    reason: string;
}

/**
 * Inspects every bench across all classrooms in a seat plan and returns detailed violations
 * where two students seated on the same bench conflict under university examination rules.
 */
export function getSeatPlanViolations(
    plan: SeatPlan,
    classrooms: Classroom[]
): BenchViolationDetail[] {
    if (!plan || !plan.assignments || plan.assignments.length === 0) return [];

    const violations: BenchViolationDetail[] = [];
    const roomMap = new Map(classrooms.map(c => [c.id, c]));

    const assignmentsByRoom = new Map<string, Seat[]>();
    for (const seat of plan.assignments) {
        if (!seat.classroom) continue;
        if (!assignmentsByRoom.has(seat.classroom.id)) {
            assignmentsByRoom.set(seat.classroom.id, []);
        }
        assignmentsByRoom.get(seat.classroom.id)!.push(seat);
    }

    assignmentsByRoom.forEach((seats, roomId) => {
        const room = roomMap.get(roomId) || seats[0]?.classroom;
        if (!room || !room.benchCapacities || room.benchCapacities.length === 0) return;

        const sortedSeats = [...seats].sort((a, b) => a.seatNumber - b.seatNumber);

        let currentSeatIdx = 0;
        room.benchCapacities.forEach((capacity, benchIdx) => {
            const benchSeats: Seat[] = [];
            for (let i = 0; i < capacity; i++) {
                if (currentSeatIdx < sortedSeats.length) {
                    const seat = sortedSeats[currentSeatIdx];
                    if (seat && seat.student) {
                        benchSeats.push(seat);
                    }
                    currentSeatIdx++;
                }
            }

            for (let i = 0; i < benchSeats.length; i++) {
                for (let j = i + 1; j < benchSeats.length; j++) {
                    const s1 = benchSeats[i].student!;
                    const s2 = benchSeats[j].student!;
                    if (isStudentConflict(s1, s2)) {
                        violations.push({
                            classroomId: room.id,
                            roomNo: room.roomNo,
                            benchIndex: benchIdx,
                            seatNumber1: benchSeats[i].seatNumber,
                            seatNumber2: benchSeats[j].seatNumber,
                            student1: s1,
                            student2: s2,
                            reason: s1.exam?.subjectCode === s2.exam?.subjectCode
                                ? `Same Subject (${s1.exam?.subjectCode})`
                                : `Same Course (${s1.course})`
                        });
                    }
                }
            }
        });
    });

    return violations;
}

/**
 * Fast violation counter for seat plans.
 */
export function countSeatPlanViolations(
    plan: SeatPlan,
    classrooms: Classroom[]
): number {
    return getSeatPlanViolations(plan, classrooms).length;
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
        const key = `${canonicalizeCourse(student.course || student.exam.course)}_${student.exam.subjectCode}`;
        if (!studentPools.has(key)) studentPools.set(key, []);
        studentPools.get(key)!.push(student);
    });

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

                    // Calculate the starting flat index of this bench
                    let benchFlatIdxBase = 0;
                    for (let b = 0; b < benchIdx; b++) benchFlatIdxBase += room.benchCapacities[b];
                    const flatIdx = benchFlatIdxBase + side;

                    if (map[flatIdx] !== null) continue; // Already handled (persistent seat)

                    let poolKey: string | null = null;
                    
                    // Priority 1: Continuity - Check if current track already has a course locked
                    // and that course has students left and does NOT conflict with any student on this bench
                    const currentLockedPool = trackCourseMap.get(trackKey);
                    if (
                        currentLockedPool &&
                        sortedPools.has(currentLockedPool) &&
                        sortedPools.get(currentLockedPool)!.length > 0 &&
                        !doesCandidateConflictWithBench(
                            sortedPools.get(currentLockedPool)![0],
                            benchFlatIdxBase,
                            benchSize,
                            flatIdx,
                            map
                        )
                    ) {
                        poolKey = currentLockedPool;
                    } else {
                        // Priority 2: Select a NEW course for this track
                        // Sort active pool keys by remaining strength for optimal multi-course pairing
                        activePoolKeys.sort((a, b) => 
                            (sortedPools.get(b)?.length || 0) - (sortedPools.get(a)?.length || 0)
                        );

                        const validPoolKey = activePoolKeys.find(k => {
                            const pool = sortedPools.get(k);
                            if (!pool || pool.length === 0) return false;
                            return !doesCandidateConflictWithBench(
                                pool[0],
                                benchFlatIdxBase,
                                benchSize,
                                flatIdx,
                                map
                            );
                        });

                        if (validPoolKey) {
                            poolKey = validPoolKey;
                            trackCourseMap.set(trackKey, poolKey); // Lock this track to the new course
                        } else {
                            // No valid non-conflicting pools left: THIS BENCH SEAT MUST REMAIN EMPTY!
                            trackCourseMap.set(trackKey, null);
                        }
                    }

                    if (poolKey) {
                        const student = sortedPools.get(poolKey)!.shift()!;
                        student.seatAssignment = {
                            classroomId: room.id,
                            seatNumber: flatIdx + 1
                        };
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
    reservedCount: number = 0,
    facultyStudentRules?: FacultyStudentRule[]
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

    // Proportional target duty weights (higher designation = lesser duties, but non-zero)
    const TIER_TARGET_WEIGHTS: Record<string, number> = {
        'Professor': 3,
        'Associate Professor': 6,
        'Assistant Professor': 9,
        'Lecturer': 11,
        'Nursing Tutor': 11,
        'Teaching Associate': 11,
        'Teaching Assistant': 11,
        'Tutor': 11,
        'Lab Assistant': 8
    };

    const SENIOR_DESIGNATIONS = new Set([
        'Professor',
        'Associate Professor'
    ]);

    const DUTY_LIMITS: Record<string, number> = {
        'Professor': 6,
        'Associate Professor': 10,
        'Assistant Professor': 16,
        'Lecturer': 18,
        'Nursing Tutor': 18,
        'Teaching Associate': 18,
        'Teaching Assistant': 18,
        'Tutor': 18,
        'Lab Assistant': 14
    };

    const getTotalDuties = (inv: Invigilator): number =>
        inv.assignedDuties ? inv.assignedDuties.reduce((sum, duty) => sum + duty.count, 0) : 0;

    const getDutiesToday = (inv: Invigilator, date: string): number => {
        if (!inv.assignedDuties) return 0;
        const d = inv.assignedDuties.find(entry => entry.date === date);
        return d ? d.count : 0;
    };

    // Filter available candidates not marked unavailable for this exam slot
    let validInvigilators = invigilatorMasterList.filter((i: Invigilator) =>
        i.isAvailable &&
        (!i.unavailableSlots || !i.unavailableSlots.some(slot => slot.slotId === exam.id)) &&
        getTotalDuties(i) < (DUTY_LIMITS[i.designation] || 16)
    );

    // Fallback if staffing is tight
    if (validInvigilators.length < 8) {
        validInvigilators = invigilatorMasterList.filter((i: Invigilator) =>
            i.isAvailable &&
            (!i.unavailableSlots || !i.unavailableSlots.some(slot => slot.slotId === exam.id))
        );
    }

    const availablePool = [...validInvigilators];
    const assignments: InvigilatorAssignment[] = [];
    const assignedInSession = new Set<string>();

    // Derive active Classrooms and Student Counts from SeatPlan
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

    // Clean department string helper
    const cleanDept = (s: string) => s ? s.toLowerCase().replace(/department of|school of/g, '').trim() : '';
    const examDeptClean = cleanDept(exam.department);

    // Scoring function that strictly guarantees fair division of labor:
    const scoreCandidate = (
        inv: Invigilator,
        role: 'SENIOR' | 'CO_INVIGILATOR' | 'RESERVE',
        roomAssigned: Invigilator[]
    ): number => {
        const total = getTotalDuties(inv);
        const today = getDutiesToday(inv, exam.date);
        const target = TIER_TARGET_WEIGHTS[inv.designation] || 9;

        // 1. FATIGUE FACTOR: 0 duties today strongly preferred over 1 duty today
        let score = today * 100000;

        // 2. EQUAL DIVISION OF LABOUR (Primary Sort within pool):
        // Total duties * 10000 guarantees someone with k duties ALWAYS beats someone with k+1 duties!
        score += total * 10000;

        // 3. PROPORTIONAL LOAD RATIO:
        // Spreads duties according to rank-based target weights
        score += (total / target) * 1000;

        // 4. DEPARTMENT INTEGRITY / CONFLICT OF INTEREST:
        // Faculty should not invigilate rooms where their own department core exam is taking place
        if (examDeptClean && cleanDept(inv.department) === examDeptClean) {
            score += 2500;
        }

        // 5. GENDER DIVERSITY:
        // Encourage male + female pairing in every room
        if (roomAssigned.length > 0) {
            const existingGenders = new Set(roomAssigned.map(r => r.gender));
            if (!existingGenders.has(inv.gender)) {
                score -= 400;
            }
        }

        // 6. Tie-breaker jitter
        score += ((inv.id.charCodeAt(inv.id.length - 1) || 0) % 11) * 3 + Math.random() * 2;

        return score;
    };

    // Helper to select and pop the best candidate from a candidate list
    const selectBestCandidate = (
        candidateList: Invigilator[],
        role: 'SENIOR' | 'CO_INVIGILATOR' | 'RESERVE',
        roomAssigned: Invigilator[]
    ): Invigilator | null => {
        const filtered = candidateList.filter(inv => !assignedInSession.has(inv.id));
        if (filtered.length === 0) return null;

        const scored = filtered.map(inv => ({
            inv,
            score: scoreCandidate(inv, role, roomAssigned)
        }));

        scored.sort((a, b) => a.score - b.score);
        return scored[0].inv;
    };

    // Staff each active room
    for (const room of classroomsInUse) {
        const studentCount = roomStudentCounts.get(room.id) || 0;
        if (studentCount <= 0) continue;

        // Dynamically compute faculty requirement per room from user-configured student rules
        const requiredInvigilators = getRequiredFacultyCount(studentCount, facultyStudentRules);

        const sessionRoomAssignments: Invigilator[] = [];

        for (let pos = 0; pos < requiredInvigilators; pos++) {
            let chosen: Invigilator | null = null;

            if (pos === 0) {
                // POSITION 1: Room Senior / Lead Invigilator
                // Try from Professors / Associate Professors first
                const seniorCandidates = availablePool.filter(inv =>
                    SENIOR_DESIGNATIONS.has(inv.designation) && !assignedInSession.has(inv.id)
                );

                if (seniorCandidates.length > 0) {
                    chosen = selectBestCandidate(seniorCandidates, 'SENIOR', sessionRoomAssignments);
                }

                // Fallback if senior pool exhausted: pick lowest-duty Assistant Professor
                if (!chosen) {
                    const fallbackCandidates = availablePool.filter(inv => !assignedInSession.has(inv.id));
                    chosen = selectBestCandidate(fallbackCandidates, 'SENIOR', sessionRoomAssignments);
                }
            } else {
                // POSITION 2 & 3: Co-Invigilators
                // Filter out a second Lab Assistant if one is already in this room
                const hasLabAssistant = sessionRoomAssignments.some(inv => inv.designation === 'Lab Assistant');
                const coInvigilatorCandidates = availablePool.filter(inv =>
                    !assignedInSession.has(inv.id) &&
                    !(hasLabAssistant && inv.designation === 'Lab Assistant')
                );

                chosen = selectBestCandidate(coInvigilatorCandidates, 'CO_INVIGILATOR', sessionRoomAssignments);
            }

            if (!chosen) break;

            sessionRoomAssignments.push(chosen);
            assignedInSession.add(chosen.id);

            assignments.push({
                exam,
                classroom: room,
                invigilator: chosen,
            });

            // Update master record for atomic duty count tracking
            const invRecord = invigilatorMasterList.find(im => im.id === chosen!.id);
            if (invRecord) {
                let dutyRecord = invRecord.assignedDuties.find(d => d.date === exam.date);
                if (dutyRecord) dutyRecord.count++;
                else invRecord.assignedDuties.push({ date: exam.date, count: 1 });

                invRecord.lastAssignedSlotId = exam.id;
                invRecord.lastAssignedDate = exam.date;
                invRecord.lastAssignedShift = String(exam.shift || exam.time);
            }

            // Sync available pool copy
            const poolIdx = availablePool.findIndex(p => p.id === chosen!.id);
            if (poolIdx !== -1 && invRecord) {
                availablePool[poolIdx] = JSON.parse(JSON.stringify(invRecord));
            }
        }
    }

    // RESERVED / STANDBY INVIGILATORS ALLOCATION
    if (reservedCount > 0) {
        for (let i = 0; i < reservedCount; i++) {
            const reserveCandidates = availablePool.filter(inv => !assignedInSession.has(inv.id));
            const winner = selectBestCandidate(reserveCandidates, 'RESERVE', []);
            if (!winner) break;

            assignedInSession.add(winner.id);
            assignments.push({
                exam,
                classroom: null, // Reserved / Standby
                invigilator: winner,
                isReserved: true
            });

            const invRecord = invigilatorMasterList.find(im => im.id === winner.id);
            if (invRecord) {
                let dutyRecord = invRecord.assignedDuties.find(d => d.date === exam.date);
                if (dutyRecord) dutyRecord.count++;
                else invRecord.assignedDuties.push({ date: exam.date, count: 1 });

                invRecord.lastAssignedSlotId = exam.id;
                invRecord.lastAssignedDate = exam.date;
                invRecord.lastAssignedShift = String(exam.shift || exam.time);
            }

            const poolIdx = availablePool.findIndex(p => p.id === winner.id);
            if (poolIdx !== -1 && invRecord) {
                availablePool[poolIdx] = JSON.parse(JSON.stringify(invRecord));
            }
        }
    }

    return { assignments, updatedInvigilators: invigilatorMasterList };
}

/**
 * Performs faculty assignment based on manual room and staff counts.
 * This is used when the user wants to bypass student-based logic and just say
 * "I need X rooms and Y invigilators".
 */
export const DEFAULT_FACULTY_DUTY_LIMITS: Record<string, number> = {
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

export function generateManualFacultyAllotment(
    invigilators: Invigilator[],
    classrooms: Classroom[],
    exam: ExamSlot,
    roomCount: number,
    activeStaffCount: number,
    reservedStaffCount: number,
    blockPriority: string[] = [],
    customDutyLimits?: Record<string, number>
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
        ...DEFAULT_FACULTY_DUTY_LIMITS,
        ...(customDutyLimits || {})
    };
    const getTotalDuties = (inv: Invigilator) => inv.assignedDuties ? inv.assignedDuties.reduce((sum, duty) => sum + duty.count, 0) : 0;

    // 1. Pick Classrooms based on priority and count
    const sortedRooms = [...classrooms]
        .filter(room => !room.unavailableSlots?.some(slot => slot.slotId === exam.id))
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

    const currentShift = (exam as any).manualShiftIndex ?? (exam.shift ? exam.shift - 1 : (exam.id.includes('Shift II') ? 1 : 0));
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

        // PASS 1: The "Universal Law" - Strictly Respect Designation Duty Limits, Daily Limits & NO back-to-back duties
        const nonConsecutiveCandidates = availablePool.filter(inv => {
            // 0. Max Designation Duty Limit Check
            const limit = DUTY_LIMITS[inv.designation] ?? 15;
            const currentDuties = getTotalDuties(inv);
            if (currentDuties >= limit) return false;

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

        // PASS 2: Emergency Fallback - ONLY allow 001 + 01 (Mid + Reg) for Juniors within limits
        if (poolToUse.length === 0) {
            const juniorCandidates = availablePool.filter(inv => {
                if (!isJunior(inv.designation)) return false;
                
                // Check overall designation limit
                const limit = DUTY_LIMITS[inv.designation] ?? 20;
                if (getTotalDuties(inv) >= limit) return false;

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

/**
 * Generates synthetic student roster from batch student counts.
 * E.g., B.Tech CSE Sem 3: 120 -> S-25CSE001 to S-25CSE120
 */
export function generateStudentsFromBatches(
    batches: { course: string; department?: string; semester: number | string; count: number }[]
): Student[] {
    const students: Student[] = [];
    let rollCounter = 1;

    batches.forEach(b => {
        const count = Number(b.count) || 0;
        if (count <= 0) return;

        // Clean code for roll number prefix
        const cleanCourse = b.course.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'STU';
        const sem = Number(b.semester) || 1;
        const dept = b.department || b.course.split('(')[0].trim() || 'General';

        for (let i = 1; i <= count; i++) {
            const rollNo = `25${cleanCourse}${String(i).padStart(3, '0')}`;
            students.push({
                id: `S-${cleanCourse}-${sem}-${String(i).padStart(3, '0')}`,
                name: `${b.course} Student ${i}`,
                rollNo,
                course: b.course,
                department: dept,
                semester: sem,
                section: ['A', 'B', 'C'][(i - 1) % 3],
                ineligibilityRecords: [],
                unavailableSlots: [],
                seatAssignment: null,
                isDebarred: false
            });
            rollCounter++;
        }
    });

    return students;
}

/**
 * Extracts room-by-room batch allocation, roll-number ranges, occupancy, and invigilators
 * for a single exam session.
 */
export function extractSessionRoomSummary(
    sessionKey: string,
    seatPlan: SeatPlan,
    invigilatorAssignments: InvigilatorAssignment[],
    allClassrooms: Classroom[]
): SessionAllotmentSummary {
    const [date, time] = sessionKey.split(' ');
    const hour = parseInt((time || '09:30').split(':')[0]);
    const shift = hour < 12 ? 'Shift I (Morning)' : 'Shift II (Afternoon)';

    const roomMap = new Map<string, {
        classroom: Classroom;
        students: (Student & { exam: ExamSlot })[];
    }>();

    seatPlan.assignments.forEach(seat => {
        if (seat.student && seat.classroom) {
            if (!roomMap.has(seat.classroom.id)) {
                roomMap.set(seat.classroom.id, {
                    classroom: seat.classroom,
                    students: []
                });
            }
            roomMap.get(seat.classroom.id)!.students.push(seat.student);
        }
    });

    const rooms: BatchRoomAllocation[] = [];
    let totalStudents = 0;

    roomMap.forEach(({ classroom, students }) => {
        totalStudents += students.length;

        const batchMap = new Map<string, {
            course: string;
            semester: number;
            subjectCode: string;
            subjectName: string;
            studentCount: number;
            rollNumbers: string[];
        }>();

        students.forEach(s => {
            const key = `${s.course}-${s.semester}-${s.exam.subjectCode}`;
            if (!batchMap.has(key)) {
                batchMap.set(key, {
                    course: s.course,
                    semester: s.semester,
                    subjectCode: s.exam.subjectCode,
                    subjectName: s.exam.subjectName,
                    studentCount: 0,
                    rollNumbers: []
                });
            }
            const b = batchMap.get(key)!;
            b.studentCount++;
            if (s.rollNo) b.rollNumbers.push(s.rollNo);
        });

        const batches: RoomBatchDistribution[] = Array.from(batchMap.values()).map(b => {
            b.rollNumbers.sort((x, y) => x.localeCompare(y, undefined, { numeric: true }));
            const minRoll = b.rollNumbers[0];
            const maxRoll = b.rollNumbers[b.rollNumbers.length - 1];
            const rollNoRange = b.rollNumbers.length > 1 ? `${minRoll} - ${maxRoll}` : (minRoll || '');
            return {
                course: b.course,
                semester: b.semester,
                subjectCode: b.subjectCode,
                subjectName: b.subjectName,
                studentCount: b.studentCount,
                rollNoRange
            };
        });

        const roomInvigilators = invigilatorAssignments
            .filter(a => a.classroom?.id === classroom.id && !a.isReserved)
            .map(a => a.invigilator);

        rooms.push({
            roomId: classroom.id,
            roomNo: classroom.roomNo,
            building: classroom.building,
            capacity: classroom.capacity,
            allocatedCount: students.length,
            occupancyPercent: Math.round((students.length / Math.max(1, classroom.capacity)) * 100),
            batches,
            invigilators: roomInvigilators
        });
    });

    rooms.sort((a, b) => a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true }));

    const reservedInvigilators = invigilatorAssignments
        .filter(a => a.isReserved)
        .map(a => a.invigilator);

    return {
        sessionKey,
        date: date || '',
        time: time || '',
        shift,
        totalStudents,
        totalRooms: rooms.length,
        rooms,
        reservedInvigilators
    };
}

/**
 * End-to-end Room & Batch Allotment Engine.
 * Matches student numbers for each batch with classrooms session-by-session,
 * assigning rooms, desk seats, and invigilators.
 */
export function generateFullBatchAllotment(
    batches: { course: string; department?: string; semester: number | string; count: number }[],
    classrooms: Classroom[],
    invigilators: Invigilator[],
    examSchedule: ExamSlot[],
    options?: {
        reservedCount?: number;
        blockPriority?: string[];
        excludedBlocks?: string[];
        excludedRooms?: string[];
        facultyStudentRules?: FacultyStudentRule[];
    }
): {
    fullAllotment: Record<string, { seatPlan: SeatPlan; invigilatorAssignments: InvigilatorAssignment[] }>;
    updatedStudents: Student[];
    updatedInvigilators: Invigilator[];
    sessionSummaries: Record<string, SessionAllotmentSummary>;
} {
    const reservedCount = options?.reservedCount ?? 2;
    const blockPriority = options?.blockPriority ?? [];
    const excludedBlocks = options?.excludedBlocks ?? [];
    const excludedRooms = options?.excludedRooms ?? [];

    // 1. Generate student master list from batch counts
    let masterStudents = generateStudentsFromBatches(batches);
    let masterInvigilators = JSON.parse(JSON.stringify(invigilators));

    // Reset assigned duties
    masterInvigilators.forEach((inv: Invigilator) => {
        inv.assignedDuties = [];
        delete inv.lastAssignedSlotId;
        delete inv.lastAssignedDate;
        delete inv.lastAssignedShift;
    });

    // 2. Filter available classrooms
    const usableClassrooms = classrooms.filter(room =>
        !excludedBlocks.includes(room.building) &&
        !excludedRooms.includes(room.id)
    );

    // 3. Group exams by session (Date + Time)
    const examSlotsByTime = examSchedule.reduce((acc, exam) => {
        const key = `${exam.date} ${exam.time}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(exam);
        return acc;
    }, {} as Record<string, ExamSlot[]>);

    const sortedSessionKeys = Object.keys(examSlotsByTime).sort((a, b) => 
        new Date(a).getTime() - new Date(b).getTime()
    );

    const generatedPlans: Record<string, { seatPlan: SeatPlan; invigilatorAssignments: InvigilatorAssignment[] }> = {};
    const sessionSummaries: Record<string, SessionAllotmentSummary> = {};

    for (const key of sortedSessionKeys) {
        const concurrentExams = examSlotsByTime[key];
        if (!concurrentExams || concurrentExams.length === 0) continue;

        const { plan, updatedStudents } = generateSeatPlan(masterStudents, usableClassrooms, concurrentExams, blockPriority);
        masterStudents = updatedStudents;

        const { assignments, updatedInvigilators } = assignInvigilators(masterInvigilators, plan, concurrentExams[0], reservedCount, options?.facultyStudentRules);
        masterInvigilators = updatedInvigilators;

        generatedPlans[key] = { seatPlan: plan, invigilatorAssignments: assignments };
        sessionSummaries[key] = extractSessionRoomSummary(key, plan, assignments, usableClassrooms);
    }

    return {
        fullAllotment: generatedPlans,
        updatedStudents: masterStudents,
        updatedInvigilators: masterInvigilators,
        sessionSummaries
    };
}

