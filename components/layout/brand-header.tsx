import { HardHat, Languages } from "lucide-react";
import type { Language } from "@/lib/workflow/state";

export function BrandHeader({ language, onLanguageChange }: { language: Language; onLanguageChange: (language: Language) => void }) {
  return <header className="border-b border-[var(--sand-300)] bg-[color:rgba(251,247,239,0.94)]">
    <div className="mx-auto flex min-h-20 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
      <a href="#main-content" className="sr-only rounded bg-white px-3 py-2 focus:not-sr-only focus:absolute focus:left-4 focus:top-4">Skip to main content</a>
      <div className="flex items-center gap-3" aria-label="HeatShift home"><span className="flex size-10 items-center justify-center rounded-lg bg-[var(--navy-950)] text-amber-400"><HardHat aria-hidden="true" className="size-5" /></span><div><p className="font-bold leading-tight">HeatShift</p><p className="text-sm leading-tight text-[var(--navy-600)]" lang="ar" dir="rtl">وردية آمنة</p></div></div>
      <div role="group" aria-label="Language selection" className="flex items-center gap-1 rounded-lg border border-[var(--sand-300)] bg-white p-1 text-sm font-semibold"><Languages aria-hidden="true" className="mx-1 size-4 text-[var(--navy-600)]" />
        <button type="button" aria-label="English" aria-pressed={language === "en"} onClick={() => onLanguageChange("en")} className={`rounded-md px-2.5 py-1.5 ${language === "en" ? "bg-[var(--navy-950)] text-white" : "text-[var(--navy-700)]"}`}>EN</button>
        <button type="button" aria-label="العربية" aria-pressed={language === "ar"} onClick={() => onLanguageChange("ar")} lang="ar" className={`rounded-md px-2.5 py-1.5 ${language === "ar" ? "bg-[var(--navy-950)] text-white" : "text-[var(--navy-700)]"}`}>عربي</button>
      </div>
    </div>
  </header>;
}
