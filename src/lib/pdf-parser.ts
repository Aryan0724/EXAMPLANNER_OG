import * as pdfjsLib from 'pdfjs-dist';
import { ExamSlot } from './types';

// Use a stable CDN for the worker to avoid build/configuration issues in Next.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;

export async function parseExamPDF(file: File): Promise<ExamSlot[]> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let allTextRows: string[] = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        const items = (textContent.items as any[]).filter(it => 'transform' in it);
        
        // Group items by vertical position with a 4px tolerance to prevent split lines
        const rows: { y: number; items: any[] }[] = [];
        items.sort((a, b) => b.transform[5] - a.transform[5]);

        items.forEach(it => {
            const y = it.transform[5];
            const existingRow = rows.find(r => Math.abs(r.y - y) <= 4);
            if (existingRow) {
                existingRow.items.push(it);
            } else {
                rows.push({ y, items: [it] });
            }
        });

        // Sort rows top-to-bottom and items left-to-right
        rows.sort((a, b) => b.y - a.y);
        rows.forEach(r => {
            const rowItems = r.items.sort((a, b) => a.transform[4] - b.transform[4]);
            const rowText = rowItems.map(item => item.str).join(' ').trim();
            
            // Skip headers and noise
            const lowerRow = rowText.toLowerCase();
            const isHeader = lowerRow.includes('date') && lowerRow.includes('subject') && lowerRow.includes('time');
            const isTitle = lowerRow.includes('examination') || lowerRow.includes('schedule') || lowerRow.includes('university');

            if (rowText && rowText.length > 5 && !isHeader && !isTitle) {
                allTextRows.push(rowText);
            }
        });
    }

    const exams: ExamSlot[] = [];
    const romanMap: Record<string, number> = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10 };
    
    // Pattern Discovery from University PDF:
    // Date (DD-MM-YYYY) | Day | Time (HH:MM AM - HH:MM PM) | Course | Sem | Subject Name | Code
    
    const dateRegex = /(\d{2}-\d{2}-\d{4})/;
    const timeRegex = /(\d{1,2}:\d{2}\s*[AP]M\s*-\s*\d{1,2}:\d{2}\s*[AP]M)/i;

    allTextRows.forEach((row) => {
        const dateMatch = row.match(dateRegex);
        if (!dateMatch) return;

        const dateStr = dateMatch[1];
        const timeMatch = row.match(timeRegex);
        if (!timeMatch) return;
        const timeStr = timeMatch[1];

        const timeIdx = row.indexOf(timeStr);
        const afterTime = row.substring(timeIdx + timeStr.length).trim();
        
        // Handle rows that might have merged text
        // Remaining format: Course | Sem | Subject Name | Code
        const parts = afterTime.split(/\s+/);
        if (parts.length < 3) return; // Need at least Sem, Subject, Code

        // Usually the last part is the Code
        const subjectCode = parts[parts.length - 1];
        
        // Find Semester (numeric or Roman numeral)
        let semIdx = parts.findIndex(p => p.match(/^(\d+|I|II|III|IV|V|VI|VII|VIII|IX|X)$/i));
        if (semIdx === -1) {
            semIdx = 0; 
        }

        const semRaw = parts[semIdx].toUpperCase();
        const semester = romanMap[semRaw] || parseInt(parts[semIdx]) || 1;
        const course = parts.slice(0, semIdx).join(' ') || "Imported Course";
        const subjectName = parts.slice(semIdx + 1, parts.length - 1).join(' ') || "Imported Subject";

        // Parse date for the app (YYYY-MM-DD)
        const [d, m, y] = dateStr.split('-');
        const formattedDate = `${y}-${m}-${d}`;

        // Parse start time (e.g., 01:30 PM)
        const startTimeMatch = timeStr.match(/(\d{1,2}:\d{2})\s*([AP]M)/i);
        let time = '09:30';
        if (startTimeMatch) {
            let hh = parseInt(startTimeMatch[1].split(':')[0]);
            const mm = startTimeMatch[1].split(':')[1];
            const mer = startTimeMatch[2].toUpperCase();
            if (mer === 'PM' && hh < 12) hh += 12;
            if (mer === 'AM' && hh === 12) hh = 0;
            time = `${hh.toString().padStart(2, '0')}:${mm}`;
        }

        // Determine duration
        let duration = 90;
        const timeParts = timeStr.split(/\s*-\s*/);
        if (timeParts.length === 2) {
            const start = parseTimeToMinutes(timeParts[0]);
            const end = parseTimeToMinutes(timeParts[1]);
            if (start > 0 && end > start) {
                duration = end - start;
            }
        }

        // For Department, if it's not in the PDF (which it usually isn't), 
        // it's better to use the Course name or a derivation of it 
        // to keep batches distinct and meaningful.
        let department = 'Imported';
        if (course && course !== "Imported Course") {
            // Simplified derivation: use the first word or the full course name
            // This is better than a generic "Imported" for allotment grouping.
            department = course.split('(')[0].trim();
        }

        exams.push({
            id: `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            date: formattedDate,
            time: time,
            subjectCode: subjectCode,
            subjectName: subjectName,
            course: course,
            department: department, 
            semester: semester,
            duration: duration,
            type: 'Theory',
            mode: 'Offline'
        });
    });

    return exams;
}

function parseTimeToMinutes(timeStr: string): number {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
    if (!match) return 0;
    let hh = parseInt(match[1]);
    const mm = parseInt(match[2]);
    const mer = match[3].toUpperCase();
    if (mer === 'PM' && hh < 12) hh += 12;
    if (mer === 'AM' && hh === 12) hh = 0;
    return hh * 60 + mm;
}
