import { CalendarDays, HardHat, Languages, MapPin, Users } from "lucide-react";
import type { Language, PlanForm, WorkflowStep } from "@/lib/workflow/state";

interface BrandHeaderProps {
  language: Language;
  plan: PlanForm;
  status: WorkflowStep;
  onLanguageChange: (language: Language) => void;
}

const statusCopy: Record<WorkflowStep, Record<Language, string>> = {
  describe: { en: "Shift setup", ar: "إعداد الوردية" },
  verify: { en: "Task review", ar: "مراجعة المهام" },
  conditions: { en: "Conditions review", ar: "مراجعة الظروف" },
  results: { en: "Plan generated", ar: "تم إنشاء الخطة" },
};

export function BrandHeader({ language, plan, status, onLanguageChange }: BrandHeaderProps) {
  const unknown = language === "ar" ? "غير محدد" : "Not set";
  return (
    <header className="operations-header print:hidden">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <span className="brand-mark" aria-hidden="true"><HardHat className="size-5" /></span>
          <div>
            <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[var(--steel-600)]">Field operations planning</p>
            <p className="text-lg font-black leading-tight">HeatShift <span aria-hidden="true">/</span> <span lang="ar" dir="rtl">وردية آمنة</span></p>
          </div>
        </div>

        <dl className="header-facts">
          <div><dt><MapPin aria-hidden="true" />{language === "ar" ? "الموقع" : "Site"}</dt><dd>{plan.siteName || unknown}{plan.location ? ` · ${plan.location.name}` : ""}</dd></div>
          <div><dt><CalendarDays aria-hidden="true" />{language === "ar" ? "التاريخ" : "Shift date"}</dt><dd dir="ltr">{plan.shiftDate || unknown}</dd></div>
          <div><dt><Users aria-hidden="true" />{language === "ar" ? "الفريق" : "Crew"}</dt><dd>{plan.crewSize || "—"}</dd></div>
          <div><dt>{language === "ar" ? "الحالة" : "Status"}</dt><dd className="status-value">{statusCopy[status][language]}</dd></div>
        </dl>

        <div role="group" aria-label="Language selection" className="language-switch">
          <Languages aria-hidden="true" className="size-4" />
          <button type="button" aria-label="English" aria-pressed={language === "en"} onClick={() => onLanguageChange("en")}>EN</button>
          <button type="button" aria-label="العربية" aria-pressed={language === "ar"} onClick={() => onLanguageChange("ar")} lang="ar">عربي</button>
        </div>
      </div>
    </header>
  );
}
