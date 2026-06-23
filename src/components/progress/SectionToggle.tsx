import { Eye, EyeOff } from 'lucide-react';

interface Props {
  visible: boolean;
  onToggle: () => void;
  label: string;
}

export default function SectionToggle({ visible, onToggle, label }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={visible}
      aria-label={visible ? `إخفاء ${label}` : `إظهار ${label}`}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-900 text-emerald-400 hover:text-white hover:border-emerald-700 transition-colors text-[11px] font-cairo"
    >
      {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      {visible ? 'إخفاء' : 'إظهار'}
    </button>
  );
}
