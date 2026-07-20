"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertOctagon,
  ArrowLeft,
  CalendarDays,
  Clock3,
  Droplets,
  MapPin,
  Printer,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Users,
} from "lucide-react";
import { OFFICIAL_SOURCES, SOURCE_IDS } from "@/data/official-sources";
import { evaluateOriginalPlan, type OriginalPlanConflict } from "@/lib/domain/original-plan";
import type { ScheduleBlock, ScheduleResult } from "@/lib/domain/scheduler-types";
import { isWorkActivity,type ForecastHour, type ScheduleActivity, type ShiftPlan, type SiteConditions } from "@/lib/domain/types";
import {
  displayEnvironment,
  displayOriginalFinding,
  displayReason,
  displayTwlZone,
  displayWorkload,
} from "@/lib/i18n/operations-display";
import { buildBriefings, buildHydrationPlan } from "@/lib/report/report-model";
import { buildPlanOutcome } from "@/lib/report/plan-outcome";
import { activityType, associatedBlocks, forecastRibbonPoints, idleBlocks, timeToMinutes } from "@/lib/report/timeline-model";
import { classifyForecastTemperature } from "@/lib/domain/temperature-category";
import { formatDuration } from "@/lib/workflow/format-duration";
import type { ForecastSource, Language, PlanSource } from "@/lib/workflow/state";
import { saudiTimeZoneSentence } from "@/lib/i18n/saudi-time";

interface ResultsPageProps {
  language: Language;
  plan: ShiftPlan;
  conditions: SiteConditions;
  result: ScheduleResult;
  forecast: ForecastHour[];
  planSource: PlanSource;
  forecastSource: ForecastSource;
  onEditPlan: () => void;
  onChangeConditions: () => void;
  onRecalculate: () => void;
  onStartOver: () => void;
}

type Selection = { kind: "requested"; id: string } | { kind: "scheduled"; id: string } | null;

