import { Student, Classroom, createClassroom, Invigilator, ExamSlot } from './types';
import { BHIMTAL_DEPARTMENTS, BHIMTAL_COURSES, REAL_BHIMTAL_EXAMS } from './bhimtalData';

export const DEPARTMENTS: string[] = BHIMTAL_DEPARTMENTS;
export const COURSES: Record<string, string[]> = BHIMTAL_COURSES;

const COURSE_CODE_MAPPING = [
  { code: '01', dept: 'Computer Science and Engineering', name: 'B.Tech CSE (Hons.) - Cyber Security' },
  { code: '02', dept: 'Computer Science and Engineering', name: 'B.Tech CSE (Hons.) - AI & ML' },
  { code: '03', dept: 'Computer Science and Engineering', name: 'B.Tech Computer Science and Engineering' },
  { code: '04', dept: 'Computer Science and Engineering', name: 'Diploma in Computer Science and Engineering' },
  { code: '05', dept: 'Computer Science and Engineering', name: 'M.Tech Computer Science and Engineering' },
  { code: '10', dept: 'Mechanical Engineering', name: 'B.Tech Mechanical Engineering (Hons.) - Electric Vehicle' },
  { code: '11', dept: 'Mechanical Engineering', name: 'B.Tech Mechanical Engineering (Hons.) - Mechatronics' },
  { code: '12', dept: 'Mechanical Engineering', name: 'B.Tech Mechanical Engineering' },
  { code: '13', dept: 'Mechanical Engineering', name: 'Diploma in Mechanical Engineering' },
  { code: '20', dept: 'Civil Engineering', name: 'B.Tech Civil Engineering (Hons.) - Environmental Engineering' },
  { code: '21', dept: 'Civil Engineering', name: 'B.Tech Civil Engineering (Hons.) - Geoinformatics' },
  { code: '22', dept: 'Civil Engineering', name: 'B.Tech Civil Engineering' },
  { code: '23', dept: 'Civil Engineering', name: 'Diploma in Civil Engineering' },
  { code: '30', dept: 'Electronics and Communication Engineering', name: 'B.Tech ECE (Hons.) - Drone Technology' },
  { code: '31', dept: 'Electronics and Communication Engineering', name: 'B.Tech ECE (Hons.) - VLSI' },
  { code: '32', dept: 'Electronics and Communication Engineering', name: 'B.Tech Electronics and Communication Engineering' },
  { code: '40', dept: 'Computer Applications', name: 'BCA (Hons.) - AI & Data Science' },
  { code: '41', dept: 'Computer Applications', name: 'B.Sc. IT' },
  { code: '42', dept: 'Computer Applications', name: 'BCA' },
  { code: '43', dept: 'Computer Applications', name: 'MCA' },
  { code: '44', dept: 'Computer Applications', name: 'MCA - AI & Data Science' },
  { code: '50', dept: 'Management', name: 'Master of Business Administration (MBA)' },
  { code: '51', dept: 'Management', name: 'BBA - International Finance & Accounting (ACCA)' },
  { code: '52', dept: 'Management', name: 'Bachelor of Business Administration (BBA)' },
  { code: '60', dept: 'Commerce', name: 'B.Com (Hons.)' },
  { code: '61', dept: 'Commerce', name: 'B.Com (Hons.) - International Finance & Accounting (ACCA UK)' },
  { code: '70', dept: 'Nursing', name: 'B.Sc. Nursing' },
  { code: '80', dept: 'Pharmacy', name: 'Bachelor of Pharmacy (B.Pharm.)' }
];

