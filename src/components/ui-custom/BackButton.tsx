import { useRouter, useLocation } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export function BackButton() {
  const router = useRouter();
  const location = useLocation();

  // Hide on home page
  if (location.pathname === "/") return null;

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/" });
    }
  };

  return (
    <div className="fixed top-20 right-4 z-40 md:top-24 md:right-6" dir="rtl">
      <button
        onClick={handleBack}
        aria-label="رجوع"
        className="group flex items-center gap-2 rounded-full border border-emerald-800 bg-emerald-950 px-4 py-2 text-sm font-cairo text-emerald-100 transition-colors hover:brightness-125"
        style={{ isolation: 'isolate', contain: 'paint', transform: 'translateZ(0)', willChange: 'transform', boxShadow: 'none', backgroundImage: 'none', filter: 'none', backdropFilter: 'none', WebkitBackdropFilter: 'none' }}
      >
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        <span>رجوع</span>
      </button>
    </div>
  );
}