const copy = {
  en: {
    title: "Generated safer schedule",
    preliminary: "Preliminary",
    twlEntered: "Supervisor-entered TWL",
    disclaimer: "Planning aid only. This report does not guarantee safety or regulatory compliance. Verify conditions through qualified on-site procedures.",
    requestedWork: "Requested work",
    scheduledWork: "Scheduled work",
    recovery: "Recovery",
    unscheduled: "Unscheduled",
    peak: "Peak shift temperature",
    rules: "Rules applied",
    candidates: "Candidates evaluated",
    strategy: "Selected strategy",
    mustComplete: "Required-today work completed",
    otherWork: "Other scheduled work",
    breakMeal: "Break / meal",
    movement: "Movement from original requested plan",
    splits: "Splits",
    capacity: "This shift cannot accommodate all planned work under the selected conditions.",
    workers: "Affected non-acclimatized workers need reassignment or supervisor intervention.",
    requestedPlan: "Original requested plan",
    saferPlan: "Generated safer schedule",
    restriction: "12:00–15:00 direct-sun restriction",
    notSpecified: "Time not specified",
    selectBlock: "Select a block for movement and rule details.",
    blockDetails: "Block details",
    originalTime: "Original time",
    plannedTime: "Planned time",
    workload: "Workload",
    environment: "Work area",
    ruleApplied: "Rule applied",
    source: "Source",
    movedBecause: "Planning consequence",
    noMove: "Retained or placed within available crew capacity.",
    moved: "Moved or split to respect the selected conditions and available crew capacity.",
    textAlternative: "Timeline text alternative",
    findings: "Original requested-plan and capacity findings",
    noFindings: "No original requested-plan conflicts detected.",
    hydration: "Hydration planning rates",
    briefing: "Supervisor briefing",
    sources: "Source references",
    noEndorsement: "Source listing supports configured rules and does not imply endorsement of HeatShift.",
    edit: "Edit plan",
    change: "Change conditions",
    recalculate: "Recalculate",
    startOver: "Start over",
    print: "Print supervisor report",
    minutes: "min",
    crew: "crew",
    work: "Work",
    rest: "Recovery",
    breakActivity:"Break",
    meal:"Meal",
    critical: "Critical",
    warning: "Warning",
    info: "Information",
    unknownSource: "HeatShift deterministic planning rule",
    noRegulation: "No verified HeatShift restriction configuration is available for this date.",
    sample: "Sample shift",
    extracted: "Imported plan",
    manual: "Manual plan",
    forecastLive: "Live coordinate forecast",
    forecastSample: "Sample coordinate forecast",
    forecastNone: "No forecast data",
    fitShift: "Fit shift",
    oneHour: "1 hour",
    thirtyMinutes: "30 minutes",
    zoom: "Timeline scale",
    scaleHelp: "Fit shift shows an overview. Use 1 hour or 30 minutes for task details.",
    scrollHint: "Swipe horizontally for timeline detail",
    heat: "Forecast heat",
    apparent: "Apparent",
    lower: "Lower / caution",
    intermediate: "Intermediate",
    high: "High",
    highRisk: "High risk",
    idle: "Idle gap",
    activityType: "Activity type",
    duration: "Duration",
    timing: "Timing preference",
    fixed: "Fixed",
    preferred: "Preferred",
    flexible: "Flexible",
    mustStatus: "Priority",
    required: "Required today",
    normal: "Normal",
    notes: "Operational notes",
    consequence: "Optimization consequence",
    plannedTimes: "Planned times",
    generatedWorkTimes: "Generated work times",
    associatedRecoveryTimes: "Associated recovery times",
    scheduledDuration: "Scheduled duration",
    remainingDuration: "Remaining duration",
    unscheduledRemaining: "Not scheduled",
    untimedActivities: "Genuinely untimed activities",
    noRequestedTime: "No requested time",
    couldNotSchedule: "Could not be scheduled",
    scheduled: "Scheduled",
    remaining: "Remaining",
    reason: "Reason",
    planOutcome: "Plan outcome",
    whatChanged: "What changed?",
    whatIncomplete: "What could not be completed?",
    why: "Why?",
    nextActions: "What should the supervisor do next?",
    forecastCategory: "Forecast heat category",
    forecastContextOnly: "context only — not a TWL measurement",
    appliedTwl: "Applied TWL zone",
    selectionSummary: "HeatShift compared {count} deterministic schedule options and selected the valid option that best preserved required work, dependencies, and requested timing.",
    howSelected: "How this schedule was selected",
    hardViolations: "Hard-constraint violations",
    invalidSchedule: "Schedule generated with validation warnings. Review these warnings before using the plan.",
    lowRecovery: "0 min because the supervisor-entered Low TWL zone uses continuous-work guidance.",
    noTwlRecovery: "No site TWL: exact recovery cycles were not applied.",
    cycleRecovery: "Recovery blocks reflect the selected site-entered TWL cycle.",
    restrictionA11y: "The hatched vertical band marks 12:00 to 15:00, when configured direct-sun work is restricted.",
    supervisorActions: "Required supervisor actions",
    changeTable: "Original requested versus generated",
    activity: "Activity",
    requested: "Original requested",
    selected: "Generated",
    changeSummary: "Change",
    status: "Status",
    complete: "Fully scheduled",
    partial: "Partially scheduled",
    notScheduled: "Not scheduled",
    unchanged: "Requested timing retained",
    movedEarlier: "Moved earlier",
    movedLater: "Moved later",
    splitChange: "Split into {count} periods",
    forecastContext: "Forecast context",
    technicalSummary: "Deterministic candidate comparison; no global-optimality claim is made.",
    noCapacityChange: "Left unscheduled because no valid capacity remained",
    timelineView: "Activity schedule",
    executionList: "Crew sequence",
    requestedView: "Original requested plan view",
    generatedView: "Generated safer schedule view",
    priorityExplanation: "Required-today activities are prioritized before normal activities, but HeatShift will not violate restrictions, recovery rules, fixed timing, or dependencies to force them into the shift.",
    requiredIncomplete: "Required-today work remains incomplete.",
    dependency: "Dependency",
    noDependency: "No confirmed predecessor",
    differs: "Differs from requested time",
    retained: "Requested time retained",
    originalConflict: "Original conflict",
    noOriginalConflict: "No original conflict",
    timeZone: "Operational time zone",
  },
  ar: {
    generatedWorkTimes: "أوقات العمل المُنشأة",
    associatedRecoveryTimes: "أوقات التعافي المرتبطة",
    scheduledDuration: "المدة المجدولة",
    remainingDuration: "المدة المتبقية",
    title: "الجدول المُنشأ لوردية أكثر أمانًا",
    preliminary: "أولية",
    twlEntered: "نطاق TWL أدخله المشرف",
    disclaimer: "أداة مساعدة للتخطيط فقط. لا يضمن هذا التقرير السلامة أو الامتثال التنظيمي. تحقق من الظروف من خلال إجراءات ميدانية مؤهلة.",
    requestedWork: "العمل المطلوب",
    scheduledWork: "العمل المجدول",
    recovery: "التعافي",
    unscheduled: "غير المجدول",
    peak: "أعلى حرارة خلال الوردية",
    rules: "القواعد المطبقة",
    candidates: "الجداول المرشحة",
    strategy: "الاستراتيجية المختارة",
    mustComplete: "العمل المطلوب اليوم المنجز",
    otherWork: "العمل الآخر المجدول",
    breakMeal: "استراحة / وجبة",
    movement: "الحركة عن الخطة الأصلية المطلوبة",
    splits: "التقسيمات",
    capacity: "لا يمكن لهذه الوردية استيعاب كل العمل المخطط في ظل الظروف المحددة.",
    workers: "يحتاج العمال غير المتأقلمين المتأثرون إلى إعادة توزيع أو تدخل المشرف.",
    requestedPlan: "الخطة الأصلية المطلوبة",
    saferPlan: "الجدول المُنشأ لوردية أكثر أمانًا",
    restriction: "تقييد الشمس المباشرة 12:00–15:00",
    notSpecified: "الوقت غير محدد",
    selectBlock: "اختر فترة لعرض تفاصيل الحركة والقاعدة.",
    blockDetails: "تفاصيل الفترة",
    originalTime: "الوقت الأصلي",
    plannedTime: "الوقت المخطط",
    workload: "عبء العمل",
    environment: "منطقة العمل",
    ruleApplied: "القاعدة المطبقة",
    source: "المصدر",
    movedBecause: "نتيجة التخطيط",
    noMove: "تم الاحتفاظ بها أو وضعها ضمن سعة الفريق المتاحة.",
    moved: "نُقلت أو قُسمت لاحترام الظروف المحددة وسعة الفريق المتاحة.",
    textAlternative: "بديل نصي للمخطط الزمني",
    findings: "ملاحظات الخطة الأصلية المطلوبة والسعة",
    noFindings: "لم تُكتشف تعارضات في الخطة الأصلية المطلوبة.",
    hydration: "معدلات تخطيط الترطيب",
    briefing: "إحاطة المشرف",
    sources: "مراجع المصادر",
    noEndorsement: "يدعم إدراج المصادر القواعد المهيأة ولا يعني تأييد HeatShift.",
    edit: "تعديل الخطة",
    change: "تغيير الظروف",
    recalculate: "إعادة الحساب",
    startOver: "البدء من جديد",
    print: "طباعة تقرير المشرف",
    minutes: "دقيقة",
    crew: "الفريق",
    work: "عمل",
    rest: "تعافٍ",
    breakActivity:"استراحة",
    meal:"وجبة",
    critical: "حرج",
    warning: "تحذير",
    info: "معلومة",
    unknownSource: "قاعدة تخطيط حتمية في HeatShift",
    noRegulation: "لا يتوفر إعداد تقييد موثّق في HeatShift لهذا التاريخ.",
    sample: "وردية نموذجية",
    extracted: "خطة مستوردة",
    manual: "خطة يدوية",
    forecastLive: "توقع مباشر للإحداثيات",
    forecastSample: "توقع نموذجي للإحداثيات",
    forecastNone: "لا توجد بيانات توقعات",
    fitShift: "ملاءمة الوردية",
    oneHour: "ساعة واحدة",
    thirtyMinutes: "30 دقيقة",
    zoom: "مقياس المخطط الزمني",
    scaleHelp: "تعرض ملاءمة الوردية نظرة عامة. استخدم ساعة واحدة أو 30 دقيقة لتفاصيل الأنشطة.",
    scrollHint: "اسحب أفقياً لرؤية تفاصيل المخطط",
    heat: "حرارة التوقعات",
    apparent: "المحسوسة",
    lower: "أقل / حذر",
    intermediate: "متوسط",
    high: "مرتفع",
    highRisk: "خطر مرتفع",
    idle: "فترة غير مستخدمة",
    activityType: "نوع النشاط",
    duration: "المدة",
    timing: "تفضيل التوقيت",
    fixed: "ثابت",
    preferred: "مفضل",
    flexible: "مرن",
    mustStatus: "الأولوية",
    required: "مطلوب اليوم",
    normal: "عادي",
    notes: "ملاحظات تشغيلية",
    consequence: "نتيجة التحسين",
    plannedTimes: "الأوقات المخططة",
    unscheduledRemaining: "غير مجدول",
    untimedActivities: "أنشطة بلا توقيت فعلي",
    noRequestedTime: "لا يوجد وقت مطلوب",
    couldNotSchedule: "تعذر جدولته",
    scheduled: "المجدول",
    remaining: "المتبقي",
    reason: "السبب",
    planOutcome: "نتيجة الخطة",
    whatChanged: "ما الذي تغيّر؟",
    whatIncomplete: "ما الذي تعذر إكماله؟",
    why: "لماذا؟",
    nextActions: "ماذا يجب أن يفعل المشرف بعد ذلك؟",
    forecastCategory: "فئة حرارة التوقعات",
    forecastContextOnly: "للسياق فقط — وليست قياس TWL",
    appliedTwl: "نطاق TWL المطبق",
    selectionSummary: "قارن HeatShift بين {count} خيارات جدولة حتمية واختار الخيار الصالح الذي حافظ بأفضل شكل على العمل المطلوب والتبعيات والتوقيت المطلوب.",
    howSelected: "كيف تم اختيار هذا الجدول",
    hardViolations: "مخالفات القيود الصلبة",
    invalidSchedule: "تم إنشاء الجدول مع تحذيرات تحقق. راجع هذه التحذيرات قبل استخدام الخطة.",
    lowRecovery: "TWL منخفض: إرشاد عمل متواصل؛ لم تُطبق فترات تعافٍ دورية.",
    noTwlRecovery: "لا يوجد TWL من الموقع: لم تُطبق دورات تعافٍ دقيقة.",
    cycleRecovery: "تعكس فترات التعافي دورة TWL التي أدخلها المشرف من الموقع.",
    restrictionA11y: "يمثل الشريط الرأسي المخطط الفترة من 12:00 إلى 15:00 حيث يُقيّد العمل المهيأ تحت الشمس المباشرة.",
    supervisorActions: "إجراءات المشرف المطلوبة",
    changeTable: "مقارنة الخطة الأصلية المطلوبة بالجدول المُنشأ",
    activity: "النشاط",
    requested: "المطلوب الأصلي",
    selected: "المُنشأ",
    changeSummary: "التغيير",
    status: "الحالة",
    complete: "مجدول بالكامل",
    partial: "مجدول جزئيًا",
    notScheduled: "غير مجدول",
    unchanged: "تم الاحتفاظ بالتوقيت المطلوب",
    movedEarlier: "نُقل إلى وقت أبكر",
    movedLater: "نُقل إلى وقت لاحق",
    splitChange: "قُسّم إلى {count} فترات",
    forecastContext: "سياق التوقعات",
    technicalSummary: "مقارنة حتمية بين الجداول المرشحة؛ لا يدّعي النظام الوصول إلى أفضل حل عالمي.",
    noCapacityChange: "تُرك دون جدولة لعدم بقاء سعة صالحة",
    timelineView: "المخطط الزمني",
    executionList: "قائمة التنفيذ",
    requestedView: "عرض الخطة الأصلية المطلوبة",
    generatedView: "عرض الجدول المُنشأ لوردية أكثر أمانًا",
    priorityExplanation: "تُعطى الأنشطة المطلوبة اليوم الأولوية قبل الأنشطة العادية، لكن HeatShift لن يخرق القيود أو قواعد التعافي أو التوقيت الثابت أو التبعيات لفرضها داخل الوردية.",
    requiredIncomplete: "لا يزال عمل مطلوب اليوم غير مكتمل.",
    dependency: "التبعية",
    noDependency: "لا يوجد نشاط سابق مؤكد",
    differs: "يختلف عن الوقت المطلوب",
    retained: "تم الاحتفاظ بالوقت المطلوب",
    originalConflict: "التعارض الأصلي",
    noOriginalConflict: "لا يوجد تعارض أصلي",
    timeZone: "منطقة التوقيت التشغيلية",
  },
} as const;

