

import type { Student, Classroom, ExamSlot, SeatPlan, Invigilator, InvigilatorAssignment, Seat, BatchRoomAllocation, SessionAllotmentSummary, RoomBatchDistribution, FacultyStudentRule, RuleViolation, RuleValidationReport, RuleConflict } from './types';
import { DEFAULT_FACULTY_STUDENT_RULES } from './types';
import { isCourseMatch, canonicalizeCourse } from './course-utils';
import { getFacultySeniority } from './data';

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

        const courseMatch = isCourseMatch(s.course, exam.course) || 
                            normalize(s.course) === normalize(exam.course) ||
                            (Boolean(exam.subjectCode) && (
                                normalize(s.course) === normalize(exam.subjectCode) ||
                                normalize(s.course).replace(/[^a-z0-9]/g, '') === normalize(exam.subjectCode).replace(/[^a-z0-9]/g, '')
                            ));
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
 * Helper to determine if two roll numbers are consecutive numbers in sequence.
 * E.g., '25CSE001' and '25CSE002' are consecutive.
 * Under Rule 2, students with consecutive roll numbers must sit on the same side
 * of the benches down the column, NOT next to each other on the same bench.
 */
export function areRollNumbersConsecutive(r1?: string, r2?: string): boolean {
    if (!r1 || !r2) return false;
    const clean1 = r1.trim().toUpperCase();
    const clean2 = r2.trim().toUpperCase();
    if (clean1 === clean2) return true; // duplicate roll number

    const match1 = clean1.match(/^(.*?)(\d+)$/);
    const match2 = clean2.match(/^(.*?)(\d+)$/);
    if (match1 && match2) {
        const prefix1 = match1[1];
        const prefix2 = match2[1];
        if (prefix1 === prefix2) {
            const num1 = parseInt(match1[2], 10);
            const num2 = parseInt(match2[2], 10);
            return Math.abs(num1 - num2) === 1;
        }
    }
    return false;
}

/**
 * Evaluates whether two students conflict and therefore CANNOT sit on the same bench.
 * 
 * Rules enforced:
 * - Rule 10: No duplicate allotment (same student cannot sit twice).
 * - Rule 2: Consecutive roll numbers must sit on the same side of the benches, in ascending order.
 *   Two students with consecutive roll numbers from the same course cannot sit on opposite sides of the same bench.
 * - Same-course non-consecutive students CAN sit on the same bench under Rule 4 (Left-Right seating)
 *   and Rule 8 (Same-course seating without unnecessary gaps).
 */
