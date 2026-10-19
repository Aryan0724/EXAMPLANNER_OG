const fs = require('fs');

// We can simulate parsePastedExamSchedule from schedule-importer.ts
const text = fs.readFileSync('scripts/schedule_paste_tsv.txt', 'utf8');

const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
const headerTokens = lines[0].split('\t').map(c => c.trim());
console.log('Headers:', headerTokens);

let parsedCount = 0;
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split('\t').map(c => c.trim());
  if (cols.length >= 5) {
    parsedCount++;
  }
}

console.log(`Parsed ${parsedCount} out of ${lines.length - 1} rows successfully!`);