const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));

export function ResultsPage(props: ResultsPageProps) {
  const { language, plan, conditions, result } = props;
  const t = copy[language];
  const [selection, setSelection] = useState<Selection>(null);
  const hydration = buildHydrationPlan(plan, result);
  const briefings = buildBriefings(plan, conditions, result);
  const originalConflicts = evaluateOriginalPlan(plan, conditions);
  const restriction = result.blocks.find((block) => block.type === "restriction");
  const highNewWorkers = conditions.twlZone === "high" && plan.nonAcclimatizedWorkers > 0;
  const requiredWorkIncomplete = result.unscheduled.some((item) => plan.tasks.find((task) => task.id === item.taskId)?.mustSchedule);
  const currentBriefing = language === "ar" ? briefings.ar : briefings.en;
  const selectedTask = selection?.kind === "requested" ? plan.tasks.find((task) => task.id === selection.id) : undefined;
  const selectedBlock = selection?.kind === "scheduled" ? result.blocks.find((block) => block.id === selection.id) : undefined;
  const selectedBlockTask = selectedBlock?.taskId ? plan.tasks.find((task) => task.id === selectedBlock.taskId) : undefined;
  const outcome = buildPlanOutcome(plan, conditions, result, language);
  const forecastCategory = result.metrics.peakForecastTemperature === null ? null : classifyForecastTemperature(result.metrics.peakForecastTemperature).category;
  const selectionSummary = t.selectionSummary.replace("{count}", String(result.optimizationSummary.candidatesEvaluated));

  return (
    <div className="results-report">
      <header className="result-status-header">
        <div><p>04 / {t.saferPlan}</p><h1>{t.title}</h1><span className="status-tag">{result.isPreliminary ? t.preliminary : t.twlEntered}</span></div>
        <dl>
          <div><dt><MapPin aria-hidden="true" />{language === "ar" ? "الموقع" : "Site"}</dt><dd>{plan.siteName} · {plan.location.name}</dd></div>
          <div><dt><CalendarDays aria-hidden="true" />{language === "ar" ? "التاريخ" : "Date"}</dt><dd dir="ltr">{plan.shiftDate}</dd></div>
          <div><dt><Clock3 aria-hidden="true" />{language === "ar" ? "الوردية" : "Shift"}</dt><dd dir="ltr">{plan.shiftStart}–{plan.shiftEnd}</dd></div>
          <div><dt><Users aria-hidden="true" />{language === "ar" ? "الفريق" : "Crew"}</dt><dd>{plan.crewSize}</dd></div>
        </dl>
        <p className="result-timezone"><strong>{t.timeZone}:</strong> {saudiTimeZoneSentence(language)}</p>
        <p className="result-disclaimer">{t.disclaimer}</p>
        <div className="result-context"><p><strong>{t.forecastCategory}:</strong> {forecastCategory ? `${displayForecastCategory(forecastCategory, language)} — ${t.forecastContextOnly}` : props.forecastSource === "none" ? t.forecastNone : "—"}</p><p><strong>{t.appliedTwl}:</strong> {displayAppliedTwl(conditions.twlZone, language)}</p><p>{props.planSource === "sample" ? t.sample : props.planSource === "ai" ? t.extracted : t.manual} · {props.forecastSource === "live" ? t.forecastLive : props.forecastSource === "sample" ? t.forecastSample : t.forecastNone}</p></div>
      </header>

      {result.optimizationSummary.hardConstraintViolations.length > 0 && <div role="alert" className="operational-alert warning"><AlertOctagon aria-hidden="true" /><div><strong>{t.invalidSchedule}</strong><ul>{result.optimizationSummary.hardConstraintViolations.map((violation) => <li key={violation}>{violation.replaceAll("_", " ")}</li>)}</ul></div></div>}
      {!result.regulatoryGuidanceAvailable && <div role="status" className="operational-alert warning"><AlertOctagon aria-hidden="true" /><strong>{t.noRegulation}</strong></div>}
      {result.metrics.unscheduledMinutes > 0 && <div role="alert" className="operational-alert critical"><AlertOctagon aria-hidden="true" /><div><strong>{t.capacity}</strong><span>{formatDuration(result.metrics.unscheduledMinutes, language)} · {t.unscheduled}</span></div></div>}
      {requiredWorkIncomplete && <div role="alert" className="operational-alert critical required-incomplete"><AlertOctagon aria-hidden="true" /><strong>{t.requiredIncomplete}</strong></div>}
      {highNewWorkers && <div role="alert" className="operational-alert critical"><ShieldAlert aria-hidden="true" /><div><strong>{t.workers}</strong><span>{plan.nonAcclimatizedWorkers} / {plan.crewSize}</span></div></div>}

      <section className="plan-outcome" aria-labelledby="plan-outcome-title"><h2 id="plan-outcome-title">{t.planOutcome}</h2><div><OutcomeList title={t.whatChanged} items={outcome.changed} /><OutcomeList title={t.whatIncomplete} items={outcome.incomplete} /><OutcomeList title={t.why} items={outcome.reasons} /></div></section>
      <section className="supervisor-actions" aria-labelledby="supervisor-actions-title"><ShieldAlert aria-hidden="true" /><div><h2 id="supervisor-actions-title">{t.supervisorActions}</h2><ul>{outcome.nextActions.map((item) => <li key={item}>{item}</li>)}</ul></div></section>
      <ChangeTable plan={plan} result={result} language={language} />

      <PlanComparison plan={plan} result={result} forecast={props.forecast} originalConflicts={originalConflicts} language={language} selection={selection} onSelect={setSelection} selectedTask={selectedTask ?? selectedBlockTask} selectedBlock={selectedBlock} restriction={restriction} />

      <section className="report-grid">
        <div className="report-panel findings-panel"><h2>{t.findings}</h2>{originalConflicts.length === 0 && result.conflicts.length === 0 ? <p>{t.noFindings}</p> : <ul>{originalConflicts.map((finding) => <OriginalFinding key={finding.id} finding={finding} language={language} />)}{result.conflicts.map((finding) => <li key={finding.id} className={`finding ${finding.severity}`}><span className="severity-label">{severityLabel(finding.severity, language)}</span><strong>{language === "ar" ? finding.titleAr : finding.titleEn}</strong><p>{language === "ar" ? finding.descriptionAr : finding.descriptionEn}</p><SourceReference sourceId={finding.sourceId} language={language} /></li>)}</ul>}</div>
        <details className="report-panel hydration-panel" open><summary><Droplets aria-hidden="true" />{t.hydration}</summary><p>{language === "ar" ? hydration.wordingAr : hydration.wordingEn}</p><small>{language === "ar" ? hydration.detailsAr : hydration.detailsEn}</small></details>
      </section>

      <section className="report-panel briefing-panel"><h2>{t.briefing}</h2><ol lang={language} dir={language === "ar" ? "rtl" : "ltr"}>{currentBriefing.map((line, index) => <li key={index}>{line}</li>)}</ol></section>
      <section className="report-panel sources-panel"><h2>{t.sources}</h2><p>{t.noEndorsement}</p><ul>{OFFICIAL_SOURCES.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a><span>{source.publisher} — {source.supports}</span></li>)}</ul></section>
      <details className="selection-details"><summary>{t.howSelected}</summary><p>{selectionSummary}</p><p>{t.priorityExplanation}</p><dl><div><dt>{t.candidates}</dt><dd>{result.optimizationSummary.candidatesEvaluated}</dd></div><div><dt>{t.strategy}</dt><dd>{displayStrategy(result.optimizationSummary.selectedStrategy, language)}</dd></div><div><dt>{t.hardViolations}</dt><dd>{result.optimizationSummary.hardConstraintViolations.length}</dd></div><div><dt>{t.movement}</dt><dd>{formatDuration(result.optimizationSummary.movementMinutes, language)}</dd></div><div><dt>{t.splits}</dt><dd>{result.optimizationSummary.splitCount}</dd></div></dl><p>{language === "ar" ? t.technicalSummary : result.explanationSummary}</p></details>
      <div className="report-actions"><button className="button-secondary" onClick={props.onEditPlan}><ArrowLeft aria-hidden="true" />{t.edit}</button><button className="button-secondary" onClick={props.onChangeConditions}>{t.change}</button><button className="button-secondary" onClick={props.onRecalculate}><RefreshCw aria-hidden="true" />{t.recalculate}</button><button className="button-tertiary" onClick={props.onStartOver}><RotateCcw aria-hidden="true" />{t.startOver}</button><button className="button-primary print-action" onClick={() => window.print()}><Printer aria-hidden="true" />{t.print}</button></div>
    </div>
  );
}