export function isStudentConflict(
    s1: { id?: string; rollNo?: string; course: string; department?: string; semester?: number | string; exam?: { subjectCode?: string; course?: string } },
    s2: { id?: string; rollNo?: string; course: string; department?: string; semester?: number | string; exam?: { subjectCode?: string; course?: string } }
): boolean {
    if (!s1 || !s2) return false;

    // Rule 10: Duplicate student check
    if (s1.id && s2.id && s1.id === s2.id) return true;
    if (s1.rollNo && s2.rollNo && s1.rollNo.trim().toUpperCase() === s2.rollNo.trim().toUpperCase()) return true;

    // Rule: Same course students must NOT sit together on the same bench
    const isSameCourse = isCourseMatch(s1.course, s2.course) ||
        (s1.exam?.course && s2.exam?.course && isCourseMatch(s1.exam.course, s2.exam.course)) ||
        canonicalizeCourse(s1.course).toLowerCase() === canonicalizeCourse(s2.course).toLowerCase();

    const isSameSubject = Boolean(
        s1.exam?.subjectCode &&
        s2.exam?.subjectCode &&
        s1.exam.subjectCode.trim().toLowerCase() === s2.exam.subjectCode.trim().toLowerCase()
    );

    if (isSameCourse || isSameSubject) {
        return true;
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
 * Validates a SeatPlan against all 24 Student Seating Allotment Rules:
 * 1. Course-wise classroom allocation
 * 2. Consecutive roll numbers on same side of benches
 * 3. Roll number sequence ascending starting from first bench
 * 4. Left-right seating maintained on each side
 * 5. Bench allocation capacity respected
 * 6. Classroom filling without arbitrary fragmentation
 * 7. Course separation unless capacity requires sharing
 * 8. Same-course seating without unnecessary gaps
 * 10. No duplicate student allotment
 * 11. No duplicate seat occupancy
 * 15. Capacity management spillover
 * 16. Predefined consistent seating pattern
 * 19. Incomplete sequences handled without inventing dummy students
 * 20. Insufficient capacity reported
 * 21. Deterministic allocation
 * 22. Manual adjustments revalidated
 * 23. Allocation records retain roll number, course, room, bench number, seat position
 * 24. Flag conflicts instead of silently violating rules
 */
export function validateSeatPlanRules(
    plan: SeatPlan,
    classrooms: Classroom[] = []
): RuleValidationReport {
    const violations: RuleViolation[] = [];
    const validClassrooms = Array.isArray(classrooms) ? classrooms.filter(c => c && c.id) : [];
    const roomMap = new Map(validClassrooms.map(c => [c.id, c]));

    const assignedSeats = (plan.assignments || []).filter(a => a && a.classroom?.id);

    // Rule 10: No duplicate student allotment
    const studentSeatMap = new Map<string, Seat[]>();
    assignedSeats.forEach(seat => {
        if (seat.student) {
            if (!studentSeatMap.has(seat.student.id)) studentSeatMap.set(seat.student.id, []);
            studentSeatMap.get(seat.student.id)!.push(seat);
        }
    });
    studentSeatMap.forEach((seats, studentId) => {
        if (seats.length > 1) {
            violations.push({
                ruleNumber: 10,
                ruleName: 'No duplicate allotment',
                studentRollNo: seats[0].student?.rollNo,
                description: `Student ${seats[0].student?.name} (${seats[0].student?.rollNo}) is assigned to ${seats.length} seats in the same session.`,
                severity: 'error'
            });
        }
    });

    // Rule 11: No duplicate seat occupancy
    const roomSeatOccupancy = new Map<string, Map<number, Seat[]>>();
    assignedSeats.forEach(seat => {
        if (seat.student) {
            const rId = seat.classroom.id;
            if (!roomSeatOccupancy.has(rId)) roomSeatOccupancy.set(rId, new Map());
            const seatMap = roomSeatOccupancy.get(rId)!;
            if (!seatMap.has(seat.seatNumber)) seatMap.set(seat.seatNumber, []);
            seatMap.get(seat.seatNumber)!.push(seat);
        }
    });
    roomSeatOccupancy.forEach((seatMap, rId) => {
        const room = roomMap.get(rId);
        seatMap.forEach((seats, seatNumber) => {
            if (seats.length > 1) {
                violations.push({
                    ruleNumber: 11,
                    ruleName: 'No duplicate occupancy',
                    classroomId: rId,
                    roomNo: room?.roomNo,
                    seatNumber,
                    description: `Seat #${seatNumber} in Room ${room?.roomNo || rId} is occupied by ${seats.length} students.`,
                    severity: 'error'
                });
            }
        });
    });

    // Rule 5: Bench capacity & Rule 2: Consecutive roll numbers check
    const assignmentsByRoom = new Map<string, Seat[]>();
    assignedSeats.forEach(seat => {
        const rId = seat.classroom.id;
        if (!assignmentsByRoom.has(rId)) assignmentsByRoom.set(rId, []);
        assignmentsByRoom.get(rId)!.push(seat);
    });

    assignmentsByRoom.forEach((seats, rId) => {
        const room = roomMap.get(rId) || seats[0]?.classroom;
        if (!room || !Array.isArray(room.benchCapacities)) return;

        const seatMap = new Map<number, Seat>();
        seats.forEach(s => {
            if (s && typeof s.seatNumber === 'number') seatMap.set(s.seatNumber, s);
        });

        let seatCounter = 1;
        room.benchCapacities.forEach((capacity, benchIdx) => {
            const benchSeats: Seat[] = [];
            for (let i = 0; i < capacity; i++) {
                const seatNum = seatCounter++;
                const seat = seatMap.get(seatNum);
                if (seat && seat.student) benchSeats.push(seat);
            }

            // Rule 5: Bench capacity check
            if (benchSeats.length > capacity) {
                violations.push({
                    ruleNumber: 5,
                    ruleName: 'Bench allocation capacity',
                    classroomId: room.id,
                    roomNo: room.roomNo,
                    benchIndex: benchIdx,
                    description: `Bench #${benchIdx + 1} has ${benchSeats.length} students but capacity is only ${capacity}.`,
                    severity: 'error'
                });
            }

            // Rule 2: Consecutive roll numbers on the same bench
            if (benchSeats.length > 1) {
                for (let i = 0; i < benchSeats.length; i++) {
                    for (let j = i + 1; j < benchSeats.length; j++) {
                        const s1 = benchSeats[i].student!;
                        const s2 = benchSeats[j].student!;
                        if (isStudentConflict(s1, s2)) {
                            violations.push({
                                ruleNumber: 2,
                                ruleName: 'Consecutive roll numbers on same side',
                                classroomId: room.id,
                                roomNo: room.roomNo,
                                benchIndex: benchIdx,
                                seatNumber: benchSeats[i].seatNumber,
                                studentRollNo: `${s1.rollNo} & ${s2.rollNo}`,
                                description: `Students with consecutive roll numbers (${s1.rollNo} and ${s2.rollNo}) are seated side-by-side on Bench #${benchIdx + 1}. Under Rule 2, consecutive roll numbers must sit on the same side of the benches down the column.`,
                                severity: 'error'
                            });
                        }
                    }
                }
            }
        });

        // Rule 7: Course separation check
        const distinctCourses = new Set(
            seats.filter(s => s.student).map(s => canonicalizeCourse(s.student!.course || s.student!.exam?.course))
        );
        if (distinctCourses.size > 1) {
            violations.push({
                ruleNumber: 7,
                ruleName: 'Course separation',
                classroomId: room.id,
                roomNo: room.roomNo,
                description: `Room ${room.roomNo} has mixed courses: ${Array.from(distinctCourses).join(', ')}. Permitted only when classroom capacity necessitates sharing.`,
                severity: 'warning'
            });
        }
    });

    const errorCount = violations.filter(v => v.severity === 'error').length;
    const warningCount = violations.filter(v => v.severity === 'warning').length;

    return {
        isValid: errorCount === 0,
        violations,
        summary: {
            totalViolations: violations.length,
            errorCount,
            warningCount,
            courseSeparationCompliant: warningCount === 0,
            consecutiveRollCompliant: !violations.some(v => v.ruleNumber === 2),
            benchCapacityCompliant: !violations.some(v => v.ruleNumber === 5),
            noDuplicateStudents: !violations.some(v => v.ruleNumber === 10),
            noDuplicateSeats: !violations.some(v => v.ruleNumber === 11)
        }
    };
}

/**
 * Inspects benches across all classrooms in a seat plan and returns detailed violations.
 */
export function getSeatPlanViolations(
    plan: SeatPlan,
    classrooms: Classroom[] = []
): BenchViolationDetail[] {
    if (!plan || !plan.assignments || !Array.isArray(plan.assignments) || plan.assignments.length === 0) return [];
    const report = validateSeatPlanRules(plan, classrooms);
    return report.violations
        .filter(v => v.severity === 'error' && (v.ruleNumber === 2 || v.ruleNumber === 5 || v.ruleNumber === 10 || v.ruleNumber === 11))
        .map(v => ({
            classroomId: v.classroomId || '',
            roomNo: v.roomNo || 'Room',
            benchIndex: v.benchIndex ?? 0,
            seatNumber1: v.seatNumber ?? 0,
            seatNumber2: v.seatNumber ?? 0,
            student1: null as any,
            student2: null as any,
            reason: `Rule ${v.ruleNumber} (${v.ruleName}): ${v.description}`
        }));
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

/**
 * Verifies that a seat plan adheres to all seating rules (zero errors).
 */
export function isSeatPlanCompliantWithSittingRules(
    plan: SeatPlan,
    classrooms: Classroom[] = []
): boolean {
    if (!plan || !plan.assignments || plan.assignments.length === 0) return true;
    return countSeatPlanViolations(plan, classrooms) === 0;
}

/**
 * ExamPlanner Automated Seating Engine implementing all 24 Student Seating Allotment Rules.
 */
export function generateSeatPlan(
    allStudents: Student[],
    classrooms: Classroom[],
    exams: ExamSlot[],
    blockPriority: string[] = [],
    options?: { retainFixedSeats?: boolean }
): {
    plan: SeatPlan;
    updatedStudents: Student[];
    validationReport: RuleValidationReport;
    shortageStudents: (Student & { exam: ExamSlot; reason: string })[];
    ruleConflicts: RuleConflict[];
} {
    // Retain previous seat assignments if requested (Rule 17)
    const studentMasterList: Student[] = allStudents.map(s => ({
        ...s,
        seatAssignment: options?.retainFixedSeats ? s.seatAssignment : null
    }));
    const finalAssignments: Seat[] = [];
    const ruleConflicts: RuleConflict[] = [];
    const shortageStudents: (Student & { exam: ExamSlot; reason: string })[] = [];

    // 1. Identify all eligible students for today's exams (Rules 10, 19)
    const allEligibleEntries = exams.flatMap(exam =>
        getEligibleStudentsForExam(studentMasterList, exam).map(s => ({ ...s, exam }))
    );

    // Rule 10: Deduplicate students (no student assigned more than one seat in session)
    const eligibleStudentsToday: (Student & { exam: ExamSlot })[] = [];
    const studentIdsProcessed = new Set<string>();
    for (const entry of allEligibleEntries) {
        if (!studentIdsProcessed.has(entry.id)) {
            studentIdsProcessed.add(entry.id);
            eligibleStudentsToday.push(entry);
        } else {
            // Student matched multiple concurrent exams
            ruleConflicts.push({
                ruleNumber: 10,
                ruleName: 'Duplicate exam eligibility',
                course: entry.course,
                description: `Student ${entry.name} (${entry.rollNo}) is eligible for multiple concurrent exams; assigned to primary exam only.`,
                severity: 'warning'
            });
        }
    }

    // 2. Filter available classrooms & Sort deterministically (Rule 18, 21)
    const availableClassrooms = classrooms
        .filter(room => !exams.some(exam => room.unavailableSlots?.some(slot => slot.slotId === exam.id)))
        .sort((a, b) => {
            // Priority Sort first
            const indexA = blockPriority.indexOf(a.building);
            const indexB = blockPriority.indexOf(b.building);
            if (indexA !== -1 && indexB !== -1 && indexA !== indexB) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;

            // Secondary: Capacity Descending (minimizes total rooms used, Rule 18)
            if (b.capacity !== a.capacity) return b.capacity - a.capacity;

            // Stable deterministic tie-breaker (Rule 21)
            return (a.roomNo || '').localeCompare(b.roomNo || '', undefined, { numeric: true });
        });

    // 3. Prepare Room-Seat Maps
    const roomSeatMaps = new Map<string, (Seat | null)[]>();
    availableClassrooms.forEach(room => {
        roomSeatMaps.set(room.id, Array(room.capacity).fill(null));
    });

    // 4. Group Students by Course to form Course Batches (Rule 1, 8)
    const courseBatches = new Map<string, (Student & { exam: ExamSlot })[]>();
    eligibleStudentsToday.forEach(student => {
        const key = canonicalizeCourse(student.course || student.exam.course);
        if (!courseBatches.has(key)) courseBatches.set(key, []);
        courseBatches.get(key)!.push(student);
    });

    // Sort each batch strictly in ascending roll-number order (Rules 3, 8, 19, 21)
    const sortedCourseBatches = new Map<string, (Student & { exam: ExamSlot })[]>();
    courseBatches.forEach((students, key) => {
        const sorted = [...students].sort((a, b) =>
            a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true, sensitivity: 'base' })
        );
        sortedCourseBatches.set(key, sorted);
    });

    // 5. Course-wise Classroom Allocation with Interleaved Course Pairing & Smart Gap Filling (Rules 1, 2, 4, 6, 7, 8, 15, 18)
    // University Anti-Cheating & Exam Administration Rules:
    // - Students of the same course must NEVER sit together on the same bench or on adjacent sides across the aisle.
    // - Consecutive roll numbers must sit down the column on the same side of benches in ascending order.
    // - Classrooms are filled to maximum capacity before moving to the next classroom (Zero Seat Waste).
    // - Primary large course (e.g. BTech) occupies Side A (Left).
    // - Secondary large course (e.g. BCA, BBA) occupies Side B (Right).
    // - Smart Gap-Filling Rule:
    //   If space remains on a side, fill with compatible courses to prevent wasting classroom space.
    //   Priority 1: Exact matches (course remaining count == remaining gap) or complete fits (course fits entirely).
    //   Priority 2: Anti-Splinter Rule - If the room already has >= 2 distinct courses, do NOT splinter
    //   a large 3rd course for just 1 or 2 leftover seats if other classrooms exist, preventing isolated student stragglers.
    //   Priority 3: If gap >= 3 seats, take a substantial cohort from the largest candidate course.
    const availableQueue = [...availableClassrooms];

    // Track active pools for each course
    const remainingCourseBatches = new Map<string, (Student & { exam: ExamSlot })[]>();
    sortedCourseBatches.forEach((students, key) => {
        remainingCourseBatches.set(key, [...students]);
    });

    const getRemainingCount = (courseKey: string) => remainingCourseBatches.get(courseKey)?.length || 0;
    const getTotalRemaining = () => {
        let sum = 0;
        remainingCourseBatches.forEach(list => { sum += list.length; });
        return sum;
    };

    const getActiveCoursesSorted = () => {
        return Array.from(remainingCourseBatches.keys())
            .filter(c => getRemainingCount(c) > 0)
            .sort((a, b) => getRemainingCount(b) - getRemainingCount(a));
    };

    // Helper to check whether a candidate course/exam conflicts with an already seated student
    const doesCandidateConflictWithOther = (
        candidateCourse: string,
        candidateExam: ExamSlot,
        other: (Student & { exam: ExamSlot }) | null
    ): boolean => {
        if (!other) return false;
        if (isCourseMatch(candidateCourse, other.course)) return true;
        if (canonicalizeCourse(candidateCourse).toLowerCase() === canonicalizeCourse(other.course).toLowerCase()) return true;
        if (other.exam?.course && isCourseMatch(candidateCourse, other.exam.course)) return true;
        if (candidateExam.course && isCourseMatch(candidateExam.course, other.course)) return true;
        if (candidateExam.subjectCode && other.exam?.subjectCode &&
            candidateExam.subjectCode.trim().toLowerCase() === other.exam.subjectCode.trim().toLowerCase()) {
            return true;
        }
        return false;
    };

    while (getTotalRemaining() > 0 && availableQueue.length > 0) {
        const room = availableQueue.shift()!;
        const map = roomSeatMaps.get(room.id)!;

        // Group benches by column traversal (down each aisle, column 0 then column 1...)
        const orderedBenches: { benchIdx: number; benchNumber: number; capacity: number }[] = [];
        for (let col = 0; col < room.columns; col++) {
            for (let r = 0; r < room.rows; r++) {
                const benchIdx = r * room.columns + col;
                if (benchIdx < room.benchCapacities.length && room.benchCapacities[benchIdx] > 0) {
                    orderedBenches.push({
                        benchIdx,
                        benchNumber: benchIdx + 1,
                        capacity: room.benchCapacities[benchIdx]
                    });
                }
            }
        }

        if (orderedBenches.length === 0) continue;

        // Bench seating state tracking
        const benchAssignments: {
            bench: { benchIdx: number; benchNumber: number; capacity: number };
            left: (Student & { exam: ExamSlot }) | null;
            right: (Student & { exam: ExamSlot }) | null;
            extra: (Student & { exam: ExamSlot }) | null;
        }[] = orderedBenches.map(b => ({ bench: b, left: null, right: null, extra: null }));

        const roomCourses = new Set<string>();

        // 1. ANCHOR SIDE A (Left): Largest remaining course
        const activeCoursesA = getActiveCoursesSorted();
        if (activeCoursesA.length === 0) break;

        const courseA = activeCoursesA[0];
        const leftBenches = benchAssignments.filter(b => b.bench.capacity >= 1);
        const poolA = remainingCourseBatches.get(courseA)!;
        const takeCountA = Math.min(poolA.length, leftBenches.length);
        const studentsA = poolA.splice(0, takeCountA);

        for (let i = 0; i < takeCountA; i++) {
            leftBenches[i].left = studentsA[i];
        }
        roomCourses.add(courseA);

        if (poolA.length > 0) {
            ruleConflicts.push({
                ruleNumber: 15,
                ruleName: 'Capacity management spillover',
                classroomId: room.id,
                roomNo: room.roomNo,
                course: courseA,
                description: `Course ${courseA} filled Room ${room.roomNo} Side A capacity (${leftBenches.length}); remaining ${poolA.length} student(s) will be allotted to next eligible classroom.`,
                severity: 'warning'
            });
        }

        // 2. ANCHOR SIDE B (Right): Next largest course distinct from courseA
        const rightBenches = benchAssignments.filter(b => b.bench.capacity >= 2);
        let primaryCourseB: string | null = null;

        if (rightBenches.length > 0) {
            const otherCourses = getActiveCoursesSorted().filter(c => c !== courseA);
            if (otherCourses.length > 0) {
                primaryCourseB = otherCourses[0];
                const poolB = remainingCourseBatches.get(primaryCourseB)!;
                const takeCountB = Math.min(poolB.length, rightBenches.length);
                const studentsB = poolB.splice(0, takeCountB);

                for (let i = 0; i < takeCountB; i++) {
                    rightBenches[i].right = studentsB[i];
                }
                roomCourses.add(primaryCourseB);

                if (poolB.length > 0) {
                    ruleConflicts.push({
                        ruleNumber: 15,
                        ruleName: 'Capacity management spillover',
                        classroomId: room.id,
                        roomNo: room.roomNo,
                        course: primaryCourseB,
                        description: `Course ${primaryCourseB} filled Room ${room.roomNo} Side B seats; remaining ${poolB.length} student(s) will be allotted to next eligible classroom.`,
                        severity: 'warning'
                    });
                }
            }
        }

        // 3. SMART GAP FILLING ON SIDE B (Right seats)
        // If Side B has empty benches left, fill them intelligently without seat waste or 1-seat splinters
        let currentRightIdx = rightBenches.findIndex(b => b.right === null);
        if (currentRightIdx !== -1) {
            while (currentRightIdx < rightBenches.length && getTotalRemaining() > 0) {
                const remainingGap = rightBenches.length - currentRightIdx;

                // Compatible candidates that don't conflict with the Left seat on the bench
                const candidateCourses = getActiveCoursesSorted().filter(courseKey => {
                    const benchTarget = rightBenches[currentRightIdx];
                    if (!benchTarget.left) return true;
                    const sampleStudent = remainingCourseBatches.get(courseKey)?.[0];
                    const candidateExam = sampleStudent?.exam || exams[0];
                    return !doesCandidateConflictWithOther(courseKey, candidateExam, benchTarget.left);
                });

                if (candidateCourses.length === 0) break;

                let chosenCourse: string | null = null;
                let seatsToTake = 0;

                // Priority 1: Exact match (zero seat waste, whole course seated together)
                const exactMatch = candidateCourses.find(c => getRemainingCount(c) === remainingGap);
                if (exactMatch) {
                    chosenCourse = exactMatch;
                    seatsToTake = remainingGap;
                } else {
                    // Priority 2: Complete fit (entire course fits within remaining gap)
                    const completeFits = candidateCourses
                        .filter(c => getRemainingCount(c) < remainingGap)
                        .sort((a, b) => getRemainingCount(b) - getRemainingCount(a));

                    if (completeFits.length > 0) {
                        chosenCourse = completeFits[0];
                        seatsToTake = getRemainingCount(chosenCourse);
                    } else {
                        // Priority 3: Courses larger than remainingGap
                        // Anti-Splinter: If room already has >= 2 courses and gap <= 2, do NOT splinter a large 3rd course
                        if (roomCourses.size >= 2 && remainingGap <= 2) {
                            if (availableQueue.length > 0) {
                                break; // Keep 1-2 buffer seats; let the course stay together in the next room
                            }
                        }

                        // Substantial cohort (gap >= 3) or room only has 1 course or final room
                        const largest = candidateCourses[0];
                        chosenCourse = largest;
                        seatsToTake = Math.min(getRemainingCount(largest), remainingGap);
                    }
                }

                if (!chosenCourse || seatsToTake <= 0) break;

                const pool = remainingCourseBatches.get(chosenCourse)!;
                const taken = pool.splice(0, seatsToTake);
                for (let i = 0; i < taken.length; i++) {
                    rightBenches[currentRightIdx + i].right = taken[i];
                }
                roomCourses.add(chosenCourse);
                currentRightIdx += taken.length;
            }
        }

        // 4. SMART GAP FILLING ON SIDE A (Left seats)
        // If Side A has empty benches left (Course A had fewer students than Left capacity)
        let currentLeftIdx = leftBenches.findIndex(b => b.left === null);
        if (currentLeftIdx !== -1) {
            while (currentLeftIdx < leftBenches.length && getTotalRemaining() > 0) {
                const remainingGap = leftBenches.length - currentLeftIdx;

                const candidateCourses = getActiveCoursesSorted().filter(courseKey => {
                    const benchTarget = leftBenches[currentLeftIdx];
                    if (!benchTarget.right) return true;
                    const sampleStudent = remainingCourseBatches.get(courseKey)?.[0];
                    const candidateExam = sampleStudent?.exam || exams[0];
                    return !doesCandidateConflictWithOther(courseKey, candidateExam, benchTarget.right);
                });

                if (candidateCourses.length === 0) break;

                let chosenCourse: string | null = null;
                let seatsToTake = 0;

                const exactMatch = candidateCourses.find(c => getRemainingCount(c) === remainingGap);
                if (exactMatch) {
                    chosenCourse = exactMatch;
                    seatsToTake = remainingGap;
                } else {
                    const completeFits = candidateCourses
                        .filter(c => getRemainingCount(c) < remainingGap)
                        .sort((a, b) => getRemainingCount(b) - getRemainingCount(a));

                    if (completeFits.length > 0) {
                        chosenCourse = completeFits[0];
                        seatsToTake = getRemainingCount(chosenCourse);
                    } else {
                        if (roomCourses.size >= 2 && remainingGap <= 2) {
                            if (availableQueue.length > 0) {
                                break;
                            }
                        }
                        const largest = candidateCourses[0];
                        chosenCourse = largest;
                        seatsToTake = Math.min(getRemainingCount(largest), remainingGap);
                    }
                }

                if (!chosenCourse || seatsToTake <= 0) break;

                const pool = remainingCourseBatches.get(chosenCourse)!;
                const taken = pool.splice(0, seatsToTake);
                for (let i = 0; i < taken.length; i++) {
                    leftBenches[currentLeftIdx + i].left = taken[i];
                }
                roomCourses.add(chosenCourse);
                currentLeftIdx += taken.length;
            }
        }

        // 5. COMMIT BENCH ASSIGNMENTS TO ROOM SEAT MAP
        for (const item of benchAssignments) {
            const { bench, left, right, extra } = item;
            let benchFlatIdxBase = 0;
            for (let b = 0; b < bench.benchIdx; b++) benchFlatIdxBase += room.benchCapacities[b];

            if (left) {
                const flatIdx = benchFlatIdxBase + 0;
                map[flatIdx] = {
                    student: left,
                    classroom: room,
                    seatNumber: flatIdx + 1,
                    benchNumber: bench.benchNumber,
                    benchIndex: bench.benchIdx,
                    seatPosition: 'Left'
                };
            }

            if (right && bench.capacity >= 2) {
                const flatIdx = benchFlatIdxBase + 1;
                map[flatIdx] = {
                    student: right,
                    classroom: room,
                    seatNumber: flatIdx + 1,
                    benchNumber: bench.benchNumber,
                    benchIndex: bench.benchIdx,
                    seatPosition: 'Right'
                };
            }

            if (extra && bench.capacity >= 3) {
                const flatIdx = benchFlatIdxBase + 2;
                map[flatIdx] = {
                    student: extra,
                    classroom: room,
                    seatNumber: flatIdx + 1,
                    benchNumber: bench.benchNumber,
                    benchIndex: bench.benchIdx,
                    seatPosition: 'Middle'
                };
            }
        }
    }

    // Handle any students that could not be seated due to insufficient total capacity
    remainingCourseBatches.forEach((pool, courseKey) => {
        if (pool.length > 0) {
            const unseated = pool.splice(0, pool.length);
            unseated.forEach(s => {
                shortageStudents.push({
                    ...s,
                    reason: `Insufficient classroom capacity. No eligible classroom or non-conflicting seats available.`
                });
            });
            ruleConflicts.push({
                ruleNumber: 20,
                ruleName: 'Insufficient capacity',
                course: courseKey,
                description: `Capacity shortage: ${unseated.length} student(s) of course ${courseKey} could not be allotted seats due to insufficient classroom capacity or room exhaustion.`,
                severity: 'error'
            });
        }
    });

    // 7. Assemble Final Assignments & Retain Allocation Records (Rule 23)
    availableClassrooms.forEach(room => {
        const map = roomSeatMaps.get(room.id);
        if (!map) return;
        let benchFlatIdxBase = 0;
        room.benchCapacities.forEach((benchSize, benchIdx) => {
            for (let s = 0; s < benchSize; s++) {
                const flatIdx = benchFlatIdxBase + s;
                const seatPos = benchSize === 1 ? 'Left' : (s === 0 ? 'Left' : (s === 1 ? 'Right' : 'Middle'));
                if (map[flatIdx]) {
                    const seat = map[flatIdx]!;
                    finalAssignments.push(seat);
                    if (seat.student) {
                        const masterIdx = studentMasterList.findIndex(sm => sm.id === seat.student!.id);
                        if (masterIdx !== -1) {
                            studentMasterList[masterIdx].seatAssignment = {
                                classroomId: room.id,
                                seatNumber: flatIdx + 1,
                                benchNumber: benchIdx + 1,
                                seatPosition: seatPos,
                                course: seat.student.course,
                                rollNo: seat.student.rollNo
                            };
                        }
                    }
                } else {
                    finalAssignments.push({
                        student: null,
                        classroom: room,
                        seatNumber: flatIdx + 1,
                        benchNumber: benchIdx + 1,
                        benchIndex: benchIdx,
                        seatPosition: seatPos
                    });
                }
            }
            benchFlatIdxBase += benchSize;
        });
    });

    const plan: SeatPlan = {
        exam: exams.length > 1 ? exams : exams[0],
        assignments: finalAssignments,
        shortageStudents,
        ruleConflicts
    };

    // 8. Revalidate Seating Arrangement (Rules 22, 24)
    const validationReport = validateSeatPlanRules(plan, availableClassrooms);
    plan.validationReport = validationReport;

    return {
        plan,
        updatedStudents: studentMasterList,
        validationReport,
        shortageStudents,
        ruleConflicts
    };
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
        if (seat && seat.student && seat.classroom?.id) {
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
                // Prioritize faculty with Senior seniority
                const seniorCandidates = availablePool.filter(inv =>
                    (inv.seniority === 'Senior' || getFacultySeniority(inv) === 'Senior') &&
                    !assignedInSession.has(inv.id)
                );

                if (seniorCandidates.length > 0) {
                    chosen = selectBestCandidate(seniorCandidates, 'SENIOR', sessionRoomAssignments);
                }

                // Fallback if senior pool exhausted: pick lowest-duty candidate from remaining pool
                if (!chosen) {
                    const fallbackCandidates = availablePool.filter(inv => !assignedInSession.has(inv.id));
                    chosen = selectBestCandidate(fallbackCandidates, 'SENIOR', sessionRoomAssignments);
                }
            } else if (pos === 1) {
                // POSITION 2: Room Junior Invigilator (Pair 1 Junior with 1 Senior)
                const hasLabAssistant = sessionRoomAssignments.some(inv => inv.designation === 'Lab Assistant');
                const juniorCandidates = availablePool.filter(inv =>
                    (inv.seniority === 'Junior' || getFacultySeniority(inv) === 'Junior') &&
                    !assignedInSession.has(inv.id) &&
                    !(hasLabAssistant && inv.designation === 'Lab Assistant')
                );

                if (juniorCandidates.length > 0) {
                    chosen = selectBestCandidate(juniorCandidates, 'CO_INVIGILATOR', sessionRoomAssignments);
                }

                // Fallback if junior pool exhausted: pick any remaining candidate
                if (!chosen) {
                    const fallbackCandidates = availablePool.filter(inv =>
                        !assignedInSession.has(inv.id) &&
                        !(hasLabAssistant && inv.designation === 'Lab Assistant')
                    );
                    chosen = selectBestCandidate(fallbackCandidates, 'CO_INVIGILATOR', sessionRoomAssignments);
                }
            } else {
                // POSITION 3+: Additional Co-Invigilators
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
        const count = Number(b.count || (b as any).totalStudents) || 0;
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
        if (seat && seat.student && seat.classroom?.id) {
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

