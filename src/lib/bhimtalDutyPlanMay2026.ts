import { ExamSlot, Classroom, Invigilator, SeatPlan, InvigilatorAssignment } from './types';
import { REAL_BHIMTAL_EXAMS } from './bhimtalData';

export interface DutyPlanShift {
  shiftName: 'Mid' | 'Shift I' | 'Shift II';
  shiftIndex: 0 | 1 | 2; // 0: Mid (09:30-11:00), 1: Shift I (09:30-12:30), 2: Shift II (01:30-04:30)
  time: string;          // "09:30" or "13:30"
  timeRange: string;     // "09:30AM-11:00AM", "09:30AM-12:30PM", "01:30PM-04:30PM"
  roomsRequired: number;
  totalInvigilators: number;
  activeInvigilators: number;
  reliefInvigilators: number;
  reservedInvigilators: number;
  backPaperNote?: string;
}

export interface DutyPlanDay {
  date: string;          // "2026-05-14"
  dayName: string;       // "Thursday"
  dateDisplay: string;   // "Thursday, 14 May, 2026"
  shifts: DutyPlanShift[];
}

/**
 * Official Graphic Era Hill University (Bhimtal Campus)
 * Examination Plan for End Term Examination (Even Semester) May 2026
 * (For Regular and Back paper)
 * As issued by Superintendent of Examination, GEHU, Bhimtal Campus.
 */