type TimelineScale = "fit" | "hour" | "half-hour";
type PlanView = "activity" | "crew";
type TimelineMode = "requested" | "generated";

function PlanComparison({ plan, result, forecast, originalConflicts, language, selection, onSelect, selectedTask, selectedBlock, restriction }: { plan: ShiftPlan; result: ScheduleResult; forecast: ForecastHour[]; originalConflicts: OriginalPlanConflict[]; language: Language; selection: Selection; onSelect: (selection: Selection) => void; selectedTask?: ScheduleActivity; selectedBlock?: ScheduleBlock; restriction?: ScheduleBlock }) {
  const t = copy[language];

  return <section className="timeline-section" aria-labelledby="comparison-title">
    <div className="timeline-heading"><div><p className="eyebrow">{language === "ar" ? "مقارنة الخطتين" : "Plan comparison"}</p><h2 id="comparison-title">{t.requestedPlan} / {t.saferPlan}</h2><span>{t.selectBlock}</span></div>{restriction && <div className="restriction-key"><i />{language === "ar" ? <span>تقييد الشمس المباشرة <bdi dir="ltr">12:00–15:00</bdi></span> : t.restriction}</div>}</div>
    <div className="plan-view-stack print:hidden">
      <section className="plan-view-panel" data-testid="requested-plan-section" aria-labelledby="requested-plan-heading">
        <header className="plan-view-header"><div><p className="plan-kicker">A</p><h3 id="requested-plan-heading">{t.requestedPlan}</h3><span>{language==="ar"?"تسلسل الفريق الأصلي":"Original crew sequence"}</span></div></header>
        <ShiftBoard mode="requested" view="crew" plan={plan} result={result} forecast={forecast} originalConflicts={originalConflicts} language={language} selection={selection} onSelect={onSelect} />
      </section>
      <section className="plan-view-panel generated-panel" data-testid="generated-plan-section" aria-labelledby="generated-plan-heading">
        <header className="plan-view-header"><div><p className="plan-kicker">B</p><h3 id="generated-plan-heading">{t.saferPlan}</h3><span>{language==="ar"?"تسلسل زمني لفريق واحد":"One-crew chronological sequence"}</span></div></header>
        <ShiftBoard mode="generated" view="crew" plan={plan} result={result} forecast={forecast} originalConflicts={originalConflicts} language={language} selection={selection} onSelect={onSelect} />
      </section>
    </div>
    {(selectedTask || selectedBlock) && <BlockDetails language={language} task={selectedTask} block={selectedBlock} result={result} />}
    <div className="print-comparison" aria-hidden="true">
      <h3>{t.requestedPlan} — {language === "ar" ? "تسلسل الفريق" : "Crew sequence"}</h3><ShiftBoard mode="requested" view="crew" forceFit plan={plan} result={result} forecast={forecast} originalConflicts={originalConflicts} language={language} selection={null} onSelect={onSelect} />
      <h3>{t.saferPlan} — {language === "ar" ? "تسلسل الفريق" : "Crew sequence"}</h3><ShiftBoard mode="generated" view="crew" forceFit plan={plan} result={result} forecast={forecast} originalConflicts={originalConflicts} language={language} selection={null} onSelect={onSelect} />
    </div>
  </section>;
}

function PriorityBadge({ required, language }: { required: boolean; language: Language }) {
  const t = copy[language];
  return <span className={`priority-badge ${required ? "required" : "normal"}`}>{required ? t.required : t.normal}</span>;
}

function activityLabel(type: ScheduleBlock["type"] | "idle", language: Language): string {
  const t = copy[language];
  return type === "rest" ? t.rest : type === "break" ? t.breakActivity : type === "meal" ? t.meal : type === "idle" ? t.idle : t.work;
}

