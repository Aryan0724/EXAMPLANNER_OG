import * as XLSX from 'xlsx';
import { ExamSlot } from './types';
import { canonicalizeCourse, isCourseMatch } from './course-utils';
import { OFFICIAL_STUDENT_BATCH_SPECS } from './data';

/**
 * Maps canonical or raw course name to its standard department.
 */
export function getDefaultDepartmentForCourse(courseName: string): string {
  const canon = canonicalizeCourse(courseName);
  const matchedBatch = OFFICIAL_STUDENT_BATCH_SPECS.find(b => isCourseMatch(b.course, canon));
  if (matchedBatch) return matchedBatch.department;

  const lower = canon.toLowerCase();
  if (lower.includes('nursing')) return 'College of Nursing';
  if (lower.includes('pharm')) return 'College of Pharmacy';
  if (lower.includes('cse') || lower.includes('computer science')) return 'Computer Science and Engineering';
  if (lower.includes('ece') || lower.includes('electronics')) return 'Electronics and Communication Engineering';
  if (lower.includes('me') || lower.includes('mechanical')) return 'Mechanical Engineering';
  if (lower.includes('ce') || lower.includes('civil')) return 'Civil Engineering';
  if (lower.includes('bba') || lower.includes('management') || lower.includes('mba')) return 'School of Management';
  if (lower.includes('bca') || lower.includes('mca')) return 'Computer Applications';
  if (lower.includes('b.com') || lower.includes('commerce')) return 'Commerce';

  return 'Academic Department';
}

/**
 * Maps canonical course name to default semester.
 */
export function getDefaultSemesterForCourse(courseName: string): number {
  const canon = canonicalizeCourse(courseName);
  const matchedBatch = OFFICIAL_STUDENT_BATCH_SPECS.find(b => isCourseMatch(b.course, canon));
  if (matchedBatch) return matchedBatch.semester;
  return 3;
}

/**
 * Roman numerals to integer.
 */
export function romanToNumber(roman: string | number): number {
  if (typeof roman === 'number') return roman;
  const str = String(roman).toUpperCase().trim();
  const map: Record<string, number> = {
    'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5,
    'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10
  };
  if (map[str]) return map[str];
  const parsed = parseInt(str.replace(/\D/g, ''), 10);
  return isNaN(parsed) || parsed <= 0 ? 3 : parsed;
}

/**
 * Parses dates from various formats (Excel serial number, DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, textual).
 * Outputs YYYY-MM-DD.
 */
export function parseFlexibleDate(val: any): string {
  if (!val) return '';

  // 1. Excel serial number (e.g. 46156)
  if (typeof val === 'number') {
    const epoch = new Date((val - 25569) * 86400 * 1000);
    if (!isNaN(epoch.getTime())) {
      return epoch.toISOString().split('T')[0];
    }
  }

  const str = String(val).trim();

  // 2. YYYY-MM-DD or YYYY/MM/DD
  const ymd = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymd) {
    const year = ymd[1];
    const month = ymd[2].padStart(2, '0');
    const day = ymd[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 3. DD-MM-YYYY or DD/MM/YYYY
  const dmy = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }

  // 4. Try native Date parse (e.g. "14 May 2026", "May 14, 2026")
  const parsedDate = new Date(str);
  if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 2000) {
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return str;
}

/**
 * Parses times from various formats (Excel decimal, "09:30 AM", "13:30", "Shift 1").
 * Outputs HH:mm in 24h format.
 */
export function parseFlexibleTime(val: any, defaultShift?: number): { time: string; shift: number } {
  if (val === undefined || val === null || val === '') {
    const shift = defaultShift || 1;
    return { time: shift === 2 ? '13:30' : shift === 3 ? '16:00' : '09:30', shift };
  }

  // 1. Excel time fraction (e.g. 0.3958333 -> 09:30)
  if (typeof val === 'number') {
    const totalSeconds = Math.round(val * 24 * 3600);
    let hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    hours = hours % 24;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    const shift = hours < 12 ? 1 : hours < 15 ? 2 : 3;
    return { time: timeStr, shift };
  }

  const str = String(val).trim();

  // 2. Check for Shift keyword: "Shift 1", "Shift 2", "Shift-1", etc.
  const shiftMatch = str.match(/shift\s*[-:]?\s*(\d)/i);
  let explicitShift = shiftMatch ? parseInt(shiftMatch[1], 10) : defaultShift;

  // 3. Time pattern e.g. "09:30 AM", "1:30 PM", "09:30 - 11:30", "13:30"
  const timeMatch = str.match(/(\d{1,2})[:.](\d{2})\s*([AP]M)?/i);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2];
    const meridiem = timeMatch[3]?.toUpperCase();

    if (meridiem === 'PM' && hour < 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;

    const timeStr = `${String(hour).padStart(2, '0')}:${minute}`;
    const shift = explicitShift || (hour < 12 ? 1 : hour < 15 ? 2 : 3);
    return { time: timeStr, shift };
  }

  // Fallback if only "Shift 1" or "Shift 2" was provided
  if (explicitShift === 2) return { time: '13:30', shift: 2 };
  if (explicitShift === 3) return { time: '16:00', shift: 3 };
  return { time: '09:30', shift: 1 };
}

