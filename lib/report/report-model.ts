import type { ScheduleResult } from "../domain/scheduler-types";
import type { ShiftPlan, SiteConditions, Workload } from "../domain/types";

function minutes(time: string): number { const [hour, minute] = time.split(":").map(Number); return hour * 60 + minute; }
function round(value: number): number { return Math.ceil(value * 10) / 10; }

export type HydrationPlan =
  | { kind: "preliminary"; minimumLiters: null; maximumLiters: null; wordingEn: string; wordingAr: string; detailsEn: string; detailsAr: string }
  | { kind: "minimum" | "range"; minimumLiters: number; maximumLiters: number | null; wordingEn: string; wordingAr: string; detailsEn: string; detailsAr: string };

export function buildHydrationPlan(plan: ShiftPlan, result: ScheduleResult): HydrationPlan {
  const outdoor = result.blocks.filter((block) => block.type === "work" && block.environment !== "conditioned_indoor");
  const hasUnspecifiedGuidance = outdoor.some((block) => result.metrics.hydrationPlanning[block.workload as Workload].kind === "preliminary");
  if (result.isPreliminary || outdoor.length === 0 || hasUnspecifiedGuidance) return {
    kind: "preliminary", minimumLiters: null, maximumLiters: null,
    wordingEn: "Hydration quantity remains preliminary until site conditions and exposure are verified.",
    wordingAr: "تظل كمية الترطيب أولية حتى يتم التحقق من ظروف الموقع ومدة التعرض.",
    detailsEn: "No exact crew quantity is stated because the selected guidance does not provide a precise site-verified rate.",
    detailsAr: "لا يتم ذكر كمية دقيقة للفريق لأن الإرشادات المحددة لا توفر معدلًا دقيقًا موثقًا من الموقع.",
  };
  let minimum = 0; let maximum = 0; let allRanges = true;
  for (const block of outdoor) {
    const workload = block.workload as Workload;
    const guidance = result.metrics.hydrationPlanning[workload];
    if (guidance.kind === "preliminary") continue;
    const exposureHours = (minutes(block.end) - minutes(block.start)) / 60;
    minimum += exposureHours * plan.crewSize * guidance.minimumLitersPerHour;
    if (guidance.kind === "range") maximum += exposureHours * plan.crewSize * guidance.maximumLitersPerHour;
    else allRanges = false;
  }
  const minimumLiters = round(minimum); const maximumLiters = allRanges ? round(maximum) : null;
  const wordingEn = maximumLiters === null
    ? `Plan for at least ${minimumLiters} liters across the crew for the scheduled exposure, with on-site adjustment required.`
    : `Plan a range of ${minimumLiters}–${maximumLiters} liters across the crew for the scheduled exposure, with on-site adjustment required.`;
  const wordingAr = maximumLiters === null
    ? `خطط لما لا يقل عن ${minimumLiters} لتر للفريق خلال التعرض المجدول، مع ضرورة التعديل في الموقع.`
    : `خطط لنطاق ${minimumLiters}–${maximumLiters} لتر للفريق خلال التعرض المجدول، مع ضرورة التعديل في الموقع.`;
  return { kind: maximumLiters === null ? "minimum" : "range", minimumLiters, maximumLiters, wordingEn, wordingAr,
    detailsEn: `Calculated per scheduled outdoor work block: exposure hours × ${plan.crewSize} workers × the applicable planning rate. Rest and cooled indoor blocks are excluded. This is planning guidance, not an exact medical prescription.`,
    detailsAr: `يُحسب لكل فترة عمل خارجية مجدولة: ساعات التعرض × ${plan.crewSize} عمال × معدل التخطيط المطبق. تُستبعد فترات الراحة والعمل الداخلي. هذه إرشادات تخطيط وليست وصفة طبية دقيقة.` };
}

export function buildBriefings(plan: ShiftPlan, conditions: SiteConditions, result: ScheduleResult): { en: string[]; ar: string[] } {
  const restriction = result.blocks.some((block) => block.type === "restriction");
  const cycles = conditions.twlZone === "high" ? "heavy 20 work / 40 rest; light 45 work / 15 rest" : conditions.twlZone === "intermediate" ? "heavy 45 work / 15 rest; light continuous" : "continuous work guidance";
  const cyclesAr = conditions.twlZone === "high" ? "الثقيل 20 عمل / 40 راحة؛ الخفيف 45 عمل / 15 راحة" : conditions.twlZone === "intermediate" ? "الثقيل 45 عمل / 15 راحة؛ الخفيف متواصل" : "إرشادات العمل المتواصل";
  const hydration = buildHydrationPlan(plan, result);
  const newWorkerWarning = conditions.twlZone === "high" && plan.nonAcclimatizedWorkers > 0;
  return {
    en: [
      `${plan.siteName} — ${plan.shiftDate}. Shift ${plan.shiftStart}–${plan.shiftEnd}.`,
      restriction ? "Direct-sun work is restricted from 12:00–15:00." : "No seasonal midday restriction block was generated for this plan.",
      conditions.measurementMode === "onsite_twl" ? `Site-verified input selected: TWL ${conditions.twlZone}.` : "Forecast-only mode: exact recovery cycles are not site verified.",
      result.isPreliminary ? "No exact work/rest cycle was applied." : `Applied work/rest guidance: ${cycles}.`,
      hydration.wordingEn,
      newWorkerWarning ? `${plan.nonAcclimatizedWorkers} non-acclimatized workers require reassignment or supervisor intervention.` : "No high-TWL new-worker warning was generated.",
      result.metrics.unscheduledMinutes ? `${result.metrics.unscheduledMinutes} minutes remain unscheduled.` : "All requested work was placed.",
      "Emergency escalation reminder: stop work and follow qualified site emergency procedures when warning signs or changing conditions require it.",
      "Planning aid only. Verify conditions using qualified on-site safety procedures.",
    ],
    ar: [
      `${plan.siteName} — ${plan.shiftDate}. الوردية ${plan.shiftStart}–${plan.shiftEnd}.`,
      restriction ? "يُقيّد العمل تحت الشمس المباشرة من 12:00 إلى 15:00." : "لم يتم إنشاء فترة تقييد موسمية لمنتصف النهار لهذه الخطة.",
      conditions.measurementMode === "onsite_twl" ? `تم اختيار إدخال موثق من الموقع: نطاق TWL ${conditions.twlZone}.` : "وضع التوقعات فقط: دورات التعافي الدقيقة غير موثقة من الموقع.",
      result.isPreliminary ? "لم تُطبق دورة عمل وراحة دقيقة." : `إرشادات العمل والراحة المطبقة: ${cyclesAr}.`,
      hydration.wordingAr,
      newWorkerWarning ? `يحتاج ${plan.nonAcclimatizedWorkers} من العمال غير المتأقلمين إلى إعادة توزيع أو تدخل المشرف.` : "لم يصدر تحذير للعمال الجدد في نطاق TWL مرتفع.",
      result.metrics.unscheduledMinutes ? `تبقى ${result.metrics.unscheduledMinutes} دقيقة غير مجدولة.` : "تم وضع كل العمل المطلوب.",
      "تذكير بالتصعيد في حالات الطوارئ: أوقف العمل واتبع إجراءات الطوارئ المؤهلة في الموقع عند ظهور علامات تحذير أو تغير الظروف.",
      "أداة مساعدة للتخطيط فقط. تحقق من الظروف باستخدام إجراءات سلامة ميدانية مؤهلة.",
    ],
  };
}
