

export interface SeatAssignment {
  classroomId: string;
  seatNumber: number;
  benchNumber?: number;
  seatPosition?: 'Left' | 'Right' | 'Middle' | 'Single' | string;
  course?: string;
  rollNo?: string;
}

export interface AvailabilitySlot {
  slotId: string; // Corresponds to an ExamSlot id
  reason: string; // e.g., "Medical", "Maintenance"
}

export interface IneligibilityRecord {
  subjectCode: string;
  reason: string;
}

export interface Student {
  id: string;
  name: string;
  rollNo: string;
  department: string;
  course: string;
  semester: number;
  section: string;
  group?: 'A' | 'B' | 'All' | string; // For subject cycles or groupings
  ineligibilityRecords: IneligibilityRecord[];
  unavailableSlots: AvailabilitySlot[];
  seatAssignment: SeatAssignment | null; // Persisted seat
  isDebarred?: boolean;
  debarmentReason?: string;
  exam?: ExamSlot; // Temporary property for planning
}

export interface Classroom {
  id: string;
  roomNo: string;
  building: string;
  rows: number;
  columns: number;
  benchCapacities: number[]; // Array of capacities for each bench
  get capacity(): number; // Calculated property
  unavailableSlots: AvailabilitySlot[];
  departmentBlock: string; // For filtering, can be derived from building/room
}

// Helper to create a classroom with a getter for capacity
export function createClassroom(data: Omit<Classroom, 'capacity'>): Classroom {
  return {
    ...data,
    get capacity() {
      return this.benchCapacities.reduce((sum, current) => sum + current, 0);
    }
  };
}

export interface Invigilator {
  id: string;
  name: string;
  department: string;
  designation: 'Professor' | 'Associate Professor' | 'Assistant Professor' | 'Tutor' | 'Lab Assistant' | 'Nursing Tutor' | 'Lecturer' | 'Teaching Assistant' | 'Teaching Associate' | string;
  seniority?: 'Senior' | 'Junior';
  gender: 'Male' | 'Female';
  isAvailable: boolean;
  maxDailySessions?: number;
  unavailableSlots: AvailabilitySlot[];
  assignedDuties: { date: string, count: number }[]; // To track duties per day
  lastAssignedSlotId?: string; 
  lastAssignedDate?: string;
  lastAssignedShift?: string;
}

export interface ExamSlot {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  course: string;
  department: string;
  semester: number;
  subjectName: string;
  subjectCode: string;
  duration: number; // in minutes
  group?: 'A' | 'B' | 'All' | string; // For group-specific exams
  shift?: number; // 1, 2, 3, or 4
  type?: 'Theory' | 'Practical';
  mode?: 'Offline' | 'Online';
  timeRange?: string; // Optional timing range e.g. "09:30 AM to 12:30 PM"
}

export interface FacultyStudentRule {
  id: string;
  minStudents: number;
  maxStudents: number;
  facultyCount: number;
}

export const DEFAULT_FACULTY_STUDENT_RULES: FacultyStudentRule[] = [
  { id: 'rule-1', minStudents: 0, maxStudents: 20, facultyCount: 1 },
  { id: 'rule-2', minStudents: 21, maxStudents: 50, facultyCount: 2 },
  { id: 'rule-3', minStudents: 51, maxStudents: 80, facultyCount: 3 },
  { id: 'rule-4', minStudents: 81, maxStudents: 999, facultyCount: 4 },
];

export interface RuleViolation {
  ruleNumber: number;
  ruleName: string;
  classroomId?: string;
  roomNo?: string;
  seatNumber?: number;
  benchIndex?: number;
  studentRollNo?: string;
  description: string;
  severity: 'error' | 'warning';
}

export interface RuleConflict {
  ruleNumber: number;
  ruleName: string;
  classroomId?: string;
  roomNo?: string;
  course?: string;
  description: string;
  severity: 'warning' | 'error';
}

export interface RuleValidationReport {
  isValid: boolean;
  violations: RuleViolation[];
  summary: {
    totalViolations: number;
    errorCount: number;
    warningCount: number;
    courseSeparationCompliant: boolean;
    consecutiveRollCompliant: boolean;
    benchCapacityCompliant: boolean;
    noDuplicateStudents: boolean;
    noDuplicateSeats: boolean;
  };
}

export interface Seat {
  student: (Student & { exam: ExamSlot }) | null; // Null if empty
  isDebarredSeat?: boolean; // True if the seat is reserved for a debarred student
  classroom: Classroom;
  seatNumber: number; // 1-based index in the classroom
  benchNumber?: number; // 1-based bench number in the classroom (Rule 23)
  benchIndex?: number; // 0-based bench index
  seatPosition?: 'Left' | 'Right' | 'Middle' | 'Single' | string; // Position on the bench (Rule 23)
}

export interface SeatPlan {
  exam: ExamSlot | ExamSlot[]; // Can be for one or more concurrent exams
  assignments: Seat[];
  validationReport?: RuleValidationReport;
  shortageStudents?: (Student & { exam: ExamSlot; reason: string })[];
  ruleConflicts?: RuleConflict[];
}

export interface InvigilatorAssignment {
  exam: ExamSlot;
  classroom: Classroom | null; // Null if reserved/standby
  invigilator: Invigilator;
  isReserved?: boolean;
  isExchanged?: boolean;
  exchangedWith?: string;
  originalInvigilatorName?: string;
  originalInvigilatorId?: string;
  exchangeReason?: string;
  exchangeTimestamp?: string;
}

export interface RoomBatchDistribution {
  course: string;
  semester: number;
  subjectCode: string;
  subjectName: string;
  studentCount: number;
  rollNoRange?: string;
}

export interface BatchRoomAllocation {
  roomId: string;
  roomNo: string;
  building: string;
  capacity: number;
  allocatedCount: number;
  occupancyPercent: number;
  batches: RoomBatchDistribution[];
  invigilators: Invigilator[];
}

export interface SessionAllotmentSummary {
  sessionKey: string;
  date: string;
  time: string;
  shift: string;
  totalStudents: number;
  totalRooms: number;
  rooms: BatchRoomAllocation[];
  reservedInvigilators: Invigilator[];
}

