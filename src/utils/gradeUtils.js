export const GRADE_VALUE_MAP = {
  Z: 100,
  'S+': 95,
  S: 90,
  'S-': 85,
  'A+': 80,
  A: 75,
  'A-': 70,
  'B+': 65,
  B: 60,
  'B-': 55,
  'C+': 50,
  C: 45,
  'C-': 40,
  'D+': 35,
  D: 30,
  'D-': 25,
};

export const ELITE_GRADES = new Set(['S', 'S+']);

export const normalizeGrade = (grade) => String(grade ?? '').toUpperCase().trim();

export const getGradeValue = (grade) => {
  const normalizedGrade = normalizeGrade(grade);
  return GRADE_VALUE_MAP[normalizedGrade] ?? 0;
};

export const getGradeClassToken = (grade) => {
  const normalizedGrade = normalizeGrade(grade);

  if (!GRADE_VALUE_MAP[normalizedGrade]) {
    return 'NONE';
  }

  return normalizedGrade
    .replace(/\+/g, '_PLUS')
    .replace(/-/g, '_MINUS');
};

export const isEliteGrade = (grade) => ELITE_GRADES.has(normalizeGrade(grade));

export const isGodTierGrade = (grade) => normalizeGrade(grade) === 'Z';
