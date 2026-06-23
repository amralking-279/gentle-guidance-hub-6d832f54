// Metadata for hadith collections.
// "available" = wired to the public fawazahmed0 hadith-api CDN.
// "soon" = not yet wired (will gracefully show a "coming soon" notice).

export type HadithBook = {
  slug: string;
  arabicName: string;
  englishName: string;
  author: string;
  count: number; // approximate hadith count
  color: string; // tailwind color stem
  available: boolean;
  // For the API edition slug, defaults to slug
  apiSlug?: string;
};

export const HADITH_BOOKS: HadithBook[] = [
  {
    slug: 'bukhari',
    arabicName: 'صحيح البخاري',
    englishName: 'Sahih al-Bukhari',
    author: 'الإمام البخاري',
    count: 7563,
    color: 'emerald',
    available: true,
  },
  {
    slug: 'muslim',
    arabicName: 'صحيح مسلم',
    englishName: 'Sahih Muslim',
    author: 'الإمام مسلم',
    count: 7470,
    color: 'teal',
    available: true,
  },
  {
    slug: 'abudawud',
    arabicName: 'سنن أبي داود',
    englishName: 'Sunan Abu Dawud',
    author: 'الإمام أبو داود',
    count: 5274,
    color: 'cyan',
    available: true,
  },
  {
    slug: 'tirmidhi',
    arabicName: 'سنن الترمذي',
    englishName: 'Jami at-Tirmidhi',
    author: 'الإمام الترمذي',
    count: 3956,
    color: 'blue',
    available: true,
  },
  {
    slug: 'nasai',
    arabicName: 'سنن النسائي',
    englishName: 'Sunan an-Nasai',
    author: 'الإمام النسائي',
    count: 5761,
    color: 'indigo',
    available: true,
  },
  {
    slug: 'ibnmajah',
    arabicName: 'سنن ابن ماجه',
    englishName: 'Sunan Ibn Majah',
    author: 'الإمام ابن ماجه',
    count: 4341,
    color: 'purple',
    available: true,
  },
  {
    slug: 'malik',
    arabicName: 'موطأ مالك',
    englishName: "Muwatta Malik",
    author: 'الإمام مالك',
    count: 1851,
    color: 'fuchsia',
    available: true,
  },
  {
    slug: 'nawawi',
    arabicName: 'الأربعون النووية',
    englishName: '40 Hadith Nawawi',
    author: 'الإمام النووي',
    count: 42,
    color: 'amber',
    available: true,
  },
  {
    slug: 'qudsi',
    arabicName: 'الأحاديث القدسية',
    englishName: '40 Hadith Qudsi',
    author: 'مجموعة',
    count: 40,
    color: 'gold',
    available: true,
  },
  // Not yet wired — show as "بعد قريب"
  {
    slug: 'riyad',
    arabicName: 'رياض الصالحين',
    englishName: 'Riyad as-Salihin',
    author: 'الإمام النووي',
    count: 1896,
    color: 'rose',
    available: false,
  },
  {
    slug: 'adab',
    arabicName: 'الأدب المفرد',
    englishName: 'Al-Adab Al-Mufrad',
    author: 'الإمام البخاري',
    count: 1322,
    color: 'pink',
    available: false,
  },
  {
    slug: 'shamail',
    arabicName: 'الشمائل المحمدية',
    englishName: 'Shamail Muhammadiyah',
    author: 'الإمام الترمذي',
    count: 397,
    color: 'orange',
    available: false,
  },
  {
    slug: 'bulugh',
    arabicName: 'بلوغ المرام',
    englishName: 'Bulugh al-Maram',
    author: 'الحافظ ابن حجر',
    count: 1569,
    color: 'red',
    available: false,
  },
];

export const colorClassMap: Record<string, { bg: string; text: string; border: string; ring: string }> = {
  emerald: { bg: 'bg-emerald-900/40', text: 'text-emerald-400', border: 'border-emerald-700/40', ring: 'shadow-[0_0_30px_rgba(16,185,129,0.15)]' },
  teal:    { bg: 'bg-teal-900/40',    text: 'text-teal-400',    border: 'border-teal-700/40',    ring: 'shadow-[0_0_30px_rgba(20,184,166,0.15)]' },
  cyan:    { bg: 'bg-cyan-900/40',    text: 'text-cyan-400',    border: 'border-cyan-700/40',    ring: 'shadow-[0_0_30px_rgba(34,211,238,0.15)]' },
  blue:    { bg: 'bg-blue-900/40',    text: 'text-blue-400',    border: 'border-blue-700/40',    ring: 'shadow-[0_0_30px_rgba(59,130,246,0.15)]' },
  indigo:  { bg: 'bg-indigo-900/40',  text: 'text-indigo-400',  border: 'border-indigo-700/40',  ring: 'shadow-[0_0_30px_rgba(99,102,241,0.15)]' },
  purple:  { bg: 'bg-purple-900/40',  text: 'text-purple-400',  border: 'border-purple-700/40',  ring: 'shadow-[0_0_30px_rgba(168,85,247,0.15)]' },
  fuchsia: { bg: 'bg-fuchsia-900/40', text: 'text-fuchsia-400', border: 'border-fuchsia-700/40', ring: 'shadow-[0_0_30px_rgba(217,70,239,0.15)]' },
  amber:   { bg: 'bg-amber-900/40',   text: 'text-amber-400',   border: 'border-amber-700/40',   ring: 'shadow-[0_0_30px_rgba(245,158,11,0.15)]' },
  gold:    { bg: 'bg-yellow-900/40',  text: 'text-yellow-400',  border: 'border-yellow-700/40',  ring: 'shadow-[0_0_30px_rgba(250,204,21,0.15)]' },
  rose:    { bg: 'bg-rose-900/40',    text: 'text-rose-400',    border: 'border-rose-700/40',    ring: 'shadow-[0_0_30px_rgba(244,63,94,0.15)]' },
  pink:    { bg: 'bg-pink-900/40',    text: 'text-pink-400',    border: 'border-pink-700/40',    ring: 'shadow-[0_0_30px_rgba(236,72,153,0.15)]' },
  orange:  { bg: 'bg-orange-900/40',  text: 'text-orange-400',  border: 'border-orange-700/40',  ring: 'shadow-[0_0_30px_rgba(249,115,22,0.15)]' },
  red:     { bg: 'bg-red-900/40',     text: 'text-red-400',     border: 'border-red-700/40',     ring: 'shadow-[0_0_30px_rgba(239,68,68,0.15)]' },
};