function ShiftBoard({ mode, view, forceFit = false, plan, result, forecast, originalConflicts, language, selection, onSelect }: { mode: TimelineMode; view:PlanView; forceFit?: boolean; plan: ShiftPlan; result: ScheduleResult; forecast: ForecastHour[]; originalConflicts: OriginalPlanConflict[]; language: Language; selection: Selection; onSelect: (selection: Selection) => void }) {
  const t=copy[language];const start=toMinutes(plan.shiftStart);const end=toMinutes(plan.shiftEnd);const duration=end-start;
  const [scale,setScale]=useState<TimelineScale>(forceFit?"fit":"hour");const scrollRegion=useRef<HTMLDivElement>(null);
  useEffect(()=>{scrollRegion.current?.scrollTo({left:0});},[language,scale]);
  const restriction=result.blocks.find(block=>block.type==="restriction");
  const linkedTaskId=selection?.kind==="requested"?selection.id:selection?.kind==="scheduled"?result.blocks.find(block=>block.id===selection.id)?.taskId:undefined;
  const generatedBlocks=result.blocks.filter(block=>block.type!=="restriction");const gaps=idleBlocks(plan,result);const chronologicalBlocks=[...generatedBlocks,...gaps].sort((a,b)=>toMinutes(a.start)-toMinutes(b.start));
  const heatPoints=forecastRibbonPoints(forecast,plan.shiftStart,plan.shiftEnd);const ticks:number[]=[];const tickStep=scale==="half-hour"?30:60;for(let minute=start;minute<=end;minute+=tickStep)ticks.push(minute);if(ticks.at(-1)!==end)ticks.push(end);
  const styleFor=(from:string,to:string)=>{const boundedStart=Math.max(start,toMinutes(from));const boundedEnd=Math.min(end,toMinutes(to));return{left:`${((boundedStart-start)/duration)*100}%`,width:`${Math.max(0,((boundedEnd-boundedStart)/duration)*100)}%`};};
  const hours=duration/60;const plotWidth=scale==="fit"?"calc(100% - 220px)":`${Math.ceil(hours*(scale==="hour"?140:260))}px`;const conflicts=new Set(originalConflicts.filter(finding=>finding.severity!=="info").flatMap(finding=>finding.taskIds));
  const typeLabel=(block:ScheduleBlock)=>block.id.startsWith("idle-")?t.idle:block.type==="rest"?t.rest:block.type==="break"?t.breakActivity:block.type==="meal"?t.meal:t.work;const typeCode=(block:ScheduleBlock)=>block.id.startsWith("idle-")?"··":block.type==="rest"?"↻":block.type==="break"?"Ⅱ":block.type==="meal"?"◇":"●";
  const categoryLabel=(category:"low"|"intermediate"|"high"|"high_risk")=>category==="low"?t.lower:category==="intermediate"?t.intermediate:category==="high"?t.high:t.highRisk;
  const boardId=forceFit?`print-${mode}-activity-board`:`${mode}-${view}-board`;
  return <>{!forceFit&&<div className="timeline-scale-row print:hidden"><div className="timeline-controls" role="group" aria-label={t.zoom}>{([['fit',t.fitShift],['hour',t.oneHour],['half-hour',t.thirtyMinutes]] as const).map(([value,label])=><button key={value} type="button" aria-pressed={scale===value} onClick={()=>setScale(value)}>{label}</button>)}</div><p className="timeline-scale-help">{t.scaleHelp}</p></div>}{!forceFit&&<p className="timeline-scroll-hint print:hidden">↔ {t.scrollHint}</p>}<p className="sr-only">{t.restrictionA11y}</p><div ref={scrollRegion} className="shift-board-scroll" role="region" aria-label={`${mode==="requested"?t.requestedPlan:t.saferPlan} — ${view==="activity"?(language==="ar"?"جدول الأنشطة":"Activity schedule"):(language==="ar"?"تسلسل الفريق":"Crew sequence")}`} tabIndex={0}><div className={`shift-board scale-${scale}`} dir="ltr" data-testid={boardId} style={{"--timeline-width":plotWidth} as React.CSSProperties}><div className="board-ruler-label"/><div className="time-ruler"><div className="timeline-canvas">{ticks.map(minute=><time key={minute} style={{left:`${((minute-start)/duration)*100}%`}}>{String(Math.floor(minute/60)).padStart(2,"0")}:{String(minute%60).padStart(2,"0")}</time>)}{restriction&&<span className="restriction-top-label" style={styleFor(restriction.start,restriction.end)}>{restriction.start}–{restriction.end}</span>}</div></div>
  {mode==="requested"&&view==="activity"&&<><div className="lane-label section-label" dir={language==="ar"?"rtl":"ltr"}><strong>{t.requestedPlan}</strong><span>{language==="ar"?"صف واحد لكل نشاط":"One row per activity"}</span></div><div className="section-spacer"/>{plan.tasks.map(task=><RequestedRow key={task.id} task={task} language={language} conflict={conflicts.has(task.id)} selected={linkedTaskId===task.id} onSelect={()=>onSelect({kind:"requested",id:task.id})} ticks={ticks} start={start} duration={duration} restriction={restriction} styleFor={styleFor} testHooks={!forceFit}/>)}</>}
  {mode==="generated"&&view==="activity"&&<><div className="lane-label section-label" dir={language==="ar"?"rtl":"ltr"}><strong>{t.saferPlan}</strong><span>{language==="ar"?"صف مطابق لكل نشاط أصلي":"Matching row for every original activity"}</span></div><div className="section-spacer"/>{plan.tasks.map(task=><GeneratedActivityRow key={task.id} task={task} result={result} language={language} selected={linkedTaskId===task.id} onSelect={onSelect} ticks={ticks} start={start} duration={duration} restriction={restriction} styleFor={styleFor}/>) }<SystemRow label={t.rest} testId="crew-recovery-row" blocks={generatedBlocks.filter(block=>block.type==="rest")} language={language} selection={selection} onSelect={onSelect} ticks={ticks} start={start} duration={duration} restriction={restriction} styleFor={styleFor}/>{gaps.length>0&&<SystemRow label={t.idle} testId="idle-capacity-row" blocks={gaps} language={language} selection={selection} onSelect={onSelect} ticks={ticks} start={start} duration={duration} restriction={restriction} styleFor={styleFor}/>}</>}
  {mode==="requested"&&view==="crew"&&<RequestedCrewSequence plan={plan} language={language} selection={selection} linkedTaskId={linkedTaskId} conflicts={conflicts} onSelect={onSelect} ticks={ticks} start={start} duration={duration} restriction={restriction} styleFor={styleFor}/>}
  {mode==="generated"&&view==="crew"&&<><div className="lane-label section-label" dir={language==="ar"?"rtl":"ltr"}><strong>{t.saferPlan}</strong><span>{language==="ar"?"تسلسل زمني لفريق واحد":"One-crew chronological sequence"}</span></div><div className="section-spacer"/><div className="lane-label compact-label" dir={language==="ar"?"rtl":"ltr"}><strong>{language==="ar"?"تسلسل الفريق":"Crew sequence"}</strong></div><div className="timeline-plot safer-plot"><div className="timeline-canvas"><GridLines ticks={ticks} start={start} duration={duration}/>{restriction&&<RestrictionBand style={styleFor(restriction.start,restriction.end)}/>} {chronologicalBlocks.map(block=>{const idle=block.id.startsWith("idle-");const selected=Boolean(linkedTaskId&&block.taskId===linkedTaskId)||(selection?.kind==="scheduled"&&selection.id===block.id);return <button key={block.id} data-block-type={forceFit?undefined:idle?"idle":block.type} data-start={forceFit?undefined:block.start} data-end={forceFit?undefined:block.end} data-task-id={forceFit?undefined:block.taskId} className={`scheduled-block ${idle?"idle":block.type} ${block.environment==="conditioned_indoor"?"indoor":""} ${selected?"selected linked":""}`} style={styleFor(block.start,block.end)} onClick={()=>onSelect({kind:"scheduled",id:block.id})} aria-label={`${typeLabel(block)}: ${language==="ar"?block.labelAr:block.labelEn}, ${block.start}–${block.end}`}><b aria-hidden="true">{typeCode(block)}</b><span>{idle?t.idle:block.type==="rest"?t.rest:language==="ar"?block.labelAr:block.labelEn}</span><time>{block.start}–{block.end}</time></button>})}</div></div><div className="lane-label compact-label heat-label" dir={language==="ar"?"rtl":"ltr"}><strong>{t.forecastContext}</strong><span>{language==="ar"?"توقع نموذجي أولي":"Preliminary model forecast"}</span></div><div className="heat-ribbon" data-testid={forceFit?"print-heat-ribbon":"heat-ribbon"} role="img" aria-label={`${t.heat}. ${heatPoints.map(point=>`${point.time}: ${point.temperature}°C, ${categoryLabel(point.category)}`).join("; ")}`}><div className="timeline-canvas">{heatPoints.map((point,index)=>{const from=timeToMinutes(point.time)<start?plan.shiftStart:point.time;const to=heatPoints[index+1]?.time??plan.shiftEnd;return <div key={`${point.time}-${index}`} className={`heat-period heat-${point.category}`} style={styleFor(from,to)} title={`${point.time} · ${point.temperature}°C · ${t.apparent} ${point.apparentTemperature}°C · ${categoryLabel(point.category)}`}><strong>{point.temperature}°</strong><span>{categoryLabel(point.category)}</span></div>})}</div></div></>}
  </div></div>{mode==="generated"&&result.unscheduled.length>0&&<UnscheduledWork plan={plan} result={result} language={language} onSelect={onSelect}/>}<TimelineLegend blocks={mode==="generated"?chronologicalBlocks:[]} heatCategories={mode==="generated"&&view==="crew"?new Set(heatPoints.map(point=>point.category)):new Set()} hasUnscheduled={mode==="generated"&&result.unscheduled.length>0} hasRestriction={Boolean(restriction)} language={language}/></>;
}

type TimelineLayoutProps={ticks:number[];start:number;duration:number;restriction?:ScheduleBlock;styleFor:(from:string,to:string)=>React.CSSProperties};

function GeneratedActivityRow({task,result,language,selected,onSelect,ticks,start,duration,restriction,styleFor}:{task:ScheduleActivity;result:ScheduleResult;language:Language;selected:boolean;onSelect:(selection:Selection)=>void}&TimelineLayoutProps){
  const t=copy[language];const kind=activityType(task);const blocks=result.blocks.filter(block=>block.taskId===task.id&&block.type===kind);const scheduled=blocks.reduce((sum,block)=>sum+toMinutes(block.end)-toMinutes(block.start),0);const unscheduled=result.unscheduled.find(item=>item.taskId===task.id);const remaining=unscheduled?.unscheduledMinutes??Math.max(0,task.durationMinutes-scheduled);const dependencyBlocked=unscheduled?.reasonCode.includes("DEPENDENCY");const status=remaining===0?(language==="ar"?"مجدول":"Scheduled"):scheduled===0?t.notScheduled:(language==="ar"?"مجدول جزئيًا":"Partially scheduled");
  return <><div className={`requested-row-label generated-row-label ${selected?"selected":""}`} data-generated-task-row={task.id} dir={language==="ar"?"rtl":"ltr"}><strong>{language==="ar"?task.nameAr:task.nameEn}</strong><span>{activityLabel(kind,language)} · {task.mustSchedule?t.required:t.normal} · {status}</span><span dir="ltr">{task.requestedStart&&task.requestedEnd?`${task.requestedStart}–${task.requestedEnd}`:t.notSpecified}</span><small>{t.scheduled}: {formatDuration(scheduled,language)} · {t.remaining}: {formatDuration(remaining,language)}{dependencyBlocked?` · ${language==="ar"?"محجوب بالتبعية":"Dependency blocked"}`:""}{unscheduled?` · ${displayUnscheduledReason(unscheduled.reasonCode,language)}`:""}</small></div><div className="timeline-plot requested-row-plot"><div className="timeline-canvas"><GridLines ticks={ticks} start={start} duration={duration}/>{restriction&&<RestrictionBand style={styleFor(restriction.start,restriction.end)}/>} {blocks.map(block=><button key={block.id} type="button" data-task-id={task.id} data-block-type={block.type} data-start={block.start} data-end={block.end} className={`scheduled-block generated-activity-block ${block.environment==="conditioned_indoor"?"indoor":""} ${selected?"selected linked":""}`} style={styleFor(block.start,block.end)} onClick={()=>onSelect({kind:"scheduled",id:block.id})} aria-label={`${language==="ar"?task.nameAr:task.nameEn}, ${block.start}–${block.end}`}><b aria-hidden="true">{kind==="work"?"W":kind==="break"?"B":"M"}</b><span>{language==="ar"?task.nameAr:task.nameEn}</span><time>{block.start}–{block.end}</time></button>)}{blocks.length===0&&<button type="button" className="unscheduled-row-control" onClick={()=>onSelect({kind:"requested",id:task.id})}>{t.notScheduled} · {formatDuration(remaining,language)}{unscheduled?` · ${displayUnscheduledReason(unscheduled.reasonCode,language)}`:""}</button>}</div></div></>;
}

