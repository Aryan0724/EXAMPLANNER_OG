

export interface SeatAssignment {
  classroomId: string;
  roomNo: string;
  row: number;
  col: number;
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
  eligibleSubjects: string[]; // Array of subject codes
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
  isAvailable: boolean; // Kept for simplicity, can be derived from unavailableSlots
  maxDailySessions?: number;
  unavailableSlots: AvailabilitySlot[];
  assignedSessionIds: string[];
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
}

export interface Seat {
  student: Student | null; // Null if debarred or empty
  classroom: Classroom;
  seatNumber: number; // 1-based index in the classroom
}

export interface SeatPlan {
  exam: ExamSlot;
  assignments: Seat[];
}

export interface InvigilatorAssignment {
  exam: ExamSlot;
  classroom: Classroom;
  invigilator: Invigilator;
}