/**
 * Normalizes an object's keys to lowercase alphanumeric for robust column matching.
 */
function normalizeKeys(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, val] of Object.entries(row)) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    out[cleanKey] = val;
  }
  return out;
}

/**
 * Extracts a value from a row using multiple possible key variants.
 */
function getField(row: Record<string, any>, variants: string[]): any {
  for (const v of variants) {
    const clean = v.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (row[clean] !== undefined && row[clean] !== null && String(row[clean]).trim() !== '') {
      return row[clean];
    }
  }
  return undefined;
}

/**
 * Converts a raw spreadsheet row into an ExamSlot object.
 */
export function rowToExamSlot(rawRow: Record<string, any>, idx: number): ExamSlot | null {
  const row = normalizeKeys(rawRow);

  // Subject / Paper
  const subjectName = getField(row, [
    'subjectname', 'subject', 'papername', 'paper', 'title', 'coursetitle',
    'coursename', 'nameofsubject', 'subjectdescription', 'name'
  ]);

  // Subject Code
  let subjectCode = getField(row, [
    'subjectcode', 'code', 'papercode', 'coursecode', 'subcode'
  ]);

  // Date
  const rawDate = getField(row, [
    'date', 'examdate', 'dateofexam', 'daydate', 'dayanddate', 'slotdate'
  ]);

  if (!rawDate && !subjectName) {
    return null; // Empty or invalid row
  }

  const date = parseFlexibleDate(rawDate);

  // Time & Shift
  const rawTime = getField(row, [
    'time', 'timing', 'slot', 'shifttime', 'timeslot', 'examtime'
  ]);
  const rawShift = getField(row, ['shift', 'shiftno', 'session']);
  const shiftNum = rawShift ? parseInt(String(rawShift).replace(/\D/g, ''), 10) : undefined;
  const { time, shift } = parseFlexibleTime(rawTime, shiftNum);

  // Course / Branch
  const rawCourse = getField(row, [
    'course', 'branch', 'programme', 'program', 'stream', 'degree', 'class'
  ]) || 'B.Tech CSE';
  const course = canonicalizeCourse(String(rawCourse));

  // Department
  let department = getField(row, ['department', 'dept', 'school', 'faculty']);
  if (!department) {
    department = getDefaultDepartmentForCourse(course);
  } else {
    department = String(department).trim();
  }

  // Semester
  const rawSem = getField(row, ['semester', 'sem', 'term']);
  const semester = rawSem ? romanToNumber(rawSem) : getDefaultSemesterForCourse(course);

  // Group
  const rawGroup = getField(row, ['group', 'section', 'sec', 'grp']);
  const group = rawGroup && String(rawGroup).trim().toLowerCase() !== 'all' ? String(rawGroup).trim() : undefined;

  // Fallback for Subject Code if missing
  if (!subjectCode && subjectName) {
    // Generate code from initials e.g. "Engineering Mathematics" -> "EM-101"
    const words = String(subjectName).split(/\s+/).filter(w => w.length > 0);
    const initials = words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
    subjectCode = `${initials}${semester}0${(idx % 9) + 1}`;
  }

  return {
    id: `EX_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
    date,
    time,
    shift,
    duration: 90,
    subjectCode: String(subjectCode || 'EXAM').toUpperCase().trim(),
    subjectName: String(subjectName || 'Exam Paper').trim(),
    course,
    department,
    semester,
    group: group as any,
    type: 'Theory',
    mode: 'Offline',
  };
}

/**
 * Parses an Excel (.xlsx, .xls) or CSV file directly.
 */
export async function parseExamScheduleFile(file: File): Promise<ExamSlot[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('No sheet found in workbook.');

  const worksheet = workbook.Sheets[sheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('The spreadsheet appears to be empty. Please verify headers and rows.');
  }

  const exams: ExamSlot[] = [];
  rawRows.forEach((row, idx) => {
    const slot = rowToExamSlot(row, idx + 1);
    if (slot && slot.date && slot.subjectName) {
      exams.push(slot);
    }
  });

  if (exams.length === 0) {
    throw new Error('No valid exam rows could be recognized. Ensure columns contain Date, Subject/Paper, and Course.');
  }

  return exams;
}

/**
 * Parses pasted text (TSV from Excel, CSV, or Markdown pipe table).
 */
export function parsePastedExamSchedule(text: string): ExamSlot[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Check if first line is headers
  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes('|') ? '|' : ',';

  const cleanRow = (line: string): string[] => {
    let l = line;
    if (delimiter === '|') {
      l = l.replace(/^\|/, '').replace(/\|$/, '');
    }
    return l.split(delimiter).map(c => c.trim());
  };

  const headerTokens = cleanRow(lines[0]);
  const isHeaderRow = headerTokens.some(t => {
    const lower = t.toLowerCase();
    return lower.includes('date') || lower.includes('subject') || lower.includes('course') || lower.includes('code');
  });

  const startIdx = isHeaderRow ? 1 : 0;
  const headers = isHeaderRow
    ? headerTokens
    : ['date', 'time', 'code', 'subject', 'course', 'department', 'semester', 'group'];

  const exams: ExamSlot[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^\|?[-:\s|]+\|?$/)) continue; // Separator row

    const cols = cleanRow(line);
    if (cols.length < 2) continue;

    const rowObj: Record<string, any> = {};
    headers.forEach((h, hIdx) => {
      rowObj[h] = cols[hIdx] !== undefined ? cols[hIdx] : '';
    });

    const slot = rowToExamSlot(rowObj, i);
    if (slot && slot.date && slot.subjectName) {
      exams.push(slot);
    }
  }

  return exams;
}

/**
 * Creates and downloads a sample Excel template populated with representative
 * GEHU Bhimtal courses and exam slots ready for immediate test and 1-click allotment.
 */
export function downloadSampleExamScheduleExcel() {
  const sampleData = [
    {
      Date: '2026-05-14',
      Time: '09:30',
      Shift: 'Shift 1',
      'Subject Code': 'TMA201',
      'Subject Name': 'Engineering Mathematics-II',
      Course: 'B.Tech CSE',
      Department: 'Computer Science and Engineering',
      Semester: 'III',
      Group: 'All'
    },
    {
      Date: '2026-05-14',
      Time: '09:30',
      Shift: 'Shift 1',
      'Subject Code': 'BBA201',
      'Subject Name': 'Organisational Behavior',
      Course: 'BBA',
      Department: 'School of Management',
      Semester: 'III',
      Group: 'All'
    },
    {
      Date: '2026-05-14',
      Time: '09:30',
      Shift: 'Shift 1',
      'Subject Code': 'BCH201',
      'Subject Name': 'Human Resource Management',
      Course: 'B.Com(H)',
      Department: 'Commerce',
      Semester: 'III',
      Group: 'All'
    },
    {
      Date: '2026-05-14',
      Time: '09:30',
      Shift: 'Shift 1',
      'Subject Code': 'NUR101',
      'Subject Name': 'Applied Anatomy & Physiology',
      Course: 'B.Sc (Nursing)',
      Department: 'College of Nursing',
      Semester: 'I',
      Group: 'All'
    },
    {
      Date: '2026-05-14',
      Time: '09:30',
      Shift: 'Shift 1',
      'Subject Code': 'BP301T',
      'Subject Name': 'Pharmaceutical Organic Chemistry-II',
      Course: 'B.Pharma',
      Department: 'College of Pharmacy',
      Semester: 'III',
      Group: 'All'
    },
    {
      Date: '2026-05-14',
      Time: '09:30',
      Shift: 'Shift 1',
      'Subject Code': 'TBD201',
      'Subject Name': 'Foundations of AI & Data Science',
      Course: 'BCA(Hons.) with AI&DS',
      Department: 'Computer Applications',
      Semester: 'III',
      Group: 'All'
    },
    {
      Date: '2026-05-14',
      Time: '09:30',
      Shift: 'Shift 1',
      'Subject Code': 'BCA201',
      'Subject Name': 'Data Structures & Algorithms',
      Course: 'BCA',
      Department: 'Computer Applications',
      Semester: 'III',
      Group: 'All'
    },
    {
      Date: '2026-05-14',
      Time: '13:30',
      Shift: 'Shift 2',
      'Subject Code': 'TCS302',
      'Subject Name': 'Computer Organization & Architecture',
      Course: 'B.Tech CSE',
      Department: 'Computer Science and Engineering',
      Semester: 'III',
      Group: 'All'
    },
    {
      Date: '2026-05-14',
      Time: '13:30',
      Shift: 'Shift 2',
      'Subject Code': 'BBA202',
      'Subject Name': 'Marketing Management',
      Course: 'BBA',
      Department: 'School of Management',
      Semester: 'III',
      Group: 'All'
    },
    {
      Date: '2026-05-15',
      Time: '09:30',
      Shift: 'Shift 1',
      'Subject Code': 'TCS303',
      'Subject Name': 'Discrete Mathematical Structures',
      Course: 'B.Tech CSE',
      Department: 'Computer Science and Engineering',
      Semester: 'III',
      Group: 'All'
    },
    {
      Date: '2026-05-15',
      Time: '09:30',
      Shift: 'Shift 1',
      'Subject Code': 'NUR102',
      'Subject Name': 'Applied Sociology & Psychology',
      Course: 'B.Sc (Nursing)',
      Department: 'College of Nursing',
      Semester: 'I',
      Group: 'All'
    }
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths
  ws['!cols'] = [
    { wch: 14 }, // Date
    { wch: 10 }, // Time
    { wch: 10 }, // Shift
    { wch: 16 }, // Subject Code
    { wch: 38 }, // Subject Name
    { wch: 24 }, // Course
    { wch: 34 }, // Department
    { wch: 12 }, // Semester
    { wch: 10 }  // Group
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Exam Schedule');
  XLSX.writeFile(wb, 'GEHU_Exam_Schedule_Template.xlsx');
}