function SystemRow({label,testId,blocks,language,selection,onSelect,ticks,start,duration,restriction,styleFor}:{label:string;testId:string;blocks:ScheduleBlock[];language:Language;selection:Selection;onSelect:(selection:Selection)=>void}&TimelineLayoutProps){
  return <><div className="requested-row-label system-row-label" data-testid={testId} dir={language==="ar"?"rtl":"ltr"}><strong>{label}</strong><span>{blocks.length} {language==="ar"?"فترات":"intervals"}</span></div><div className="timeline-plot requested-row-plot"><div className="timeline-canvas"><GridLines ticks={ticks} start={start} duration={duration}/>{restriction&&<RestrictionBand style={styleFor(restriction.start,restriction.end)}/>} {blocks.map(block=>{const idle=block.id.startsWith("idle-");return <button key={block.id} type="button" data-block-type={idle?"idle":"rest"} className={`scheduled-block ${idle?"idle":"rest"} ${selection?.kind==="scheduled"&&selection.id===block.id?"selected":""}`} style={styleFor(block.start,block.end)} onClick={()=>onSelect({kind:"scheduled",id:block.id})} aria-label={`${label}, ${block.start}–${block.end}`}><b aria-hidden="true">{idle?"··":"↻"}</b><span>{label}</span><time>{block.start}–{block.end}</time></button>})}</div></div></>;
}

function RequestedCrewSequence({plan,language,selection,linkedTaskId,conflicts,onSelect,ticks,start,duration,restriction,styleFor}:{plan:ShiftPlan;language:Language;selection:Selection;linkedTaskId?:string;conflicts:Set<string>;onSelect:(selection:Selection)=>void}&TimelineLayoutProps){
  const t=copy[language];const timed=plan.tasks.filter(task=>task.requestedStart&&task.requestedEnd).map((task,index)=>({task,index,start:toMinutes(task.requestedStart!),end:toMinutes(task.requestedEnd!)})).sort((a,b)=>a.start-b.start||a.index-b.index);const trackEnds:number[]=[];const placed=timed.map(item=>{let track=trackEnds.findIndex(end=>end<=item.start);if(track<0){track=trackEnds.length;trackEnds.push(item.end);}else trackEnds[track]=item.end;const overlap=timed.some(other=>other.task.id!==item.task.id&&other.start<item.end&&other.end>item.start);return{...item,track,overlap};});const height=Math.max(64,trackEnds.length*54+14);const untimed=plan.tasks.filter(task=>!task.requestedStart||!task.requestedEnd);
  return <><div className="lane-label section-label" dir={language==="ar"?"rtl":"ltr"}><strong>{t.requestedPlan}</strong><span>{language==="ar"?"تسلسل الفريق الأصلي":"Original crew sequence"}</span></div><div className="section-spacer"/><div className="lane-label compact-label" style={{height}} dir={language==="ar"?"rtl":"ltr"}><strong>{language==="ar"?"تسلسل الفريق":"Crew sequence"}</strong><span>{placed.some(item=>item.overlap)?language==="ar"?"توجد أنشطة متداخلة":"Overlapping activities are stacked":""}</span></div><div className="timeline-plot crew-sequence-plot" style={{height}}><div className="timeline-canvas"><GridLines ticks={ticks} start={start} duration={duration}/>{restriction&&<RestrictionBand style={styleFor(restriction.start,restriction.end)}/>} {placed.map(({task,track,overlap})=>{const kind=activityType(task);const selected=linkedTaskId===task.id||selection?.kind==="requested"&&selection.id===task.id;return <button key={task.id} type="button" data-requested-id={task.id} className={`requested-block crew-requested-block ${overlap||conflicts.has(task.id)?"has-conflict":""} ${selected?"selected":""}`} style={{...styleFor(task.requestedStart!,task.requestedEnd!),top:7+track*54}} onClick={()=>onSelect({kind:"requested",id:task.id})} aria-label={`${language==="ar"?task.nameAr:task.nameEn}, ${task.requestedStart}–${task.requestedEnd}${overlap?`, ${language==="ar"?"متداخل":"overlap"}`:""}`}><b aria-hidden="true">{kind==="work"?"W":kind==="break"?"B":"M"}</b><span>{language==="ar"?task.nameAr:task.nameEn}</span><time>{task.requestedStart}–{task.requestedEnd}</time>{overlap&&<i aria-label={language==="ar"?"تداخل":"Overlap"}>!</i>}</button>})}</div></div>{untimed.length>0&&<><div className="lane-label capacity-label" dir={language==="ar"?"rtl":"ltr"}><strong>{t.noRequestedTime}</strong></div><div className="capacity-lane">{untimed.map(task=><button type="button" key={task.id} onClick={()=>onSelect({kind:"requested",id:task.id})}>{language==="ar"?task.nameAr:task.nameEn} · {t.notSpecified}</button>)}</div></>}</>;
}

function UnscheduledWork({ plan, result, language, onSelect }: { plan: ShiftPlan; result: ScheduleResult; language: Language; onSelect: (selection: Selection) => void }) {
  const t = copy[language];
  const requiredIncomplete = result.unscheduled.some((item) => plan.tasks.find((task) => task.id === item.taskId)?.mustSchedule);
  return <section className="unscheduled-section" aria-label={t.couldNotSchedule}><h3>{t.couldNotSchedule}</h3>{requiredIncomplete && <p className="required-work-note">{t.requiredIncomplete}</p>}<div className="unscheduled-table-wrap"><table><thead><tr><th>{language === "ar" ? "النشاط" : "Activity"}</th><th>{t.mustStatus}</th><th>{t.requestedWork}</th><th>{t.scheduled}</th><th>{t.remaining}</th><th>{t.reason}</th></tr></thead><tbody>{result.unscheduled.map((item) => { const task=plan.tasks.find((candidate)=>candidate.id===item.taskId); const scheduled=Math.max(0,(task?.durationMinutes??item.unscheduledMinutes)-item.unscheduledMinutes); return <tr key={item.taskId}><th><button type="button" onClick={()=>onSelect({kind:"requested",id:item.taskId})}>{task ? (language === "ar" ? task.nameAr : task.nameEn) : item.taskName}</button></th><td><PriorityBadge required={Boolean(task?.mustSchedule)} language={language} /></td><td>{formatDuration(task?.durationMinutes??item.unscheduledMinutes,language)}</td><td>{formatDuration(scheduled,language)}</td><td>{formatDuration(item.unscheduledMinutes,language)}</td><td>{displayUnscheduledReason(item.reasonCode,language)}</td></tr>; })}</tbody></table></div></section>;
}

function TimelineLegend({ blocks, heatCategories, hasUnscheduled, hasRestriction, language }: { blocks: ScheduleBlock[]; heatCategories: Set<"low" | "intermediate" | "high" | "high_risk">; hasUnscheduled: boolean; hasRestriction: boolean; language: Language }) {
  const t = copy[language];
  const types = new Set(blocks.map((block) => block.id.startsWith("idle-") ? "idle" : block.type));
  const items = [
    types.has("work") ? ["work", t.work] : null,
    types.has("rest") ? ["rest", t.rest] : null,
    types.has("break") ? ["break", t.breakActivity] : null,
    types.has("meal") ? ["meal", t.meal] : null,
    types.has("idle") ? ["idle", t.idle] : null,
    hasUnscheduled ? ["unscheduled", t.unscheduled] : null,
    hasRestriction ? ["restriction", t.restriction] : null,
  ].filter((item): item is string[] => Boolean(item));
  const categories = (["low", "intermediate", "high", "high_risk"] as const).filter((category) => heatCategories.has(category));
  return <div className="timeline-legend" aria-label={language === "ar" ? "مفتاح المخطط" : "Timeline legend"}>{items.map(([type, label]) => <span key={type}><i className={`legend-swatch ${type}`} aria-hidden="true" />{label}</span>)}{categories.map((category) => <span key={category}><i className={`legend-swatch heat-${category}`} aria-hidden="true" />{category === "low" ? t.lower : category === "intermediate" ? t.intermediate : category === "high" ? t.high : t.highRisk}</span>)}</div>;
}

