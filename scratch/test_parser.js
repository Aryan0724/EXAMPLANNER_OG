const text = `
## Shift I (Mid) – 09:30 AM to 11:00 AM

| Date                   | No. of Rooms Required | Total Invigilator Required |
| ---------------------- | --------------------- | -------------------------- |
| Thursday, 14 May 2026  | 02                    | 04                         |
| Wednesday, 20 May 2026 | —                     | —                          |

# Shift I – 09:30 AM to 12:30 PM

| Date   | Rooms | Back      | Total Invigilators  |
| ------ | ----- | --------- | ------------------- |
| 14 May | 14    | 03 → m-64 | 42 + 4 + 3 = **49** |
| 16 May | 17+2  | 69 → m-64 | 42 + 4 + 3 = **49** |
| 28 May | 01    | —         | 03 + 1 = **4**      |

# Shift II – 01:30 PM to 04:30 PM

| Date   | Rooms | Back | Total Invigilators      |
| ------ | ----- | ---- | ----------------------- |
| 14 May | 17    | 05   | 40 + 1 + 3 = **44**     |
| 25 May | 10+3  | 13   | 26 + 6 + 2 + 3 = **37** |
`;

let currentShift = null;
const aggregated = {}; // date -> { I: { rooms, faculty }, II: { rooms, faculty } }

for(const line of text.split('\n')) {
    if(line.toLowerCase().includes('shift i (mid)')) currentShift = 'I';
    else if(line.toLowerCase().includes('shift i –') || line.toLowerCase().includes('shift i -')) currentShift = 'I';
    else if(line.toLowerCase().includes('shift ii')) currentShift = 'II';
    else if(line.includes('|') && !line.includes('---') && !line.toLowerCase().includes('date')) {
        const parts = line.split('|').map(s => s.trim()).filter(Boolean);
        if(parts.length < 3) continue;

        const dateStr = parts[0];
        if(dateStr.includes('—')) continue; // empty row
        
        // Extract day
        const match = dateStr.match(/\d+/);
        if(!match) continue;
        const day = parseInt(match[0]);
        const fullDate = `2026-05-${day.toString().padStart(2, '0')}`;

        let roomsStr, facultyStr;
        if(parts.length === 3) {
            // Mid
            roomsStr = parts[1];
            facultyStr = parts[2];
        } else {
            // Regular
            roomsStr = parts[1];
            facultyStr = parts[3];
        }

        if(roomsStr.includes('—') || facultyStr.includes('—')) continue;

        // Parse Rooms (e.g. "17+2" or "10+3")
        const rooms = roomsStr.split('+').reduce((acc, val) => acc + (parseInt(val.replace(/\D/g, '')) || 0), 0);

        // Parse Faculty (e.g. "42 + 4 + 3 = **49**")
        const facMatches = facultyStr.match(/\d+/g);
        const faculty = facMatches ? parseInt(facMatches[facMatches.length - 1]) : 0;

        if(!aggregated[fullDate]) aggregated[fullDate] = { I: {rooms:0, faculty:0}, II: {rooms:0, faculty:0} };
        
        aggregated[fullDate][currentShift].rooms += rooms;
        aggregated[fullDate][currentShift].faculty += faculty;
    }
}

console.log(JSON.stringify(aggregated, null, 2));
