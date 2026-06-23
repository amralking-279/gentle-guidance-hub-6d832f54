import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Sparkles, AlertTriangle, FileText, Tag } from 'lucide-react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import {
  checkForUpdate,
  getSkippedVersion,
  setSkippedVersion,
  type RemoteVersionInfo,
} from '@/lib/native/updateChecker';

export function UpdateModal() {
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState<RemoteVersionInfo | null>(null);
  const [current, setCurrent] = useState('');
  const [mandatory, setMandatory] = useState(false);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const result = await checkForUpdate();
      if (!mounted) return;
      if (!result.hasUpdate || !result.remote) return;
      if (!result.isMandatory && getSkippedVersion() === result.remote.version) return;
      setRemote(result.remote);
      setCurrent(result.currentVersion);
      setMandatory(result.isMandatory);
      setOpen(true);
    };
    const t = setTimeout(run, 1500);
    return () => { mounted = false; clearTimeout(t); };
  }, []);

  const close = () => {
    if (remote && !mandatory) setSkippedVersion(remote.version);
    setOpen(false);
  };

  const handleDownload = async () => {
    if (!remote) return;
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url: remote.apk_url });
    } else {
      try {
        window.open(remote.apk_url, '_system');
      } catch {
        window.location.href = remote.apk_url;
      }
    }
  };

  return (
    <AnimatePresence>
      {open && remote && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          dir="rtl"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="w-full max-w-md rounded-2xl border border-emerald-800 bg-[#06140a] p-6 relative"
          >
            {!mandatory && (
              <button
                onClick={close}
                className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-gray-950 border border-gray-800 hover:brightness-125 text-gray-300 flex items-center justify-center"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-900 border border-emerald-800 flex items-center justify-center shrink-0">
                {mandatory ? (
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                ) : (
                  <Sparkles className="w-6 h-6 text-emerald-300" />
                )}
              </div>
              <div>
                <h3 className="text-white font-cairo font-bold text-lg">
                  {mandatory ? 'تحديث إلزامي مطلوب' : 'تحديث جديد متاح'}
                </h3>
                <p className="text-emerald-400 text-xs font-cairo mt-0.5">
                  الإصدار {current} ← {remote.version}
                </p>
              </div>
            </div>

            {remote.message && (
              <p className="text-gray-200 font-cairo text-sm leading-relaxed mb-4">
                {remote.message}
              </p>
            )}

            {remote.changelog && remote.changelog.length > 0 && (
              <div className="rounded-lg bg-emerald-950/40 border border-emerald-900/60 p-3 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-emerald-300" />
                  <span className="text-emerald-300 font-cairo font-semibold text-xs">
                    ما الجديد في هذا الإصدار
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {remote.changelog.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Tag className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <span className="text-emerald-100 font-cairo text-xs leading-relaxed">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {remote.released_at && (
              <p className="text-gray-500 font-cairo text-[10px] mb-4">
                تاريخ الإصدار: {remote.released_at}
              </p>
            )}

            <div className="rounded-lg bg-amber-950/30 border border-amber-900/40 p-3 mb-5">
              <p className="text-amber-200 font-cairo text-xs leading-relaxed">
                {mandatory
                  ? 'هذا التحديث مطلوب للاستمرار في استخدام التطبيق. يرجى تحميله وتثبيته الآن.'
                  : 'سيتم تحميل ملف التحديث (APK) من الموقع الرسمي. بعد انتهاء التحميل افتح الملف من إشعار التحميل لتثبيته.'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-cairo font-semibold text-sm rounded-lg px-4 py-3 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                تحميل التحديث
              </button>
              {!mandatory && (
                <button
                  onClick={close}
                  className="bg-gray-900 border border-gray-800 hover:brightness-125 text-gray-200 font-cairo text-sm rounded-lg px-4 py-3 transition-colors"
                >
                  لاحقاً
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