function RequestedRow({ task, language, conflict, selected, onSelect, ticks, start, duration, restriction, styleFor, testHooks }: { task: ScheduleActivity; language: Language; conflict: boolean; selected: boolean; onSelect: () => void; ticks: number[]; start: number; duration: number; restriction?: ScheduleBlock; styleFor: (from: string, to: string) => React.CSSProperties; testHooks: boolean }) {
  const t = copy[language];
  const kind = activityType(task);
  const timing = task.timingPreference ?? "flexible";
  const timed=Boolean(task.requestedStart&&task.requestedEnd);
  return <><div className={`requested-row-label ${selected ? "selected" : ""}`} data-requested-task-row={task.id} dir={language === "ar" ? "rtl" : "ltr"}><strong>{language === "ar" ? task.nameAr : task.nameEn}</strong><span>{kind === "work" ? t.work : kind === "break" ? t.breakActivity : t.meal} · {formatDuration(task.durationMinutes, language)}</span><span dir="ltr">{timed?`${task.requestedStart}–${task.requestedEnd}`:t.notSpecified}</span><small>{timing === "fixed" ? t.fixed : timing === "preferred" ? t.preferred : t.flexible} · {task.mustSchedule ? t.required : t.normal}{conflict ? ` · ! ${t.warning}` : ""}</small></div><div className="timeline-plot requested-row-plot"><div className="timeline-canvas"><GridLines ticks={ticks} start={start} duration={duration} />{restriction && <RestrictionBand style={styleFor(restriction.start, restriction.end)} />}{timed?<button type="button" data-requested-id={testHooks ? task.id : undefined} className={`requested-block ${conflict ? "has-conflict" : ""} ${selected ? "selected" : ""}`} style={styleFor(task.requestedStart!, task.requestedEnd!)} onClick={onSelect} aria-pressed={selected} aria-label={`${language === "ar" ? task.nameAr : task.nameEn}, ${task.requestedStart}–${task.requestedEnd}, ${formatDuration(task.durationMinutes, language)}, ${task.mustSchedule ? t.required : t.normal}`}><b aria-hidden="true">{kind === "work" ? "W" : kind === "break" ? "B" : "M"}</b><span>{language === "ar" ? task.nameAr : task.nameEn}</span><time>{task.requestedStart}–{task.requestedEnd}</time>{conflict && <i aria-label={language === "ar" ? "تعارض" : "Conflict"}>!</i>}</button>:<button type="button" className="untimed-row-control" onClick={onSelect}>{t.notSpecified}</button>}</div></div></>;
}

function GridLines({ ticks, start, duration }: { ticks: number[]; start: number; duration: number }) {
  return <>{ticks.map((minute) => <i key={minute} className="grid-line" style={{ left: `${((minute - start) / duration) * 100}%` }} />)}</>;
}

function RestrictionBand({ style }: { style: React.CSSProperties }) {
  return <div className="restriction-band" style={style} aria-hidden="true" />;
}

function BlockDetails({ language, task, block, result }: { language: Language; task?: ScheduleActivity; block?: ScheduleBlock; result: ScheduleResult }) {
  const t = copy[language];
  const original = task?.requestedStart && task.requestedEnd ? `${task.requestedStart}–${task.requestedEnd}` : t.notSpecified;
  const linked = task ? associatedBlocks(result, task.id) : block ? [block] : [];
  const generatedActivity = linked.filter((item) => item.type !== "rest");
  const recovery = linked.filter((item) => item.type === "rest");
  const unscheduled = task ? result.unscheduled.find((item) => item.taskId === task.id) : undefined;
  const scheduledMinutes=generatedActivity.reduce((sum,item)=>sum+toMinutes(item.end)-toMinutes(item.start),0);
  const remainingMinutes=unscheduled?.unscheduledMinutes??(task?Math.max(0,task.durationMinutes-scheduledMinutes):0);
  const sourceIds = new Set<string>();
  for (const item of linked) { if (item.reasonCodes.some((code) => code.includes("MIDDAY"))) sourceIds.add(SOURCE_IDS.middayRestriction); if (item.reasonCodes.some((code) => code.startsWith("TWL_"))) sourceIds.add(SOURCE_IDS.twlGuidance); }
  const consequence = movementExplanation(task, linked, unscheduled?.unscheduledMinutes, language);
  const kind = task ? activityType(task) : block?.type;
  const dependencies=task?.predecessorTaskIds?.map(id=>result.blocks.find(candidate=>candidate.taskId===id)?.labelEn??id)??[];
  return <aside className="block-drawer" aria-live="polite"><div><p className="eyebrow">{t.blockDetails}</p><h3>{task ? (language === "ar" ? task.nameAr : task.nameEn) : block ? (language === "ar" ? block.labelAr : block.labelEn) : ""}</h3></div><dl><div><dt>{t.activityType}</dt><dd>{kind === "work" ? t.work : kind === "break" ? t.breakActivity : kind === "meal" ? t.meal : kind === "rest" ? t.rest : t.idle}</dd></div><div><dt>{t.originalTime}</dt><dd dir="ltr">{original}</dd></div><div><dt>{t.generatedWorkTimes}</dt><dd dir="ltr">{generatedActivity.length?generatedActivity.map(item=>`${item.start}–${item.end}`).join(", "):"—"}</dd></div><div><dt>{t.associatedRecoveryTimes}</dt><dd dir="ltr">{recovery.length?recovery.map(item=>`${item.start}–${item.end}`).join(", "):"—"}</dd></div>{task&&<><div><dt>{t.scheduledDuration}</dt><dd>{formatDuration(scheduledMinutes,language)}</dd></div><div><dt>{t.remainingDuration}</dt><dd>{formatDuration(remainingMinutes,language)}</dd></div><div><dt>{t.duration}</dt><dd>{formatDuration(task.durationMinutes, language)}</dd></div><div><dt>{t.timing}</dt><dd>{task.timingPreference === "fixed" ? t.fixed : task.timingPreference === "preferred" ? t.preferred : t.flexible}</dd></div><div><dt>{t.mustStatus}</dt><dd><PriorityBadge required={Boolean(task.mustSchedule)} language={language} /></dd></div><div><dt>{t.dependency}</dt><dd>{dependencies.length?dependencies.join(", "):t.noDependency}</dd></div></>}{task && isWorkActivity(task) && <><div><dt>{t.workload}</dt><dd>{displayWorkload(task.workload, language)}</dd></div><div><dt>{t.environment}</dt><dd>{displayEnvironment(task.environment, language)}</dd></div></>}</dl>{task?.operationalNotes?.length ? <div><strong>{t.notes}</strong><ul>{task.operationalNotes.map((note) => <li key={note}>{note}</li>)}</ul></div> : null}{linked.length > 0 && <div className="drawer-rules"><strong>{t.ruleApplied}</strong><ul>{[...new Set(linked.flatMap((item) => item.reasonCodes))].map((code) => <li key={code}>{displayReason(code, language)}</li>)}</ul></div>}<p><strong>{t.movedBecause}:</strong> {consequence}</p><p><strong>{t.consequence}:</strong> {optimizationConsequence(task, unscheduled?.unscheduledMinutes, language)}</p>{sourceIds.size > 0 && <div><strong>{t.source}</strong>{[...sourceIds].map((sourceId) => <SourceReference key={sourceId} sourceId={sourceId} language={language} />)}</div>}</aside>;
}