const REAL_FACULTY: Omit<Invigilator, 'isAvailable' | 'unavailableSlots' | 'assignedDuties'>[] = [
  { id: '02210374', name: 'Dr. Kiran Patni', department: 'Allied Science (Chemistry)', designation: 'Assistant Professor', gender: 'Female' },
  { id: '02113710', name: 'Mr. Shiva Biswas', department: 'Allied Science (Chemistry)', designation: 'Assistant Professor', gender: 'Male' },
  { id: '0202112806', name: 'Dr. Madan Mohan Sati', department: 'Allied Science (Mathematics)', designation: 'Assistant Professor', gender: 'Male' },
  { id: '02111371', name: 'Dr. Deependra Singh Rawat', department: 'Allied Science (Physics)', designation: 'Assistant Professor', gender: 'Male' },
  { id: '02110372', name: 'Dr. Amit Mittal', department: 'Allied Science(Environment)', designation: 'Assistant Professor', gender: 'Male' },
  { id: '93111469', name: 'Dr. Bhagwati Prasad Joshi', department: 'Allied Science(Mathematics)', designation: 'Associate Professor', gender: 'Female' },
  { id: '02115334', name: 'Dr. Ankit Singh Mehra', department: 'Civil Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: '02115354', name: 'Mr. Naman Tewari', department: 'Civil Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: '02210277', name: 'Ms. Sonia Pandey', department: 'College  of Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: '02210279', name: 'Dr. Amrita Pargaien', department: 'College  of Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: '02210280', name: 'Ms. Shikha Pawar', department: 'College  of Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: '02210327', name: 'Ms. Neema Bisht', department: 'College  of Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: '02210365', name: 'Mrs. Kanak Pandey', department: 'College  of Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: '02210695', name: 'Dr. Neha Joshi', department: 'College  of Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: '02210757', name: 'Dr. Sunita Waila Tiwari', department: 'College  of Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: '02110760', name: 'Mr. Preetam Kumar', department: 'College  of Pharmacy', designation: 'Assistant Professor', gender: 'Male' },
  { id: '02211023', name: 'Ms. Garima Chand', department: 'College  of Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: '02211024', name: 'Mrs. Namita Joshi', department: 'College  of Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: '04211794', name: 'Ms. Shivali Sagar', department: 'College  of Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: '02211842', name: 'Mrs. Mamta  Joshi', department: 'College  of Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: '04211844', name: 'Mrs. Jyoti Gwasikoti', department: 'College  of Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: '02211846', name: 'Ms. Pooja Negi', department: 'College  of Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: '02212028', name: 'Mrs. Vandana Pandey', department: 'College  of Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: '02213100', name: 'Ms. Rashmi', department: 'College  of Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: '02213168', name: 'Ms. Himani Kulyal', department: 'College  of Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: '93213184', name: 'Dr. Amita Joshi Rana', department: 'College  of Pharmacy', designation: 'Associate Professor', gender: 'Male' },
  { id: '02213186', name: 'Mr. Navneet Tiwari', department: 'College  of Pharmacy', designation: 'Assistant Professor', gender: 'Male' },
  { id: '93213247', name: 'Dr. Virender Kaur', department: 'College  of Pharmacy', designation: 'Associate Professor', gender: 'Female' },
  { id: '02210435', name: 'Dr. Neha Bhatt', department: 'College of Nursing', designation: 'Assistant Professor', gender: 'Female' },
  { id: '210438', name: 'Ms. Babita Bisht', department: 'College of Nursing', designation: 'Nursing Tutor', gender: 'Female' },
  { id: '210730', name: 'Ms. Chandni Manral', department: 'College of Nursing', designation: 'Assistant Professor', gender: 'Female' },
  { id: '213251', name: 'Ms. Shivani Kirola', department: 'College of Nursing', designation: 'Nursing Tutor', gender: 'Female' },
  { id: '214609', name: 'Ms. Neelam', department: 'College of Nursing', designation: 'Nursing Tutor', gender: 'Female' },
  { id: '115062', name: 'Mr. Jaysurya Thapa', department: 'College of Nursing', designation: 'Nursing Tutor', gender: 'Male' },
  { id: '215379', name: 'Ms. Pooja Sijwali', department: 'College of Nursing', designation: 'Nursing Tutor', gender: 'Female' },
  { id: '215407', name: 'Ms. Shivani Kumayan', department: 'College of Nursing', designation: 'Nursing Tutor', gender: 'Female' },
  { id: '215548', name: 'Ms. Jyoti Mishra', department: 'College of Nursing', designation: 'Nursing Tutor', gender: 'Female' },
  { id: '04115755', name: 'Mr. Kartik Mani Pathak', department: 'College of Pharmacy', designation: 'Lecturer', gender: 'Male' },
  { id: '02215756', name: 'Ms. Poonam', department: 'College of Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: '04115757', name: 'Mr. Rakshit Bamola', department: 'College of Pharmacy', designation: 'Lecturer', gender: 'Male' },
  { id: '02110619', name: 'Mr. Shashi Kumar Sharma', department: 'Computer Science & Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: '02111149', name: 'Mr. Devesh Pandey', department: 'Computer Science & Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: '02111183', name: 'Mr. Rahul Kumar Singh', department: 'Computer Science & Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: '10200447', name: 'Ms. Priyanka  Jethi', department: 'Computer Science & Engineering', designation: 'Assistant Professor', gender: 'Female' },
  { id: '3322231386', name: 'Mr. Aviral Awasthi', department: 'Computer Science & Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: '02211720', name: 'Mrs. Senam Pandey', department: 'Computer Science & Engineering', designation: 'Assistant Professor', gender: 'Female' },
  { id: '02112069', name: 'Mr. Anubhav Bewerwal', department: 'Computer Science & Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: '02212159', name: 'Ms. Heera Patwal', department: 'Computer Science & Engineering', designation: 'Assistant Professor', gender: 'Female' },
  { id: '02212468', name: 'Dr. Shilpa Jain', department: 'Computer Science & Engineering', designation: 'Assistant Professor', gender: 'Female' },
  { id: '02113762', name: 'Mr. Prince Kumar', department: 'Computer Science & Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: '04113789', name: 'Mr. Ansh Dhingra', department: 'Computer Science & Engineering', designation: 'Lecturer', gender: 'Male' },
  { id: '213828', name: 'Ms. Vaishali Dev', department: 'Computer Science & Engineering', designation: 'Teaching Assistant', gender: 'Female' },
  { id: '02214674', name: 'Mrs. Kalpana Chauhan', department: 'Computer Science & Engineering', designation: 'Assistant Professor', gender: 'Female' },
  { id: '3322231387', name: 'Ms. Megha Upreti', department: 'Computer Science & Engineering', designation: 'Teaching Associate', gender: 'Female' },
  { id: '02115542', name: 'Mr. Manoj Kaushik', department: 'Computer Science & Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: '02215543', name: 'Ms. Deepali Chaudhary', department: 'Computer Science & Engineering', designation: 'Assistant Professor', gender: 'Female' },
  { id: '02115563', name: 'Mr. Suraj Chaunal', department: 'Computer Science & Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: '1102112437', name: 'Mr. Mohit Pant', department: 'Electronics &  Communication', designation: 'Assistant Professor', gender: 'Male' },
  { id: '1602112424', name: 'Mr. Harshit Pandey', department: 'Mechanical Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: '1602112408', name: 'Mr. Devesh Bora', department: 'Mechanical Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: '1602112440', name: 'Mr. Nagendra Singh Gaira', department: 'Mechanical Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: '4036212430', name: 'Dr. Kavita Ajay Joshi', department: 'PDP/PC', designation: 'Associate Professor', gender: 'Female' },
  { id: '3002212449', name: 'Dr. Shweta Arora', department: 'PDP/PC', designation: 'Associate Professor', gender: 'Female' },
  { id: '3002112456', name: 'Mr. Pawan Agarwal', department: 'PDP/PC', designation: 'Assistant Professor', gender: 'Male' },
  { id: '3224111923', name: 'Mr. Narendra Bisht', department: 'PDP/PC', designation: 'Assistant Professor', gender: 'Male' },
  { id: '331920089', name: 'Ms. Garima Pant', department: 'PDP/PC', designation: 'Assistant Professor', gender: 'Female' },
  { id: '3322231411', name: 'Ms. Srijana Karnatak', department: 'PDP/PC', designation: 'Assistant Professor', gender: 'Female' },
  { id: '02212328', name: 'Ms. Nidhi Joshi', department: 'PDP/PC', designation: 'Assistant Professor', gender: 'Female' },
  { id: '02213536', name: 'Mrs. Maya G Pillai', department: 'PDP/PC', designation: 'Assistant Professor', gender: 'Female' },
  { id: '0429111595', name: 'Dr.Himanshu Pant', department: 'School of Computing', designation: 'Assistant Professor', gender: 'Male' },
  { id: '2229110691', name: 'Dr. Janmejay Pant', department: 'School of Computing', designation: 'Assistant Professor', gender: 'Male' },
  { id: '331920094', name: 'Mr. Devendra Singh', department: 'School of Computing', designation: 'Assistant Professor', gender: 'Male' },
  { id: '02110369', name: 'Dr. Bhupesh Rawat', department: 'School of Computing', designation: 'Associate Professor', gender: 'Female' },
  { id: '93110454', name: 'Dr. Naveen Tiwari', department: 'School of Computing', designation: 'Associate Professor', gender: 'Male' },
  { id: '93110455', name: 'Dr. Mukesh Joshi', department: 'School of Computing', designation: 'Associate Professor', gender: 'Male' },
  { id: '3322231220', name: 'Dr. Jitendra Kumar Chaudhary', department: 'School of Computing', designation: 'Associate Professor', gender: 'Male' },
  { id: '02111669', name: 'Mr. Praveen Kumar Joshi', department: 'School of Computing', designation: 'Assistant Professor', gender: 'Male' },
  { id: '04112433', name: 'Mr. Saurabh Dhanik', department: 'School of Computing', designation: 'Assistant Professor', gender: 'Male' },
  { id: '02214566', name: 'Mrs. Divya Rastogi', department: 'School of Computing', designation: 'Assistant Professor', gender: 'Female' },
  { id: '8029211804', name: 'Dr. Farha Khan', department: 'School of Management', designation: 'Assistant Professor', gender: 'Female' },
  { id: '502112801', name: 'Mr. Sandeep Bisht', department: 'School of Management', designation: 'Assistant Professor', gender: 'Male' },
  { id: '05PT202805', name: 'Ms. Kavita Khati', department: 'School of Management', designation: 'Assistant Professor', gender: 'Female' },
  { id: '05PT112814', name: 'Mr. Ramanuj Tewari', department: 'School of Management', designation: 'Assistant Professor', gender: 'Male' },
  { id: '05PT102824', name: 'Mr. Bhavesh Joshi', department: 'School of Management', designation: 'Assistant Professor', gender: 'Male' },
  { id: '02110378', name: 'Dr. Prakash Garia', department: 'School of Management', designation: 'Assistant Professor', gender: 'Male' },
  { id: '02210502', name: 'Ms. Isha Tewari', department: 'School of Management', designation: 'Assistant Professor', gender: 'Female' },
  { id: '93210715', name: 'Dr. Nidhi Bhatt Pant', department: 'School of Management', designation: 'Associate Professor', gender: 'Female' },
  { id: '02211425', name: 'Dr. Surabhi Saxena', department: 'School of Management', designation: 'Assistant Professor', gender: 'Female' },
  { id: '93112472', name: 'Dr. Asheesh Sah', department: 'School of Management', designation: 'Associate Professor', gender: 'Male' },
  { id: '93113250', name: 'Dr. Jayant Gautam', department: 'School of Management', designation: 'Associate Professor', gender: 'Female' },
  { id: '02213719', name: 'Ms. Sangeeta Bafila', department: 'School of Management', designation: 'Assistant Professor', gender: 'Female' },
  { id: '02113720', name: 'Dr. Manohar Giri', department: 'School of Management', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'TA113788', name: 'Mr. Hrishabh Pandey', department: 'School of Management', designation: 'Assistant Professor', gender: 'Male' },
  { id: '93115160', name: 'Dr. Asheesh Bisht', department: 'School of Management', designation: 'Associate Professor', gender: 'Male' },
  { id: '93115403', name: 'Dr. Sanjay Kumar Mishra', department: 'School of Management', designation: 'Associate Professor', gender: 'Male' },
  { id: 'TA214890', name: 'Ms. Kumkum Upreti', department: 'Computer Science & Engineering', designation: 'Teaching Associate', gender: 'Female' },
  { id: 'TA114891', name: 'Mr. Aditya Gupta', department: 'Computer Science & Engineering', designation: 'Teaching Associate', gender: 'Male' },
];

export const generateMockStudents = (studentsPerCourse = 100): Student[] => {
  const students: Student[] = [];
  const year = '25';
  let globalStudentCounter = 0;
  COURSE_CODE_MAPPING.forEach(courseInfo => {
    const count = studentsPerCourse;
    for (let i = 1; i <= count; i++) {
      const personalId = String(i).padStart(3, '0');
      const rollNo = `${year}${courseInfo.code}${personalId}`;
      students.push({
        id: `S${rollNo}`,
        name: `Student ${rollNo}`,
        rollNo: rollNo,
        department: courseInfo.dept,
        course: courseInfo.name,
        semester: (globalStudentCounter % 8) + 1,
        section: ['A', 'B', 'C'][globalStudentCounter % 3],
        group: Math.random() > 0.7 ? (Math.random() > 0.5 ? 'A' : 'B') : undefined,
        ineligibilityRecords: [],
        unavailableSlots: [],
        seatAssignment: null,
        isDebarred: Math.random() > 0.98,
        debarmentReason: 'Disciplinary Action'
      });
      globalStudentCounter++;
    }
  });
  return students;
};

export const generateMockClassrooms = (): Classroom[] => {
  const customRooms = [
    { roomNo: 'A007', capacity: 42, building: 'Academic Block A' },
    { roomNo: 'A008', capacity: 42, building: 'Academic Block A' },
    { roomNo: 'C001', capacity: 42, building: 'Academic Block C' },
    { roomNo: 'C002', capacity: 42, building: 'Academic Block C' },
    { roomNo: 'C003', capacity: 42, building: 'Academic Block C' },
    { roomNo: 'C004', capacity: 42, building: 'Academic Block C' },
    { roomNo: 'C102', capacity: 42, building: 'Academic Block C' },
    { roomNo: 'C104', capacity: 42, building: 'Academic Block C' },
    { roomNo: 'C202', capacity: 42, building: 'Academic Block C' },
    { roomNo: 'C203', capacity: 42, building: 'Academic Block C' },
    { roomNo: 'C204', capacity: 42, building: 'Academic Block C' },
    { roomNo: 'C303', capacity: 42, building: 'Academic Block C' },
    { roomNo: 'C306', capacity: 42, building: 'Academic Block C' },
    { roomNo: 'D003', capacity: 66, building: 'Academic Block D' },
    { roomNo: 'D006', capacity: 60, building: 'Academic Block D' },
    { roomNo: 'D103', capacity: 120, building: 'Academic Block D' },
    { roomNo: 'D104', capacity: 120, building: 'Academic Block D' },
    { roomNo: 'E001', capacity: 42, building: 'Academic Block E' },
    { roomNo: 'E003', capacity: 42, building: 'Academic Block E' },
    { roomNo: 'E101', capacity: 42, building: 'Academic Block E' },
    { roomNo: 'E103', capacity: 42, building: 'Academic Block E' },
  ];
  return customRooms.map((room, index) => {
    const benchCount = Math.ceil(room.capacity / 2);
    const rows = Math.ceil(Math.sqrt(benchCount));
    const columns = Math.ceil(benchCount / rows);
    const benchCapacities: number[] = [];
    let remainingCapacity = room.capacity;
    for (let i = 0; i < rows * columns; i++) {
      if (remainingCapacity >= 2) {
        benchCapacities.push(2);
        remainingCapacity -= 2;
      } else if (remainingCapacity === 1) {
        benchCapacities.push(1);
        remainingCapacity -= 1;
      } else {
        benchCapacities.push(0);
      }
    }
    return createClassroom({
      id: `C${String(index + 1).padStart(3, '0')}`,
      roomNo: room.roomNo,
      building: room.building,
      rows: rows,
      columns: columns,
      benchCapacities: benchCapacities,
      unavailableSlots: [],
      departmentBlock: room.building,
    });
  });
};

export const generateMockInvigilators = (): Invigilator[] => {
  return REAL_FACULTY.map(faculty => ({
    ...faculty,
    isAvailable: true,
    unavailableSlots: [],
    assignedDuties: []
  }));
};

export const generateMockExamSchedule = (): ExamSlot[] => {
  const exams: ExamSlot[] = [];
  let idCounter = 1;
  const add = (date: string, time: string, sem: number, subject: string, code: string, course: string, dept: string, shift: number) => {
    exams.push({
      id: `E${String(idCounter++).padStart(4, '0')}`,
      date, time, course, department: dept, semester: sem, subjectName: subject, subjectCode: code, duration: 90, shift
    });
  };

  // Re-adding essential schedule items
  const CSE = 'Computer Science and Engineering';
  const BTECH = 'B.Tech Computer Science and Engineering';
  add('2025-12-06', '09:30', 1, 'Professional Communication', 'THU101', BTECH, CSE, 1);
  add('2025-12-09', '09:30', 1, 'Basic Electrical Engineering', 'TEE101', BTECH, CSE, 1);
  return exams;
};

export const getBhimtalExamSchedule = (): ExamSlot[] => {
  return REAL_BHIMTAL_EXAMS.map((exam, index) => ({
    ...exam,
    id: `BE${String(index + 1).padStart(4, '0')}`
  }));
};
