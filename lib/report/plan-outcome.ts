import { isWorkActivity, type ShiftPlan, type SiteConditions } from "../domain/types";
import { evaluateMiddayRestriction } from "../domain/midday-restriction";
import type { ScheduleResult } from "../domain/scheduler-types";
import { formatDuration } from "../workflow/format-duration";

export interface PlanOutcome {
  changed: string[];
  incomplete: string[];
  reasons: string[];
  nextActions: string[];
}

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));

export function buildPlanOutcome(plan: ShiftPlan, conditions: SiteConditions, result: ScheduleResult, language: "en" | "ar"): PlanOutcome {
  const changed: string[] = [];
  const middayRestrictionActive = evaluateMiddayRestriction({
    date: plan.shiftDate,
    time: "12:00",
    environment: "direct_sun",
  }).restrictedWindowActive;
  for (const task of plan.tasks) {
    const blocks = result.blocks.filter((block) => block.taskId === task.id && (block.type === "work" || block.type === "break" || block.type === "meal"));
    if (!blocks.length) continue;
    const name = language === "ar" ? task.nameAr : task.nameEn;
    const overlapsRestriction = isWorkActivity(task) && task.environment === "direct_sun" && task.requestedStart && task.requestedEnd && task.requestedStart < "15:00" && task.requestedEnd > "12:00";
    if (middayRestrictionActive && overlapsRestriction && blocks.every((block) => block.end <= "12:00" || block.start >= "15:00")) {
      changed.push(language === "ar" ? `نُقل ${name} خارج تقييد الشمس المباشرة 12:00–15:00.` : `${name} was moved outside the 12:00–15:00 direct-sun restriction.`);
    } else if (task.requestedStart && blocks[0].start !== task.requestedStart) {
      const delta = minutes(blocks[0].start) - minutes(task.requestedStart);
      changed.push(language === "ar" ? `نُقل ${name} بمقدار ${formatDuration(Math.abs(delta), "ar")} ${delta < 0 ? "أبكر" : "لاحقًا"}.` : `${name} moved ${formatDuration(Math.abs(delta))} ${delta < 0 ? "earlier" : "later"}.`);
    }
    if (blocks.filter((block) => block.type === "work").length > 1) changed.push(language === "ar" ? `قُسّم ${name} إلى فترات عمل متعددة.` : `${name} was split into multiple work periods.`);
  }
  const mustComplete = plan.tasks.filter((task) => isWorkActivity(task) && task.mustSchedule);
  if (mustComplete.length) changed.push(language === "ar" ? `${mustComplete.map((task) => task.nameAr).join("، ")} محدد كعمل مطلوب اليوم وأُعطي الأولوية قبل العمل العادي.` : `${mustComplete.map((task) => task.nameEn).join(", ")} is marked Required today and was prioritized before normal work.`);
  if (!changed.length) changed.push(language === "ar" ? "حُفظت الأنشطة المجدولة ضمن توقيتها المطلوب حيث أمكن." : "Scheduled activities were kept at their requested times where capacity allowed.");

  const incomplete = result.unscheduled.map((item) => {
    const task = plan.tasks.find((candidate) => candidate.id === item.taskId);
    const name = language === "ar" ? task?.nameAr ?? item.taskName : task?.nameEn ?? item.taskName;
    return language === "ar" ? `${name}: يتبقى ${formatDuration(item.unscheduledMinutes, "ar")} دون جدولة.` : `${name}: ${formatDuration(item.unscheduledMinutes)} remains unscheduled.`;
  });
  if (!incomplete.length) incomplete.push(language === "ar" ? "لم يتبق عمل غير مجدول." : "No work remains unscheduled.");

  const reasons: string[] = [];
  if (result.blocks.some((block) => block.type === "restriction")) reasons.push(language === "ar" ? "أُبعد العمل تحت الشمس المباشرة عن فترة التقييد 12:00–15:00." : "Direct-sun work was kept outside the 12:00–15:00 restriction.");
  if (conditions.twlZone === "none") reasons.push(language === "ar" ? "لم تُطبّق دورات تعافٍ دقيقة لعدم إدخال TWL من الموقع." : "Exact recovery cycles were not applied because no site TWL was entered.");
  else if (conditions.twlZone === "low") reasons.push(language === "ar" ? "يوفر نطاق TWL المنخفض إرشاد عمل متواصل؛ لم تُفرض فترات تعافٍ دورية." : "Low TWL provides continuous-work guidance, so no cyclic recovery blocks were imposed.");
  else reasons.push(language === "ar" ? "طُبّقت دورة العمل والتعافي المحددة زمنيًا حسب نطاق TWL الذي أدخله المشرف." : "Timed work/recovery cycles were applied from the supervisor-entered TWL zone.");
  if (plan.tasks.some((task) => (task.predecessorTaskIds?.length ?? 0) > 0)) reasons.push(language === "ar" ? "حُفظ تسلسل الإنشاء المؤكد؛ لم يبدأ أي نشاط تابع قبل اكتمال سابقه." : "Confirmed construction sequence was preserved; no successor began before its predecessor was complete.");
  if (result.unscheduled.some((item) => item.reasonCode.includes("DEPENDENCY"))) reasons.push(language === "ar" ? "بقيت الأنشطة التابعة دون جدولة عندما لم يكتمل النشاط السابق." : "Dependent activities remained unscheduled when their predecessor could not be completed.");
  if (plan.tasks.some((task) => isWorkActivity(task) && task.mustSchedule)) reasons.push(language === "ar" ? "أُعطيت الأولوية للعمل المؤكد المطلوب اليوم قبل العمل العادي، دون خرق القيود أو قواعد التعافي أو التوقيت الثابت أو التبعيات." : "Required-today activities were prioritized before normal activities without overriding restrictions, recovery rules, fixed timing, or dependencies.");

  const nextActions: string[] = [];
  if (result.unscheduled.length) {
    nextActions.push(language === "ar" ? "مدّد نافذة الوردية أو انقل العمل العادي غير المجدول إلى وردية أخرى." : "Extend the shift window or move normal-priority unscheduled work to another shift.");
    nextActions.push(language === "ar" ? "راجع بيئة العمل والتبعيات المؤكدة فقط إذا تغيّرت ظروف الموقع فعليًا." : "Revise confirmed work areas or dependencies only if site conditions genuinely change.");
  }
  if (conditions.twlZone === "none") nextActions.push(language === "ar" ? "أدخل قراءة TWL مناسبة من الموقع قبل الاعتماد على دورات تعافٍ دقيقة." : "Enter an appropriate site TWL reading before relying on exact recovery cycles.");
  if (plan.tasks.some((task) => !isWorkActivity(task) && task.recoveryEligibility === "unknown")) nextActions.push(language === "ar" ? "أكد ما إذا كانت الاستراحات والوجبات مؤهلة للتعافي في منطقة مظللة أو مبرّدة." : "Confirm whether breaks and meals are recovery-eligible in an appropriate shaded or cooled area.");
  if (!nextActions.length) nextActions.push(language === "ar" ? "تحقق من الظروف في الموقع ونفّذ إحاطة المشرف قبل بدء الوردية." : "Verify conditions on site and complete the supervisor briefing before the shift.");
  return { changed, incomplete, reasons, nextActions };
}
