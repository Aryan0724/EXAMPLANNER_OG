

import { Student, Classroom, createClassroom, Invigilator, ExamSlot } from './types';

export const DEPARTMENTS: string[] = [
    'Computer Science and Engineering',
    'Civil Engineering',
    'Electronics and Communication Engineering',
    'Mechanical Engineering',
    'Computer Application',
    'Management',
    'Commerce',
    'Nursing',
    'Pharmacy',
    'Polytechnic',
    'Allied Sciences',
    'Department of Personality Development',
    'Part-Time Programs'
];

export const COURSES: Record<string, string[]> = {
    'Computer Science and Engineering': [
        'B.Tech CSE (Hons.) with specialization in Cyber Security',
        'B.Tech Computer Science Engineering',
        'Diploma In Computer Science Engineering',
        'B.Tech CSE (Hons.) with specialization in Artificial Intelligence and Machine Learning',
    ],
    'Civil Engineering': [
        'B.Tech Civil Engineering (Hons.) with specialization in Environmental Engineering',
        'B.Tech Civil Engineering (Hons.) with specialization in Geoinformatics',
        'B.Tech in Civil Engineering',
    ],
    'Electronics and Communication Engineering': [
        'B.Tech Electronics & Communication Engg (Hons.) with Specialization in Drone Technology',
        'B.Tech Electronics & Communication Engineering (Hons.) with specialization in VLSI',
        'B.Tech in Electronics and Communication Engineering',
    ],
    'Mechanical Engineering': [
        'B.Tech Mechanical Engineering (Hons.) with Specialization in Electric Vehicle',
        'B.Tech Mechanical Engineering (Hons.) with specialization in Mechatronics',
        'B.Tech Mechanical Engineering',
    ],
    'Computer Application': [
        'BCA (Hons.) with AI and DS',
        'B.Sc. IT',
        'BCA',
        'MCA',
        'MCA in AI and DS',
    ],
    'Management': [
        'Master of Business Administration',
        'BBA (International Finance & Accounting with ACCA)',
        'BBA',
    ],
    'Commerce': [
        'B.Com. (Hons)',
        'B.Com (Hons.) International Finance and Accounting with ACCA, UK',
        'B.Com International Finance and Accounting with ACCA, UK',
    ],
    'Nursing': [
        'B.Sc. Nursing',
    ],
    'Pharmacy': [
        'B.Pharm',
    ],
    'Polytechnic': [
        'Diploma In Civil Engineering',
        'Diploma In Computer Science Engineering',
        'Diploma In Mechanical Engineering',
    ],
    'Allied Sciences': [
        'Allied Sciences (General)',
    ],
    'Department of Personality Development': [
        'Personality Development Certificate Program'
    ],
    'Part-Time Programs': [
        'M.Tech CSE (Part Time)'
    ]
};

