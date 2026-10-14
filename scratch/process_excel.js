const XLSX = require('xlsx');
const fs = require('fs');
const wb = XLSX.readFile('Faculty list as on 28.4.2026.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, {header: 1});

let tsCode = `const REAL_FACULTY: Omit<Invigilator, 'isAvailable' | 'unavailableSlots' | 'assignedDuties'>[] = [\n`;

for(let i=1; i<data.length; i++) {
  const row = data[i];
  if(!row || row.length < 5) continue;
  
  const idStr = String(row[1] || '').trim() || `UNK${i}`;
  const nameStr = String(row[2] || '').trim();
  const desigStr = String(row[3] || '').trim();
  const deptStr = String(row[4] || '').trim();
  
  let gender = 'Female';
  const nameLower = nameStr.toLowerCase();
  if(nameLower.startsWith('mr.') || nameLower.includes('singh') || nameLower.startsWith('dr.') && ['prakash', 'kumar', 'sandeep', 'himanshu', 'rajendra', 'saurabh', 'harshit', 'devesh', 'nagendra', 'mohit', 'janmejay', 'pawan', 'narendra', 'divas', 'madan', 'govind', 'abhijit', 'ramanuj', 'bhavesh', 'devendra', 'mehul', 'amit', 'somesh', 'naveen', 'mukesh', 'lalit', 'ankur', 'shashi', 'chetan', 'preetam', 'praveen', 'aviral', 'anubhav', 'ayush', 'tarun', 'shiva', 'manohar', 'prince', 'ansh', 'hrishabh', 'jaysurya', 'asheesh', 'manish', 'ankit', 'naman', 'sanjay', 'manoj', 'suraj', 'vaibhav', 'nishant', 'abhishek', 'parthak', 'aditya'].some(n => nameLower.includes(n))) {
     gender = 'Male';
  }
  
  tsCode += `  { id: '${idStr}', name: '${nameStr}', department: '${deptStr}', designation: '${desigStr}', gender: '${gender}' },\n`;
}

tsCode += `];`;

fs.writeFileSync('temp_faculty.ts', tsCode);
console.log('done');
