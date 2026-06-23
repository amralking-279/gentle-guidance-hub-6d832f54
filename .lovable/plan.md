
## الهدف
إضافة زر/تبويب جديد بجانب "نمط العرض" في صفحة `/more/themes` اسمه **"قالب التطبيق"**، يسمح للمستخدم يختار بين قالبين:
1. **القالب الأصلي** (الحالي بدون أي تغيير — الافتراضي)
2. **قالب "براير ناو"** (مستوحى من الصورة المرفقة: هيدر بصورة خلفية + عداد تنازلي للصلاة القادمة + كارت أوقات صلاة أفقي + شبكة أيقونات + تاب بار سفلي)

التغيير يطبَّق على **كل التطبيق** ويتم حفظ الاختيار في `localStorage`.

## المعمارية

```text
src/lib/appTemplates.ts          ← جديد: ids + apply/store/read (نفس نمط displayModes)
src/components/providers/
  AppTemplateProvider.tsx        ← جديد: context يوفر templateId للأطفال
src/components/templates/
  PrayerNowHome.tsx              ← جديد: واجهة الهوم الجديدة
  PrayerNowBottomTab.tsx         ← جديد: التاب بار السفلي
  PrayerNowHeader.tsx            ← جديد: الهيدر بالصورة + العد التنازلي
src/routes/index.tsx             ← يبدّل بين HomePage الحالية وPrayerNowHome حسب القالب
src/routes/__root.tsx            ← يلف الأطفال بـ AppTemplateProvider + يعرض BottomTab شرطيًا
src/routes/more.themes.tsx       ← يضيف تبويب ثالث "قالب التطبيق" بجانب اللون ونمط العرض
```

## القوالب

**`classic` (الأصلي):**
- يحافظ على كل الكود الحالي كما هو 100% — لا تعديل في `HeroSection`, `FeaturesSection`, إلخ.
- لا BottomTab.

**`prayer-now` (الجديد):**
- **الهيدر:** صورة خلفية صحراوية (مولّدة بـ imagegen، صحراء + مسجد + جِمال)، فوقها اسم الصلاة القادمة + عداد تنازلي كبير (HH:MM:SS) + الوقت المتبقي بالسالب.
- **بار التاريخ:** اليوم بالعربي + التاريخ الميلادي + الهجري + أيقونة شروق.
- **كارت أوقات الصلاة الأفقي:** الفجر/الظهر/العصر/المغرب/العشاء في صف واحد بأيقونات وأوقات.
- **شبكة أيقونات الميزات:** القبلة، السبحة، الختمة، متتبع الصلاة، مجتمع الداعين، المكتبة (تستعمل المسارات الموجودة في `/more/*`).
- **تاب بار سفلي ثابت:** القرآن / الأذكار / المزيد / الصلاة / استكشف.

## المنطق

في `src/lib/appTemplates.ts`:
```ts
export type AppTemplateId = 'classic' | 'prayer-now';
export const DEFAULT_TEMPLATE: AppTemplateId = 'classic';
// apply/store/read + class على <html> (app-template-prayer-now)
```

`AppTemplateProvider` يوفر `useAppTemplate()` للأطفال. `routes/index.tsx` يقرر `templateId === 'prayer-now' ? <PrayerNowHome/> : <ClassicHome/>`. `__root.tsx` يعرض `<PrayerNowBottomTab/>` فقط لما القالب = `prayer-now`.

## تعديل صفحة الثيمات

التبويبات تصبح: **اللون | نمط العرض | قالب التطبيق**. تبويب القالب يعرض كرتين كبيرتين بصورة معاينة (mockup) لكل قالب + زر "تطبيق". زي ما هو معمول في نمط العرض بالظبط.

## ملاحظات
- العد التنازلي يستعمل `usePrayerTimes`/منطق `more.prayer-times.tsx` الموجود (مش هنعمل نظام جديد).
- صورة الخلفية تتولَّد بـ `imagegen` (صحراء/مسجد سيلويت/جِمال، sunrise tones) وتحفظ في `src/assets/`.
- لا تعديل في الباك إند ولا في الـ routing الموجود.
