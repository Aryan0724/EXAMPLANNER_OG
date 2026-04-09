import { Student, Classroom, createClassroom, Invigilator, ExamSlot } from './types';

/**
 * @file data.ts
 * @description Centralized library for all mock data generation and GEHU-specific constants.
 * This file serves as the "source of truth" for test data when real datasets are unavailable.
 * 
 * CORE LOGIC:
 * 1. Departments & Courses: Hierarchical mapping used to generate realistic student profiles.
 * 2. Roll Number Schema: Uses '25' + CourseCode + StudentSerial (e.g., 2501001).
 * 3. Shifts: Deterministically assigned using a hash of the subject code to ensure balanced distribution.
 * 4. Faculty: Seeded with a list of real GEHU faculty members.
 */

/**
 * Predefined list of departments in the university.
 */
export const DEPARTMENTS: string[] = [
  'Computer Science and Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electronics and Communication Engineering',
  'Computer Applications',
  'Management',
  'Commerce',
  'Nursing',
  'Pharmacy',
  'Department of Personality Development',
  'Polytechnic',
  'Allied Sciences'
];

export const COURSES: Record<string, string[]> = {
  'Computer Science and Engineering': [
    'B.Tech CSE (Hons.) - Cyber Security',
    'B.Tech CSE (Hons.) - AI & ML',
    'B.Tech Computer Science and Engineering',
    'Diploma in Computer Science and Engineering',
    'M.Tech Computer Science and Engineering'
  ],
  'Mechanical Engineering': [
    'B.Tech Mechanical Engineering (Hons.) - Electric Vehicle',
    'B.Tech Mechanical Engineering (Hons.) - Mechatronics',
    'B.Tech Mechanical Engineering',
    'Diploma in Mechanical Engineering'
  ],
  'Civil Engineering': [
    'B.Tech Civil Engineering (Hons.) - Environmental Engineering',
    'B.Tech Civil Engineering (Hons.) - Geoinformatics',
    'B.Tech Civil Engineering',
    'Diploma in Civil Engineering'
  ],
  'Electronics and Communication Engineering': [
    'B.Tech ECE (Hons.) - Drone Technology',
    'B.Tech ECE (Hons.) - VLSI',
    'B.Tech Electronics and Communication Engineering'
  ],
  'Computer Applications': [
    'BCA (Hons.) - AI & Data Science',
    'B.Sc. IT',
    'BCA',
    'MCA',
    'MCA - AI & Data Science'
  ],
  'Management': [
    'Master of Business Administration (MBA)',
    'BBA - International Finance & Accounting (ACCA)',
    'Bachelor of Business Administration (BBA)'
  ],
  'Commerce': [
    'B.Com (Hons.)',
    'B.Com (Hons.) - International Finance & Accounting (ACCA UK)'
  ],
  'Nursing': [
    'B.Sc. Nursing'
  ],
  'Pharmacy': [
    'Bachelor of Pharmacy (B.Pharm.)'
  ],
  'Department of Personality Development': [
    'Personality Development'
  ],
  'Polytechnic': [
    'Diploma in Civil Engineering',
    'Diploma in Computer Science & Engineering',
    'Diploma in Mechanical Engineering'
  ],
  'Allied Sciences': [
    'Allied Sciences'
  ]
};

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

// Placeholder for subject mapping - would need to be updated with real subjects if available
const SUBJECTS_BY_COURSE: Record<string, Record<string, { subject_code: string; subject_name: string }[]>> = {
  // Re-using some previous structure for demo purposes, mapped to new course names where possible
  'B.Tech Computer Science and Engineering': {
    '1': [
      { "subject_code": "TMA101", "subject_name": "Engineering Mathematics-I" },
      { "subject_code": "TCS101", "subject_name": "Fundamentals of Computer & Introduction to Programming" },
      { "subject_code": "TPH101", "subject_name": "Engineering Physics" },
      { "subject_code": "TCH101", "subject_name": "Engineering Chemistry" },
      { "subject_code": "THU101", "subject_name": "Professional Communication" }
    ],
    '3': [
      { "subject_code": "TCS201", "subject_name": "Data Structures" },
      { "subject_code": "TCS202", "subject_name": "Discrete Mathematics" },
      { "subject_code": "TCS203", "subject_name": "Digital Logic Design" },
      { "subject_code": "TCS204", "subject_name": "Object Oriented Programming (C++)" },
      { "subject_code": "TCS205", "subject_name": "Computer Organization" }
    ],
    '5': [
      { "subject_code": "TCS301", "subject_name": "Algorithms" },
      { "subject_code": "TCS302", "subject_name": "Database Management Systems" },
      { "subject_code": "TCS303", "subject_name": "Operating Systems" },
      { "subject_code": "TCS304", "subject_name": "Software Engineering" }
    ],
    '7': [
      { "subject_code": "TCS401", "subject_name": "Artificial Intelligence" },
      { "subject_code": "TCS402", "subject_name": "Machine Learning" },
      { "subject_code": "TCS403", "subject_name": "Cloud Computing" },
      { "subject_code": "TCS405", "subject_name": "Information Security" }
    ]
  }
};

