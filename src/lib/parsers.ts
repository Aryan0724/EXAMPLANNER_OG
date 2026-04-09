import { ExamSlot } from './types';

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

        const content = trimmedLine.replace(/^\|/, '').replace(/\|$/, '');
        const columns = content.split('|').map(c => c.trim());

        if (columns.length < 4) return;

        // Standard Columns: 0: Date, 1: Shift, 2: Code, 3: Subject Name
        // Optional Columns: 4: Course, 5: Dept, 6: Sem
        const dateStr = columns[0];
        const shiftStr = columns[1];
        const subjectCode = columns[2];
        const subjectName = columns[3];
        const course = columns[4] || 'Imported';
        const department = columns[5] || 'Imported';
        const semStr = columns[6] || '1';

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
        if (!trimmed || trimmed.match(/^\|?\s*[-]+\s*\|/) || (trimmed.toLowerCase().includes('course') && trimmed.toLowerCase().includes('total'))) continue;

        // Remove outer pipes if present and split
        const content = trimmed.replace(/^\|/, '').replace(/\|$/, '');
        const cols = content.split('|').map(c => c.trim());

        if (cols.length >= 4) {
            // Expected: | Course | Dept/Department | Sem | Count/Total Students |
            // Example: | B.Com (H) | Department of Commerce | II | 58 |
            const course = cols[0];
            let department = cols[1];

            // Clean up department name (remove "Department of ")
            if (department.toLowerCase().startsWith('department of ')) {
                department = department.substring(14).trim();
            }

            const semester = romanToNum(cols[2]);
            const count = parseInt(cols[3].replace(/\D/g, '')) || 0;

            if (course && department && count > 0) {
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
