
import * as fs from 'fs';

function convertCsvToMarkdown() {
    const csvContent = fs.readFileSync('exam_schedule.csv', 'utf8');
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');

    // | Date | Shift | Code | Subject | Course | Dept | Sem |
    let output = "| Date | Shift | Code | Subject | Course | Dept | Sem |\n";
    output += "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n";

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        // Handle CSV with potential quotes
        const row = parseCsvLine(lines[i]);
        if (row.length < 8) continue;

        const date = row[1];
        const time = row[2];
        const course = row[3];
        const dept = row[4];
        const sem = row[5];
        const subject = row[6];
        const code = row[7];

        const shift = time === '09:30' ? 'Shift I' : (time === '13:30' ? 'Shift II' : time);

        output += `| ${date} | ${shift} | ${code} | ${subject} | ${course} | ${dept} | ${sem} |\n`;
    }

    fs.writeFileSync('exam_schedule_markdown.txt', output);
    console.log("Conversion complete: exam_schedule_markdown.txt");
}

function parseCsvLine(line: string) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
            inQuotes = !inQuotes;
        } else if (line[i] === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += line[i];
        }
    }
    result.push(current);
    return result;
}

convertCsvToMarkdown();