const REAL_FACULTY: Omit<Invigilator, 'isAvailable' | 'unavailableSlots' | 'assignedDuties'>[] = [
  // 1-116 Main List
  { id: 'ALS001', name: 'Dr. Navneet Joshi', department: 'Allied Sciences', designation: 'Associate Professor', gender: 'Male' },
  { id: 'SOC001', name: 'Dr. Sandeep K. Budhani', department: 'Computer Science and Engineering', designation: 'Associate Professor', gender: 'Male' },
  { id: 'ME001', name: 'Mr. Jagdish Singh Mehta', department: 'Mechanical Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'ECE001', name: 'Dr. S.K. Sunori', department: 'Electronics and Communication Engineering', designation: 'Associate Professor', gender: 'Male' },
  { id: 'SOC002', name: 'Dr. Himanshu Pant', department: 'Computer Science and Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'MGT001', name: 'Dr. Farha Khan', department: 'Management', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'ECE002', name: 'Mr. Vimal Singh Bisht', department: 'Electronics and Communication Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'ECE003', name: 'Mr. Dikendra Kumar Verma', department: 'Electronics and Communication Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'PDP001', name: 'Dr. Kavita Ajay Joshi', department: 'Department of Personality Development', designation: 'Associate Professor', gender: 'Female' },
  { id: 'SOC003', name: 'Mr. Rajendra Singh Bisht', department: 'Computer Science and Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'ECE004', name: 'Dr. Saurabh Pargaien', department: 'Electronics and Communication Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'ME002', name: 'Mr. Harshit Pandey', department: 'Mechanical Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'ME003', name: 'Mr. Devesh Bora', department: 'Mechanical Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'ME004', name: 'Mr. Nagendra Singh Gaira', department: 'Mechanical Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'ECE005', name: 'Mr. Mohit Pant', department: 'Electronics and Communication Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'PDP002', name: 'Dr. Shweta Arora', department: 'Department of Personality Development', designation: 'Associate Professor', gender: 'Female' },
  { id: 'SOC004', name: 'Dr. Janmejay Pant', department: 'Computer Science and Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'PDP003', name: 'Mr. Pawan Agarwal', department: 'Department of Personality Development', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'PDP004', name: 'Mr. Narendra Bisht', department: 'Department of Personality Development', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'PDP005', name: 'Mr. Divas Tewari', department: 'Department of Personality Development', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'MGT002', name: 'Mr. Sandeep Bisht', department: 'Management', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'MGT003', name: 'Ms. Kavita Khati', department: 'Management', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'ALS002', name: 'Dr. Madan Mohan Sati', department: 'Allied Sciences', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'SOC005', name: 'Mr. Govind Singh Jethi', department: 'Computer Science and Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'ECE006', name: 'Mr. Abhijit Singh Bhakuni', department: 'Electronics and Communication Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'MGT004', name: 'Mr. Ramanuj Tewari', department: 'Management', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'MGT005', name: 'Mr. Bhavesh Joshi', department: 'Management', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'ALS003', name: 'Dr. Pushpa Negi', department: 'Allied Sciences', designation: 'Professor', gender: 'Female' },
  { id: 'PDP006', name: 'Ms. Garima Pant', department: 'Department of Personality Development', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'SOC006', name: 'Mr. Devendra Singh', department: 'Computer Science and Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'ALS004', name: 'Dr. Mehul Manu', department: 'Allied Sciences', designation: 'Assistant Professor', gender: 'Male' }, // Corrected spelling 'Mukul Mana' -> 'Mehul Manu' per user
  { id: 'PHR001', name: 'Ms. Sonia Pandey', department: 'Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'PHR002', name: 'Dr. Amrita Pargaien', department: 'Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'PHR003', name: 'Ms. Shikha Pawar', department: 'Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'PHR004', name: 'Ms. Neema Bisht', department: 'Pharmacy', designation: 'Assistant Professor', gender: 'Female' }, // Neerja -> Neema per user
  { id: 'CE001', name: 'Mr. Pratul Raj', department: 'Civil Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'PHR005', name: 'Mrs. Kanak Pandey', department: 'Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'SOC007', name: 'Dr. Bhupesh Rawat', department: 'Computer Science and Engineering', designation: 'Associate Professor', gender: 'Male' }, // Note: User says SoC, previous data said Pharmacy for Bhupesh Rawat. User list SoC takes precedence.
  { id: 'ALS005', name: 'Dr. Amit Mittal', department: 'Allied Sciences', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'ALS006', name: 'Dr. Kiran Patni', department: 'Allied Sciences', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'MGT006', name: 'Dr. Somesh Sharma', department: 'Management', designation: 'Associate Professor', gender: 'Male' },
  { id: 'MGT007', name: 'Dr. Prakash Garia', department: 'Management', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'NUR001', name: 'Dr. Neha Bhatt', department: 'Nursing', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'NUR002', name: 'Mrs. Hansi Negi', department: 'Nursing', designation: 'Professor', gender: 'Female' }, // Principal -> Professor
  { id: 'NUR003', name: 'Ms. Babita Bisht', department: 'Nursing', designation: 'Tutor', gender: 'Female' }, // Nursing Tutor -> Tutor
  { id: 'SOC008', name: 'Dr. Naveen Tiwari', department: 'Computer Science and Engineering', designation: 'Associate Professor', gender: 'Male' },
  { id: 'SOC009', name: 'Dr. Mukesh Joshi', department: 'Computer Science and Engineering', designation: 'Associate Professor', gender: 'Male' },
  { id: 'MGT008', name: 'Ms. Isha Tewari', department: 'Management', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'PDP007', name: 'Mr. Lalit Singh', department: 'Department of Personality Development', designation: 'Associate Professor', gender: 'Male' },
  { id: 'MGT009', name: 'Dr. Santoshi Sen Gupta', department: 'Management', designation: 'Professor', gender: 'Female' },
  { id: 'SOC010', name: 'Dr. Ankur Singh Bist', department: 'Computer Science and Engineering', designation: 'Professor', gender: 'Male' },
  { id: 'SOC011', name: 'Mr. Shashi Kumar Sharma', department: 'Computer Science and Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'ME005', name: 'Mr. Chetan Prakash Khurana', department: 'Mechanical Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'PHR006', name: 'Dr. Neha Joshi', department: 'Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'MGT010', name: 'Dr. Nidhi Bhatt Pant', department: 'Management', designation: 'Associate Professor', gender: 'Female' },
  { id: 'NUR004', name: 'Ms. Chandni Manral', department: 'Nursing', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'PHR007', name: 'Dr. Sunita Waila Tiwari', department: 'Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'PHR008', name: 'Mr. Preetam Kumar', department: 'Pharmacy', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'PHR009', name: 'Ms. Garima Chand', department: 'Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'PHR010', name: 'Mrs. Namita Joshi', department: 'Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'SOC012', name: 'Mr. Devesh Pandey', department: 'Computer Science and Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'SOC013', name: 'Mr. Rahul Kumar Singh', department: 'Computer Science and Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'SOC014', name: 'Ms. Priyanka Jethi', department: 'Computer Science and Engineering', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'SOC015', name: 'Dr. Jitendra Kumar Chaudhary', department: 'Computer Science and Engineering', designation: 'Associate Professor', gender: 'Male' },
  { id: 'ALS007', name: 'Dr. Deependra Singh Rawat', department: 'Allied Sciences', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'SOC016', name: 'Mr. Aviral Awasthi', department: 'Computer Science and Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'PDP008', name: 'Ms. Srijana Karnatak', department: 'Department of Personality Development', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'MGT011', name: 'Dr. Surabhi Saxena', department: 'Management', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'ALS008', name: 'Dr. Bhagwati Prasad Joshi', department: 'Allied Sciences', designation: 'Associate Professor', gender: 'Male' },
  { id: 'SOC017', name: 'Mr. Praveen Kumar Joshi', department: 'Computer Science and Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'SOC018', name: 'Mrs. Senam Pandey', department: 'Computer Science and Engineering', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'PHR011', name: 'Ms. Shivali Sagar', department: 'Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'PHR012', name: 'Mrs. Mamta Joshi', department: 'Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'PHR013', name: 'Mrs. Jyoti Gwasikoti', department: 'Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'PHR014', name: 'Ms. Pooja Negi', department: 'Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'PHR015', name: 'Mrs. Vandana Pandey', department: 'Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'SOC019', name: 'Mr. Anubhav Bewerwal', department: 'Computer Science and Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'SOC020', name: 'Ms. Heera Patwal', department: 'Computer Science and Engineering', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'PDP009', name: 'Ms. Nidhi Joshi', department: 'Department of Personality Development', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'SOC021', name: 'Mr. Saurabh Dhanik', department: 'Computer Science and Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'SOC022', name: 'Dr. Shilpa Jain', department: 'Computer Science and Engineering', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'MGT012', name: 'Dr. Asheesh Sah', department: 'Management', designation: 'Associate Professor', gender: 'Male' },
  { id: 'PHR016', name: 'Ms. Rashmi', department: 'Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'PHR017', name: 'Ms. Himani Kulyal', department: 'Pharmacy', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'PHR018', name: 'Dr. Amita Joshi Rana', department: 'Pharmacy', designation: 'Associate Professor', gender: 'Female' },
  { id: 'PHR019', name: 'Mr. Navneet Tiwari', department: 'Pharmacy', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'SOC023', name: 'Ms. Kashish Mirza', department: 'Computer Science and Engineering', designation: 'Assistant Professor', gender: 'Female' }, // Lecturer -> Asst Prof
  { id: 'PHR020', name: 'Dr. Virender Kaur', department: 'Pharmacy', designation: 'Associate Professor', gender: 'Female' },
  { id: 'MGT013', name: 'Dr. Jayant Gautam', department: 'Management', designation: 'Associate Professor', gender: 'Male' },
  { id: 'NUR005', name: 'Ms. Shivani Kirola', department: 'Nursing', designation: 'Tutor', gender: 'Female' }, // Nursing Tutor
  { id: 'SOC024', name: 'Mr. Ayush Kapri', department: 'Computer Science and Engineering', designation: 'Assistant Professor', gender: 'Male' }, // Adjunct -> Asst Prof
  { id: 'PDP010', name: 'Mrs. Maya G Pillai', department: 'Department of Personality Development', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'ME006', name: 'Dr. Tarun Bangia', department: 'Mechanical Engineering', designation: 'Assistant Professor', gender: 'Male' }, // Adjunct -> Asst Prof
  { id: 'ALS009', name: 'Mr. Shiva Biswas', department: 'Allied Sciences', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'MGT014', name: 'Ms. Sangeeta Bafila', department: 'Management', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'MGT015', name: 'Dr. Manohar Giri', department: 'Management', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'SOC025', name: 'Mr. Prince Kumar', department: 'Computer Science and Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'SOC026', name: 'Mr. Ansh Dhingra', department: 'Computer Science and Engineering', designation: 'Assistant Professor', gender: 'Male' }, // Lecturer -> Asst Prof
  { id: 'MGT016', name: 'Mr. Hrishabh Pandey', department: 'Management', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'SOC027', name: 'Ms. Vaishali Dev', department: 'Computer Science and Engineering', designation: 'Lab Assistant', gender: 'Female' }, // Teaching Assistant -> Lab Assistant (Matches previous request)
  { id: 'SOC028', name: 'Mrs. Divya Rastogi', department: 'Computer Science and Engineering', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'NUR006', name: 'Ms. Neelam', department: 'Nursing', designation: 'Tutor', gender: 'Female' }, // Nursing Tutor
  { id: 'SOC029', name: 'Mrs. Kalpana Chauhan', department: 'Computer Science and Engineering', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'NUR007', name: 'Mr. Jaysurya Thapa', department: 'Nursing', designation: 'Tutor', gender: 'Male' }, // Nursing Tutor
  { id: 'MGT017', name: 'Dr. Asheesh Bisht', department: 'Management', designation: 'Associate Professor', gender: 'Male' },
  { id: 'SOC030', name: 'Ms. Megha Upreti', department: 'Computer Science and Engineering', designation: 'Lab Assistant', gender: 'Female' }, // Teaching Associate -> Lab Assistant
  { id: 'MGT018', name: 'Dr. Manish Bisht', department: 'Management', designation: 'Professor', gender: 'Male' },
  { id: 'CE002', name: 'Dr. Ankit Singh Mehra', department: 'Civil Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'CE003', name: 'Mr. Naman Tewari', department: 'Civil Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'NUR008', name: 'Ms. Pooja Sijwali', department: 'Nursing', designation: 'Tutor', gender: 'Female' }, // Nursing Tutor
  { id: 'MGT019', name: 'Dr. Sanjay Kumar Mishra', department: 'Management', designation: 'Associate Professor', gender: 'Male' },
  { id: 'NUR009', name: 'Ms. Shivani Kumayan', department: 'Nursing', designation: 'Tutor', gender: 'Female' }, // Nursing Tutor
  { id: 'SOC031', name: 'Mr. Manoj Kaushik', department: 'Computer Science and Engineering', designation: 'Assistant Professor', gender: 'Male' },
  { id: 'SOC032', name: 'Ms. Deepali Chaudhary', department: 'Computer Science and Engineering', designation: 'Assistant Professor', gender: 'Female' },
  { id: 'NUR010', name: 'Ms. Jyoti Mishra', department: 'Nursing', designation: 'Tutor', gender: 'Female' }, // Nursing Tutor
  { id: 'SOC033', name: 'Mr. Suraj Chaunal', department: 'Computer Science and Engineering', designation: 'Assistant Professor', gender: 'Male' },

  // Additional Lab Assistants from User List
  { id: 'SOC034', name: 'Mr. Vaibhav Kumar Sharma', department: 'Computer Science and Engineering', designation: 'Lab Assistant', gender: 'Male' },
  { id: 'SOC035', name: 'Mr. Nishant Koturiya', department: 'Computer Science and Engineering', designation: 'Lab Assistant', gender: 'Male' },
  { id: 'SOC036', name: 'Mr. Abhishek Tamta', department: 'Computer Science and Engineering', designation: 'Lab Assistant', gender: 'Male' },
  { id: 'SOC037', name: 'Mr. Parthak Mehra', department: 'Computer Science and Engineering', designation: 'Lab Assistant', gender: 'Male' }, // Lab Supervisor -> Lab Assistant
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Yadav', 'Mehra', 'Chopra', 'Malhotra', 'Kapoor',
  'Agrawal', 'Bansal', 'Goel', 'Jain', 'Mittal', 'Shah', 'Patel', 'Reddy', 'Nair', 'Iyer',
  'Pandey', 'Mishra', 'Tiwari', 'Dubey', 'Pathak', 'Deshmukh', 'Kulkarni', 'Joshi', 'Bhide', 'Rao'
];

const MALE_FIRST_NAMES = [
  'Aarav', 'Aryan', 'Advait', 'Vihaan', 'Arjun', 'Sai', 'Ishaan', 'Ayaan', 'Krishna', 'Atharv',
  'Rahul', 'Amit', 'Vikram', 'Aditya', 'Sandeep', 'Deepak', 'Mohit', 'Sanjay', 'Ramesh', 'Suresh'
];

const FEMALE_FIRST_NAMES = [
  'Ananya', 'Diya', 'Ishani', 'Saanvi', 'Kiara', 'Myra', 'Aavya', 'Anika', 'Riya', 'Sia',
  'Sneha', 'Pooja', 'Neha', 'Geeta', 'Babita', 'Anita', 'Lata', 'Shweta', 'Tanvi', 'Kavita'
];

const getRandomName = (gender?: 'Male' | 'Female') => {
  const finalGender = gender || (Math.random() > 0.4 ? 'Male' : 'Female');
  const firstPool = finalGender === 'Male' ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES;
  const first = firstPool[Math.floor(Math.random() * firstPool.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return { name: `${first} ${last}`, gender: finalGender };
};

/**
 * Generates a list of mock students based on predefined courses and department mappings.
 * 
 * @param studentsPerCourse The number of students to generate for every course in COURSE_CODE_MAPPING.
 * @returns An array of Student objects with realistic roll numbers and attributes.
 * 
 * LOGIC:
 * - Roll Number: [BatchYear(2)] + [CourseCode(2)] + [Serial(3)]
 * - Example: '25' (Batch) + '01' (CSE) + '001' = 2501001
 * - Semester: Evenly distributed across 1-8.
 * - Section: Balanced distribution across A, B, and C.
 */
export const generateMockStudents = (studentsPerCourse = 100): Student[] => {
  const students: Student[] = [];
  const year = '25'; // For 2025 batch
  let globalStudentCounter = 0;

  COURSE_CODE_MAPPING.forEach(courseInfo => {
    // Only generate students for B.Tech CSE and general courses for testing to avoid huge arrays if loop is too large
    // Or just generating fewer students per course to keep it manageable
    const count = studentsPerCourse;

    for (let i = 1; i <= count; i++) {
      const personalId = String(i).padStart(3, '0');
      const rollNo = `${year}${courseInfo.code}${personalId}`;

      students.push({
        id: `S${rollNo}`,
        name: getRandomName().name,
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

/**
 * Generates mock classrooms with predefined capacities and realistic layouts.
 * 
 * @param count Requested number of classrooms (currently uses a fixed list for accuracy).
 * @returns An array of Classroom objects.
 * 
 * LOGIC:
 * - Bench Capacity: Defaults to 2 students per bench.
 * - Grid Calculation: Automatically calculates rows/columns to fit the room capacity based on a square-ish layout.
 */
export const generateMockClassrooms = (count = 50): Classroom[] => {
  const customRooms = [
    // BLOCK C - Updated Capacities
    { roomNo: 'C001', capacity: 42, building: 'Academic Block C' },
    { roomNo: 'C002', capacity: 42, building: 'Academic Block C' },
    { roomNo: 'C003', capacity: 42, building: 'Academic Block C' },
    { roomNo: 'C004', capacity: 42, building: 'Academic Block C' },
    { roomNo: 'C102', capacity: 42, building: 'Academic Block C' },
    { roomNo: 'C104', capacity: 42, building: 'Academic Block C' },
    { roomNo: 'C202', capacity: 42, building: 'Academic Block C' },
    { roomNo: 'C204', capacity: 42, building: 'Academic Block C' },
    { roomNo: 'C303', capacity: 42, building: 'Academic Block C' },
    { roomNo: 'C306', capacity: 42, building: 'Academic Block C' },

    // BLOCK D - Updated Capacities
    { roomNo: 'D003', capacity: 66, building: 'Academic Block D' },
    { roomNo: 'D006', capacity: 60, building: 'Academic Block D' },
    { roomNo: 'D103', capacity: 120, building: 'Academic Block D' },
    { roomNo: 'D104', capacity: 120, building: 'Academic Block D' },

    // BLOCK E - Updated Capacities
    { roomNo: 'E001', capacity: 42, building: 'Academic Block E' },
    { roomNo: 'E003', capacity: 42, building: 'Academic Block E' },
    { roomNo: 'E101', capacity: 42, building: 'Academic Block E' },
    { roomNo: 'E103', capacity: 42, building: 'Academic Block E' },
  ];

  return customRooms.map((room, index) => {
    // Determine layout
    // Assuming 2 students per bench logic as seen in planning.ts
    const benchCount = Math.ceil(room.capacity / 2);

    // Create a somewhat rectangular grid
    const rows = Math.ceil(Math.sqrt(benchCount));
    const columns = Math.ceil(benchCount / rows);

    // Fill benches: all 2s, except possibly the last one if capacity is odd
    // But importantly, we need benchCapacities sum to equal room.capacity exactly
    // So we can have N benches.
    // If capacity is even: N benches of 2.
    // If capacity is odd: N-1 benches of 2, 1 bench of 1.

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
        benchCapacities.push(0); // Empty benches if grid is larger than needed
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
      departmentBlock: room.building, // Mapping block as department block roughly
    });
  });
};


export const generateMockInvigilators = (count = 100): Invigilator[] => {
  // Use real faculty list first
  const invigilators: Invigilator[] = REAL_FACULTY.map(faculty => ({
    ...faculty,
    isAvailable: true, // Default to available
    unavailableSlots: [],
    assignedDuties: []
  }));

  // If count requested is more than real faculty, pad with mocks
  // (though for accurate representation we might want to just stick to real faculty if that's the intent)
  // However, the app might rely on having a larger pool for stress testing. 
  // Let's stick to the REAL list if count is not specified or relatively small, 
  // but if the system expects 'count', we might need to fill gaps. 
  // For now, let's just return the REAL list + some mocks if strictly needed, 
  // but I'll assume the user wants the REAL list primarily.

  if (invigilators.length < count) {
    const remaining = count - invigilators.length;
    for (let i = 0; i < remaining; i++) {
      const isFemale = Math.random() > 0.6;
      const gender = isFemale ? 'Female' : 'Male';
      const { name } = getRandomName(gender);

      invigilators.push({
        id: `EXT${String(i + 1).padStart(3, '0')}`,
        name: `Dr. ${name} (Guest)`,
        department: DEPARTMENTS[i % DEPARTMENTS.length],
        designation: 'Assistant Professor',
        gender,
        isAvailable: true,
        unavailableSlots: [],
        assignedDuties: []
      });
    }
  }

  return invigilators;
};

// Function to shuffle an array
const shuffle = <T>(array: T[]): T[] => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};


/**
 * Generates a comprehensive exam schedule for various engineering and management programs.
 * 
 * @returns An array of ExamSlot objects.
 * 
 * SHIFT DETERMINATION:
 * - We use 4 shifts of 90 minutes each.
 * - Shifts are assigned DETERMINISTICALLY based on the subject code hash.
 * - This ensures that the same subject always falls on the same shift during generation.
 */
export const generateMockExamSchedule = (): ExamSlot[] => {
  const exams: ExamSlot[] = [];
  let idCounter = 1;

  const add = (dateDMY: string, timeRange: string, sem: number, subject: string, code: string, course: string, dept: string) => {
    // Parse Date DD-MM-YYYY -> YYYY-MM-DD
    const [d, m, y] = dateDMY.split('-');
    const date = `${y}-${m}-${d}`;

    // SHIFT LOGIC: 4 Shifts of 90 minutes each
    // Shift 1: 09:30 AM - 11:00 AM
    // Shift 2: 11:30 AM - 01:00 PM
    // Shift 3: 01:30 PM - 03:00 PM
    // Shift 4: 03:30 PM - 05:00 PM

    // Deterministically assign shift based on subject code to ensure even distribution
    // and consistency (same subject always gets same shift)
    const hash = code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const shift = (hash % 4) + 1; // 1, 2, 3, or 4

    let time = '09:30';
    if (shift === 1) time = '09:30';
    else if (shift === 2) time = '11:30';
    else if (shift === 3) time = '13:30';
    else if (shift === 4) time = '15:30';

    exams.push({
      id: `E${String(idCounter++).padStart(4, '0')}`,
      date,
      time,
      course,
      department: dept,
      semester: sem,
      subjectName: subject,
      subjectCode: code,
      duration: 90, // 1.5 Hours
      shift: shift
    });
  };

  // --- ENGINEERING PROGRAMS ---
  const CSE_DEPT = 'Computer Science and Engineering';
  const BTECH_CSE = 'B.Tech Computer Science and Engineering';
  add('06-12-2025', '01:30 PM - 04:30 PM', 1, 'Professional Communication', 'THU101', BTECH_CSE, CSE_DEPT);
  add('09-12-2025', '01:30 PM - 04:30 PM', 1, 'Basic Electrical Engineering', 'TEE101', BTECH_CSE, CSE_DEPT);
  add('09-12-2025', '01:30 PM - 04:30 PM', 1, 'Basic Electronics Engineering', 'TEC101', BTECH_CSE, CSE_DEPT);
  add('11-12-2025', '01:30 PM - 04:30 PM', 1, 'Engineering Chemistry', 'TCH101', BTECH_CSE, CSE_DEPT);
  add('11-12-2025', '01:30 PM - 04:30 PM', 1, 'Engineering Physics', 'TPH101', BTECH_CSE, CSE_DEPT);
  add('13-12-2025', '01:30 PM - 04:30 PM', 1, 'Fundamental of Computer & Introduction to Programming', 'TCS101', BTECH_CSE, CSE_DEPT);
  add('16-12-2025', '01:30 PM - 04:30 PM', 1, 'Engineering Mathematics-I', 'TMA101', BTECH_CSE, CSE_DEPT);
  add('18-12-2025', '01:30 PM - 04:30 PM', 1, 'Environmental Science', 'TEV101', BTECH_CSE, CSE_DEPT);
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Information Security Foundations BTL', 'TCS324', BTECH_CSE, CSE_DEPT);
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Probability and Random Process', 'TCS344', BTECH_CSE, CSE_DEPT);
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Fundamentals of Cloud Computing and Bigdata', 'TCS351', BTECH_CSE, CSE_DEPT);
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Introduction to Cryptography', 'TCS392', BTECH_CSE, CSE_DEPT);
  add('27-11-2025', '09:30 AM - 12:30 PM', 3, 'Data Structures with C', 'TCS302', BTECH_CSE, CSE_DEPT);
  add('29-11-2025', '09:30 AM - 12:30 PM', 3, 'Logic Design & Computer Organization', 'TCS308', BTECH_CSE, CSE_DEPT);
  add('02-12-2025', '09:30 AM - 12:30 PM', 3, 'Object Oriented Programming with C++', 'TCS307', BTECH_CSE, CSE_DEPT);
  add('04-12-2025', '09:30 AM - 12:30 PM', 3, 'Mathematical Foundations for Artificial Intelligence', 'TCS343', BTECH_CSE, CSE_DEPT);
  add('10-12-2025', '09:30 AM - 12:30 PM', 3, 'Fundamentals of AI and ML', 'TCS364', BTECH_CSE, CSE_DEPT);
  add('12-12-2025', '09:30 AM - 12:30 PM', 3, 'Discrete Structures and Combinatorics', 'TMA316', BTECH_CSE, CSE_DEPT);
  add('06-12-2025', '09:30 AM - 12:30 PM', 3, 'Python Programming', 'TCS346', BTECH_CSE, CSE_DEPT);
  add('26-11-2025', '09:30 AM - 12:30 PM', 5, 'Machine Learning', 'TCS509', BTECH_CSE, CSE_DEPT);
  add('26-11-2025', '09:30 AM - 12:30 PM', 5, 'Introduction to Artificial Intelligence and Data Science', 'TCS562', BTECH_CSE, CSE_DEPT);
  add('26-11-2025', '09:30 AM - 12:30 PM', 5, 'Computer System Security', 'TCS597', BTECH_CSE, CSE_DEPT);
  add('26-11-2025', '09:30 AM - 12:30 PM', 5, 'Natural Language Processing and Computer Vision', 'TCS564', BTECH_CSE, CSE_DEPT);
  add('28-11-2025', '09:30 AM - 12:30 PM', 5, 'Operating Systems', 'TCS502', BTECH_CSE, CSE_DEPT);
  add('01-12-2025', '09:30 AM - 12:30 PM', 5, 'Database Management Systems', 'TCS503', BTECH_CSE, CSE_DEPT);
  add('03-12-2025', '09:30 AM - 12:30 PM', 5, 'Computer Networks', 'TCS511', BTECH_CSE, CSE_DEPT);
  add('03-12-2025', '09:30 AM - 12:30 PM', 5, 'Computer Networks I', 'TCS514', BTECH_CSE, CSE_DEPT);
  add('05-12-2025', '09:30 AM - 12:30 PM', 5, 'Bigdata Visualization', 'TCS571', BTECH_CSE, CSE_DEPT);
  add('05-12-2025', '09:30 AM - 12:30 PM', 5, 'Cloud Based Application Development and Management', 'TCS552', BTECH_CSE, CSE_DEPT);
  add('05-12-2025', '09:30 AM - 12:30 PM', 5, 'Computer System Security', 'TCS591', BTECH_CSE, CSE_DEPT);
  add('05-12-2025', '09:30 AM - 12:30 PM', 5, 'Deep Learning Fundamentals', 'TCS593', BTECH_CSE, CSE_DEPT);
  add('05-12-2025', '09:30 AM - 12:30 PM', 5, 'Security Audit and Compliance-I', 'TCS595', BTECH_CSE, CSE_DEPT);
  add('08-12-2025', '09:30 AM - 12:30 PM', 5, 'Advanced Python Programming', 'TCS546', BTECH_CSE, CSE_DEPT);
  add('08-12-2025', '09:30 AM - 12:30 PM', 5, 'Blockchain Technology and its application', 'TCS592', BTECH_CSE, CSE_DEPT);
  add('08-12-2025', '09:30 AM - 12:30 PM', 5, 'Foundation of Quantum Computing', 'TCS584', BTECH_CSE, CSE_DEPT);
  add('08-12-2025', '09:30 AM - 12:30 PM', 5, 'Reinforcement Learning', 'TCS545', BTECH_CSE, CSE_DEPT);
  add('26-11-2025', '01:30 PM - 04:30 PM', 7, 'Artificial Intelligence', 'TCS706', BTECH_CSE, CSE_DEPT);
  add('26-11-2025', '01:30 PM - 04:30 PM', 7, 'Security Audit and Compliance-II', 'TCS-795', BTECH_CSE, CSE_DEPT);
  add('28-11-2025', '01:30 PM - 04:30 PM', 7, 'Cryptography & Network Security', 'TIT704', BTECH_CSE, CSE_DEPT);
  add('01-12-2025', '01:30 PM - 04:30 PM', 7, 'Computer Networks-II', 'TCS703', BTECH_CSE, CSE_DEPT);
  add('03-12-2025', '01:30 PM - 04:30 PM', 7, 'Advanced Computer Architecture', 'TCS704', BTECH_CSE, CSE_DEPT);
  add('05-12-2025', '01:30 PM - 04:30 PM', 7, 'Human Computer Interaction', 'TCS756', BTECH_CSE, CSE_DEPT);

  const BTECH_AIDS = 'B.Tech CSE (Hons.) - AI & ML'; // Mapping closest match
  add('13-12-2025', '01:30 PM - 04:30 PM', 1, 'Introduction to Python Programming', 'TCS102', BTECH_AIDS, CSE_DEPT);
  add('16-12-2025', '01:30 PM - 04:30 PM', 1, 'Mathematics for AI-I', 'TMA102', BTECH_AIDS, CSE_DEPT);
  add('26-11-2025', '01:30 PM - 04:30 PM', 7, 'Data Warehousing and Data Mining', 'TCS722', BTECH_AIDS, CSE_DEPT);
  add('26-11-2025', '01:30 PM - 04:30 PM', 7, 'Security Audit and Compliance-II', 'TCS-795', BTECH_AIDS, CSE_DEPT);
  add('28-11-2025', '01:30 PM - 04:30 PM', 7, 'Cryptography and Network Security', 'TIT704', BTECH_AIDS, CSE_DEPT);
  add('01-12-2025', '01:30 PM - 04:30 PM', 7, 'Computer Networks-II', 'TCS703', BTECH_AIDS, CSE_DEPT);
  add('03-12-2025', '01:30 PM - 04:30 PM', 7, 'Advanced Computer Architecture', 'TCS704', BTECH_AIDS, CSE_DEPT);
  add('05-12-2025', '01:30 PM - 04:30 PM', 7, 'Human Computer Interaction', 'TCS756', BTECH_AIDS, CSE_DEPT);

  const CIVIL_DEPT = 'Civil Engineering';
  const BTECH_CE = 'B.Tech Civil Engineering';
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Geomatic Engineering', 'TCE302', BTECH_CE, CIVIL_DEPT);
  add('27-11-2025', '09:30 AM - 12:30 PM', 3, 'Mechanics of Solids', 'TCE303', BTECH_CE, CIVIL_DEPT);
  add('29-11-2025', '09:30 AM - 12:30 PM', 3, 'Fluid Mechanics', 'TCE301', BTECH_CE, CIVIL_DEPT);
  add('02-12-2025', '09:30 AM - 12:30 PM', 3, 'Mathematics-III', 'TMA302', BTECH_CE, CIVIL_DEPT);
  add('04-12-2025', '09:30 AM - 12:30 PM', 3, 'Emerging Technologies in Construction Practices(DDN)', 'TCE339', BTECH_CE, CIVIL_DEPT);
  add('04-12-2025', '09:30 AM - 12:30 PM', 3, 'Remote Sensing & its Techniques(DDN)', 'TCE399', BTECH_CE, CIVIL_DEPT);
  add('06-12-2025', '09:30 AM - 12:30 PM', 3, 'Universal Human Value-II', 'UHV301', BTECH_CE, CIVIL_DEPT);
  add('26-11-2025', '09:30 AM - 12:30 PM', 5, 'Advance Structural Analysis', 'TCE501', BTECH_CE, CIVIL_DEPT);
  add('28-11-2025', '09:30 AM - 12:30 PM', 5, 'Air and Noise Pollution', 'TCE511', BTECH_CE, CIVIL_DEPT);
  add('01-12-2025', '09:30 AM - 12:30 PM', 5, 'Hydrology and Irrigation', 'TCE504', BTECH_CE, CIVIL_DEPT);
  add('03-12-2025', '09:30 AM - 12:30 PM', 5, 'Reinforced Cement Concrete Design', 'TCE502', BTECH_CE, CIVIL_DEPT);
  add('05-12-2025', '09:30 AM - 12:30 PM', 5, 'Geotechnical & Foundation Engineering', 'TCE503', BTECH_CE, CIVIL_DEPT);

  const ECE_DEPT = 'Electronics and Communication Engineering';
  const BTECH_ECE = 'B.Tech Electronics and Communication Engineering';
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Signals & Systems', 'TEC304', BTECH_ECE, ECE_DEPT);
  add('27-11-2025', '09:30 AM - 12:30 PM', 3, 'Advanced Engineering Mathematics', 'BSC301', BTECH_ECE, ECE_DEPT);
  add('29-11-2025', '09:30 AM - 12:30 PM', 3, 'Electronic Devices and Circuits', 'TEC301', BTECH_ECE, ECE_DEPT);
  add('02-12-2025', '09:30 AM - 12:30 PM', 3, 'Digital System Design', 'TEC302', BTECH_ECE, ECE_DEPT);
  add('04-12-2025', '09:30 AM - 12:30 PM', 3, 'Network Theory', 'TEC303', BTECH_ECE, ECE_DEPT);
  add('26-11-2025', '09:30 AM - 12:30 PM', 5, 'Analog & Digital Communication', 'TEC501', BTECH_ECE, ECE_DEPT);
  add('28-11-2025', '09:30 AM - 12:30 PM', 5, 'Digital Signal Processing', 'TEC502', BTECH_ECE, ECE_DEPT);
  add('01-12-2025', '09:30 AM - 12:30 PM', 5, 'Electromagnetic Waves', 'TEC503', BTECH_ECE, ECE_DEPT);
  add('03-12-2025', '09:30 AM - 12:30 PM', 5, 'Data Communication Network', 'TEC504', BTECH_ECE, ECE_DEPT);
  add('05-12-2025', '09:30 AM - 12:30 PM', 5, 'Probability Theory and Stochastic Processes', 'TEC505', BTECH_ECE, ECE_DEPT);
  add('08-12-2025', '09:30 AM - 12:30 PM', 5, 'Object Oriented Programming using C++', 'TEC506', BTECH_ECE, ECE_DEPT);
  add('26-11-2025', '01:30 PM - 04:30 PM', 7, 'Wireless Communication', 'TEC701', BTECH_ECE, ECE_DEPT);
  add('28-11-2025', '01:30 PM - 04:30 PM', 7, 'Digital Image Processing', 'TEC705', BTECH_ECE, ECE_DEPT);
  add('01-12-2025', '01:30 PM - 04:30 PM', 7, 'Fundamentals of Cybersecurity', 'TEC707', BTECH_ECE, ECE_DEPT);
  add('04-12-2025', '01:30 PM - 04:30 PM', 7, 'Principle of Management', 'HSMC701', BTECH_ECE, ECE_DEPT);

  const ME_DEPT = 'Mechanical Engineering';
  const BTECH_ME = 'B.Tech Mechanical Engineering';
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Material Science', 'TME302', BTECH_ME, ME_DEPT);
  add('27-11-2025', '09:30 AM - 12:30 PM', 3, 'Engineering Mathematics III', 'TMA303', BTECH_ME, ME_DEPT);
  add('29-11-2025', '09:30 AM - 12:30 PM', 3, 'Thermal Engineering', 'TME308', BTECH_ME, ME_DEPT);
  add('02-12-2025', '09:30 AM - 12:30 PM', 3, 'Production Technology', 'TME309', BTECH_ME, ME_DEPT);
  add('04-12-2025', '09:30 AM - 12:30 PM', 3, 'Entrepreneurship for Engineers', 'TME310', BTECH_ME, ME_DEPT);
  add('06-12-2025', '09:30 AM - 12:30 PM', 3, 'Universal Human Values II', 'UHV301', BTECH_ME, ME_DEPT);
  add('09-12-2025', '09:30 AM - 12:30 PM', 3, 'Engineering Mechanics', 'TME306', BTECH_ME, ME_DEPT);
  add('26-11-2025', '09:30 AM - 12:30 PM', 5, 'Heat Transfer', 'TME501', BTECH_ME, ME_DEPT);
  add('28-11-2025', '09:30 AM - 12:30 PM', 5, 'Design of Machine Elements I', 'TME502', BTECH_ME, ME_DEPT);
  add('01-12-2025', '09:30 AM - 12:30 PM', 5, 'Theory of Machines', 'TME508', BTECH_ME, ME_DEPT);
  add('03-12-2025', '09:30 AM - 12:30 PM', 5, 'Mechanical Measurement and Metrology', 'TME510', BTECH_ME, ME_DEPT);
  add('05-12-2025', '09:30 AM - 12:30 PM', 5, 'Supply Chain Management', 'TME515', BTECH_ME, ME_DEPT);
  add('08-12-2025', '09:30 AM - 12:30 PM', 5, 'Renewable Energy', 'TME509', BTECH_ME, ME_DEPT);
  add('26-11-2025', '01:30 PM - 04:30 PM', 7, 'Automobile Engineering', 'TME707', BTECH_ME, ME_DEPT);
  add('28-11-2025', '01:30 PM - 04:30 PM', 7, 'Mechatronics', 'TME708', BTECH_ME, ME_DEPT);
  add('04-12-2025', '01:30 PM - 04:30 PM', 7, 'Total Quality Management', 'TME714', BTECH_ME, ME_DEPT);

  const MTECH_CSE = 'M.Tech Computer Science and Engineering';
  add('06-12-2025', '01:30 PM - 04:30 PM', 1, 'Data Structures and Algorithms', 'MCS141', MTECH_CSE, CSE_DEPT);
  add('09-12-2025', '01:30 PM - 04:30 PM', 1, 'Cryptography and Network Security', 'MCS142', MTECH_CSE, CSE_DEPT);
  add('11-12-2025', '01:30 PM - 04:30 PM', 1, 'Artificial Intelligence', 'MCS143', MTECH_CSE, CSE_DEPT);
  add('13-12-2025', '01:30 PM - 04:30 PM', 1, 'Data Ware Housing and Data Mining', 'MCS124', MTECH_CSE, CSE_DEPT);
  add('13-12-2025', '01:30 PM - 04:30 PM', 1, 'Internet of Things BTL', 'MCS134', MTECH_CSE, CSE_DEPT);
  add('16-12-2025', '01:30 PM - 04:30 PM', 1, 'Big Data Analytics / Applied Data Science (BTL)', 'MCS129/MCS131', MTECH_CSE, CSE_DEPT);
  add('26-11-2025', '01:30 PM - 04:30 PM', 3, 'Soft Computing', 'MCS301', MTECH_CSE, CSE_DEPT);
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Introduction to Research Methodology', 'MRD-302', MTECH_CSE, CSE_DEPT);
  add('27-11-2025', '09:30 AM - 12:30 PM', 3, 'Quantum Computing', 'MCS-373', MTECH_CSE, CSE_DEPT);

  // --- COMPUTER APPLICATION PROGRAMS ---
  const CA_DEPT = 'Computer Applications';
  const BCA = 'BCA';
  add('06-12-2025', '01:30 PM - 04:30 PM', 1, 'Professional Communication', 'TBC104', BCA, CA_DEPT);
  add('09-12-2025', '01:30 PM - 04:30 PM', 1, 'Foundations of Computer Programming', 'TBC102', BCA, CA_DEPT);
  add('11-12-2025', '01:30 PM - 04:30 PM', 1, 'Mathematical Foundation of Computer Science', 'TBC103', BCA, CA_DEPT);
  add('13-12-2025', '01:30 PM - 04:30 PM', 1, 'Computational Thinking & Fundamentals of IT', 'TBC101', BCA, CA_DEPT);
  add('16-12-2025', '01:30 PM - 04:30 PM', 1, 'Bridge Course (only for Non Maths students)', 'TBC111', BCA, CA_DEPT);
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Foundations of Artificial Intelligence', 'TBC311', BCA, CA_DEPT);
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Fundamental of Cloud Computing', 'TBC313', BCA, CA_DEPT);
  add('27-11-2025', '09:30 AM - 12:30 PM', 3, 'Introduction to Data Structures', 'TBC301', BCA, CA_DEPT);
  add('29-11-2025', '09:30 AM - 12:30 PM', 3, 'Introduction to Database Management Systems', 'TBC302', BCA, CA_DEPT);
  add('02-12-2025', '09:30 AM - 12:30 PM', 3, 'Digital Logic Design', 'TBC303', BCA, CA_DEPT);
  add('26-11-2025', '09:30 AM - 12:30 PM', 5, 'Career Skills- III', 'TBC 506', BCA, CA_DEPT);
  add('28-11-2025', '09:30 AM - 12:30 PM', 5, 'Introduction to Java Programming', 'TBC501', BCA, CA_DEPT);
  add('01-12-2025', '09:30 AM - 12:30 PM', 5, 'Introduction to Artificial Intelligence', 'TBC502', BCA, CA_DEPT);
  add('03-12-2025', '09:30 AM - 12:30 PM', 5, 'Introduction to Microcontrollers', 'TBC503', BCA, CA_DEPT);
  add('05-12-2025', '09:30 AM - 12:30 PM', 5, 'Introduction to Dot Net Programming', 'TBC505(3)', BCA, CA_DEPT);
  add('05-12-2025', '09:30 AM - 12:30 PM', 5, 'Object Oriented Analysis and Design', 'TBC505(2)', BCA, CA_DEPT);

  const BCA_HONS_CS = 'BCA (Hons.) - AI & Data Science'; // Using AI & DS for Hons mapping
  add('06-12-2025', '01:30 PM - 04:30 PM', 1, 'Professional Communication', 'TBL104', BCA_HONS_CS, CA_DEPT);
  add('09-12-2025', '01:30 PM - 04:30 PM', 1, 'Fundamentals of Python Programming', 'TBL102', BCA_HONS_CS, CA_DEPT);
  add('11-12-2025', '01:30 PM - 04:30 PM', 1, 'Mathematical Foundation of Computer Science', 'TBL103', BCA_HONS_CS, CA_DEPT);
  add('13-12-2025', '01:30 PM - 04:30 PM', 1, 'Computational Thinking & Fundamentals of IT', 'TBL101', BCA_HONS_CS, CA_DEPT);
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Web Application Development', 'TBL312', BCA_HONS_CS, CA_DEPT);
  add('27-11-2025', '09:30 AM - 12:30 PM', 3, 'Introduction to Data Structures', 'TBL305', BCA_HONS_CS, CA_DEPT);
  add('29-11-2025', '09:30 AM - 12:30 PM', 3, 'Cryptography', 'TBL302', BCA_HONS_CS, CA_DEPT);
  add('02-12-2025', '09:30 AM - 12:30 PM', 3, 'Operating Systems and Security', 'TBL303', BCA_HONS_CS, CA_DEPT);
  add('04-12-2025', '09:30 AM - 12:30 PM', 3, 'Python Programming', 'TBL301', BCA_HONS_CS, CA_DEPT);

  const BCA_HONS_AIDS = 'BCA (Hons.) - AI & Data Science';
  add('06-12-2025', '01:30 PM - 04:30 PM', 1, 'Professional Communication', 'TBD104', BCA_HONS_AIDS, CA_DEPT);
  add('09-12-2025', '01:30 PM - 04:30 PM', 1, 'Fundamentals of Python Programming', 'TBD102', BCA_HONS_AIDS, CA_DEPT);
  add('11-12-2025', '01:30 PM - 04:30 PM', 1, 'Mathematical Foundation for AI', 'TBD103', BCA_HONS_AIDS, CA_DEPT);
  add('13-12-2025', '01:30 PM - 04:30 PM', 1, 'Computational Thinking & Fundamentals of IT', 'TBD101', BCA_HONS_AIDS, CA_DEPT);
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Fundamentals of cloud computing', 'TBD313', BCA_HONS_AIDS, CA_DEPT);
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Introduction to Soft Computing', 'TBD311', BCA_HONS_AIDS, CA_DEPT);
  add('27-11-2025', '09:30 AM - 12:30 PM', 3, 'Introduction to Data Structures', 'TBD301', BCA_HONS_AIDS, CA_DEPT);
  add('29-11-2025', '09:30 AM - 12:30 PM', 3, 'Introduction to Database Management Systems', 'TBD302', BCA_HONS_AIDS, CA_DEPT);
  add('02-12-2025', '09:30 AM - 12:30 PM', 3, 'Introduction to Data Science', 'TBD303', BCA_HONS_AIDS, CA_DEPT);
  add('26-11-2025', '09:30 AM - 12:30 PM', 5, 'Career Skills - III', 'XBD501', BCA_HONS_AIDS, CA_DEPT);
  add('28-11-2025', '09:30 AM - 12:30 PM', 5, 'Machine Learning 1', 'TBD501', BCA_HONS_AIDS, CA_DEPT);
  add('01-12-2025', '09:30 AM - 12:30 PM', 5, 'Introduction to Data Mining', 'TBD502', BCA_HONS_AIDS, CA_DEPT);
  add('03-12-2025', '09:30 AM - 12:30 PM', 5, 'Cloud Computing', 'TBD503', BCA_HONS_AIDS, CA_DEPT);
  add('05-12-2025', '09:30 AM - 12:30 PM', 5, 'Introduction to Microcontrollers and IOT', 'TBD504(c)', BCA_HONS_AIDS, CA_DEPT);

  const MCA = 'MCA';
  add('06-12-2025', '01:30 PM - 04:30 PM', 1, 'Computer Networks', 'TMC102', MCA, CA_DEPT);
  add('09-12-2025', '01:30 PM - 04:30 PM', 1, 'Programming and Problem-Solving', 'TMC103', MCA, CA_DEPT);
  add('11-12-2025', '01:30 PM - 04:30 PM', 1, 'Advanced Operating Systems', 'TMC104', MCA, CA_DEPT);
  add('13-12-2025', '01:30 PM - 04:30 PM', 1, 'Full Stack Development', 'TMC101', MCA, CA_DEPT);
  add('16-12-2025', '01:30 PM - 04:30 PM', 1, 'Artificial Intelligence', 'TMC115', MCA, CA_DEPT);
  add('16-12-2025', '01:30 PM - 04:30 PM', 1, 'Probability & Statistics', 'TMC111', MCA, CA_DEPT);
  add('18-12-2025', '01:30 PM - 04:30 PM', 1, 'Cloud Computing', 'TMC113', MCA, CA_DEPT);
  add('18-12-2025', '01:30 PM - 04:30 PM', 1, 'Python Programming', 'TMC118', MCA, CA_DEPT);
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Mobile Application Development', 'TMC302', MCA, CA_DEPT);
  add('27-11-2025', '09:30 AM - 12:30 PM', 3, 'Software Engineering', 'TMC303', MCA, CA_DEPT);
  add('29-11-2025', '09:30 AM - 12:30 PM', 3, 'Computer System Security (HLD)', 'TMC313', MCA, CA_DEPT);
  add('29-11-2025', '09:30 AM - 12:30 PM', 3, 'Data Warehousing and Mining', 'TMC315', MCA, CA_DEPT);
  add('29-11-2025', '09:30 AM - 12:30 PM', 3, 'Machine Learning (BTL)', 'TMC311', MCA, CA_DEPT);
  add('02-12-2025', '09:30 AM - 12:30 PM', 3, 'Design and Analysis of Algorithms', 'TMC301', MCA, CA_DEPT);

  const MCA_AIDS = 'MCA - AI & Data Science';
  add('06-12-2025', '01:30 PM - 04:30 PM', 1, 'Python Programming', 'TMD102', MCA_AIDS, CA_DEPT);
  add('09-12-2025', '01:30 PM - 04:30 PM', 1, 'Programming and Problem-Solving', 'TMD103', MCA_AIDS, CA_DEPT);
  add('09-12-2025', '01:30 PM - 04:30 PM', 1, 'Computer Network', 'TMD112', MCA_AIDS, CA_DEPT);
  add('11-12-2025', '01:30 PM - 04:30 PM', 1, 'Advanced Operating Systems', 'TMD105', MCA_AIDS, CA_DEPT);
  add('13-12-2025', '01:30 PM - 04:30 PM', 1, 'Full Stack Development', 'TMD111', MCA_AIDS, CA_DEPT);
  add('13-12-2025', '01:30 PM - 04:30 PM', 1, 'Internet of Things', 'TMD113', MCA_AIDS, CA_DEPT);
  add('16-12-2025', '01:30 PM - 04:30 PM', 1, 'Probability & Statistics', 'TMD101', MCA_AIDS, CA_DEPT);
  add('18-12-2025', '01:30 PM - 04:30 PM', 1, 'Advance Database Management System', 'TMD104', MCA_AIDS, CA_DEPT);
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Machine Learning - I', 'TMD302', MCA_AIDS, CA_DEPT);
  add('27-11-2025', '09:30 AM - 12:30 PM', 3, 'R Programming', 'TMD303', MCA_AIDS, CA_DEPT);
  add('29-11-2025', '09:30 AM - 12:30 PM', 3, 'Data Analytics and Visualization', 'TMD301', MCA_AIDS, CA_DEPT);
  add('02-12-2025', '09:30 AM - 12:30 PM', 3, 'Design and Analysis of Algorithms', 'TMD311', MCA_AIDS, CA_DEPT);

  const BSC_IT = 'B.Sc. IT';
  add('06-12-2025', '01:30 PM - 04:30 PM', 1, 'Professional Communication', 'TBI104', BSC_IT, CA_DEPT);
  add('09-12-2025', '01:30 PM - 04:30 PM', 1, 'Foundations of Computer Programming', 'TBI102', BSC_IT, CA_DEPT);
  add('11-12-2025', '01:30 PM - 04:30 PM', 1, 'Probability and Statistics', 'CAD101', BSC_IT, CA_DEPT);
  add('13-12-2025', '01:30 PM - 04:30 PM', 1, 'Computer Fundamentals and Information Technology', 'TBI101', BSC_IT, CA_DEPT);
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Foundations of Artificial Intelligence', 'TBI311', BSC_IT, CA_DEPT);
  add('27-11-2025', '09:30 AM - 12:30 PM', 3, 'Introduction to Data Structures', 'TBI303', BSC_IT, CA_DEPT);
  add('29-11-2025', '09:30 AM - 12:30 PM', 3, 'Introduction to Database Management Systems', 'TBI302', BSC_IT, CA_DEPT);
  add('04-12-2025', '09:30 AM - 12:30 PM', 3, 'Python Programming', 'TBI301', BSC_IT, CA_DEPT);
  add('26-11-2025', '09:30 AM - 12:30 PM', 5, 'Career Skills-III', 'XBI 501', BSC_IT, CA_DEPT);
  add('28-11-2025', '09:30 AM - 12:30 PM', 5, 'Programming in C#.Net', 'TBI501', BSC_IT, CA_DEPT);
  add('01-12-2025', '09:30 AM - 12:30 PM', 5, 'Web Technology', 'TBI502', BSC_IT, CA_DEPT);
  add('03-12-2025', '09:30 AM - 12:30 PM', 5, 'Fundamentals of Artificial Intelligence', 'TBI503', BSC_IT, CA_DEPT);
  add('05-12-2025', '09:30 AM - 12:30 PM', 5, 'Cloud Computing', 'TBI504(3)', BSC_IT, CA_DEPT);

  // --- MANAGEMENT & COMMERCE PROGRAMS ---
  const MGT_DEPT = 'Management';
  const BBA = 'Bachelor of Business Administration (BBA)';
  add('06-12-2025', '01:30 PM - 04:30 PM', 1, 'Principles & Practices of Management', 'BBA101', BBA, MGT_DEPT);
  add('09-12-2025', '01:30 PM - 04:30 PM', 1, 'Business Communication - I', 'BBA102', BBA, MGT_DEPT);
  add('11-12-2025', '01:30 PM - 04:30 PM', 1, 'Financial Accounting', 'BBA103', BBA, MGT_DEPT);
  add('13-12-2025', '01:30 PM - 04:30 PM', 1, 'Business Economics', 'BBA104', BBA, MGT_DEPT);
  add('16-12-2025', '01:30 PM - 04:30 PM', 1, 'Indian Knowledge System', 'BBA106', BBA, MGT_DEPT);
  add('18-12-2025', '01:30 PM - 04:30 PM', 1, 'Environmental Science and Sustainability', 'BBA107', BBA, MGT_DEPT);
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Management Accounting', 'BBA301', BBA, MGT_DEPT);
  add('27-11-2025', '09:30 AM - 12:30 PM', 3, 'Legal and Ethical Issues in Business', 'BBA302', BBA, MGT_DEPT);
  add('29-11-2025', '09:30 AM - 12:30 PM', 3, 'Human Resource Management', 'BBA303', BBA, MGT_DEPT);
  add('02-12-2025', '09:30 AM - 12:30 PM', 3, 'Management Information System', 'BBA305', BBA, MGT_DEPT);
  add('04-12-2025', '09:30 AM - 12:30 PM', 3, 'Consumer Protection Act', 'BBA306', BBA, MGT_DEPT);
  add('26-11-2025', '09:30 AM - 12:30 PM', 5, 'Career Skills', 'BBA 504', BBA, MGT_DEPT);
  add('28-11-2025', '09:30 AM - 12:30 PM', 5, 'Strategic Management', 'BBA501', BBA, MGT_DEPT);
  add('01-12-2025', '09:30 AM - 12:30 PM', 5, 'Logistics and Supply Chain Management', 'BBA502', BBA, MGT_DEPT);

  const BBA_ACCA = 'BBA - International Finance & Accounting (ACCA)';
  add('06-12-2025', '01:30 PM - 04:30 PM', 1, 'Accountant in Business', 'BBA101(ACCA)', BBA_ACCA, MGT_DEPT);
  add('11-12-2025', '01:30 PM - 04:30 PM', 1, 'Financial Accounting', 'BBA103(ACCA)', BBA_ACCA, MGT_DEPT);
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Financial Management', 'BBA301(ACCA)', BBA_ACCA, MGT_DEPT);
  add('27-11-2025', '09:30 AM - 12:30 PM', 3, 'Audit & Assurance', 'BBA302(ACCA)', BBA_ACCA, MGT_DEPT);
  add('04-12-2025', '09:30 AM - 12:30 PM', 3, 'Performance Management', 'BBA306(ACCA)', BBA_ACCA, MGT_DEPT);
  add('28-11-2025', '09:30 AM - 12:30 PM', 5, 'Business Analysis', 'BBA501(ACCA)', BBA_ACCA, MGT_DEPT);
  add('01-12-2025', '09:30 AM - 12:30 PM', 5, 'Government Risk & Ethics', 'BBA502(ACCA)', BBA_ACCA, MGT_DEPT);

  const MBA = 'Master of Business Administration (MBA)';
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Strategic Management', 'MBA301', MBA, MGT_DEPT);
  add('27-11-2025', '09:30 AM - 12:30 PM', 3, 'Sales and Distribution Management', 'MBA303(MK1)', MBA, MGT_DEPT);
  add('29-11-2025', '09:30 AM - 12:30 PM', 3, 'Consumer Behaviour', 'MBA303(MK3)', MBA, MGT_DEPT);
  add('02-12-2025', '09:30 AM - 12:30 PM', 3, 'Data Visualization', 'MBA303(BA2)', MBA, MGT_DEPT);

  const COMM_DEPT = 'Commerce';
  const BCOM_HONS = 'B.Com (Hons.)';
  add('06-12-2025', '01:30 PM - 04:30 PM', 1, 'Principles of Management', 'BCH101', BCOM_HONS, COMM_DEPT);

  const BPHARM = 'Bachelor of Pharmacy (B.Pharm.)';
  const PHARM_DEPT = 'Pharmacy';
  add('06-12-2025', '01:30 PM - 04:30 PM', 1, 'Human Anatomy and Physiology-I', 'BP101T', BPHARM, PHARM_DEPT);
  add('09-12-2025', '01:30 PM - 04:30 PM', 1, 'Pharmaceutical Analysis-I', 'BP102T', BPHARM, PHARM_DEPT);
  add('11-12-2025', '01:30 PM - 04:30 PM', 1, 'Pharmaceutics-I', 'BP103T', BPHARM, PHARM_DEPT);
  add('13-12-2025', '01:30 PM - 04:30 PM', 1, 'Pharmaceutical Inorganic Chemistry', 'BP104T', BPHARM, PHARM_DEPT);
  add('16-12-2025', '01:30 PM - 04:30 PM', 1, 'Communication Skills', 'BP105T', BPHARM, PHARM_DEPT);
  add('18-12-2025', '01:30 PM - 04:30 PM', 1, 'Remedial Biology', 'BP106RBT', BPHARM, PHARM_DEPT);
  add('18-12-2025', '01:30 PM - 04:30 PM', 1, 'Remedial Mathematics', 'BP106RMT', BPHARM, PHARM_DEPT);
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Pharmaceutical Organic Chemistry II', 'BP301T', BPHARM, PHARM_DEPT);
  add('27-11-2025', '09:30 AM - 12:30 PM', 3, 'Physical Pharmaceutics I', 'BP302T', BPHARM, PHARM_DEPT);
  add('29-11-2025', '09:30 AM - 12:30 PM', 3, 'Pharmaceutical Microbiology', 'BP303T', BPHARM, PHARM_DEPT);
  add('02-12-2025', '09:30 AM - 12:30 PM', 3, 'Pharmaceutical Engineering', 'BP304T', BPHARM, PHARM_DEPT);
  add('04-12-2025', '09:30 AM - 12:30 PM', 3, 'Communication Skills', 'BP105T', BPHARM, PHARM_DEPT);
  add('26-11-2025', '09:30 AM - 12:30 PM', 5, 'Medicinal Chemistry II', 'BP-501T', BPHARM, PHARM_DEPT);
  add('28-11-2025', '09:30 AM - 12:30 PM', 5, 'Industrial Pharmacy I', 'BP-502T', BPHARM, PHARM_DEPT);
  add('01-12-2025', '09:30 AM - 12:30 PM', 5, 'Pharmacology II', 'BP-503T', BPHARM, PHARM_DEPT);
  add('03-12-2025', '09:30 AM - 12:30 PM', 5, 'Pharmacognosy II', 'BP-504T', BPHARM, PHARM_DEPT);
  add('05-12-2025', '09:30 AM - 12:30 PM', 5, 'Pharmaceutical Jurisprudence', 'BP-505T', BPHARM, PHARM_DEPT);
  add('26-11-2025', '01:30 PM - 04:30 PM', 7, 'Instrumental Methods of Analysis', 'BP-701T', BPHARM, PHARM_DEPT);
  add('28-11-2025', '01:30 PM - 04:30 PM', 7, 'Industrial Pharmacy II', 'BP-702T', BPHARM, PHARM_DEPT);
  add('01-12-2025', '01:30 PM - 04:30 PM', 7, 'Pharmacy Practice', 'BP-703T', BPHARM, PHARM_DEPT);
  add('03-12-2025', '01:30 PM - 04:30 PM', 7, 'Novel Drug Delivery System', 'BP-704T', BPHARM, PHARM_DEPT);

  const MPHARM = 'Master of Pharmacy';
  add('06-12-2025', '01:30 PM - 04:30 PM', 1, 'Modern Pharmaceutical Analytical Techniques', 'MPH101T', MPHARM, PHARM_DEPT);
  add('09-12-2025', '01:30 PM - 04:30 PM', 1, 'Drug Delivery System', 'MPH102T', MPHARM, PHARM_DEPT);
  add('11-12-2025', '01:30 PM - 04:30 PM', 1, 'Modern Pharmaceutics', 'MPH103T', MPHARM, PHARM_DEPT);
  add('13-12-2025', '01:30 PM - 04:30 PM', 1, 'Regulatory Affair', 'MPH104T', MPHARM, PHARM_DEPT);
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Research Methodology & Biostatistics', 'MRM301T', MPHARM, PHARM_DEPT);

  const NURSING_DEPT = 'Nursing';
  const BSC_NURSING = 'B.Sc. Nursing';
  add('06-12-2025', '01:30 PM - 04:30 PM', 1, 'Professional Communication', 'EAEC101', BSC_NURSING, NURSING_DEPT);
  add('09-12-2025', '01:30 PM - 04:30 PM', 1, 'Drama(A)', 'ENG103', BSC_NURSING, NURSING_DEPT);
  add('11-12-2025', '01:30 PM - 04:30 PM', 1, 'Fundamental of Grammar and Communication in English', 'EMC101', BSC_NURSING, NURSING_DEPT);
  add('13-12-2025', '01:30 PM - 04:30 PM', 1, 'History of English Literature', 'ENG101', BSC_NURSING, NURSING_DEPT);
  add('16-12-2025', '01:30 PM - 04:30 PM', 1, 'Poetry(A)', 'ENG102', BSC_NURSING, NURSING_DEPT);
  add('18-12-2025', '01:30 PM - 04:30 PM', 1, 'Environmental Science', 'EVAC101', BSC_NURSING, NURSING_DEPT);
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Drama (B)', 'ENG303', BSC_NURSING, NURSING_DEPT);
  add('27-11-2025', '09:30 AM - 12:30 PM', 3, 'Soft Skills and Personality Development (AEC III)', 'EAEC301', BSC_NURSING, NURSING_DEPT);
  add('29-11-2025', '09:30 AM - 12:30 PM', 3, 'Story Telling (Minor III)', 'EMC301', BSC_NURSING, NURSING_DEPT);
  add('02-12-2025', '09:30 AM - 12:30 PM', 3, 'Greek Mythology and Biblical References', 'ENG301', BSC_NURSING, NURSING_DEPT);
  add('04-12-2025', '09:30 AM - 12:30 PM', 3, 'Poetry (B)', 'ENG302', BSC_NURSING, NURSING_DEPT);
  add('26-11-2025', '09:30 AM - 12:30 PM', 5, 'Career Skills (SEC III)', 'ESEC 501', BSC_NURSING, NURSING_DEPT);
  add('28-11-2025', '09:30 AM - 12:30 PM', 5, 'British Literature 19th Century', 'EDSC501', BSC_NURSING, NURSING_DEPT);
  add('01-12-2025', '09:30 AM - 12:30 PM', 5, 'British Literature Early 20th Century', 'EDSC502', BSC_NURSING, NURSING_DEPT);
  add('03-12-2025', '09:30 AM - 12:30 PM', 5, 'Conversational Skills', 'EMC501', BSC_NURSING, NURSING_DEPT);
  add('05-12-2025', '09:30 AM - 12:30 PM', 5, 'Literary Criticism', 'EDSC503', BSC_NURSING, NURSING_DEPT);

  const ALLIED_DEPT = 'Allied Sciences';
  const BSC_CHEM = 'B.Sc. (H) Chemistry';
  add('06-12-2025', '01:30 PM - 04:30 PM', 1, 'Professional Communication', 'CAEC101', BSC_CHEM, ALLIED_DEPT);
  add('09-12-2025', '01:30 PM - 04:30 PM', 1, 'Inorganic Chemistry', 'CBHT101', BSC_CHEM, ALLIED_DEPT);
  add('11-12-2025', '01:30 PM - 04:30 PM', 1, 'Physical Chemistry', 'CBHT102', BSC_CHEM, ALLIED_DEPT);
  add('13-12-2025', '01:30 PM - 04:30 PM', 1, 'Polymer Science', 'CBHM101', BSC_CHEM, ALLIED_DEPT);
  add('16-12-2025', '01:30 PM - 04:30 PM', 1, 'Environmental Education', 'CVAC101', BSC_CHEM, ALLIED_DEPT);
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Writing Skill in Latex', 'CAEC301', BSC_CHEM, ALLIED_DEPT);
  add('27-11-2025', '09:30 AM - 12:30 PM', 3, 'Functional Group Based Organic Chemistry -I', 'CBHT301', BSC_CHEM, ALLIED_DEPT);
  add('29-11-2025', '09:30 AM - 12:30 PM', 3, 'Instrumental Methods of Analysis', 'CBHM301', BSC_CHEM, ALLIED_DEPT);
  add('02-12-2025', '09:30 AM - 12:30 PM', 3, 'Thermodynamics & Solutions', 'CBHT302', BSC_CHEM, ALLIED_DEPT);
  add('26-11-2025', '09:30 AM - 12:30 PM', 5, 'Verbal Ability', 'CAEC- 501', BSC_CHEM, ALLIED_DEPT);
  add('28-11-2025', '09:30 AM - 12:30 PM', 5, 'Water Treatment and Analysis', 'CBHM-501', BSC_CHEM, ALLIED_DEPT);
  add('01-12-2025', '09:30 AM - 12:30 PM', 5, 'Functional Group Based Organic Chemistry- II', 'CBHT-501', BSC_CHEM, ALLIED_DEPT);
  add('03-12-2025', '09:30 AM - 12:30 PM', 5, 'Chemistry of Biomolecules', 'CBHT-502', BSC_CHEM, ALLIED_DEPT);
  add('05-12-2025', '09:30 AM - 12:30 PM', 5, 'Quantum Chemistry', 'CBHT-503', BSC_CHEM, ALLIED_DEPT);

  const BSC_MATHS = 'B.Sc. (H) Maths';
  add('06-12-2025', '01:30 PM - 04:30 PM', 1, 'Professional Communication', 'MAEC101', BSC_MATHS, ALLIED_DEPT);
  add('09-12-2025', '01:30 PM - 04:30 PM', 1, 'Calculus', 'MDSC101', BSC_MATHS, ALLIED_DEPT);
  add('11-12-2025', '01:30 PM - 04:30 PM', 1, 'Descriptive Statistics', 'MSM101', BSC_MATHS, ALLIED_DEPT);
  add('13-12-2025', '01:30 PM - 04:30 PM', 1, 'Algebra', 'MDSC102', BSC_MATHS, ALLIED_DEPT);
  add('16-12-2025', '01:30 PM - 04:30 PM', 1, 'Environmental Education', 'MVAC101', BSC_MATHS, ALLIED_DEPT);
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Writing Skill in Latex', 'MAEC301', BSC_MATHS, ALLIED_DEPT);
  add('27-11-2025', '09:30 AM - 12:30 PM', 3, 'Partial Differential Equations', 'MDSC301', BSC_MATHS, ALLIED_DEPT);
  add('29-11-2025', '09:30 AM - 12:30 PM', 3, 'Sampling Distributions', 'MSM301', BSC_MATHS, ALLIED_DEPT);
  add('02-12-2025', '09:30 AM - 12:30 PM', 3, 'Theory of Real Functions', 'MDSC302', BSC_MATHS, ALLIED_DEPT);
  add('26-11-2025', '09:30 AM - 12:30 PM', 5, 'Verbal Ability', 'MAEC- 501', BSC_MATHS, ALLIED_DEPT);
  add('28-11-2025', '09:30 AM - 12:30 PM', 5, 'Ring Theory and Algebra- I', 'MDSC-501', BSC_MATHS, ALLIED_DEPT);
  add('01-12-2025', '09:30 AM - 12:30 PM', 5, 'Riemann Integration and Sequence & Series of Functions', 'MDSC-502', BSC_MATHS, ALLIED_DEPT);
  add('03-12-2025', '09:30 AM - 12:30 PM', 5, 'Multivariate Calculus', 'MDSC-503', BSC_MATHS, ALLIED_DEPT);
  add('05-12-2025', '09:30 AM - 12:30 PM', 5, 'Statistical Modeling', 'MSM-501', BSC_MATHS, ALLIED_DEPT);

  const BSC_PHYSICS = 'B.Sc. (H) Physics';
  add('06-12-2025', '01:30 PM - 04:30 PM', 1, 'Professional Communication', 'PAEC101', BSC_PHYSICS, ALLIED_DEPT);
  add('09-12-2025', '01:30 PM - 04:30 PM', 1, 'Fundamentals of Astrophysics & Space Science', 'PBHM101', BSC_PHYSICS, ALLIED_DEPT);
  add('11-12-2025', '01:30 PM - 04:30 PM', 1, 'Mathematical Physics-I', 'PBH102', BSC_PHYSICS, ALLIED_DEPT);
  add('13-12-2025', '01:30 PM - 04:30 PM', 1, 'Mechanics', 'PBH101', BSC_PHYSICS, ALLIED_DEPT);
  add('16-12-2025', '01:30 PM - 04:30 PM', 1, 'Environmental Education', 'PVAC101', BSC_PHYSICS, ALLIED_DEPT);
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Writing Skill in Latex', 'MAEC301', BSC_PHYSICS, ALLIED_DEPT);
  add('27-11-2025', '09:30 AM - 12:30 PM', 3, 'Electricity & Magnetism', 'PBH301', BSC_PHYSICS, ALLIED_DEPT);
  add('29-11-2025', '09:30 AM - 12:30 PM', 3, 'Observational Tools in Space Science', 'PBHM301', BSC_PHYSICS, ALLIED_DEPT);
  add('02-12-2025', '09:30 AM - 12:30 PM', 3, 'Thermal Physics', 'PBH302', BSC_PHYSICS, ALLIED_DEPT);
  add('26-11-2025', '09:30 AM - 12:30 PM', 5, 'Verbal Ability', 'PAEC501', BSC_PHYSICS, ALLIED_DEPT);
  add('28-11-2025', '09:30 AM - 12:30 PM', 5, 'Nuclear and Particle Physics', 'PBH501', BSC_PHYSICS, ALLIED_DEPT);
  add('01-12-2025', '09:30 AM - 12:30 PM', 5, 'Digital Systems and Applications', 'PBH502', BSC_PHYSICS, ALLIED_DEPT);
  add('03-12-2025', '09:30 AM - 12:30 PM', 5, 'Elements of Modern Physics', 'PBH503', BSC_PHYSICS, ALLIED_DEPT);
  add('05-12-2025', '09:30 AM - 12:30 PM', 5, 'Structure and Evolution of Stars', 'PBHM501', BSC_PHYSICS, ALLIED_DEPT);

  const MSC_PHYSICS = 'M.Sc. Physics';
  add('06-12-2025', '01:30 PM - 04:30 PM', 1, 'Classical Mechanics', 'MPH-103', MSC_PHYSICS, ALLIED_DEPT);
  add('09-12-2025', '01:30 PM - 04:30 PM', 1, 'Laser and Optics', 'MPH-104', MSC_PHYSICS, ALLIED_DEPT);
  add('11-12-2025', '01:30 PM - 04:30 PM', 1, 'Material Science (Elective)', 'MPH-107', MSC_PHYSICS, ALLIED_DEPT);
  add('13-12-2025', '01:30 PM - 04:30 PM', 1, 'Mathematical Physics', 'MPH-101', MSC_PHYSICS, ALLIED_DEPT);
  add('16-12-2025', '01:30 PM - 04:30 PM', 1, 'Quantum Mechanics-I', 'MPH-102', MSC_PHYSICS, ALLIED_DEPT);

  const MSC_DATA = 'M.Sc. Data Science And Statistics';
  add('06-12-2025', '01:30 PM - 04:30 PM', 1, 'Computational Linear Algebra', 'MSD101', MSC_DATA, ALLIED_DEPT);
  add('09-12-2025', '01:30 PM - 04:30 PM', 1, 'Design and Analysis of Algorithms', 'MSD103', MSC_DATA, ALLIED_DEPT);
  add('11-12-2025', '01:30 PM - 04:30 PM', 1, 'Mathematical Statistics & Time Series Analysis', 'MSD102', MSC_DATA, ALLIED_DEPT);
  add('13-12-2025', '01:30 PM - 04:30 PM', 1, 'Object Oriented Programming in C++', 'MSD104', MSC_DATA, ALLIED_DEPT);
  add('25-11-2025', '09:30 AM - 12:30 PM', 3, 'Optimization Techniques', 'MSD301', MSC_DATA, ALLIED_DEPT);
  add('27-11-2025', '09:30 AM - 12:30 PM', 3, 'Big Data Analysis', 'MSD304', MSC_DATA, ALLIED_DEPT);
  add('29-11-2025', '09:30 AM - 12:30 PM', 3, 'Data Visualization', 'MSD305', MSC_DATA, ALLIED_DEPT);
  add('02-12-2025', '09:30 AM - 12:30 PM', 3, 'Deep Learning', 'MSD302(i)', MSC_DATA, ALLIED_DEPT);
  add('04-12-2025', '09:30 AM - 12:30 PM', 3, 'Machine Learning', 'MSD303', MSC_DATA, ALLIED_DEPT);

  const POLY_DEPT = 'Polytechnic';
  const DIP_COMMON = 'Diploma (Common)';
  add('06-12-2025', '01:30 PM - 04:30 PM', 1, 'Applied Chemistry-I', 'DTCH103', DIP_COMMON, POLY_DEPT);
  add('09-12-2025', '01:30 PM - 04:30 PM', 1, 'English and Communication Skills-I', 'DTEN105', DIP_COMMON, POLY_DEPT);
  add('11-12-2025', '01:30 PM - 04:30 PM', 1, 'Fundamental of Information Technology-I', 'DTIT104', DIP_COMMON, POLY_DEPT);
  add('13-12-2025', '01:30 PM - 04:30 PM', 1, 'Applied Mathematics-I', 'DTMA101', DIP_COMMON, POLY_DEPT);
  add('16-12-2025', '01:30 PM - 04:30 PM', 1, 'Applied Physics-I', 'DTPH102', DIP_COMMON, POLY_DEPT);

  const DIP_CE = 'Diploma in Civil Engineering';
  add('26-11-2025', '01:30 PM - 04:30 PM', 3, 'Building Construction', 'DTCE302', DIP_CE, POLY_DEPT);
  add('28-11-2025', '01:30 PM - 04:30 PM', 3, 'Building Drawing', 'DTCE303', DIP_CE, POLY_DEPT);
  add('01-12-2025', '01:30 PM - 04:30 PM', 3, 'Concrete Technology', 'DTCE304', DIP_CE, POLY_DEPT);
  add('03-12-2025', '01:30 PM - 04:30 PM', 3, 'Applied Mathematics', 'DTMA305', DIP_CE, POLY_DEPT);
  add('05-12-2025', '01:30 PM - 04:30 PM', 3, 'Surveying', 'DTCE301', DIP_CE, POLY_DEPT);
  add('26-11-2025', '09:30 AM - 12:30 PM', 5, 'Building Services', 'DTCE501', DIP_CE, POLY_DEPT);
  add('28-11-2025', '09:30 AM - 12:30 PM', 5, 'Cost and Estimating', 'DTCE502', DIP_CE, POLY_DEPT);
  add('01-12-2025', '09:30 AM - 12:30 PM', 5, 'Reinforced Cement Concrete', 'DTCE503', DIP_CE, POLY_DEPT);
  add('03-12-2025', '09:30 AM - 12:30 PM', 5, 'Environment Engineering', 'DTCE504', DIP_CE, POLY_DEPT);
  add('05-12-2025', '09:30 AM - 12:30 PM', 5, 'Irrigation Engineering', 'DTCE505', DIP_CE, POLY_DEPT);

  const DIP_CS = 'Diploma in Computer Science and Engineering';
  add('26-11-2025', '01:30 PM - 04:30 PM', 3, 'Digital Logic', 'DTCS302', DIP_CS, POLY_DEPT);
  add('28-11-2025', '01:30 PM - 04:30 PM', 3, 'Relational Database Management Systems', 'DTCS303', DIP_CS, POLY_DEPT);
  add('01-12-2025', '01:30 PM - 04:30 PM', 3, 'Software Engineering', 'DTCS304', DIP_CS, POLY_DEPT);
  add('03-12-2025', '01:30 PM - 04:30 PM', 3, 'Applied Mathematics', 'DTMA305', DIP_CS, POLY_DEPT);
  add('05-12-2025', '01:30 PM - 04:30 PM', 3, 'Object Oriented Programming', 'DTCS301', DIP_CS, POLY_DEPT);
  add('26-11-2025', '09:30 AM - 12:30 PM', 5, 'Microprocessor and Programming', 'DTCS501', DIP_CS, POLY_DEPT);
  add('28-11-2025', '09:30 AM - 12:30 PM', 5, 'Multimedia and Animation Technique', 'DTCS502', DIP_CS, POLY_DEPT);
  add('01-12-2025', '09:30 AM - 12:30 PM', 5, 'Network Management and Administration', 'DTCS503', DIP_CS, POLY_DEPT);
  add('03-12-2025', '09:30 AM - 12:30 PM', 5, 'Operating System', 'DTCS504', DIP_CS, POLY_DEPT);
  add('05-12-2025', '09:30 AM - 12:30 PM', 5, 'Java Programming', 'DTCS505', DIP_CS, POLY_DEPT);

  const DIP_ME = 'Diploma in Mechanical Engineering';
  add('26-11-2025', '01:30 PM - 04:30 PM', 3, 'Engineering Mechanics', 'DTME301', DIP_ME, POLY_DEPT);
  add('28-11-2025', '01:30 PM - 04:30 PM', 3, 'Material Science & Metallurgy', 'DTME302', DIP_ME, POLY_DEPT);
  add('01-12-2025', '01:30 PM - 04:30 PM', 3, 'Manufacturing Processes-I', 'DTME303', DIP_ME, POLY_DEPT);
  add('03-12-2025', '01:30 PM - 04:30 PM', 3, 'Applied Mathematics', 'DTMA301', DIP_ME, POLY_DEPT);
  add('05-12-2025', '01:30 PM - 04:30 PM', 3, 'Thermodynamics', 'DTME304', DIP_ME, POLY_DEPT);
  add('26-11-2025', '09:30 AM - 12:30 PM', 5, 'Computer Applications in Mechanical Drafting, Design and Analysis', 'DTME501', DIP_ME, POLY_DEPT);
  add('28-11-2025', '09:30 AM - 12:30 PM', 5, 'CNC Machines and Automation', 'DTME502', DIP_ME, POLY_DEPT);
  add('01-12-2025', '09:30 AM - 12:30 PM', 5, 'Power Engineering', 'DTME503', DIP_ME, POLY_DEPT);
  add('03-12-2025', '09:30 AM - 12:30 PM', 5, 'Refrigeration and Air Conditioning', 'DTME504', DIP_ME, POLY_DEPT);

  return exams;
};
