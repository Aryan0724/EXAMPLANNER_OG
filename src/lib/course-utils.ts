/**
 * Course Aliases and Normalization Utility
 * Ensures that pasted exam schedules from Excel/CSV match student courses seamlessly.
 */

export const CANONICAL_COURSES = [
  'B.Sc (Nursing)',
  'B.Tech CSE',
  'B.Tech ECE',
  'B.Tech ME',
  'B.Tech CE',
  'B.Pharma',
  'BBA',
  'BCA',
  'B.Com(H)',
  'BCA(Hons.) with AI&DS',
  'MCA',
  'MCA AI&DS',
  'M.Tech CSE',
  'M.Pharma',
  'Diploma CSE',
  'Diploma ECE',
  'Diploma ME',
  'Diploma CE',
] as const;

export const COURSE_ALIASES: Record<string, string> = {
  // B.Tech CSE / General B.Tech
  'b.tech cse': 'B.Tech CSE',
  'b.tech computer science and engineering': 'B.Tech CSE',
  'btech cse': 'B.Tech CSE',
  'b.tech (cse)': 'B.Tech CSE',
  'b.tech. cse': 'B.Tech CSE',
  'b tech cse': 'B.Tech CSE',
  'computer science & engineering': 'B.Tech CSE',
  'computer science and engineering': 'B.Tech CSE',
  'b.tech computer science & engineering': 'B.Tech CSE',
  'cse': 'B.Tech CSE',
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
  'b.sc. (nursing)': 'B.Sc (Nursing)',
  'bsc (nursing)': 'B.Sc (Nursing)',
  'nursing': 'B.Sc (Nursing)',

  // B.Tech ECE
  'b.tech ece': 'B.Tech ECE',
  'b.tech electronics and communication engineering': 'B.Tech ECE',
  'btech ece': 'B.Tech ECE',
  'b.tech (ece)': 'B.Tech ECE',
  'b.tech. ece': 'B.Tech ECE',
  'b tech ece': 'B.Tech ECE',
  'ece': 'B.Tech ECE',
  'bachelor of technology (ece) only (btl)': 'B.Tech ECE',
  'bachelor of technology ece  group only (btl)': 'B.Tech ECE',
  'bachelor of technology( ece)  only (btl)': 'B.Tech ECE',
  'bachelor of technology ece group only (btl)': 'B.Tech ECE',

  // B.Tech ME
  'b.tech me': 'B.Tech ME',
  'b.tech mechanical engineering': 'B.Tech ME',
  'btech me': 'B.Tech ME',
  'b.tech (me)': 'B.Tech ME',
  'b.tech. me': 'B.Tech ME',
  'b tech me': 'B.Tech ME',
  'me': 'B.Tech ME',
  'bachelor of technology (me) only (btl)': 'B.Tech ME',
  'bachelor of technology (mechanical engineering) only (btl)': 'B.Tech ME',

  // B.Tech CE
  'b.tech ce': 'B.Tech CE',
  'b.tech civil engineering': 'B.Tech CE',
  'btech ce': 'B.Tech CE',
  'b.tech (ce)': 'B.Tech CE',
  'b.tech. ce': 'B.Tech CE',
  'b tech ce': 'B.Tech CE',
  'ce': 'B.Tech CE',
  'bachelor of technology (ce) only (btl)': 'B.Tech CE',
  'bachelor of technology (civil engineering)  only (btl)': 'B.Tech CE',
  'bachelor of technology (civil engineering) only (btl)': 'B.Tech CE',

  // B.Pharma
  'b.pharma': 'B.Pharma',
  'b.pharm': 'B.Pharma',
  'b.pharm.': 'B.Pharma',
  'bpharm': 'B.Pharma',
  'bpharma': 'B.Pharma',
  'bachelor of pharmacy (b.pharm.)': 'B.Pharma',
  'bachelor of pharmacy': 'B.Pharma',
  'pharmacy': 'B.Pharma',

  // BBA
  'bba': 'BBA',
  'bachelor of business administration (bba)': 'BBA',
  'bachelor of business administration': 'BBA',
  'bachelor of business administration (btl/hld)': 'BBA',
  'bba - general': 'BBA',
  'bba general': 'BBA',

  // BCA
  'bca': 'BCA',
  'bachelor of computer applications': 'BCA',
  'bca general': 'BCA',

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

  // BCA(Hons.) with AI&DS
  'bca(hons.) with ai&ds': 'BCA(Hons.) with AI&DS',
  'bca (hons.) with ai&ds': 'BCA(Hons.) with AI&DS',
  'bca (hons.) - ai & data science': 'BCA(Hons.) with AI&DS',
  'bca (hons.) ai & data science': 'BCA(Hons.) with AI&DS',
  'bca ai&ds': 'BCA(Hons.) with AI&DS',
  'bca ai and ds': 'BCA(Hons.) with AI&DS',
  'bca(hons) with ai&ds': 'BCA(Hons.) with AI&DS',
  'bca (hons) ai&ds': 'BCA(Hons.) with AI&DS',
  'bca hons with ai&ds': 'BCA(Hons.) with AI&DS',
  'bca-ai&ds': 'BCA(Hons.) with AI&DS',
  'bca a i a d s': 'BCA(Hons.) with AI&DS',
  'bca(artificial intelligence and data science)': 'BCA(Hons.) with AI&DS',
  'bca (artificial intelligence and data science)': 'BCA(Hons.) with AI&DS',

  // MCA
  'mca': 'MCA',
  'master of computer applications': 'MCA',

  // MCA AI&DS
  'mca ai&ds': 'MCA AI&DS',
  'mca - ai & data science': 'MCA AI&DS',
  'mca ai and ds': 'MCA AI&DS',
  'mca(ai&ds)': 'MCA AI&DS',
  'mca (ai&ds)': 'MCA AI&DS',

  // M.Tech CSE
  'm.tech cse': 'M.Tech CSE',
  'm.tech computer science and engineering': 'M.Tech CSE',
  'mtech cse': 'M.Tech CSE',
  'm.tech (cse)': 'M.Tech CSE',
  'm tech cse': 'M.Tech CSE',
  'master of technology': 'M.Tech CSE',

  // M.Pharma
  'm.pharma': 'M.Pharma',
  'master of pharmacy(pharmaceutics)': 'M.Pharma',
  'master of pharmacy': 'M.Pharma',

  // Diploma CSE
  'diploma cse': 'Diploma CSE',
  'diplomacse': 'Diploma CSE',
  'diploma (cs)': 'Diploma CSE',
  'diploma': 'Diploma CSE',
  'diploma in computer science and engineering': 'Diploma CSE',
  'diploma in cse': 'Diploma CSE',
  'diploma (cse)': 'Diploma CSE',

  // Diploma ECE
  'diploma ece': 'Diploma ECE',
  'diplomaece': 'Diploma ECE',
  'diploma (ece)': 'Diploma ECE',
  'diploma in electronics and communication engineering': 'Diploma ECE',
  'diploma in ece': 'Diploma ECE',

  // Diploma ME
  'diploma me': 'Diploma ME',
  'diplomame': 'Diploma ME',
  'diploma (me)': 'Diploma ME',
  'diploma in mechanical engineering': 'Diploma ME',
  'diploma in me': 'Diploma ME',

  // Diploma CE
  'diploma ce': 'Diploma CE',
  'diplomace': 'Diploma CE',
  'diploma (ce)': 'Diploma CE',
  'diploma (ce)  (btl)': 'Diploma CE',
  'diploma in civil engineering': 'Diploma CE',
  'diploma in ce': 'Diploma CE',

  // B.Tech ECE (EC)
  'b tech ec': 'B.Tech ECE',
  'btech ec': 'B.Tech ECE',
  'b.tech ec': 'B.Tech ECE',
  'b.tech (ec)': 'B.Tech ECE',

  // B.Com(H)
  'b com (h)': 'B.Com(H)',
  'b com h': 'B.Com(H)',
  'b.com(hons) aat': 'B.Com(H)',
  'b.com(hons.) b&f': 'B.Com(H)',
  'b.com (hons) aat': 'B.Com(H)',
  'b.com (hons.) b&f': 'B.Com(H)',
  'b com (hons)': 'B.Com(H)',

  // B.Pharma
  'b pharma': 'B.Pharma',
  'b pharm': 'B.Pharma',

  // English
  'ba (h) eng': 'B.A. (Hons.) English with Research',
  'b.a. (hons.) english with research': 'B.A. (Hons.) English with Research',
  'ba (hons) eng': 'B.A. (Hons.) English with Research',
  'ba hons eng': 'B.A. (Hons.) English with Research',
  'b.a. (h) english': 'B.A. (Hons.) English with Research',
  'b.a. (hons) english': 'B.A. (Hons.) English with Research',

  // Chemistry
  'b sc (h) chem': 'B.Sc (H) Chem',
  'bsc (h) chem': 'B.Sc (H) Chem',
  'b.sc (h) chem': 'B.Sc (H) Chem',

  // Maths
  'b sc (h) maths': 'B.Sc (H) Maths',
  'bsc (h) maths': 'B.Sc (H) Maths',
  'b.sc (h) maths': 'B.Sc (H) Maths',

  // Physics
  'b sc (h) phy': 'B.Sc (H) Phy',
  'bsc (h) phy': 'B.Sc (H) Phy',
  'b.sc (h) phy': 'B.Sc (H) Phy',

  // Agriculture
  'b sc (h) agri': 'B.Sc (H) Agri',
  'bsc (h) agri': 'B.Sc (H) Agri',
  'b.sc (h) agri': 'B.Sc (H) Agri',
};

