export type TajweedRule = {
  id: string;
  title: string;
  summary: string;
  detail: string;
  example?: string;
};

export const TAJWEED_RULES: TajweedRule[] = [
  {
    id: "noon-sakinah",
    title: "أحكام النون الساكنة والتنوين",
    summary: "الإظهار، الإدغام، الإقلاب، الإخفاء",
    detail:
      "النون الساكنة والتنوين لهما أربعة أحكام بحسب الحرف الذي يليهما:\n• الإظهار: عند حروف الحلق (ء، هـ، ع، ح، غ، خ).\n• الإدغام: عند حروف (ي، ر، م، ل، و، ن) ويُجمعها كلمة \"يرملون\".\n• الإقلاب: عند الباء فقط، تُقلب النون ميماً مع غنة.\n• الإخفاء: عند بقية الحروف الخمسة عشر مع غنة بمقدار حركتين.",
    example: "﴿مِنْ بَعْدِ﴾ ← إقلاب  •  ﴿مِن رَّبِّهِم﴾ ← إدغام",
  },
  {
    id: "meem-sakinah",
    title: "أحكام الميم الساكنة",
    summary: "إخفاء شفوي، إدغام مثلين، إظهار شفوي",
    detail:
      "الميم الساكنة لها ثلاثة أحكام:\n• الإخفاء الشفوي: إذا جاء بعدها باء (مع غنة).\n• الإدغام المتماثل: إذا جاء بعدها ميم.\n• الإظهار الشفوي: مع باقي الحروف، وأشدها عند الواو والفاء.",
    example: "﴿هُم بِالْآخِرَةِ﴾ ← إخفاء شفوي",
  },
  {
    id: "madd",
    title: "أحكام المد",
    summary: "المد الطبيعي والمدود الفرعية",
    detail:
      "المد هو إطالة الصوت بحرف من حروف المد (ا، و، ي).\n• المد الطبيعي: حركتان، لا سبب له.\n• المد المتصل: واجب 4-5 حركات إذا جاء بعد حرف المد همزة في نفس الكلمة.\n• المد المنفصل: جائز 2-4-5 حركات إذا جاء بعد حرف المد همزة في كلمة أخرى.\n• المد اللازم: 6 حركات إذا جاء بعد حرف المد سكون لازم.",
    example: "﴿جَاءَ﴾ متصل  •  ﴿إِنَّا أَعْطَيْنَاكَ﴾ منفصل  •  ﴿الضَّالِّينَ﴾ لازم",
  },
  {
    id: "qalqalah",
    title: "القلقلة",
    summary: "اضطراب صوت الحرف الساكن: ق ط ب ج د",
    detail:
      "حروف القلقلة خمسة مجموعة في \"قطب جد\". تُقلقل إذا كانت ساكنة (سكون أصلي أو وقفي).\n• قلقلة صغرى: السكون أصلي في وسط الكلمة.\n• قلقلة كبرى: السكون عارض بسبب الوقف، وتكون أقوى.",
    example: "﴿يَجْعَلُونَ﴾ صغرى  •  ﴿الْفَلَقِ﴾ كبرى",
  },
  {
    id: "ghunnah",
    title: "الغنة",
    summary: "صوت في الخيشوم مع النون والميم المشددتين",
    detail:
      "الغنة صوت رنيني يخرج من الخيشوم. تكون كاملة عند النون والميم المشددتين بمقدار حركتين.",
    example: "﴿إِنَّ﴾  •  ﴿ثُمَّ﴾",
  },
  {
    id: "raa",
    title: "أحكام الراء",
    summary: "تفخيم وترقيق الراء",
    detail:
      "• تُفخَّم الراء: إذا كانت مفتوحة أو مضمومة، أو ساكنة بعد فتح/ضم.\n• تُرقَّق الراء: إذا كانت مكسورة، أو ساكنة بعد كسر أصلي.\n• تجوز الوجهان في حالات محددة.",
    example: "﴿الرَّحْمَٰنِ﴾ مفخمة  •  ﴿رِجَالٌ﴾ مرققة",
  },
  {
    id: "lam",
    title: "أحكام لام لفظ الجلالة",
    summary: "تفخيم وترقيق اللام في \"الله\"",
    detail:
      "• تُفخَّم اللام في لفظ الجلالة إذا سُبقت بفتح أو ضم.\n• تُرقَّق إذا سُبقت بكسر.",
    example: "﴿قَالَ اللَّهُ﴾ مفخمة  •  ﴿بِسْمِ اللَّهِ﴾ مرققة",
  },
  {
    id: "waqf",
    title: "علامات الوقف",
    summary: "متى نقف ومتى نصل في التلاوة",
    detail:
      "• مـ : وقف لازم.\n• ط : وقف مطلق.\n• ج : وقف جائز مع استواء الطرفين.\n• قلى : الوقف أولى.\n• صلى : الوصل أولى.\n• ۚ : وقف جائز.\n• ∴ ∴ : تعانق، يجوز الوقف على أحدهما فقط.",
  },
];

