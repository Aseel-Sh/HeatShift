import type { Language } from "@/lib/workflow/state";

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
      <path className="logo-frame" d="M5 2.75h22l2.25 2.25v22L27 29.25H5L2.75 27V5L5 2.75Z" />
      <path className="logo-sun" d="M9 14a7 7 0 0 1 14 0M16 5.5v2M8.5 9l1.7 1M23.5 9l-1.7 1" />
      <path className="logo-bars" d="M7 17.25h15M10 21h15M7 24.75h15" />
      <path className="logo-shift" d="m22 15.25 3 2-3 2" />
    </svg>
  );
}

export function HeatShiftWordmark({ language, compact = false }: { language: Language; compact?: boolean }) {
  const name = language === "ar" ? "وردية آمنة" : "HeatShift";
  return (
    <div className={`heatshift-wordmark ${compact ? "compact" : ""}`} aria-label={name}>
      <span className="brand-mark"><LogoMark /></span>
      <span className="wordmark-copy" lang={language === "ar" ? "ar" : "en"} dir={language === "ar" ? "rtl" : "ltr"}>{name}</span>
    </div>
  );
}