export const BHIMTAL_MAY_2026_DUTY_PLAN: DutyPlanDay[] = [
  {
    date: '2026-05-14',
    dayName: 'Thursday',
    dateDisplay: 'Thursday, 14 May, 2026',
    shifts: [
      { shiftName: 'Mid', shiftIndex: 0, time: '09:30', timeRange: '09:30AM-11:00AM', roomsRequired: 0, totalInvigilators: 2, activeInvigilators: 2, reliefInvigilators: 0, reservedInvigilators: 0 },
      { shiftName: 'Shift I', shiftIndex: 1, time: '09:30', timeRange: '09:30AM-12:30PM', roomsRequired: 17, totalInvigilators: 49, activeInvigilators: 42, reliefInvigilators: 4, reservedInvigilators: 3, backPaperNote: 'back - 103 - m - 64' },
      { shiftName: 'Shift II', shiftIndex: 2, time: '13:30', timeRange: '01:30PM-04:30PM', roomsRequired: 17, totalInvigilators: 44, activeInvigilators: 40, reliefInvigilators: 1, reservedInvigilators: 3, backPaperNote: 'back - 05' },
    ]
  },
  {
    date: '2026-05-15',
    dayName: 'Friday',
    dateDisplay: 'Friday, 15 May, 2026',
    shifts: [
      { shiftName: 'Mid', shiftIndex: 0, time: '09:30', timeRange: '09:30AM-11:00AM', roomsRequired: 0, totalInvigilators: 4, activeInvigilators: 4, reliefInvigilators: 0, reservedInvigilators: 0 },
      { shiftName: 'Shift I', shiftIndex: 1, time: '09:30', timeRange: '09:30AM-12:30PM', roomsRequired: 17, totalInvigilators: 49, activeInvigilators: 42, reliefInvigilators: 4, reservedInvigilators: 3, backPaperNote: 'back - 17' },
      { shiftName: 'Shift II', shiftIndex: 2, time: '13:30', timeRange: '01:30PM-04:30PM', roomsRequired: 17, totalInvigilators: 49, activeInvigilators: 42, reliefInvigilators: 4, reservedInvigilators: 3, backPaperNote: 'back - 23' },
    ]
  },
  {
    date: '2026-05-16',
    dayName: 'Saturday',
    dateDisplay: 'Saturday, 16 May, 2026',
    shifts: [
      { shiftName: 'Mid', shiftIndex: 0, time: '09:30', timeRange: '09:30AM-11:00AM', roomsRequired: 0, totalInvigilators: 2, activeInvigilators: 2, reliefInvigilators: 0, reservedInvigilators: 0 },
      { shiftName: 'Shift I', shiftIndex: 1, time: '09:30', timeRange: '09:30AM-12:30PM', roomsRequired: 17, totalInvigilators: 47, activeInvigilators: 42, reliefInvigilators: 2, reservedInvigilators: 3, backPaperNote: 'back - 69' },
      { shiftName: 'Shift II', shiftIndex: 2, time: '13:30', timeRange: '01:30PM-04:30PM', roomsRequired: 17, totalInvigilators: 47, activeInvigilators: 42, reliefInvigilators: 2, reservedInvigilators: 3 },
    ]
  },
  {
    date: '2026-05-18',
    dayName: 'Monday',
    dateDisplay: 'Monday, 18 May, 2026',
    shifts: [
      { shiftName: 'Mid', shiftIndex: 0, time: '09:30', timeRange: '09:30AM-11:00AM', roomsRequired: 0, totalInvigilators: 2, activeInvigilators: 2, reliefInvigilators: 0, reservedInvigilators: 0 },
      { shiftName: 'Shift I', shiftIndex: 1, time: '09:30', timeRange: '09:30AM-12:30PM', roomsRequired: 17, totalInvigilators: 49, activeInvigilators: 42, reliefInvigilators: 4, reservedInvigilators: 3, backPaperNote: 'back - 13' },
      { shiftName: 'Shift II', shiftIndex: 2, time: '13:30', timeRange: '01:30PM-04:30PM', roomsRequired: 17, totalInvigilators: 45, activeInvigilators: 40, reliefInvigilators: 2, reservedInvigilators: 3, backPaperNote: 'back - 33' },
    ]
  },
  {
    date: '2026-05-19',
    dayName: 'Tuesday',
    dateDisplay: 'Tuesday, 19 May, 2026',
    shifts: [
      { shiftName: 'Mid', shiftIndex: 0, time: '09:30', timeRange: '09:30AM-11:00AM', roomsRequired: 0, totalInvigilators: 4, activeInvigilators: 4, reliefInvigilators: 0, reservedInvigilators: 0 },
      { shiftName: 'Shift I', shiftIndex: 1, time: '09:30', timeRange: '09:30AM-12:30PM', roomsRequired: 17, totalInvigilators: 47, activeInvigilators: 42, reliefInvigilators: 2, reservedInvigilators: 3, backPaperNote: 'back - 44' },
      { shiftName: 'Shift II', shiftIndex: 2, time: '13:30', timeRange: '01:30PM-04:30PM', roomsRequired: 17, totalInvigilators: 47, activeInvigilators: 42, reliefInvigilators: 2, reservedInvigilators: 3, backPaperNote: 'back - 12' },
    ]
  },
  {
    date: '2026-05-20',
    dayName: 'Wednesday',
    dateDisplay: 'Wednesday, 20 May, 2026',
    shifts: [
      { shiftName: 'Mid', shiftIndex: 0, time: '09:30', timeRange: '09:30AM-11:00AM', roomsRequired: 0, totalInvigilators: 4, activeInvigilators: 4, reliefInvigilators: 0, reservedInvigilators: 0 },
      { shiftName: 'Shift I', shiftIndex: 1, time: '09:30', timeRange: '09:30AM-12:30PM', roomsRequired: 17, totalInvigilators: 35, activeInvigilators: 24, reliefInvigilators: 2, reservedInvigilators: 9, backPaperNote: 'back - 02' },
      { shiftName: 'Shift II', shiftIndex: 2, time: '13:30', timeRange: '01:30PM-04:30PM', roomsRequired: 17, totalInvigilators: 49, activeInvigilators: 42, reliefInvigilators: 4, reservedInvigilators: 3, backPaperNote: 'back - 51' },
    ]
  },
  {
    date: '2026-05-21',
    dayName: 'Thursday',
    dateDisplay: 'Thursday, 21 May, 2026',
    shifts: [
      { shiftName: 'Shift I', shiftIndex: 1, time: '09:30', timeRange: '09:30AM-12:30PM', roomsRequired: 17, totalInvigilators: 47, activeInvigilators: 42, reliefInvigilators: 2, reservedInvigilators: 3, backPaperNote: 'back - 112' },
      { shiftName: 'Shift II', shiftIndex: 2, time: '13:30', timeRange: '01:30PM-04:30PM', roomsRequired: 17, totalInvigilators: 47, activeInvigilators: 42, reliefInvigilators: 2, reservedInvigilators: 3, backPaperNote: 'back - 28' },
    ]
  },
  {
    date: '2026-05-22',
    dayName: 'Friday',
    dateDisplay: 'Friday, 22 May, 2026',
    shifts: [
      { shiftName: 'Shift I', shiftIndex: 1, time: '09:30', timeRange: '09:30AM-12:30PM', roomsRequired: 17, totalInvigilators: 49, activeInvigilators: 42, reliefInvigilators: 4, reservedInvigilators: 3, backPaperNote: 'back - 16' },
      { shiftName: 'Shift II', shiftIndex: 2, time: '13:30', timeRange: '01:30PM-04:30PM', roomsRequired: 17, totalInvigilators: 15, activeInvigilators: 12, reliefInvigilators: 0, reservedInvigilators: 3 },
    ]
  },
  {
    date: '2026-05-23',
    dayName: 'Saturday',
    dateDisplay: 'Saturday, 23 May, 2026',
    shifts: [
      { shiftName: 'Shift I', shiftIndex: 1, time: '09:30', timeRange: '09:30AM-12:30PM', roomsRequired: 17, totalInvigilators: 49, activeInvigilators: 42, reliefInvigilators: 4, reservedInvigilators: 3, backPaperNote: 'back - 110' },
      { shiftName: 'Shift II', shiftIndex: 2, time: '13:30', timeRange: '01:30PM-04:30PM', roomsRequired: 17, totalInvigilators: 53, activeInvigilators: 42, reliefInvigilators: 6, reservedInvigilators: 5, backPaperNote: 'back - 28' },
    ]
  },
  {
    date: '2026-05-25',
    dayName: 'Monday',
    dateDisplay: 'Monday, 25 May, 2026',
    shifts: [
      { shiftName: 'Shift I', shiftIndex: 1, time: '09:30', timeRange: '09:30AM-12:30PM', roomsRequired: 17, totalInvigilators: 49, activeInvigilators: 42, reliefInvigilators: 4, reservedInvigilators: 3, backPaperNote: 'back - 07' },
      { shiftName: 'Shift II', shiftIndex: 2, time: '13:30', timeRange: '01:30PM-04:30PM', roomsRequired: 13, totalInvigilators: 24, activeInvigilators: 13, reliefInvigilators: 6, reservedInvigilators: 5, backPaperNote: 'back - 22' },
    ]
  },
  {
    date: '2026-05-26',
    dayName: 'Tuesday',
    dateDisplay: 'Tuesday, 26 May, 2026',
    shifts: [
      { shiftName: 'Shift I', shiftIndex: 1, time: '09:30', timeRange: '09:30AM-12:30PM', roomsRequired: 17, totalInvigilators: 40, activeInvigilators: 35, reliefInvigilators: 2, reservedInvigilators: 3 },
      { shiftName: 'Shift II', shiftIndex: 2, time: '13:30', timeRange: '01:30PM-04:30PM', roomsRequired: 10, totalInvigilators: 37, activeInvigilators: 26, reliefInvigilators: 6, reservedInvigilators: 5, backPaperNote: 'back - 13' },
    ]
  },
  {
    date: '2026-05-28',
    dayName: 'Thursday',
    dateDisplay: 'Thursday, 28 May, 2026',
    shifts: [
      { shiftName: 'Shift I', shiftIndex: 1, time: '09:30', timeRange: '09:30AM-12:30PM', roomsRequired: 12, totalInvigilators: 29, activeInvigilators: 24, reliefInvigilators: 2, reservedInvigilators: 3, backPaperNote: 'back - 42' },
      { shiftName: 'Shift II', shiftIndex: 2, time: '13:30', timeRange: '01:30PM-04:30PM', roomsRequired: 1, totalInvigilators: 3, activeInvigilators: 2, reliefInvigilators: 0, reservedInvigilators: 1 },
    ]
  },
  {
    date: '2026-05-29',
    dayName: 'Friday',
    dateDisplay: 'Friday, 29 May, 2026',
    shifts: [
      { shiftName: 'Shift I', shiftIndex: 1, time: '09:30', timeRange: '09:30AM-12:30PM', roomsRequired: 1, totalInvigilators: 4, activeInvigilators: 3, reliefInvigilators: 0, reservedInvigilators: 1, backPaperNote: 'back - 1' },
      { shiftName: 'Shift II', shiftIndex: 2, time: '13:30', timeRange: '01:30PM-04:30PM', roomsRequired: 7, totalInvigilators: 15, activeInvigilators: 7, reliefInvigilators: 6, reservedInvigilators: 2, backPaperNote: 'back - 10' },
    ]
  },
  {
    date: '2026-05-30',
    dayName: 'Saturday',
    dateDisplay: 'Saturday, 30 May, 2026',
    shifts: [
      { shiftName: 'Shift I', shiftIndex: 1, time: '09:30', timeRange: '09:30AM-12:30PM', roomsRequired: 4, totalInvigilators: 11, activeInvigilators: 8, reliefInvigilators: 0, reservedInvigilators: 3, backPaperNote: 'back - 11' },
      { shiftName: 'Shift II', shiftIndex: 2, time: '13:30', timeRange: '01:30PM-04:30PM', roomsRequired: 9, totalInvigilators: 10, activeInvigilators: 2, reliefInvigilators: 6, reservedInvigilators: 2, backPaperNote: 'back - 28' },
    ]
  }
];

