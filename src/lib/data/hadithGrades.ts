// Translate hadith grader names and grade values from English/transliteration
// to proper Arabic. Falls back to the original string when no mapping exists.

const NAME_MAP: Record<string, string> = {
  'al-albani': 'الألباني',
  'albani': 'الألباني',
  'shuaib al arnaut': 'شعيب الأرناؤوط',
  'shuaib al-arnaut': 'شعيب الأرناؤوط',
  'zubair ali zai': 'زبير علي زي',
  'muhammad muhyi al-din abdul hamid': 'محمد محيي الدين عبد الحميد',
  'muhammad fouad abd al-baqi': 'محمد فؤاد عبد الباقي',
  'ahmad muhammad shakir': 'أحمد محمد شاكر',
  'abu ghuddah': 'أبو غدة',
  'salim al-hilali': 'سالم الهلالي',
  'darussalam': 'دار السلام',
};

const GRADE_MAP: Record<string, string> = {
  'sahih': 'صحيح',
  'hasan': 'حسن',
  'hasan sahih': 'حسن صحيح',
  'sahih hasan': 'حسن صحيح',
  "da'if": 'ضعيف',
  'daif': 'ضعيف',
  'weak': 'ضعيف',
  'sahih lighairihi': 'صحيح لغيره',
  'hasan lighairihi': 'حسن لغيره',
  'isnaad hasan': 'إسناده حسن',
  'isnaad sahih': 'إسناده صحيح',
  'sahih muslim': 'صحيح مسلم',
  'sahih bukhari': 'صحيح البخاري',
  'sahih - bukhari and muslim': 'متفق عليه',
  'sahih bukhari and muslim': 'متفق عليه',
  'mawdu': 'موضوع',
  'mawdoo': 'موضوع',
  'munkar': 'منكر',
};

const VERB_BY_GRADE: Record<string, string> = {
  'صحيح': 'صحّحه',
  'حسن': 'حسّنه',
  'حسن صحيح': 'صحّحه',
  'صحيح لغيره': 'صحّحه',
  'حسن لغيره': 'حسّنه',
  'إسناده حسن': 'حسّن إسناده',
  'إسناده صحيح': 'صحّح إسناده',
  'ضعيف': 'ضعّفه',
  'موضوع': 'حكم بوضعه',
  'منكر': 'حكم بنكارته',
  'متفق عليه': 'أخرجه',
  'صحيح مسلم': 'أخرجه مسلم',
  'صحيح البخاري': 'أخرجه البخاري',
};

export function translateGraderName(name: string): string {
  return NAME_MAP[name.trim().toLowerCase()] ?? name;
}

export function translateGradeValue(grade: string): string {
  return GRADE_MAP[grade.trim().toLowerCase()] ?? grade;
}

/** Format a grade as a single Arabic phrase, e.g. "صحّحه الألباني". */
export function formatGrade(name: string, grade: string): string {
  const arName = translateGraderName(name);
  const arGrade = translateGradeValue(grade);
  const verb = VERB_BY_GRADE[arGrade];
  if (verb) return `${verb} ${arName}`;
  return `${arName}: ${arGrade}`;
}
