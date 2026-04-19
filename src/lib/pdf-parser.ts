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
        
        // Group items by their vertical position (Y-coordinate) to rebuild rows
        const items = textContent.items as any[];
        const rowsMap = new Map<number, any[]>();
        
        items.forEach(item => {
            // Some items might not have transform if they are not text? 
            // Usually item is TextItem
            if ('transform' in item) {
                const y = Math.round(item.transform[5]); // Y coordinate
                if (!rowsMap.has(y)) rowsMap.set(y, []);
                rowsMap.get(y)!.push(item);
            }
        });

        // Sort rows by Y coordinate (top to bottom) and then sort items in row by X coordinate
        const sortedYs = Array.from(rowsMap.keys()).sort((a, b) => b - a);
        sortedYs.forEach(y => {
            const rowItems = rowsMap.get(y)!.sort((a, b) => a.transform[4] - b.transform[4]);
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
        // Example: B Sc (H) Maths 1 Professional Communication MAEC101
        
        const parts = afterTime.split(/\s+/);
        if (parts.length < 3) return; // Need at least Sem, Subject, Code

        // Usually the last part is the Code
        const subjectCode = parts[parts.length - 1];
        
        // Find Semester (Usually a small number like 1, 3, 5)
        let semIdx = parts.findIndex(p => p.match(/^\d+$/));
        if (semIdx === -1) {
            // If sem is missing or merged, default to 1
            semIdx = 0; 
        }

        const semester = parseInt(parts[semIdx]) || 1;
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

        exams.push({
            id: `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            date: formattedDate,
            time: time,
            subjectCode: subjectCode,
            subjectName: subjectName,
            course: course,
            department: 'Imported', 
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
