import type { ScheduleResult } from "../domain/scheduler-types";
import type { ShiftPlan, SiteConditions } from "../domain/types";

export interface HydrationPlan {
  kind: "rates";
  wordingEn: string;
  wordingAr: string;
  detailsEn: string;
  detailsAr: string;
}

export function buildHydrationPlan(_plan: ShiftPlan, result: ScheduleResult): HydrationPlan {
  const rateLine = (workload: "light" | "heavy") => {
    const guidance = result.metrics.hydrationPlanning[workload];
    const name = workload === "light" ? "Light" : "Heavy";
    if (guidance.kind === "range") return `${name}: Plan ${guidance.minimumLitersPerHour.toFixed(1)}–${guidance.maximumLitersPerHour.toFixed(1)} L per worker per hour.`;
    if (guidance.kind === "minimum") return `${name}: Plan at least ${guidance.minimumLitersPerHour.toFixed(1)} L per worker per hour.${guidance.personalBottleWarning ? " A personal two-liter bottle warning applies." : ""}`;
    return `${name}: No configured ${workload}-work rate is available for the selected zone; guidance remains preliminary.`;
  };
  const rateLineAr = (workload: "light" | "heavy") => {
    const guidance = result.metrics.hydrationPlanning[workload];
    const name = workload === "light" ? "العمل الخفيف" : "العمل الثقيل";
    if (guidance.kind === "range") return `${name}: خطط لـ ${guidance.minimumLitersPerHour.toFixed(1)}–${guidance.maximumLitersPerHour.toFixed(1)} لتر لكل عامل في الساعة.`;
    if (guidance.kind === "minimum") return `${name}: خطط لما لا يقل عن ${guidance.minimumLitersPerHour.toFixed(1)} لتر لكل عامل في الساعة.${guidance.personalBottleWarning ? " ينطبق تحذير توفير عبوة شخصية بسعة لترين." : ""}`;
    return `${name}: لا يتوفر معدل مهيأ لهذا النطاق؛ تظل الإرشادات أولية.`;
  };
  const wordingEn = `${rateLine("light")} ${rateLine("heavy")}`;
  return {
    kind: "rates",
    wordingEn,
    wordingAr: `${rateLineAr("light")} ${rateLineAr("heavy")}`,
    detailsEn: "Source-supported planning rates are shown per worker per hour by workload. No exact crew total is calculated. Adjust through appropriate on-site procedures. This is planning guidance, not a medical prescription.",
    detailsAr: "تُعرض معدلات التخطيط المدعومة بالمصدر لكل عامل في الساعة حسب عبء العمل. لا يتم حساب إجمالي دقيق للفريق. هذه إرشادات تخطيط وليست وصفة طبية.",
  };
}

export function buildBriefings(plan: ShiftPlan, conditions: SiteConditions, result: ScheduleResult): { en: string[]; ar: string[] } {
  const restriction = result.blocks.some((block) => block.type === "restriction");
  const cycles = conditions.twlZone === "high" ? "heavy 20 work / 40 rest; light 45 work / 15 rest" : conditions.twlZone === "intermediate" ? "heavy 45 work / 15 rest; light continuous" : "continuous work guidance";
  const cyclesAr = conditions.twlZone === "high" ? "للعمل الثقيل 20 عمل / 40 راحة؛ وللعمل الخفيف 45 عمل / 15 راحة" : conditions.twlZone === "intermediate" ? "للعمل الثقيل 45 عمل / 15 راحة؛ والعمل الخفيف متواصل" : "إرشادات العمل المتواصل";
  const hydration = buildHydrationPlan(plan, result);
  const newWorkerWarning = (conditions.twlZone === "high" || conditions.twlZone === "intermediate") && plan.nonAcclimatizedWorkers > 0;
  const regulation = result.regulatoryGuidanceAvailable
    ? (restriction ? "Direct-sun work is restricted from 12:00–15:00." : "No 2026 restriction block applies to this shift.")
    : "No verified HeatShift restriction configuration is available for this date.";
  return {
    en: [
      `${plan.siteName} — ${plan.shiftDate}. Shift ${plan.shiftStart}–${plan.shiftEnd}.`,
      regulation,
      conditions.measurementMode === "onsite_twl" ? `Supervisor-entered TWL zone: ${conditions.twlZone}.` : "Forecast-only mode: exact recovery cycles are not based on a supervisor-entered TWL zone.",
      result.isPreliminary ? "Some regulatory or work/rest guidance remains preliminary." : `Applied work/rest guidance: ${cycles}.`,
      hydration.wordingEn,
      newWorkerWarning ? `${plan.nonAcclimatizedWorkers} non-acclimatized worker(s) require supervisor review, reassignment, or intervention.` : "No non-acclimatized-worker warning was generated for the selected TWL zone.",
      result.metrics.unscheduledMinutes ? `${result.metrics.unscheduledMinutes} minutes remain unscheduled.` : "All requested work was placed.",
      "Emergency escalation reminder: stop work and follow qualified site emergency procedures when warning signs or changing conditions require it.",
      "Planning aid only. Verify conditions using qualified on-site safety procedures.",
    ],
    ar: [
      `${plan.siteName} — ${plan.shiftDate}. الوردية ${plan.shiftStart}–${plan.shiftEnd}.`,
      result.regulatoryGuidanceAvailable ? (restriction ? "يُقيّد العمل تحت الشمس المباشرة من 12:00 إلى 15:00." : "لا تنطبق فترة تقييد 2026 على هذه الوردية.") : "لا يتوفر إعداد تقييد موثّق في HeatShift لهذا التاريخ.",
      conditions.measurementMode === "onsite_twl" ? `نطاق TWL أدخله المشرف: ${conditions.twlZone}.` : "وضع التوقعات فقط: دورات التعافي الدقيقة لا تستند إلى نطاق TWL أدخله المشرف.",
      result.isPreliminary ? "تظل بعض إرشادات التنظيم أو العمل والراحة أولية." : `إرشادات العمل والراحة المطبقة: ${cyclesAr}.`,
      hydration.wordingAr,
      newWorkerWarning ? `يحتاج ${plan.nonAcclimatizedWorkers} من العمال غير المتأقلمين إلى مراجعة المشرف أو إعادة التوزيع أو التدخل.` : "لم يصدر تحذير للعمال غير المتأقلمين للنطاق المحدد.",
      result.metrics.unscheduledMinutes ? `تبقى ${result.metrics.unscheduledMinutes} دقيقة غير مجدولة.` : "تم وضع كل العمل المطلوب.",
      "تذكير بالتصعيد في حالات الطوارئ: أوقف العمل واتبع إجراءات الطوارئ المؤهلة في الموقع عند ظهور علامات تحذير أو تغير الظروف.",
      "أداة مساعدة للتخطيط فقط. تحقق من الظروف باستخدام إجراءات سلامة ميدانية مؤهلة.",
    ],
  };
}
