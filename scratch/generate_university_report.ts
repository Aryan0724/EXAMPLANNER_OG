
import { generateMockInvigilators } from '../src/lib/data';
import { Invigilator } from '../src/lib/types';
import * as fs from 'fs';

// Requirements from the image (Yellow Highlights)
const REQUIREMENTS: Record<string, Record<string, number>> = {
    "2026-05-14": { "09:30": 4, "09:31": 49, "13:30": 49 },
    "2026-05-15": { "09:30": 4, "09:31": 47, "13:30": 51 },
    "2026-05-16": { "09:30": 4, "09:31": 49, "13:30": 45 },
    "2026-05-18": { "09:30": 4, "09:31": 47, "13:30": 47 },
    "2026-05-19": { "09:30": 4, "09:31": 51, "13:30": 47 },
    "2026-05-20": { "09:31": 47, "13:30": 49 },
    "2026-05-21": { "09:31": 49, "13:30": 15 },
    "2026-05-22": { "09:31": 47, "13:30": 53 },
    "2026-05-23": { "09:31": 49, "13:30": 24 },
    "2026-05-25": { "09:31": 40, "13:30": 37 },
    "2026-05-26": { "09:31": 29, "13:30": 3 },
    "2026-05-28": { "09:31": 4, "13:30": 17 },
    "2026-05-29": { "09:31": 11, "13:30": 10 },
    "2026-05-30": { "09:31": 3, "13:30": 8 },
};

const SHIFT_MAP: Record<string, string> = {
    "09:30": "Shift I (Mid)",
    "09:31": "Shift I",
    "13:30": "Shift II"
};

function generateUniversityReport() {
    console.log("Generating University Format Invigilator Duty Report...");

    // Get the full list of faculty (including real ones)
    const facultyList = generateMockInvigilators(122); 
    facultyList.forEach(f => f.assignedDuties = []);

    const fullAllotment: any = {};
    const dates = Object.keys(REQUIREMENTS).sort();

    dates.forEach(date => {
        const slots = REQUIREMENTS[date];
        const slotTimes = Object.keys(slots).sort();

        slotTimes.forEach(time => {
            const required = slots[time];
            const sessionKey = `${date} ${time}`;
            
            // Selection Logic: Pick faculty with least duties
            facultyList.sort((a, b) => (a.assignedDuties?.length || 0) - (b.assignedDuties?.length || 0));
            
            const assignments: any[] = [];
            for (let i = 0; i < required; i++) {
                if (i >= facultyList.length) {
                    console.warn(`Short on faculty for session ${sessionKey}. Needed ${required}, but only have ${facultyList.length} total.`);
                    break;
                }
                
                const inv = facultyList[i];
                assignments.push({
                    invigilator: inv,
                    classroom: { roomNo: 'Assigned' },
                    isReserved: false
                });
                
                if (!inv.assignedDuties) inv.assignedDuties = [];
                inv.assignedDuties.push({ date, count: 1 });
            }

            fullAllotment[sessionKey] = { invigilatorAssignments: assignments };
        });
    });

    // Generate Markdown Report
    let md = "# GEHU Bhimtal Invigilator Duty Report (University Format)\n\n";
    md += "Examination Center: Graphic Era Hill University, Bhimtal Campus\n";
    md += "Semester: Even Semester May 2026\n\n";

    md += "## Faculty Duty Summary\n";
    md += "| Sr. No. | Name | Department | Total Duties | Dates |\n";
    md += "| :--- | :--- | :--- | :--- | :--- |\n";

    facultyList.sort((a, b) => a.name.localeCompare(b.name)).forEach((f, idx) => {
        const dutyDates = f.assignedDuties?.map(d => d.date).join(', ') || 'None';
        md += `| ${idx + 1} | ${f.name} | ${f.department} | ${f.assignedDuties?.length || 0} | ${dutyDates} |\n`;
    });

    md += "\n## Detailed Shift-wise Allotment\n";
    dates.forEach(date => {
        md += `### Date: ${date}\n`;
        const slots = REQUIREMENTS[date];
        Object.keys(slots).forEach(time => {
            const shiftLabel = SHIFT_MAP[time];
            const asgs = fullAllotment[`${date} ${time}`].invigilatorAssignments;
            md += `#### ${shiftLabel} (${time})\n`;
            md += `**Total Required: ${slots[time]} | Total Assigned: ${asgs.length}**\n\n`;
            md += "Invigilators: " + asgs.map((a: any) => a.invigilator.name).join(', ') + "\n\n";
        });
        md += "---\n";
    });

    fs.writeFileSync('bhimtal_university_report.md', md);
    console.log("Report generated: bhimtal_university_report.md");
}

generateUniversityReport();
