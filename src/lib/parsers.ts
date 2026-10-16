import { ExamSlot } from './types';
import { canonicalizeCourse } from './course-utils';

export const parsePasteSchedule = (text: string): ExamSlot[] => {
    const lines = text.split('\n');
    const exams: ExamSlot[] = [];

    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        // Skip separator lines
        if (trimmedLine.match(/^\|?\s*[-]+\s*\|/)) return;
        // Skip header line
        if (trimmedLine.toLowerCase().includes('date') && trimmedLine.toLowerCase().includes('shift') && trimmedLine.toLowerCase().includes('subject')) return;

        let columns: string[] = [];
        if (trimmedLine.includes('\t')) {
            columns = trimmedLine.split('\t').map(c => c.trim());
        } else if (trimmedLine.includes('|')) {
            const content = trimmedLine.replace(/^\|/, '').replace(/\|$/, '');
            columns = content.split('|').map(c => c.trim());
        } else if (trimmedLine.includes(',')) {
            columns = trimmedLine.split(',').map(c => c.trim());
        }

        if (columns.length < 4) return;

        // Standard Columns: 0: Date, 1: Shift, 2: Code, 3: Subject Name
        // Optional Columns: 4: Course, 5: Dept, 6: Sem
        const dateStr = columns[0];
        const shiftStr = columns[1];
        const subjectCode = columns[2];
        const subjectName = columns[3];
        const rawCourse = columns[4] || 'B.Tech CSE';
        const course = canonicalizeCourse(rawCourse);
        const department = columns[5] || 'Computer Science and Engineering';
        const semStr = columns[6] || '3';

        // Parse Date
        let formattedDate = '';
        const dateParts = dateStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        if (dateParts) {
            formattedDate = `${dateParts[3]}-${dateParts[2].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
        } else {
            formattedDate = dateStr;
        }

        // Parse Time
        const timeMatch = shiftStr.match(/(\d{1,2}:\d{2})\s*([AP]M)?/i);
        let time = '09:30';
        if (timeMatch) {
            let hour = parseInt(timeMatch[1].split(':')[0]);
            const minute = timeMatch[1].split(':')[1];
            const meridiem = timeMatch[2]?.toUpperCase();
            if (meridiem === 'PM' && hour < 12) hour += 12;
            if (meridiem === 'AM' && hour === 12) hour = 0;
            time = `${hour.toString().padStart(2, '0')}:${minute}`;
        }

        if (formattedDate && subjectCode && subjectName) {
            exams.push({
                id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                date: formattedDate,
                time: time,
                subjectCode: subjectCode,
                subjectName: subjectName,
                course: course,
                department: department,
                semester: romanToNum(semStr),
                duration: 90,
                type: 'Theory',
                mode: 'Offline',
                group: undefined
            });
        }
    });

    return exams;
};

export interface StudentBatchInput {
    course: string;
    department: string;
    semester: number;
    count: number;
}

const romanToNum = (roman: string): number => {
    const r = roman.toUpperCase().trim();
    if (r === 'I') return 1;
    if (r === 'II') return 2;
    if (r === 'III') return 3;
    if (r === 'IV') return 4;
    if (r === 'V') return 5;
    if (r === 'VI') return 6;
    if (r === 'VII') return 7;
    if (r === 'VIII') return 8;
    return parseInt(r) || 1;
};

export const parsePasteBatches = (text: string): StudentBatchInput[] => {
    const lines = text.split('\n');
    const batches: StudentBatchInput[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        // Skip empty lines, separator lines, and header lines
        if (!trimmed || trimmed.match(/^\|?\s*[-]+\s*\|/) || (trimmed.toLowerCase().includes('course') && (trimmed.toLowerCase().includes('count') || trimmed.toLowerCase().includes('total')))) continue;

        // 1. Check for Key-Value format: "B.Tech CSE Sem 3: 120" or "BTech Sem 1 = 150"
        const kvMatch = trimmed.match(/^([^:=]+?)(?:\s*[-–]\s*|\s+)?(?:sem(?:ester)?\s*([0-9ivx]+))?\s*[:=]\s*(\d+)/i);
        if (kvMatch) {
            const courseRaw = kvMatch[1].trim();
            const semRaw = kvMatch[2] || '1';
            const count = parseInt(kvMatch[3]);
            if (count > 0) {
                batches.push({
                    course: courseRaw,
                    department: courseRaw.split('(')[0].trim(),
                    semester: romanToNum(semRaw),
                    count
                });
                continue;
            }
        }

        // 2. Delimited formats: Pipe, Tab, or Comma
        let cols: string[] = [];
        if (trimmed.includes('|')) {
            const content = trimmed.replace(/^\|/, '').replace(/\|$/, '');
            cols = content.split('|').map(c => c.trim());
        } else if (trimmed.includes('\t')) {
            cols = trimmed.split('\t').map(c => c.trim());
        } else if (trimmed.includes(',')) {
            cols = trimmed.split(',').map(c => c.trim());
        }

        if (cols.length >= 3) {
            // Can be: [Course, Dept, Sem, Count] OR [Course, Sem, Count]
            let course = cols[0];
            let department = course.split('(')[0].trim();
            let semester = 1;
            let count = 0;

            if (cols.length >= 4) {
                department = cols[1].replace(/^department of /i, '').trim();
                semester = romanToNum(cols[2]);
                count = parseInt(cols[3].replace(/\D/g, '')) || 0;
            } else {
                semester = romanToNum(cols[1]);
                count = parseInt(cols[2].replace(/\D/g, '')) || 0;
            }

            if (course && count > 0) {
                batches.push({
                    course,
                    department,
                    semester,
                    count
                });
            }
        }
    }

    return batches;
};