const COURSE_CODE_MAPPING = [
    { code: '01', dept: 'Computer Science and Engineering', name: 'B.Tech CSE (Hons.) with specialization in Cyber Security' },
    { code: '02', dept: 'Computer Science and Engineering', name: 'B.Tech Computer Science Engineering' },
    { code: '03', dept: 'Computer Science and Engineering', name: 'Diploma In Computer Science Engineering' },
    { code: '04', dept: 'Computer Science and Engineering', name: 'B.Tech CSE (Hons.) with specialization in Cyber Security' }, // Duplicate
    { code: '05', dept: 'Computer Science and Engineering', name: 'B.Tech Computer Science Engineering' }, // Duplicate
    { code: '06', dept: 'Computer Science and Engineering', name: 'B.Tech CSE (Hons.) with specialization in Artificial Intelligence and Machine Learning' },
    { code: '11', dept: 'Civil Engineering', name: 'B.Tech Civil Engineering (Hons.) with specialization in Environmental Engineering' },
    { code: '12', dept: 'Civil Engineering', name: 'B.Tech Civil Engineering (Hons.) with specialization in Geoinformatics' },
    { code: '13', dept: 'Civil Engineering', name: 'B.Tech in Civil Engineering' },
    { code: '21', dept: 'Electronics and Communication Engineering', name: 'B.Tech Electronics & Communication Engg (Hons.) with Specialization in Drone Technology' },
    { code: '22', dept: 'Electronics and Communication Engineering', name: 'B.Tech Electronics & Communication Engineering (Hons.) with specialization in VLSI' },
    { code: '23', dept: 'Electronics and Communication Engineering', name: 'B.Tech in Electronics and Communication Engineering' },
    { code: '31', dept: 'Mechanical Engineering', name: 'B.Tech Mechanical Engineering (Hons.) with Specialization in Electric Vehicle' },
    { code: '32', dept: 'Mechanical Engineering', name: 'B.Tech Mechanical Engineering (Hons.) with specialization in Mechatronics' },
    { code: '33', dept: 'Mechanical Engineering', name: 'B.Tech Mechanical Engineering' },
    { code: '41', dept: 'Computer Application', name: 'BCA (Hons.) with AI and DS' },
    { code: '42', dept: 'Computer Application', name: 'B.Sc. IT' },
    { code: '43', dept: 'Computer Application', name: 'BCA' },
    { code: '44', dept: 'Computer Application', name: 'B.Sc. IT' }, // Duplicate
    { code: '45', dept: 'Computer Application', name: 'MCA' },
    { code: '46', dept: 'Computer Application', name: 'BCA (Hons.) with AI and DS' }, // Duplicate
    { code: '47', dept: 'Computer Application', name: 'MCA in AI and DS' },
    { code: '51', dept: 'Management', name: 'Master of Business Administration' },
    { code: '52', dept: 'Management', name: 'BBA (International Finance & Accounting with ACCA)' },
    { code: '53', dept: 'Management', name: 'BBA' },
    { code: '54', dept: 'Management', name: 'BBA' }, // Duplicate
    { code: '55', dept: 'Management', name: 'BBA (International Finance & Accounting with ACCA)' }, // Duplicate
    { code: '56', dept: 'Management', name: 'Master of Business Administration' }, // Duplicate
    { code: '61', dept: 'Commerce', name: 'B.Com. (Hons)' },
    { code: '62', dept: 'Commerce', name: 'B.Com (Hons.) International Finance and Accounting with ACCA, UK' },
    { code: '63', dept: 'Commerce', name: 'B.Com International Finance and Accounting with ACCA, UK' },
    { code: '71', dept: 'Nursing', name: 'B.Sc. Nursing' },
    { code: '81', dept: 'Pharmacy', name: 'B.Pharm' },
    { code: '91', dept: 'Polytechnic', name: 'Diploma In Civil Engineering' },
    { code: '92', dept: 'Polytechnic', name: 'Diploma In Computer Science Engineering' },
    { code: '93', dept: 'Polytechnic', name: 'Diploma In Mechanical Engineering' },
    { code: '97', dept: 'Allied Sciences', name: 'Allied Sciences (General)' },
    { code: '98', dept: 'Department of Personality Development', name: 'Personality Development Certificate Program' }
];