// Curated short surahs/ayahs from Juz Amma good for practice
export type PracticeItem = {
  id: string;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  text: string;
  level: "مبتدئ" | "متوسط" | "متقدم";
};

export const PRACTICE_ITEMS: PracticeItem[] = [
  { id: "fatiha-1", surahNumber: 1, surahName: "الفاتحة", ayahNumber: 1, text: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ", level: "مبتدئ" },
  { id: "fatiha-2", surahNumber: 1, surahName: "الفاتحة", ayahNumber: 2, text: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ", level: "مبتدئ" },
  { id: "ikhlas-1", surahNumber: 112, surahName: "الإخلاص", ayahNumber: 1, text: "قُلْ هُوَ ٱللَّهُ أَحَدٌ", level: "مبتدئ" },
  { id: "ikhlas-2", surahNumber: 112, surahName: "الإخلاص", ayahNumber: 2, text: "ٱللَّهُ ٱلصَّمَدُ", level: "مبتدئ" },
  { id: "falaq-1", surahNumber: 113, surahName: "الفلق", ayahNumber: 1, text: "قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ", level: "مبتدئ" },
  { id: "nas-1", surahNumber: 114, surahName: "الناس", ayahNumber: 1, text: "قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ", level: "مبتدئ" },
  { id: "kawthar-1", surahNumber: 108, surahName: "الكوثر", ayahNumber: 1, text: "إِنَّآ أَعْطَيْنَٰكَ ٱلْكَوْثَرَ", level: "متوسط" },
  { id: "asr-1", surahNumber: 103, surahName: "العصر", ayahNumber: 1, text: "وَٱلْعَصْرِ", level: "مبتدئ" },
  { id: "asr-2", surahNumber: 103, surahName: "العصر", ayahNumber: 2, text: "إِنَّ ٱلْإِنسَٰنَ لَفِى خُسْرٍ", level: "متوسط" },
  { id: "qadr-1", surahNumber: 97, surahName: "القدر", ayahNumber: 1, text: "إِنَّآ أَنزَلْنَٰهُ فِى لَيْلَةِ ٱلْقَدْرِ", level: "متوسط" },
  { id: "duha-1", surahNumber: 93, surahName: "الضحى", ayahNumber: 1, text: "وَٱلضُّحَىٰ", level: "مبتدئ" },
  { id: "duha-2", surahNumber: 93, surahName: "الضحى", ayahNumber: 2, text: "وَٱلَّيْلِ إِذَا سَجَىٰ", level: "متوسط" },
  { id: "sharh-1", surahNumber: 94, surahName: "الشرح", ayahNumber: 1, text: "أَلَمْ نَشْرَحْ لَكَ صَدْرَكَ", level: "متوسط" },
  { id: "tin-1", surahNumber: 95, surahName: "التين", ayahNumber: 1, text: "وَٱلتِّينِ وَٱلزَّيْتُونِ", level: "متوسط" },
  { id: "alaq-1", surahNumber: 96, surahName: "العلق", ayahNumber: 1, text: "ٱقْرَأْ بِٱسْمِ رَبِّكَ ٱلَّذِى خَلَقَ", level: "متقدم" },
];