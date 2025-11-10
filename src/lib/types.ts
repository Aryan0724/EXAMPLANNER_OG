export interface Student {
  id: string;
  name: string;
  department: string;
  isDebarred: boolean;
}

export interface Classroom {
  id: string;
  capacity: number;
  departmentBlock: string;
}

export interface Invigilator {
  id: string;
  name: string;
  department: string;
  isAvailable: boolean;
}

export interface Exam {
  id: string;
  subject: string;
  department: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
}

export interface Seat {
  student: Student | null; // Null if debarred or empty
  classroom: Classroom;
  seatNumber: number;
}

export interface SeatPlan {
  exam: Exam;
  assignments: Seat[];
}

export interface InvigilatorAssignment {
  exam: Exam;
  classroom: Classroom;
  invigilator: Invigilator;
}