const SUBJECTS_BY_COURSE = {
    "B.Tech Computer Science Engineering": {
      "1": [
        {"subject_code":"TMA101","subject_name":"Engineering Mathematics-I"},
        {"subject_code":"TCS101","subject_name":"Fundamentals of Computer & Introduction to Programming"},
        {"subject_code":"TPH101","subject_name":"Engineering Physics"},
        {"subject_code":"TCH101","subject_name":"Engineering Chemistry"},
        {"subject_code":"THU101","subject_name":"Professional Communication"},
        {"subject_code":"TCS102","subject_name":"Introduction to Python Programming"}
      ],
      "3": [
        {"subject_code":"TCS201","subject_name":"Data Structures"},
        {"subject_code":"TCS202","subject_name":"Discrete Mathematics"},
        {"subject_code":"TCS203","subject_name":"Digital Logic Design"},
        {"subject_code":"TCS204","subject_name":"Object Oriented Programming (C++)"},
        {"subject_code":"TCS205","subject_name":"Computer Organization"},
        {"subject_code":"TCS206","subject_name":"Probability & Statistics for Engineers"}
      ],
      "5": [
        {"subject_code":"TCS301","subject_name":"Algorithms"},
        {"subject_code":"TCS302","subject_name":"Database Management Systems"},
        {"subject_code":"TCS303","subject_name":"Operating Systems"},
        {"subject_code":"TCS304","subject_name":"Theory of Computation"},
        {"subject_code":"TCS305","subject_name":"Software Engineering"},
        {"subject_code":"TCS306","subject_name":"Computer Networks"}
      ],
      "7": [
        {"subject_code":"TCS401","subject_name":"Artificial Intelligence"},
        {"subject_code":"TCS402","subject_name":"Machine Learning"},
        {"subject_code":"TCS403","subject_name":"Cloud Computing"},
        {"subject_code":"TCS404","subject_name":"Major Project / Dissertation I"},
        {"subject_code":"TCS405","subject_name":"Information Security"},
        {"subject_code":"TCS406","subject_name":"Elective (e.g., Advanced Databases)"}
      ]
    },
    "B.Tech in Electronics and Communication Engineering": {
      "1": [
        {"subject_code":"TPH101","subject_name":"Engineering Physics"},
        {"subject_code":"TCS101","subject_name":"Fundamentals of Computer & Intro to Programming"},
        {"subject_code":"TMA101","subject_name":"Engineering Mathematics-I"},
        {"subject_code":"TCH101","subject_name":"Engineering Chemistry"},
        {"subject_code":"THU101","subject_name":"Professional Communication"}
      ],
      "3": [
        {"subject_code":"TEC201","subject_name":"Circuit Theory"},
        {"subject_code":"TEC202","subject_name":"Signals and Systems"},
        {"subject_code":"TEC203","subject_name":"Electronic Devices and Circuits"},
        {"subject_code":"TEC204","subject_name":"Digital Electronics"},
        {"subject_code":"TEC205","subject_name":"Electromagnetics"}
      ],
      "5": [
        {"subject_code":"TEC301","subject_name":"Analog Communication"},
        {"subject_code":"TEC302","subject_name":"Microprocessors and Microcontrollers"},
        {"subject_code":"TEC303","subject_name":"Control Systems"},
        {"subject_code":"TEC304","subject_name":"Digital Signal Processing"},
        {"subject_code":"TEC305","subject_name":"VLSI Design"}
      ],
      "7": [
        {"subject_code":"TEC401","subject_name":"Advanced VLSI / Drone Systems (depending on specialization)"},
        {"subject_code":"TEC402","subject_name":"Wireless Communication"},
        {"subject_code":"TEC403","subject_name":"Embedded System Design"},
        {"subject_code":"TEC404","subject_name":"Major Project / Dissertation I"},
        {"subject_code":"TEC405","subject_name":"Elective - IoT Systems"}
      ]
    },
    "B.Tech Mechanical Engineering": {
      "1": [
        {"subject_code":"TME101","subject_name":"Engineering Mechanics"},
        {"subject_code":"TMA101","subject_name":"Engineering Mathematics-I"},
        {"subject_code":"TCS101","subject_name":"Fundamentals of Computer & Intro to Programming"},
        {"subject_code":"TCH101","subject_name":"Engineering Chemistry"},
        {"subject_code":"THU101","subject_name":"Professional Communication"}
      ],
      "3": [
        {"subject_code":"TME201","subject_name":"Strength of Materials"},
        {"subject_code":"TME202","subject_name":"Thermodynamics I"},
        {"subject_code":"TME203","subject_name":"Manufacturing Processes I"},
        {"subject_code":"TME204","subject_name":"Kinematics of Machines"}
      ],
      "5": [
        {"subject_code":"TME301","subject_name":"Machine Design"},
        {"subject_code":"TME302","subject_name":"Heat Transfer"},
        {"subject_code":"TME303","subject_name":"Manufacturing Technology II"},
        {"subject_code":"TME304","subject_name":"Fluid Mechanics"}
      ],
      "7": [
        {"subject_code":"TME401","subject_name":"Automobile Engineering / Electric Vehicle Systems"},
        {"subject_code":"TME402","subject_name":"Mechatronics / Robotics (spec. dependent)"},
        {"subject_code":"TME403","subject_name":"Major Project / Dissertation I"},
        {"subject_code":"TME404","subject_name":"Advanced Manufacturing"}
      ]
    },
    "B.Tech in Civil Engineering": {
      "1": [
        {"subject_code":"TCE101","subject_name":"Engineering Graphics & Drawing"},
        {"subject_code":"TMA101","subject_name":"Engineering Mathematics-I"},
        {"subject_code":"TCH101","subject_name":"Engineering Chemistry"},
        {"subject_code":"THU101","subject_name":"Professional Communication"},
        {"subject_code":"TCS101","subject_name":"Fundamentals of Computer"}
      ],
      "3": [
        {"subject_code":"TCE201","subject_name":"Surveying I"},
        {"subject_code":"TCE202","subject_name":"Strength of Materials"},
        {"subject_code":"TCE203","subject_name":"Concrete Technology"},
        {"subject_code":"TCE204","subject_name":"Fluid Mechanics"}
      ],
      "5": [
        {"subject_code":"TCE301","subject_name":"Structural Analysis"},
        {"subject_code":"TCE302","subject_name":"Geotechnical Engineering"},
        {"subject_code":"TCE303","subject_name":"Environmental Engineering"},
        {"subject_code":"TCE304","subject_name":"Transportation Engineering"}
      ],
      "7": [
        {"subject_code":"TCE401","subject_name":"Advanced Structural Design"},
        {"subject_code":"TCE402","subject_name":"Water Resources Engineering"},
        {"subject_code":"TCE403","subject_name":"Major Project / Dissertation I"},
        {"subject_code":"TCE404","subject_name":"Elective - Geoinformatics"}
      ]
    },
    "B.Pharm": {
      "1": [
        {"subject_code":"PHR101","subject_name":"Human Anatomy & Physiology I"},
        {"subject_code":"PHR102","subject_name":"Pharmaceutics I"},
        {"subject_code":"PHR103","subject_name":"Pharmaceutical Chemistry I"},
        {"subject_code":"PHR104","subject_name":"Biochemistry I"},
        {"subject_code":"PHR105","subject_name":"Communication Skills"}
      ],
      "3": [
        {"subject_code":"PHR201","subject_name":"Pharmaceutics II"},
        {"subject_code":"PHR202","subject_name":"Pharmaceutical Analysis I"},
        {"subject_code":"PHR203","subject_name":"Medicinal Chemistry I"},
        {"subject_code":"PHR204","subject_name":"Pharmacology I"}
      ],
      "5": [
        {"subject_code":"PHR301","subject_name":"Pharmacognosy & Phytochemistry"},
        {"subject_code":"PHR302","subject_name":"Pharmaceutical Technology"},
        {"subject_code":"PHR303","subject_name":"Pharmacology II"},
        {"subject_code":"PHR304","subject_name":"Clinical Pharmacy"}
      ],
      "7": [
        {"subject_code":"PHR401","subject_name":"Pharmaceutical Regulatory Affairs"},
        {"subject_code":"PHR402","subject_name":"Research Methodology and Project"},
        {"subject_code":"PHR403","subject_name":"Industrial Pharmacy"}
      ]
    },
    "B.Sc. Nursing": {
      "1": [
        {"subject_code":"NSG101","subject_name":"Fundamentals of Nursing"},
        {"subject_code":"NSG102","subject_name":"Anatomy & Physiology I"},
        {"subject_code":"NSG103","subject_name":"Biochemistry Essentials"},
        {"subject_code":"NSG104","subject_name":"Introduction to Psychology"},
        {"subject_code":"NSG105","subject_name":"English & Communication"}
      ],
      "3": [
        {"subject_code":"NSG201","subject_name":"Medical-Surgical Nursing I"},
        {"subject_code":"NSG202","subject_name":"Community Health Nursing I"},
        {"subject_code":"NSG203","subject_name":"Pharmacology for Nurses"},
        {"subject_code":"NSG204","subject_name":"Mental Health Nursing"}
      ],
      "5": [
        {"subject_code":"NSG301","subject_name":"Obstetrics & Gynaecology Nursing"},
        {"subject_code":"NSG302","subject_name":"Pediatric Nursing"},
        {"subject_code":"NSG303","subject_name":"Community Health Nursing II"},
        {"subject_code":"NSG304","subject_name":"Nurse Education & Ethics"}
      ],
      "7": [
        {"subject_code":"NSG401","subject_name":"Advanced Clinical Nursing Practice"},
        {"subject_code":"NSG402","subject_name":"Research & Statistics in Nursing"},
        {"subject_code":"NSG403","subject_name":"Nursing Administration and Management"}
      ]
    },
    "BBA": {
      "1": [
        {"subject_code":"BBA101","subject_name":"Principles of Management"},
        {"subject_code":"BBA102","subject_name":"Business Communication"},
        {"subject_code":"BBA103","subject_name":"Financial Accounting"},
        {"subject_code":"BBA104","subject_name":"Business Economics"},
        {"subject_code":"BBA105","subject_name":"Principles of Marketing"}
      ],
      "3": [
        {"subject_code":"BBA201","subject_name":"Human Resource Management"},
        {"subject_code":"BBA202","subject_name":"Managerial Accounting"},
        {"subject_code":"BBA203","subject_name":"Operations Management"},
        {"subject_code":"BBA204","subject_name":"Business Law"},
        {"subject_code":"BBA205","subject_name":"Organizational Behavior"}
      ]
    },
    "BCA": {
      "1": [
        {"subject_code":"TBC101","subject_name":"Computational Thinking & IT"},
        {"subject_code":"TBC102","subject_name":"Foundations of Programming (C)"},
        {"subject_code":"TBC103","subject_name":"Mathematics for Computer Science"},
        {"subject_code":"TBC104","subject_name":"Professional Communication"}
      ],
      "3": [
        {"subject_code":"TBC201","subject_name":"Data Structures"},
        {"subject_code":"TBC202","subject_name":"Database Management Systems"},
        {"subject_code":"TBC203","subject_name":"Digital Logic Design"},
        {"subject_code":"TBC204","subject_name":"Web Technologies"}
      ],
      "5": [
        {"subject_code":"TBC301","subject_name":"Object Oriented Programming (Java)"},
        {"subject_code":"TBC302","subject_name":"Machine Learning Fundamentals"},
        {"subject_code":"TBC303","subject_name":"Software Engineering"},
        {"subject_code":"TBC304","subject_name":"Computer Networks"}
      ]
    },
    "BCA (Hons.) with AI and DS": {
      "1": [
        {"subject_code":"BAC101","subject_name":"Foundations of Data Science"},
        {"subject_code":"BAC102","subject_name":"Programming for Data Science (Python)"},
        {"subject_code":"BAC103","subject_name":"Calculus & Linear Algebra"},
        {"subject_code":"BAC104","subject_name":"Professional Communication"}
      ],
      "3": [
        {"subject_code":"BAC201","subject_name":"Statistics for Data Science"},
        {"subject_code":"BAC202","subject_name":"Data Structures & Algorithms"},
        {"subject_code":"BAC203","subject_name":"Database Technologies"},
        {"subject_code":"BAC204","subject_name":"AI Foundations"}
      ],
      "5": [
        {"subject_code":"BAC301","subject_name":"Machine Learning"},
        {"subject_code":"BAC302","subject_name":"Big Data Analytics"},
        {"subject_code":"BAC303","subject_name":"Data Visualization"},
        {"subject_code":"BAC304","subject_name":"Applied Deep Learning"}
      ]
    },
    "B.Com. (Hons)": {
      "1": [
        {"subject_code":"BCH101","subject_name":"Principles of Management"},
        {"subject_code":"BCH102","subject_name":"Financial Accounting"},
        {"subject_code":"BCH103","subject_name":"Micro Economics"},
        {"subject_code":"BCH104","subject_name":"Business Communication"},
        {"subject_code":"BCH105","subject_name":"Fundamentals of Computer"},
        {"subject_code":"BCH106","subject_name":"Business Mathematics"}
      ],
      "3": [
        {"subject_code":"BCH201","subject_name":"Corporate Accounting"},
        {"subject_code":"BCH202","subject_name":"Business Law"},
        {"subject_code":"BCH203","subject_name":"Cost Accounting"},
        {"subject_code":"BCH204","subject_name":"Income Tax Law & Practice"},
        {"subject_code":"BCH205","subject_name":"Management Accounting"}
      ],
      "5": [
        {"subject_code":"BCH301","subject_name":"Auditing and Assurance"},
        {"subject_code":"BCH302","subject_name":"Financial Management"},
        {"subject_code":"BCH303","subject_name":"Investment Analysis & Portfolio Management"},
        {"subject_code":"BCH304","subject_name":"International Business"},
        {"subject_code":"BCH305","subject_name":"Goods and Services Tax (GST) Practice"}
      ]
    },
    "MCA": {
      "1": [
        {"subject_code":"MCA101","subject_name":"Advanced Programming (Python/Java)"},
        {"subject_code":"MCA102","subject_name":"Discrete Mathematics & Graph Theory"},
        {"subject_code":"MCA103","subject_name":"Database Systems"},
        {"subject_code":"MCA104","subject_name":"Computer Networks"}
      ],
      "3": [
        {"subject_code":"MCA201","subject_name":"Operating Systems"},
        {"subject_code":"MCA202","subject_name":"Software Engineering & Project Management"},
        {"subject_code":"MCA203","subject_name":"Machine Learning"},
        {"subject_code":"MCA204","subject_name":"Web & Cloud Technologies"}
      ]
    },
    "MCA in AI and DS": {
      "1": [
        {"subject_code":"MAI101","subject_name":"Foundations of AI & Data Science"},
        {"subject_code":"MAI102","subject_name":"Programming for AI (Python)"},
        {"subject_code":"MAI103","subject_name":"Probability & Statistics"},
        {"subject_code":"MAI104","subject_name":"Data Structures & Algorithms"}
      ],
      "3": [
        {"subject_code":"MAI201","subject_name":"Machine Learning"},
        {"subject_code":"MAI202","subject_name":"Deep Learning"},
        {"subject_code":"MAI203","subject_name":"Big Data Systems"},
        {"subject_code":"MAI204","subject_name":"NLP Fundamentals"}
      ]
    },
    "Master of Business Administration": {
      "1": [
        {"subject_code":"MBA101","subject_name":"Principles of Management"},
        {"subject_code":"MBA102","subject_name":"Managerial Economics"},
        {"subject_code":"MBA103","subject_name":"Organizational Behaviour"},
        {"subject_code":"MBA104","subject_name":"Quantitative Techniques"}
      ],
      "3": [
        {"subject_code":"MBA201","subject_name":"Marketing Management"},
        {"subject_code":"MBA202","subject_name":"Financial Management"},
        {"subject_code":"MBA203","subject_name":"Human Resource Management"},
        {"subject_code":"MBA204","subject_name":"Strategic Management"}
      ]
    },
    "M.Tech CSE (Part Time)": {
      "1": [
        {"subject_code":"MTC101","subject_name":"Advanced Algorithms"},
        {"subject_code":"MTC102","subject_name":"Advanced Database Systems"},
        {"subject_code":"MTC103","subject_name":"Research Methodology"}
      ],
      "3": [
        {"subject_code":"MTC201","subject_name":"Distributed Systems"},
        {"subject_code":"MTC202","subject_name":"Advanced Machine Learning"},
        {"subject_code":"MTC203","subject_name":"Elective (Security / AI)"}
      ]
    },
    "Diploma In Computer Science Engineering": {
      "3": [
        {"subject_code":"DCS201","subject_name":"Data Structures & Algorithms"},
        {"subject_code":"DCS202","subject_name":"Computer Networks Fundamentals"},
        {"subject_code":"DCS203","subject_name":"Database Systems"},
        {"subject_code":"DCS204","subject_name":"Software Engineering Basics"}
      ],
      "5": [
        {"subject_code":"DCS301","subject_name":"Operating Systems"},
        {"subject_code":"DCS302","subject_name":"Web Technologies"},
        {"subject_code":"DCS303","subject_name":"Industrial Training / Project"}
      ]
    },
    "Diploma In Civil Engineering": {
      "3": [
        {"subject_code":"DCE201","subject_name":"Surveying I"},
        {"subject_code":"DCE202","subject_name":"Strength of Materials"},
        {"subject_code":"DCE203","subject_name":"Construction Materials"}
      ],
      "5": [
        {"subject_code":"DCE301","subject_name":"Concrete Technology"},
        {"subject_code":"DCE302","subject_name":"Geotechnical Engineering"},
        {"subject_code":"DCE303","subject_name":"Infrastructure Planning"}
      ]
    },
    "Diploma In Mechanical Engineering": {
      "3": [
        {"subject_code":"DME201","subject_name":"Engineering Mechanics"},
        {"subject_code":"DME202","subject_name":"Machine Drawing"},
        {"subject_code":"DME203","subject_name":"Manufacturing Processes I"}
      ],
      "5": [
        {"subject_code":"DME301","subject_name":"Thermodynamics"},
        {"subject_code":"DME302","subject_name":"Machine Design Basics"},
        {"subject_code":"DME303","subject_name":"Industrial Training / Project"}
      ]
    },
    "Allied Sciences (General)": {
      "1": [
        {"subject_code":"GEN101","subject_name":"Professional Communication"},
        {"subject_code":"ENV101","subject_name":"Environmental Education"},
        {"subject_code":"IKS101","subject_name":"Indian Knowledge System"}
      ]
    }
  };