/**
 * Builds the comprehensive May 2026 End Term Exam Schedule
 * covering all departments and exam dates at GEHU Bhimtal.
 */
export const BHIMTAL_MAY_2026_EXAM_SCHEDULE: ExamSlot[] = [
  ...REAL_BHIMTAL_EXAMS.map((e, idx) => ({ ...e, id: `MAY26_${String(idx + 1).padStart(4, '0')}` })),
  
  // Friday, 29 May 2026
  { id: 'MAY26_0101', date: '2026-05-29', time: '09:30', shift: 1, department: 'Pharmacy', course: 'Bachelor of Pharmacy (B.Pharm.)', semester: 8, subjectName: 'Biostatistics and Research Methodology', subjectCode: 'BP801T', duration: 180 },
  { id: 'MAY26_0102', date: '2026-05-29', time: '13:30', shift: 2, department: 'Commerce', course: 'B.Com. (Hons)', semester: 4, subjectName: 'Financial Management', subjectCode: 'BCH403', duration: 180 },
  { id: 'MAY26_0103', date: '2026-05-29', time: '13:30', shift: 2, department: 'Computer Science and Engineering', course: 'B.Tech Computer Science and Engineering', semester: 4, subjectName: 'Operating Systems', subjectCode: 'TCS401', duration: 180 },
  { id: 'MAY26_0104', date: '2026-05-29', time: '13:30', shift: 2, department: 'Management', course: 'Bachelor of Business Administration (BBA)', semester: 4, subjectName: 'Financial Management', subjectCode: 'BBA402', duration: 180 },

  // Saturday, 30 May 2026
  { id: 'MAY26_0105', date: '2026-05-30', time: '09:30', shift: 1, department: 'Civil Engineering', course: 'B.Tech Civil Engineering', semester: 6, subjectName: 'Design of Steel Structures', subjectCode: 'TCE601', duration: 180 },
  { id: 'MAY26_0106', date: '2026-05-30', time: '09:30', shift: 1, department: 'Mechanical Engineering', course: 'B.Tech Mechanical Engineering', semester: 6, subjectName: 'Machine Design-II', subjectCode: 'TME601', duration: 180 },
  { id: 'MAY26_0107', date: '2026-05-30', time: '13:30', shift: 2, department: 'Computer Applications', course: 'BCA', semester: 6, subjectName: 'Mobile Application Development', subjectCode: 'TBC601', duration: 180 },
  { id: 'MAY26_0108', date: '2026-05-30', time: '13:30', shift: 2, department: 'Nursing', course: 'B.Sc. Nursing', semester: 4, subjectName: 'Pharmacology and Pathology', subjectCode: 'NUR401', duration: 180 },
];