function movementExplanation(task: ScheduleActivity | undefined, blocks: ScheduleBlock[], unscheduledMinutes: number | undefined, language: Language) {
  if (unscheduledMinutes) return language === "ar" ? `تُرك ${formatDuration(unscheduledMinutes, "ar")} دون جدولة لعدم بقاء سعة صالحة.` : `Left unscheduled because no valid capacity remained (${formatDuration(unscheduledMinutes)}).`;
  if (!task || !blocks.length) return language === "ar" ? "لا توجد فترة مخططة." : "No planned interval is available.";
  const workBlocks = blocks.filter((item) => item.type === "work");
  const explanations: string[] = [];
  if (workBlocks.length > 1) explanations.push(language === "ar" ? `قُسّم إلى ${workBlocks.length} فترات عمل لتطبيق دورة العمل/التعافي المختارة.` : `Split into ${workBlocks.length} work periods to apply the selected work/recovery cycle.`);
  if (isWorkActivity(task) && task.environment === "conditioned_indoor" && blocks.some((item) => item.start >= "12:00" && item.start < "15:00")) return language === "ar" ? "وُضع وقت الظهيرة لأنه عمل داخلي مكيّف." : "Placed at midday because it is conditioned indoor work.";
  if (task.requestedStart) { const delta = timeToMinutes(blocks[0].start) - timeToMinutes(task.requestedStart); if (delta !== 0) { const direction = delta < 0 ? (language === "ar" ? "أبكر" : "earlier") : (language === "ar" ? "لاحقاً" : "later"); const restrictionReason = isWorkActivity(task) && task.environment === "direct_sun" ? (language === "ar" ? " لتجنب تقييد الشمس المباشرة." : " to avoid the direct-sun restriction.") : "."; explanations.unshift(language === "ar" ? `نُقل ${formatDuration(Math.abs(delta), "ar")} ${direction}${restrictionReason}` : `Moved ${formatDuration(Math.abs(delta))} ${direction}${restrictionReason}`); } }
  if (explanations.length) return explanations.join(" ");
  return language === "ar" ? "حُفظ ضمن الفترة المطلوبة." : "Kept within the requested interval.";
}

function optimizationConsequence(task: ScheduleActivity | undefined, unscheduledMinutes: number | undefined, language: Language) {
  if (unscheduledMinutes) return task?.mustSchedule ? (language === "ar" ? "تعذر استيعاب العمل المطلوب اليوم دون خرق قيد صلب." : "Required-today work could not fit without violating a hard constraint.") : (language === "ar" ? "حُفظت السعة للعمل المطلوب اليوم." : "Capacity was preserved for required-today work.");
  return task?.mustSchedule ? (language === "ar" ? "أُعطيت الأولوية لإكمال هذا النشاط المطلوب اليوم." : "Completion of this required-today activity was prioritized.") : (language === "ar" ? "تم اختياره ضمن أقل نتيجة مقارنة حتمية." : "Included in the selected lowest lexicographic candidate score.");
}

function ChangeTable({ plan, result, language }: { plan: ShiftPlan; result: ScheduleResult; language: Language }) {
  const t = copy[language];
  return <section className="change-table-section" aria-labelledby="change-table-title"><h2 id="change-table-title">{t.changeTable}</h2><div className="change-table-wrap"><table><thead><tr><th>{t.activity}</th><th>{t.mustStatus}</th><th>{t.requested}</th><th>{t.selected}</th><th>{t.changeSummary}</th><th>{t.status}</th></tr></thead><tbody>{plan.tasks.map((task) => {
    const kind = activityType(task);
    const blocks = result.blocks.filter((block) => block.taskId === task.id && block.type === kind);
    const selected = blocks.map((block) => `${block.start}–${block.end}`);
    const scheduledMinutes = blocks.reduce((sum, block) => sum + toMinutes(block.end) - toMinutes(block.start), 0);
    const unscheduled = result.unscheduled.find((item) => item.taskId === task.id)?.unscheduledMinutes ?? Math.max(0, task.durationMinutes - scheduledMinutes);
    const firstDelta = task.requestedStart && blocks[0] ? toMinutes(blocks[0].start) - toMinutes(task.requestedStart) : 0;
    const changes = scheduledMinutes === 0 ? [t.noCapacityChange] : [firstDelta < 0 ? `${t.movedEarlier} ${formatDuration(Math.abs(firstDelta), language)}` : firstDelta > 0 ? `${t.movedLater} ${formatDuration(firstDelta, language)}` : null, blocks.length > 1 ? t.splitChange.replace("{count}", String(blocks.length)) : null].filter(Boolean);
    const status = scheduledMinutes === 0 ? t.notScheduled : unscheduled > 0 ? t.partial : t.complete;
    return <tr key={task.id}><th>{language === "ar" ? task.nameAr : task.nameEn}</th><td><PriorityBadge required={Boolean(task.mustSchedule)} language={language} /></td><td dir="ltr">{task.requestedStart && task.requestedEnd ? `${task.requestedStart}–${task.requestedEnd}` : t.notSpecified}</td><td dir="ltr">{selected.length ? selected.join(" + ") : `— (${formatDuration(unscheduled, language)})`}</td><td>{changes.length ? changes.join(language === "ar" ? "، " : "; ") : t.unchanged}</td><td><span className={`change-status ${scheduledMinutes === 0 ? "critical" : unscheduled > 0 ? "warning" : "complete"}`}>{status}</span></td></tr>;
  })}</tbody></table></div></section>;
}

function OutcomeList({title,items}:{title:string;items:string[]}){return <section><h3>{title}</h3><ul>{items.map((item)=><li key={item}>{item}</li>)}</ul></section>;}

function displayStrategy(strategy:string,language:Language):string{
  const names:Record<string,{en:string;ar:string}>={critical_must_schedule_first:{en:"Required-today work first",ar:"العمل المطلوب اليوم أولاً"},preserve_requested_order:{en:"Preserve requested order",ar:"الحفاظ على الترتيب المطلوب"},coolest_direct_sun_first:{en:"Coolest direct-sun periods first",ar:"فترات الشمس المباشرة الأبرد أولاً"},minimum_splitting:{en:"Minimize task splitting",ar:"تقليل تقسيم المهام"},minimum_movement:{en:"Minimize movement from requested times",ar:"تقليل النقل عن الأوقات المطلوبة"},indoor_midday_utilization:{en:"Use conditioned indoor work at midday",ar:"استخدام العمل الداخلي المكيّف وقت الظهيرة"}};
  return names[strategy]?.[language]??(language==="ar"?"استراتيجية جدولة حتمية":"Deterministic scheduling strategy");
}

function displayForecastCategory(category:"low"|"intermediate"|"high"|"high_risk",language:Language):string{
  const names={low:{en:"Lower / caution",ar:"أقل / حذر"},intermediate:{en:"Intermediate",ar:"متوسط"},high:{en:"High",ar:"مرتفع"},high_risk:{en:"High risk",ar:"خطر مرتفع"}};
  return names[category][language];
}

function displayAppliedTwl(zone:SiteConditions["twlZone"],language:Language):string{
  const suffix=zone==="low"?(language==="ar"?"إرشاد عمل متواصل":"continuous-work guidance"):zone==="none"?(language==="ar"?"لم يُدخل من الموقع":"not entered on site"):(language==="ar"?"دورة عمل وتعافٍ مطبقة":"work/recovery cycle applied");
  return `${displayTwlZone(zone,language)} — ${suffix}`;
}

function displayUnscheduledReason(reasonCode:string,language:Language):string{
  if(reasonCode.includes("DEPENDENCY"))return language==="ar"?"لم يكتمل النشاط السابق المؤكد.":"A confirmed predecessor was not completed.";
  if(reasonCode.includes("FIXED"))return language==="ar"?"تعذر ملاءمة الوقت الثابت دون خرق قيد.":"The fixed time could not fit without violating a constraint.";
  return language==="ar"?"لم تتبق سعة صالحة ضمن الوردية.":"No valid crew capacity remained in the shift.";
}

function OriginalFinding({ finding, language }: { finding: OriginalPlanConflict; language: Language }) {
  const display = displayOriginalFinding(finding.code, language);
  return <li className={`finding ${finding.severity}`}><span className="severity-label">{severityLabel(finding.severity, language)}</span><strong>{display.title}</strong><p>{display.description}</p><SourceReference sourceId={finding.sourceId} language={language} /></li>;
}

function severityLabel(severity: "info" | "warning" | "critical", language: Language) {
  const t = copy[language];
  return severity === "critical" ? t.critical : severity === "warning" ? t.warning : t.info;
}

function SourceReference({ sourceId, language }: { sourceId: string; language: Language }) {
  const source = OFFICIAL_SOURCES.find((item) => item.id === sourceId);
  return source ? <a className="source-link" href={source.url} target="_blank" rel="noreferrer">{source.title}</a> : <span className="source-link">{copy[language].unknownSource}</span>;
}
