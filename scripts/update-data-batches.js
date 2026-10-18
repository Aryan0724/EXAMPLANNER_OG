const fs = require('fs');
const specs = JSON.parse(fs.readFileSync('scripts/official_student_specs.json', 'utf8'));

const dataPath = 'src/lib/data.ts';
let content = fs.readFileSync(dataPath, 'utf8');

const specsStr = `export const OFFICIAL_STUDENT_BATCH_SPECS: OfficialBatchSpec[] = ` +
  JSON.stringify(specs.map(s => ({
    course: s.course,
    batch: s.batch,
    semester: s.semester,
    totalStudents: s.totalStudents,
    department: s.department,
    code: s.code
  })), null, 2) + `;\n`;

// Replace from 'export const OFFICIAL_STUDENT_BATCH_SPECS' to 'export function generateOfficialStudents'
const startIdx = content.indexOf('export const OFFICIAL_STUDENT_BATCH_SPECS: OfficialBatchSpec[] =');
const endIdx = content.indexOf('export function generateOfficialStudents(): Student[]');

if (startIdx !== -1 && endIdx !== -1) {
  content = content.slice(0, startIdx) + specsStr + '\n' + content.slice(endIdx);
  fs.writeFileSync(dataPath, content, 'utf8');
  console.log('Successfully updated OFFICIAL_STUDENT_BATCH_SPECS in src/lib/data.ts!');
} else {
  console.error('Could not find markers to replace in src/lib/data.ts');
}