/**
 * Maps the Duty Required List with the Exam Schedule.
 * Allocates rooms and invigilators according to the university duty plan.
 */
export function mapDutyPlanAndSchedule(
  dutyPlan: DutyPlanDay[],
  examSchedule: ExamSlot[],
  classrooms: Classroom[],
  invigilators: Invigilator[]
): {
  fullAllotment: Record<string, { seatPlan: SeatPlan; invigilatorAssignments: InvigilatorAssignment[] }>;
  totalDutiesAssigned: number;
  totalRoomsAllotted: number;
} {
  const fullAllotment: Record<string, { seatPlan: SeatPlan; invigilatorAssignments: InvigilatorAssignment[] }> = {};
  
  // Sort classrooms by priority Block C -> Block D -> Block E, then capacity
  const sortedRooms = [...classrooms].sort((a, b) => {
    const blockOrder = ['Academic Block C', 'Academic Block D', 'Academic Block E'];
    const bA = blockOrder.indexOf(a.building);
    const bB = blockOrder.indexOf(b.building);
    if (bA !== -1 && bB !== -1 && bA !== bB) return bA - bB;
    return b.capacity - a.capacity;
  });

  // Track duties per invigilator to ensure even distribution
  const dutyCounts = new Map<string, number>();
  invigilators.forEach(inv => dutyCounts.set(inv.id, 0));

  // Sort invigilators: assistant professors & lecturers first for active duty
  const sortedFaculty = [...invigilators].sort((a, b) => {
    const isJunior = (desig: string) => {
      const d = desig.toLowerCase();
      return d.includes('assistant') || d.includes('lecturer') || d.includes('tutor') || d.includes('ta');
    };
    if (isJunior(a.designation) && !isJunior(b.designation)) return -1;
    if (!isJunior(a.designation) && isJunior(b.designation)) return 1;
    return a.name.localeCompare(b.name);
  });

  let totalDutiesAssigned = 0;
  let totalRoomsAllotted = 0;

  dutyPlan.forEach(day => {
    day.shifts.forEach(shiftItem => {
      const sessionKey = `${day.date} ${shiftItem.time}`;

      // 1. Find or synthesize exams for this session
      const matchingExams = examSchedule.filter(
        e => e.date === day.date && (e.time === shiftItem.time || e.shift === shiftItem.shiftIndex)
      );

      const sessionExams = matchingExams.length > 0 ? matchingExams : [
        {
          id: `GEN_${day.date}_${shiftItem.shiftName}`,
          date: day.date,
          time: shiftItem.time,
          shift: shiftItem.shiftIndex,
          course: 'University Examination',
          department: 'Regular & Back Paper',
          semester: 2,
          subjectName: `End Term Exam (${shiftItem.shiftName})`,
          subjectCode: shiftItem.backPaperNote ? `ET-${shiftItem.shiftName} (Back)` : `ET-${shiftItem.shiftName}`,
          duration: 180
        } as ExamSlot
      ];

      // 2. Select the required number of rooms
      const numRooms = Math.min(shiftItem.roomsRequired, sortedRooms.length);
      const allocatedRooms = numRooms > 0 ? sortedRooms.slice(0, numRooms) : (shiftItem.shiftName === 'Mid' ? [] : sortedRooms.slice(0, 1));
      totalRoomsAllotted += allocatedRooms.length;

      // 3. Create Seat Assignments for these rooms
      const assignments: any[] = [];
      allocatedRooms.forEach((room, roomIdx) => {
        const examForRoom = sessionExams[roomIdx % sessionExams.length];
        const capacity = room.capacity;
        const studentCount = Math.floor(capacity * 0.85); // 85% occupancy with alternate seating

        for (let s = 1; s <= studentCount; s++) {
          const rollNo = `26${examForRoom.subjectCode.substring(0, 3)}${String(roomIdx * 50 + s).padStart(4, '0')}`;
          assignments.push({
            classroom: room,
            seatNumber: s,
            student: {
              id: `STU_${rollNo}`,
              name: `Student ${rollNo}`,
              rollNo: rollNo,
              course: examForRoom.course,
              department: examForRoom.department,
              semester: examForRoom.semester,
              section: String.fromCharCode(65 + (s % 3)),
              seatAssignment: { classroomId: room.id, seatNumber: s },
              ineligibilityRecords: [],
              unavailableSlots: [],
              exam: examForRoom
            }
          });
        }
      });

      // 4. Invigilator Assignments
      const invigilatorAssignments: InvigilatorAssignment[] = [];
      const requiredInvigilators = shiftItem.totalInvigilators;
      const activeNeeded = shiftItem.activeInvigilators || Math.min(allocatedRooms.length * 2, requiredInvigilators);

      // Sort candidate pool for this session by least duties assigned
      const candidatePool = [...sortedFaculty].sort((a, b) => {
        const cA = dutyCounts.get(a.id) || 0;
        const cB = dutyCounts.get(b.id) || 0;
        return cA - cB;
      });

      const selectedFaculty = candidatePool.slice(0, Math.min(requiredInvigilators, candidatePool.length));

      // Allot active invigilators to rooms (2 per room on average)
      let activeAssignedCount = 0;
      if (allocatedRooms.length > 0) {
        allocatedRooms.forEach((room, rIdx) => {
          // Room invigilators (1 or 2 per room)
          const inv1 = selectedFaculty[activeAssignedCount % selectedFaculty.length];
          if (inv1 && activeAssignedCount < activeNeeded) {
            invigilatorAssignments.push({
              classroom: room,
              invigilator: inv1,
              isReserved: false,
              exam: sessionExams[0]
            });
            dutyCounts.set(inv1.id, (dutyCounts.get(inv1.id) || 0) + 1);
            activeAssignedCount++;
            totalDutiesAssigned++;
          }

          if (room.capacity >= 60 && activeAssignedCount < activeNeeded) {
            const inv2 = selectedFaculty[activeAssignedCount % selectedFaculty.length];
            if (inv2 && inv2.id !== inv1?.id) {
              invigilatorAssignments.push({
                classroom: room,
                invigilator: inv2,
                isReserved: false,
                exam: sessionExams[0]
              });
              dutyCounts.set(inv2.id, (dutyCounts.get(inv2.id) || 0) + 1);
              activeAssignedCount++;
              totalDutiesAssigned++;
            }
          }
        });
      }

      // Allot remaining as Reserved / Standby or Relief invigilators
      const remainingInvigilators = selectedFaculty.slice(activeAssignedCount);
      remainingInvigilators.forEach(inv => {
        invigilatorAssignments.push({
          classroom: null,
          invigilator: inv,
          isReserved: true,
          exam: sessionExams[0]
        });
        dutyCounts.set(inv.id, (dutyCounts.get(inv.id) || 0) + 1);
        totalDutiesAssigned++;
      });

      fullAllotment[sessionKey] = {
        seatPlan: {
          exam: sessionExams,
          assignments: assignments
        },
        invigilatorAssignments: invigilatorAssignments
      };
    });
  });

  return { fullAllotment, totalDutiesAssigned, totalRoomsAllotted };
}