// Functions to generate mock data
export const generateMockStudents = (studentsPerCourse = 10): Student[] => {
    const students: Student[] = [];
    const year = '25'; // For 2025 batch
    let globalStudentCounter = 0;

    COURSE_CODE_MAPPING.forEach(courseInfo => {
        const courseShortName = courseInfo.name.split(' ')[0].replace('.', '');
        for (let i = 1; i <= studentsPerCourse; i++) {
            const personalId = String(i).padStart(3, '0');
            const rollNo = `${year}${courseInfo.code}${personalId}`;
            const studentName = `${courseShortName}_Student_${personalId}`;

            students.push({
                id: `S${rollNo}`,
                name: studentName,
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

export const generateMockClassrooms = (count = 50): Classroom[] => {
    const classrooms: Classroom[] = [];
    const buildings = ['A', 'B', 'C', 'D', 'E'];
    for (let i = 0; i < count; i++) {
        const rows = [4, 5, 6][i % 3];
        const columns = [4, 5, 6][i % 3];
        const benchCount = rows * columns;
        const benchCapacities = Array(benchCount).fill(0).map(() => (Math.random() > 0.8 ? 3 : 2));

        classrooms.push(
            createClassroom({
                id: `C${String(i + 1).padStart(3, '0')}`,
                roomNo: `${buildings[i % buildings.length]}${101 + i}`,
                building: `Block ${buildings[i % buildings.length]}`,
                rows,
                columns,
                benchCapacities,
                unavailableSlots: [],
                departmentBlock: DEPARTMENTS[i % DEPARTMENTS.length],
            })
        );
    }
    return classrooms;
};


export const generateMockInvigilators = (count = 100): Invigilator[] => {
    const invigilators: Invigilator[] = [];
    for (let i = 0; i < count; i++) {
        invigilators.push({
            id: `I${String(i + 1).padStart(3, '0')}`,
            name: `Invigilator ${i + 1}`,
            department: DEPARTMENTS[i % DEPARTMENTS.length],
            isAvailable: Math.random() > 0.1,
            unavailableSlots: [],
            assignedDuties: [],
        });
    }
    return invigilators;
};

export const generateMockExamSchedule = (): ExamSlot[] => {
    const schedule: ExamSlot[] = [];
    let examIdCounter = 1;
    let dayOffset = 0;

    const courseToDeptMap: Record<string, string> = {};
    Object.entries(COURSES).forEach(([dept, courseList]) => {
        courseList.forEach(courseName => {
            courseToDeptMap[courseName] = dept;
        });
    });

    for (const courseName in SUBJECTS_BY_COURSE) {
        const courseSemesters = SUBJECTS_BY_COURSE[courseName as keyof typeof SUBJECTS_BY_COURSE];
        const department = courseToDeptMap[courseName];
        if (!department) continue;

        for (const semester in courseSemesters) {
            const subjects = courseSemesters[semester as keyof typeof courseSemesters];
            
            for (const subject of subjects) {
                const date = new Date();
                date.setDate(date.getDate() + dayOffset);
                const dateString = date.toISOString().split('T')[0];
                const time = (examIdCounter % 2 === 0) ? '14:00' : '09:30';

                schedule.push({
                    id: `E${String(examIdCounter).padStart(4, '0')}`,
                    date: dateString,
                    time: time,
                    course: courseName,
                    department: department,
                    semester: parseInt(semester, 10),
                    subjectName: subject.subject_name,
                    subjectCode: subject.subject_code,
                    duration: 180,
                    group: Math.random() > 0.8 ? (Math.random() > 0.5 ? 'A' : 'B') : undefined,
                });

                examIdCounter++;
                // Increment day every 10 exams to spread them out
                if (examIdCounter % 10 === 0) {
                    dayOffset++;
                }
            }
        }
    }
    
    // Add common subjects for multiple courses
    const commonSubjects = SUBJECTS_BY_COURSE["Allied Sciences (General)"]["1"];
    const targetCourses = ["B.Tech Computer Science Engineering", "B.Tech in Electronics and Communication Engineering", "B.Tech Mechanical Engineering", "B.Tech in Civil Engineering"];
    
    for (const courseName of targetCourses) {
        const department = courseToDeptMap[courseName];
        if (!department) continue;
        
        for (const subject of commonSubjects) {
             const date = new Date();
             date.setDate(date.getDate() + dayOffset);
             const dateString = date.toISOString().split('T')[0];
             const time = (examIdCounter % 2 === 0) ? '14:00' : '09:30';

             schedule.push({
                    id: `E${String(examIdCounter).padStart(4, '0')}`,
                    date: dateString,
                    time: time,
                    course: courseName,
                    department: department,
                    semester: 1, // Common subjects are usually in 1st sem
                    subjectName: subject.subject_name,
                    subjectCode: subject.subject_code,
                    duration: 120,
                });
            examIdCounter++;
        }
         dayOffset++;
    }


    return schedule;
};


// Initial empty data, to be populated by user or mock data function
export let STUDENTS: Student[] = [];

export let CLASSROOMS: Classroom[] = [];

export let INVIGILATORS: Invigilator[] = [];

export let EXAM_SCHEDULE: ExamSlot[] = [];
