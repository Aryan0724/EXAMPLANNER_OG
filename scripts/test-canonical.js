const fs = require('fs');

const COURSE_ALIASES = {
  // Existing
  'b.tech cse': 'B.Tech CSE',
  'b.tech computer science and engineering': 'B.Tech CSE',
  'btech cse': 'B.Tech CSE',
  'b.tech (cse)': 'B.Tech CSE',
  'bachelor of technology (computer science)': 'B.Tech CSE',
  'bachelor of technology (computer science)(btl/hld)': 'B.Tech CSE',
  'bachelor of technology (computer science)(hld/btl)': 'B.Tech CSE',
  'bachelor of technology': 'B.Tech CSE',
  'b.tech': 'B.Tech CSE',
  'btech': 'B.Tech CSE',

  // B.Sc (Nursing)
  'b.sc (nursing)': 'B.Sc (Nursing)',
  'b.sc. nursing': 'B.Sc (Nursing)',
  'b.sc nursing': 'B.Sc (Nursing)',
  'bsc nursing': 'B.Sc (Nursing)',
  'b.sc (nursing)': 'B.Sc (Nursing)',
  'nursing': 'B.Sc (Nursing)',

  // B.Tech ECE
  'b.tech ece': 'B.Tech ECE',
  'b.tech electronics and communication engineering': 'B.Tech ECE',
  'btech ece': 'B.Tech ECE',
  'bachelor of technology (ece) only (btl)': 'B.Tech ECE',
  'bachelor of technology ece  group only (btl)': 'B.Tech ECE',
  'bachelor of technology( ece)  only (btl)': 'B.Tech ECE',
  'bachelor of technology ece group only (btl)': 'B.Tech ECE',

  // B.Tech ME
  'b.tech me': 'B.Tech ME',
  'b.tech mechanical engineering': 'B.Tech ME',
  'btech me': 'B.Tech ME',
  'bachelor of technology (me) only (btl)': 'B.Tech ME',
  'bachelor of technology (mechanical engineering) only (btl)': 'B.Tech ME',

  // B.Tech CE
  'b.tech ce': 'B.Tech CE',
  'b.tech civil engineering': 'B.Tech CE',
  'btech ce': 'B.Tech CE',
  'bachelor of technology (ce) only (btl)': 'B.Tech CE',
  'bachelor of technology (civil engineering)  only (btl)': 'B.Tech CE',
  'bachelor of technology (civil engineering) only (btl)': 'B.Tech CE',

  // B.Pharma
  'b.pharma': 'B.Pharma',
  'b.pharm': 'B.Pharma',
  'bpharm': 'B.Pharma',
  'bpharma': 'B.Pharma',
  'bachelor of pharmacy': 'B.Pharma',
  'pharmacy': 'B.Pharma',

  // BBA
  'bba': 'BBA',
  'bachelor of business administration': 'BBA',
  'bachelor of business administration (btl/hld)': 'BBA',

  // BCA
  'bca': 'BCA',
  'bachelor of computer applications': 'BCA',

  // B.Com(H)
  'b.com(h)': 'B.Com(H)',
  'b.com (h)': 'B.Com(H)',
  'b.com (hons.)': 'B.Com(H)',
  'b.com hons': 'B.Com(H)',
  'bcom(h)': 'B.Com(H)',
  'bcom (h)': 'B.Com(H)',
  'bcom hons': 'B.Com(H)',
  'bachelor of commerce (honours)': 'B.Com(H)',
  'b.com': 'B.Com(H)',
  'bcom': 'B.Com(H)',

  // BCA AI&DS
  'bca(hons.) with ai&ds': 'BCA(Hons.) with AI&DS',
  'bca (hons.) with ai&ds': 'BCA(Hons.) with AI&DS',
  'bca ai&ds': 'BCA(Hons.) with AI&DS',
  'bca a i a d s': 'BCA(Hons.) with AI&DS',
  'bca(artificial intelligence and data science)': 'BCA(Hons.) with AI&DS',
  'bca (artificial intelligence and data science)': 'BCA(Hons.) with AI&DS',

  // MCA
  'mca': 'MCA',
  'master of computer applications': 'MCA',

  // MCA AI&DS
  'mca ai&ds': 'MCA AI&DS',
  'mca ai and ds': 'MCA AI&DS',

  // M.Tech CSE
  'm.tech cse': 'M.Tech CSE',
  'master of technology': 'M.Tech CSE',

  // M.Pharma
  'm.pharma': 'M.Pharma',
  'master of pharmacy(pharmaceutics)': 'M.Pharma',
  'master of pharmacy': 'M.Pharma',

  // Diplomas
  'diploma cse': 'Diploma CSE',
  'diplomacse': 'Diploma CSE',
  'diploma (cs)': 'Diploma CSE',
  'diploma': 'Diploma CSE',
  'diploma ece': 'Diploma ECE',
  'diplomaece': 'Diploma ECE',
  'diploma (ece)': 'Diploma ECE',
  'diploma me': 'Diploma ME',
  'diplomame': 'Diploma ME',
  'diploma (me)': 'Diploma ME',
  'diploma ce': 'Diploma CE',
  'diplomace': 'Diploma CE',
  'diploma (ce)': 'Diploma CE',
  'diploma (ce)  (btl)': 'Diploma CE',
};

function canonicalizeCourse(c) {
  if (!c) return '';
  const clean = c.trim().toLowerCase().replace(/\s+/g, ' ');
  if (COURSE_ALIASES[clean]) return COURSE_ALIASES[clean];
  const alpha = clean.replace(/[^a-z0-9]/g, '');
  for (const [k, v] of Object.entries(COURSE_ALIASES)) {
    if (k.replace(/[^a-z0-9]/g, '') === alpha) return v;
  }
  return c.trim();
}

console.log('Testing canonicalize:');
const tests = [
  'BACHELOR OF TECHNOLOGY (Computer Science)',
  'BACHELOR OF TECHNOLOGY (Computer Science)(HLD/BTL)',
  'BACHELOR OF TECHNOLOGY (ECE) ONLY (BTL)',
  'BACHELOR OF TECHNOLOGY (CIVIL Engineering)  ONLY (BTL)',
  'BACHELOR OF TECHNOLOGY (Mechanical Engineering) ONLY (BTL)',
  'BACHELOR OF PHARMACY',
  'BACHELOR OF BUSINESS ADMINISTRATION',
  'BACHELOR OF COMPUTER APPLICATIONS',
  'BACHELOR OF COMMERCE (HONOURS)',
  'BCA(Artificial Intelligence And Data Science)',
  'Master of Computer Applications',
  'MCA AI&DS',
  'MASTER OF TECHNOLOGY',
  'Master of Pharmacy(Pharmaceutics)',
  'DIPLOMA (CS)',
  'DIPLOMA (CE)  (BTL)',
  'B.Sc (Nursing)',
  'BCA A I A D S'
];

tests.forEach(t => {
  console.log(`"${t}" => "${canonicalizeCourse(t)}"`);
});
