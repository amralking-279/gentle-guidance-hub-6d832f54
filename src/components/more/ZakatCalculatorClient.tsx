import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { Calculator, ArrowRight, Coins, Wheat, Info, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * شروط زكاة المال:
 *  - بلوغ النصاب: ما يعادل 85 جرام من الذهب الخالص (عيار 24).
 *  - مرور حول هجري كامل على المال (354 يوماً تقريباً).
 *  - المقدار الواجب: 2.5% من إجمالي المال الذي بلغ النصاب.
 *
 * زكاة الفطر:
 *  - تجب على كل مسلم صغير وكبير، ذكر وأنثى.
 *  - مقدارها صاع من غالب قوت أهل البلد (≈ 3 كجم من الأرز/القمح/الشعير... إلخ).
 *  - تخرج قبل صلاة عيد الفطر.
 */

const GRAM_GOLD_PRICE_EGP_DEFAULT = 7600; // سعر تقريبي للجرام عيار 24 (قابل للتعديل)
const NISAB_GOLD_GRAMS = 85;
const ZAKAT_RATE = 0.025;
const FITR_KG_PER_PERSON = 3;
const FITR_PRICE_PER_KG_DEFAULT = 50; // متوسط سعر الكيلو من غالب القوت

type Tab = 'mal' | 'fitr';

export default function ZakatCalculatorClient() {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>('mal');

  // زكاة المال
  const [wealth, setWealth] = useState<number>(50000);
  const [goldPrice, setGoldPrice] = useState<number>(GRAM_GOLD_PRICE_EGP_DEFAULT);
  const [hawlPassed, setHawlPassed] = useState<boolean>(true);

  // زكاة الفطر
  const [persons, setPersons] = useState<number>(1);
  const [kgPrice, setKgPrice] = useState<number>(FITR_PRICE_PER_KG_DEFAULT);

  useEffect(() => { setMounted(true); }, []);

  const nisab = useMemo(() => NISAB_GOLD_GRAMS * goldPrice, [goldPrice]);
  const reachedNisab = wealth >= nisab;
  const zakatAmount = reachedNisab && hawlPassed ? wealth * ZAKAT_RATE : 0;

  const fitrTotalKg = persons * FITR_KG_PER_PERSON;
  const fitrTotal = fitrTotalKg * kgPrice;

  if (!mounted) return null;

  return (
    <div className="pt-24 pb-28">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-emerald-800/30 mb-4">
            <Calculator className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-cairo text-sm">حاسبة الزكاة</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Amiri, serif' }}>
            حاسبة الزكاة
          </h1>
          <p className="text-gray-400 font-cairo">احسب زكاة المال وزكاة الفطر وفق الشروط الشرعية</p>
        </motion.div>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-2 mb-6 p-1 glass-card rounded-2xl border border-emerald-900/40">
          <button
            onClick={() => setTab('mal')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl font-cairo transition-all ${
              tab === 'mal' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Coins className="w-4 h-4" /> زكاة المال
          </button>
          <button
            onClick={() => setTab('fitr')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl font-cairo transition-all ${
              tab === 'fitr' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Wheat className="w-4 h-4" /> زكاة الفطر
          </button>
        </div>

        {tab === 'mal' && (
          <motion.div
            key="mal"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6 md:p-8 border border-emerald-900/40 mb-6"
          >
            {/* Conditions banner */}
            <div className="mb-6 p-4 rounded-xl bg-emerald-900/20 border border-emerald-800/40">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-sm font-cairo text-gray-200 space-y-1">
                  <p><span className="text-emerald-400 font-semibold">شروط وجوب زكاة المال:</span></p>
                  <p>• بلوغ المال نصاباً يعادل <span className="text-emerald-300">85 جرام ذهب</span> عيار 24.</p>
                  <p>• مرور <span className="text-emerald-300">حول هجري كامل</span> (≈ 354 يوماً) على بلوغه النصاب.</p>
                  <p>• المقدار الواجب: <span className="text-emerald-300">2.5%</span> من إجمالي المال.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-white font-cairo mb-2">سعر جرام الذهب عيار 24 (ج.م)</label>
                <input
                  type="number"
                  value={goldPrice}
                  onChange={(e) => setGoldPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-xl glass border border-emerald-800/40 bg-emerald-900/20 text-white font-mono focus:outline-none focus:border-emerald-600"
                />
                <p className="text-xs text-gray-400 font-cairo mt-1">عدّل السعر حسب سعر السوق الحالي.</p>
              </div>

              <div>
                <label className="block text-white font-cairo mb-2">إجمالي المال المملوك (نقد + ودائع + ذهب + عروض تجارة)</label>
                <div className="flex items-center gap-3">
                  <span className="text-lg text-emerald-400 font-cairo">ج.م</span>
                  <input
                    type="number"
                    value={wealth}
                    onChange={(e) => setWealth(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-4 py-3 rounded-xl glass border border-emerald-800/40 bg-emerald-900/20 text-white font-mono focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-emerald-900/20 border border-emerald-800/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hawlPassed}
                  onChange={(e) => setHawlPassed(e.target.checked)}
                  className="w-5 h-5 accent-emerald-500"
                />
                <span className="text-white font-cairo text-sm">مرّ على المال حول هجري كامل (354 يوماً)</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-emerald-900/30 border border-emerald-800/40">
                  <p className="text-xs text-gray-400 font-cairo">النصاب الحالي (85 جم ذهب)</p>
                  <p className="text-xl font-bold text-emerald-300 font-cairo mt-1">{nisab.toLocaleString()} ج.م</p>
                </div>
                <div className={`p-4 rounded-xl border ${reachedNisab ? 'bg-emerald-900/30 border-emerald-700/40' : 'bg-amber-900/20 border-amber-800/40'}`}>
                  <p className="text-xs text-gray-400 font-cairo">حالة النصاب</p>
                  <p className={`text-sm font-cairo mt-1 flex items-center gap-1 ${reachedNisab ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {reachedNisab ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {reachedNisab ? 'بلغ النصاب' : `ينقصك ${(nisab - wealth).toLocaleString()} ج.م`}
                  </p>
                </div>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-emerald-600 to-transparent my-8" />

            <div className={`p-6 rounded-xl ${zakatAmount > 0 ? 'bg-emerald-900/40 border-emerald-700/40' : 'bg-gray-900/40 border-gray-700/40'} border`}>
              <p className="text-gray-400 font-cairo text-sm mb-2">الزكاة المستحقة (2.5%)</p>
              <div className="text-4xl font-bold text-emerald-400 font-cairo">
                {zakatAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ج.م
              </div>
              {zakatAmount > 0 && (
                <p className="text-emerald-300 text-sm font-cairo mt-2">✓ تجب عليك الزكاة، أخرجها للمستحقين.</p>
              )}
              {!hawlPassed && reachedNisab && (
                <p className="text-amber-300 text-sm font-cairo mt-2">⚠ بلغ المال النصاب لكن لم يمر عليه الحول الهجري بعد.</p>
              )}
              {!reachedNisab && (
                <p className="text-gray-400 text-sm font-cairo mt-2">لم يبلغ مالك النصاب، فلا زكاة عليه.</p>
              )}
            </div>
          </motion.div>
        )}

        {tab === 'fitr' && (
          <motion.div
            key="fitr"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6 md:p-8 border border-emerald-900/40 mb-6"
          >
            <div className="mb-6 p-4 rounded-xl bg-emerald-900/20 border border-emerald-800/40">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-sm font-cairo text-gray-200 space-y-1">
                  <p><span className="text-emerald-400 font-semibold">زكاة الفطر:</span></p>
                  <p>• تجب على كل مسلم: صغير وكبير، ذكر وأنثى، حر وعبد.</p>
                  <p>• مقدارها <span className="text-emerald-300">صاع ≈ 3 كجم</span> من غالب قوت البلد (أرز، قمح، شعير، تمر...).</p>
                  <p>• تُخرج قبل صلاة عيد الفطر، ويجوز تعجيلها بيوم أو يومين.</p>
                  <p>• يجوز عند بعض الفقهاء إخراج قيمتها نقداً.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-white font-cairo mb-2">عدد الأفراد في الأسرة</label>
                <input
                  type="number"
                  min={1}
                  value={persons}
                  onChange={(e) => setPersons(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-3 rounded-xl glass border border-emerald-800/40 bg-emerald-900/20 text-white font-mono focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-white font-cairo mb-2">سعر الكيلو من غالب القوت (ج.م)</label>
                <input
                  type="number"
                  value={kgPrice}
                  onChange={(e) => setKgPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-xl glass border border-emerald-800/40 bg-emerald-900/20 text-white font-mono focus:outline-none focus:border-emerald-600"
                />
                <p className="text-xs text-gray-400 font-cairo mt-1">مثال: سعر كيلو الأرز أو القمح في بلدك.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-emerald-900/30 border border-emerald-800/40">
                  <p className="text-xs text-gray-400 font-cairo">إجمالي الوزن المطلوب</p>
                  <p className="text-xl font-bold text-emerald-300 font-cairo mt-1">{fitrTotalKg} كجم</p>
                  <p className="text-xs text-gray-400 font-cairo mt-1">({persons} × 3 كجم)</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-900/30 border border-emerald-800/40">
                  <p className="text-xs text-gray-400 font-cairo">قيمتها نقداً</p>
                  <p className="text-xl font-bold text-emerald-300 font-cairo mt-1">{fitrTotal.toLocaleString()} ج.م</p>
                </div>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-emerald-600 to-transparent my-8" />

            <div className="p-6 rounded-xl bg-emerald-900/40 border border-emerald-700/40">
              <p className="text-gray-400 font-cairo text-sm mb-2">إجمالي زكاة الفطر</p>
              <div className="text-3xl md:text-4xl font-bold text-emerald-400 font-cairo">
                {fitrTotalKg} كجم <span className="text-xl text-emerald-300">أو</span> {fitrTotal.toLocaleString()} ج.م
              </div>
              <p className="text-emerald-300 text-sm font-cairo mt-2">✓ تُصرف للفقراء والمحتاجين قبل صلاة العيد.</p>
            </div>
          </motion.div>
        )}

        {/* Back */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-900/40 border border-emerald-700/40 text-emerald-400 hover:bg-emerald-900/60 transition-all"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="font-cairo">العودة للرئيسية</span>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