/**
 * Returns the normalized canonical course string, or the trimmed original if not mapped.
 */
export function canonicalizeCourse(courseStr?: string): string {
  if (!courseStr) return '';
  const clean = courseStr
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[–—]/g, '-');

  if (COURSE_ALIASES[clean]) {
    return COURSE_ALIASES[clean];
  }

  // 1. Strip punctuation & extra spaces
  const stripped = clean.replace(/[\.\(\)\-_]/g, '').replace(/\s+/g, ' ').trim();
  for (const [key, val] of Object.entries(COURSE_ALIASES)) {
    const keyStripped = key.replace(/[\.\(\)\-_]/g, '').replace(/\s+/g, ' ').trim();
    if (keyStripped === stripped) {
      return val;
    }
  }

  // 2. Alphanumeric only (e.g. "b com (h)" => "bcomh" matches "b.com(h)" => "bcomh")
  const alphanumeric = clean.replace(/[^a-z0-9]/g, '');
  if (alphanumeric.length >= 3) {
    for (const [key, val] of Object.entries(COURSE_ALIASES)) {
      const keyAlpha = key.replace(/[^a-z0-9]/g, '');
      if (keyAlpha === alphanumeric) {
        return val;
      }
    }
  }

  return courseStr.trim();
}

/**
 * Checks if two course strings match either directly or via canonical aliases.
 */
export function isCourseMatch(courseA?: string, courseB?: string): boolean {
  if (!courseA || !courseB) return false;
  const canonA = canonicalizeCourse(courseA);
  const canonB = canonicalizeCourse(courseB);
  if (canonA && canonB && canonA.toLowerCase() === canonB.toLowerCase()) {
    return true;
  }
  return courseA.trim().toLowerCase() === courseB.trim().toLowerCase();
}
