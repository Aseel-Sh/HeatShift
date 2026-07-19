"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertOctagon,
  ArrowLeft,
  CalendarDays,
  ChevronDown,
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
import { activityType, associatedBlocks, forecastRibbonPoints, idleBlocks, timeToMinutes } from "@/lib/report/timeline-model";
import { formatDuration } from "@/lib/workflow/format-duration";
import type { ForecastSource, Language, PlanSource } from "@/lib/workflow/state";

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
    title: "Selected safer schedule",
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
    mustComplete: "Must-schedule work completed",
    otherWork: "Other scheduled work",
    breakMeal: "Break / meal",
    movement: "Movement from requested plan",
    splits: "Splits",
    capacity: "This shift cannot accommodate all planned work under the selected conditions.",
    workers: "Affected non-acclimatized workers need reassignment or supervisor intervention.",
    requestedPlan: "Requested plan",
    saferPlan: "Selected safer schedule",
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
    findings: "Requested-plan and capacity findings",
    noFindings: "No requested-plan conflicts detected.",
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
    mustStatus: "Must-complete status",
    required: "Required",
    normal: "Normal priority",
    notes: "Operational notes",
    consequence: "Optimization consequence",
    plannedTimes: "Planned times",
    unscheduledRemaining: "Not scheduled",
    untimedActivities: "Genuinely untimed activities",
    restrictionA11y: "The hatched vertical band marks 12:00 to 15:00, when configured direct-sun work is restricted.",
  },
  ar: {
    title: "الجدول المختار لوردية أكثر أمانًا",
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
    mustComplete: "العمل الإلزامي المنجز",
    otherWork: "العمل الآخر المجدول",
    breakMeal: "استراحة / وجبة",
    movement: "الحركة عن الخطة المطلوبة",
    splits: "التقسيمات",
    capacity: "لا يمكن لهذه الوردية استيعاب كل العمل المخطط في ظل الظروف المحددة.",
    workers: "يحتاج العمال غير المتأقلمين المتأثرون إلى إعادة توزيع أو تدخل المشرف.",
    requestedPlan: "الخطة المطلوبة",
    saferPlan: "الجدول المختار لوردية أكثر أمانًا",
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
    findings: "ملاحظات الخطة المطلوبة والسعة",
    noFindings: "لم تُكتشف تعارضات في الخطة المطلوبة.",
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
    mustStatus: "حالة الإلزام",
    required: "إلزامي",
    normal: "أولوية عادية",
    notes: "ملاحظات تشغيلية",
    consequence: "نتيجة التحسين",
    plannedTimes: "الأوقات المخططة",
    unscheduledRemaining: "غير مجدول",
    untimedActivities: "أنشطة بلا توقيت فعلي",
    restrictionA11y: "يمثل الشريط الرأسي المخطط الفترة من 12:00 إلى 15:00 حيث يُقيّد العمل المهيأ تحت الشمس المباشرة.",
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
  const currentBriefing = language === "ar" ? briefings.ar : briefings.en;
  const selectedTask = selection?.kind === "requested" ? plan.tasks.find((task) => task.id === selection.id) : undefined;
  const selectedBlock = selection?.kind === "scheduled" ? result.blocks.find((block) => block.id === selection.id) : undefined;
  const selectedBlockTask = selectedBlock?.taskId ? plan.tasks.find((task) => task.id === selectedBlock.taskId) : undefined;

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
        <p className="result-disclaimer">{t.disclaimer}</p>
        <p className="result-selection">{result.explanationSummary}</p>
        <p className="result-provenance">{props.planSource === "sample" ? t.sample : props.planSource === "ai" ? t.extracted : t.manual} · {props.forecastSource === "live" ? t.forecastLive : props.forecastSource === "sample" ? t.forecastSample : t.forecastNone} · {displayTwlZone(conditions.twlZone, language)}</p>
      </header>

      {!result.regulatoryGuidanceAvailable && <div role="status" className="operational-alert warning"><AlertOctagon aria-hidden="true" /><strong>{t.noRegulation}</strong></div>}
      {result.metrics.unscheduledMinutes > 0 && <div role="alert" className="operational-alert critical"><AlertOctagon aria-hidden="true" /><div><strong>{t.capacity}</strong><span>{formatDuration(result.metrics.unscheduledMinutes, language)} · {t.unscheduled}</span></div></div>}
      {highNewWorkers && <div role="alert" className="operational-alert critical"><ShieldAlert aria-hidden="true" /><div><strong>{t.workers}</strong><span>{plan.nonAcclimatizedWorkers} / {plan.crewSize}</span></div></div>}

      <section aria-label={language === "ar" ? "ملخص التخطيط" : "Planning summary"} className="summary-bar optimization-metrics">
        <SummaryItem label={t.candidates} value={String(result.optimizationSummary.candidatesEvaluated)} />
        <SummaryItem label={t.strategy} value={result.optimizationSummary.selectedStrategy.replaceAll("_", " ")} />
        <SummaryItem label={t.mustComplete} value={`${formatDuration(scheduledMustMinutes(plan, result), language)} / ${formatDuration(requestedMustMinutes(plan), language)}`} />
        <SummaryItem label={t.otherWork} value={formatDuration(result.metrics.scheduledWorkMinutes - scheduledMustMinutes(plan, result), language)} />
        <SummaryItem label={t.recovery} value={formatDuration(blockMinutes(result.blocks.filter((block) => block.type === "rest")), language)} />
        <SummaryItem label={t.breakMeal} value={formatDuration(blockMinutes(result.blocks.filter((block) => block.type === "break" || block.type === "meal")), language)} />
        <SummaryItem label={t.unscheduled} value={formatDuration(result.metrics.unscheduledMinutes, language)} critical={result.metrics.unscheduledMinutes > 0} />
        <SummaryItem label={t.movement} value={formatDuration(result.optimizationSummary.movementMinutes, language)} />
        <SummaryItem label={t.splits} value={String(result.optimizationSummary.splitCount)} />
      </section>

      <section className="timeline-section" aria-labelledby="comparison-title">
        <div className="timeline-heading"><div><p className="eyebrow">{language === "ar" ? "مقارنة زمنية" : "Time comparison"}</p><h2 id="comparison-title">{t.requestedPlan} / {t.saferPlan}</h2><span>{t.selectBlock}</span></div>{restriction && <div className="restriction-key"><i />{language === "ar" ? <span>تقييد الشمس المباشرة <bdi dir="ltr">12:00–15:00</bdi></span> : t.restriction}</div>}</div>
        <ShiftBoard plan={plan} result={result} forecast={props.forecast} originalConflicts={originalConflicts} language={language} selection={selection} onSelect={setSelection} />
        {(selectedTask || selectedBlock) && <BlockDetails language={language} task={selectedTask ?? selectedBlockTask} block={selectedBlock} result={result} />}
        <details className="timeline-text"><summary><ChevronDown aria-hidden="true" />{t.textAlternative}</summary><div><h3>{t.requestedPlan}</h3><ul>{plan.tasks.map((task) => <li key={task.id}>{language === "ar" ? task.nameAr : task.nameEn}: {activityType(task) === "work" ? t.work : activityType(task) === "break" ? t.breakActivity : t.meal}, {formatDuration(task.durationMinutes, language)}, <span dir="ltr">{task.requestedStart && task.requestedEnd ? `${task.requestedStart}–${task.requestedEnd}` : t.notSpecified}</span></li>)}</ul><h3>{t.saferPlan}</h3><ul>{result.blocks.filter((block) => block.type !== "restriction").map((block) => <li key={block.id}>{block.type === "rest" ? t.rest : block.type === "break" ? t.breakActivity : block.type === "meal" ? t.meal : t.work}: {language === "ar" ? block.labelAr : block.labelEn}, <span dir="ltr">{block.start}–{block.end}</span></li>)}</ul></div></details>
      </section>

      <section className="report-grid">
        <div className="report-panel findings-panel"><h2>{t.findings}</h2>{originalConflicts.length === 0 && result.conflicts.length === 0 ? <p>{t.noFindings}</p> : <ul>{originalConflicts.map((finding) => <OriginalFinding key={finding.id} finding={finding} language={language} />)}{result.conflicts.map((finding) => <li key={finding.id} className={`finding ${finding.severity}`}><span className="severity-label">{severityLabel(finding.severity, language)}</span><strong>{language === "ar" ? finding.titleAr : finding.titleEn}</strong><p>{language === "ar" ? finding.descriptionAr : finding.descriptionEn}</p><SourceReference sourceId={finding.sourceId} language={language} /></li>)}</ul>}</div>
        <details className="report-panel hydration-panel" open><summary><Droplets aria-hidden="true" />{t.hydration}</summary><p>{language === "ar" ? hydration.wordingAr : hydration.wordingEn}</p><small>{language === "ar" ? hydration.detailsAr : hydration.detailsEn}</small></details>
      </section>

      <section className="report-panel briefing-panel"><h2>{t.briefing}</h2><ol lang={language} dir={language === "ar" ? "rtl" : "ltr"}>{currentBriefing.map((line, index) => <li key={index}>{line}</li>)}</ol></section>
      <section className="report-panel sources-panel"><h2>{t.sources}</h2><p>{t.noEndorsement}</p><ul>{OFFICIAL_SOURCES.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a><span>{source.publisher} — {source.supports}</span></li>)}</ul></section>
      <div className="report-actions"><button className="button-secondary" onClick={props.onEditPlan}><ArrowLeft aria-hidden="true" />{t.edit}</button><button className="button-secondary" onClick={props.onChangeConditions}>{t.change}</button><button className="button-secondary" onClick={props.onRecalculate}><RefreshCw aria-hidden="true" />{t.recalculate}</button><button className="button-tertiary" onClick={props.onStartOver}><RotateCcw aria-hidden="true" />{t.startOver}</button><button className="button-primary print-action" onClick={() => window.print()}><Printer aria-hidden="true" />{t.print}</button></div>
    </div>
  );
}

type TimelineScale = "fit" | "hour" | "half-hour";

function ShiftBoard({ plan, result, forecast, originalConflicts, language, selection, onSelect }: { plan: ShiftPlan; result: ScheduleResult; forecast: ForecastHour[]; originalConflicts: OriginalPlanConflict[]; language: Language; selection: Selection; onSelect: (selection: Selection) => void }) {
  const t = copy[language];
  const start = toMinutes(plan.shiftStart);
  const end = toMinutes(plan.shiftEnd);
  const duration = end - start;
  const [scale, setScale] = useState<TimelineScale>("hour");
  const scrollRegion = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    const applyMobileDefault = () => { if (media.matches) setScale((current) => current === "hour" ? "fit" : current); };
    const timer = window.setTimeout(applyMobileDefault, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { scrollRegion.current?.scrollTo({ left: 0 }); }, [language, scale]);
  const timedTasks = plan.tasks.filter((task) => task.requestedStart && task.requestedEnd);
  const untimedTasks = plan.tasks.filter((task) => !task.requestedStart || !task.requestedEnd);
  const restriction = result.blocks.find((block) => block.type === "restriction");
  const linkedTaskId = selection?.kind === "requested"
    ? selection.id
    : selection?.kind === "scheduled"
      ? result.blocks.find((block) => block.id === selection.id)?.taskId
      : undefined;
  const chronologicalBlocks = [...result.blocks.filter((block) => block.type !== "restriction"), ...idleBlocks(plan, result)]
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  const heatPoints = forecastRibbonPoints(forecast, plan.shiftStart, plan.shiftEnd);
  const ticks: number[] = [];
  const tickStep = scale === "half-hour" ? 30 : 60;
  for (let minute = start; minute <= end; minute += tickStep) ticks.push(minute);
  if (ticks.at(-1) !== end) ticks.push(end);
  const styleFor = (from: string, to: string) => {
    const boundedStart = Math.max(start, toMinutes(from));
    const boundedEnd = Math.min(end, toMinutes(to));
    return { left: `${((boundedStart - start) / duration) * 100}%`, width: `${Math.max(0, ((boundedEnd - boundedStart) / duration) * 100)}%` };
  };
  const hours = duration / 60;
  const plotWidth = scale === "fit" ? "calc(100% - 220px)" : `${Math.ceil(hours * (scale === "hour" ? 140 : 260))}px`;
  const conflictTaskIds = new Set(originalConflicts.filter((finding) => finding.severity !== "info").flatMap((finding) => finding.taskIds));
  const blockTypeLabel=(type:ScheduleBlock["type"])=>type==="rest"?t.rest:type==="break"?t.breakActivity:type==="meal"?t.meal:t.work;
  const typeCode = (block: ScheduleBlock) => block.id.startsWith("idle-") ? "I" : block.type === "rest" ? "R" : block.type === "break" ? "B" : block.type === "meal" ? "M" : "W";
  const categoryLabel = (category: "low" | "intermediate" | "high" | "high_risk") => category === "low" ? t.lower : category === "intermediate" ? t.intermediate : category === "high" ? t.high : t.highRisk;
  return (
    <>
      <div className="timeline-controls print:hidden" role="group" aria-label={t.zoom}>
        {([['fit', t.fitShift], ['hour', t.oneHour], ['half-hour', t.thirtyMinutes]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={scale === value} onClick={() => setScale(value)}>{label}</button>)}
      </div>
      <p className="timeline-scroll-hint print:hidden">↔ {t.scrollHint}</p>
      <p className="sr-only">{t.restrictionA11y}</p>
      <div ref={scrollRegion} className="shift-board-scroll" role="region" aria-label={`${t.requestedPlan} / ${t.saferPlan}`} tabIndex={0}>
      <div className={`shift-board scale-${scale}`} dir="ltr" data-testid="shift-board" style={{ "--timeline-width": plotWidth } as React.CSSProperties}>
        <div className="board-ruler-label" />
        <div className="time-ruler"><div className="timeline-canvas">{ticks.map((minute) => <time key={minute} style={{ left: `${((minute - start) / duration) * 100}%` }}>{String(Math.floor(minute / 60)).padStart(2, "0")}:{String(minute % 60).padStart(2, "0")}</time>)}{restriction && <span className="restriction-top-label" style={styleFor(restriction.start, restriction.end)}>{restriction.start}–{restriction.end}</span>}</div></div>
        <div className="lane-label section-label" dir={language === "ar" ? "rtl" : "ltr"}><strong>{t.requestedPlan}</strong><span>{timedTasks.length} {language === "ar" ? "أنشطة مؤقتة" : "timed activities"}</span></div><div className="section-spacer" />
        {timedTasks.map((task) => <RequestedRow key={task.id} task={task} language={language} conflict={conflictTaskIds.has(task.id)} selected={linkedTaskId === task.id} onSelect={() => onSelect({ kind: "requested", id: task.id })} ticks={ticks} start={start} duration={duration} restriction={restriction} styleFor={styleFor} />)}
        <div className="lane-label section-label" dir={language === "ar" ? "rtl" : "ltr"}><strong>{t.saferPlan}</strong><span>{language === "ar" ? "مسار تنفيذ لفريق واحد" : "One-crew execution lane"}</span></div><div className="section-spacer" />
        <div className="lane-label compact-label" dir={language === "ar" ? "rtl" : "ltr"}><strong>{language === "ar" ? "التسلسل الزمني" : "Chronological execution"}</strong></div>
        <div className="timeline-plot safer-plot">
          <div className="timeline-canvas"><GridLines ticks={ticks} start={start} duration={duration} />
          {restriction && <RestrictionBand style={styleFor(restriction.start, restriction.end)} />}
          {chronologicalBlocks.map((block) => { const idle = block.id.startsWith("idle-"); const selected = Boolean(linkedTaskId && block.taskId === linkedTaskId) || selection?.kind === "scheduled" && selection.id === block.id; return <button key={block.id} data-block-type={idle ? "idle" : block.type} data-start={block.start} data-end={block.end} data-task-id={block.taskId} className={`scheduled-block ${idle ? "idle" : block.type} ${block.environment === "conditioned_indoor" ? "indoor" : ""} ${selected ? "selected linked" : ""}`} style={styleFor(block.start, block.end)} onClick={() => onSelect({ kind: "scheduled", id: block.id })} aria-label={`${idle ? t.idle : blockTypeLabel(block.type)}: ${language === "ar" ? block.labelAr : block.labelEn}, ${block.start}–${block.end}`} title={`${language === "ar" ? block.labelAr : block.labelEn} · ${block.start}–${block.end}`}><b aria-hidden="true">{typeCode(block)}</b><span>{idle ? t.idle : block.type === "rest" ? t.rest : language === "ar" ? block.labelAr : block.labelEn}</span><time>{block.start}–{block.end}</time></button>})}</div>
        </div>
        <div className="lane-label compact-label heat-label" dir={language === "ar" ? "rtl" : "ltr"}><strong>{t.heat}</strong><span>{language === "ar" ? "توقع نموذجي" : "Model forecast"}</span></div>
        <div className="heat-ribbon" data-testid="heat-ribbon" role="img" aria-label={`${t.heat}. ${heatPoints.map((point) => `${point.time}: ${point.temperature}°C, ${categoryLabel(point.category)}`).join("; ")}`}><div className="timeline-canvas">{heatPoints.map((point, index) => { const from = timeToMinutes(point.time) < start ? plan.shiftStart : point.time; const to = heatPoints[index + 1]?.time ?? plan.shiftEnd; return <div key={`${point.time}-${index}`} className={`heat-period heat-${point.category}`} style={styleFor(from, to)} title={`${point.time} · ${point.temperature}°C · ${t.apparent} ${point.apparentTemperature}°C · ${categoryLabel(point.category)}`}><strong>{point.temperature}°</strong><span>{categoryLabel(point.category)}</span></div>})}</div></div>
        {(untimedTasks.length > 0 || result.unscheduled.length > 0) && <><div className="lane-label capacity-label" dir={language === "ar" ? "rtl" : "ltr"}><strong>{t.untimedActivities} / {t.unscheduled}</strong></div><div className="capacity-lane">{untimedTasks.map((task) => <button type="button" key={task.id} onClick={() => onSelect({ kind: "requested", id: task.id })}>{language === "ar" ? task.nameAr : task.nameEn} · {t.notSpecified} · {formatDuration(task.durationMinutes, language)}</button>)}{result.unscheduled.map((task) => <button type="button" key={`unscheduled-${task.taskId}`} className="unscheduled-item" onClick={() => onSelect({ kind: "requested", id: task.taskId })}>{task.taskName} · {formatDuration(task.unscheduledMinutes, language)}</button>)}</div></>}
      </div>
    </div>
    <div className="timeline-legend" aria-label={language === "ar" ? "مفتاح المخطط" : "Timeline legend"}><span><b>W</b>{t.work}</span><span><b>R</b>{t.rest}</span><span><b>B</b>{t.breakActivity}</span><span><b>M</b>{t.meal}</span><span><b>I</b>{t.idle}</span><span className="heat-low">{t.lower}</span><span className="heat-intermediate">{t.intermediate}</span><span className="heat-high">{t.high}</span><span className="heat-high_risk">{t.highRisk}</span></div>
    </>
  );
}

function RequestedRow({ task, language, conflict, selected, onSelect, ticks, start, duration, restriction, styleFor }: { task: ScheduleActivity; language: Language; conflict: boolean; selected: boolean; onSelect: () => void; ticks: number[]; start: number; duration: number; restriction?: ScheduleBlock; styleFor: (from: string, to: string) => React.CSSProperties }) {
  const t = copy[language];
  const kind = activityType(task);
  const timing = task.timingPreference ?? "flexible";
  return <><div className={`requested-row-label ${selected ? "selected" : ""}`} dir={language === "ar" ? "rtl" : "ltr"}><strong>{language === "ar" ? task.nameAr : task.nameEn}</strong><span>{kind === "work" ? t.work : kind === "break" ? t.breakActivity : t.meal} · {formatDuration(task.durationMinutes, language)}</span><span dir="ltr">{task.requestedStart}–{task.requestedEnd}</span><small>{timing === "fixed" ? t.fixed : timing === "preferred" ? t.preferred : t.flexible}{conflict ? ` · ! ${t.warning}` : ""}</small></div><div className="timeline-plot requested-row-plot"><div className="timeline-canvas"><GridLines ticks={ticks} start={start} duration={duration} />{restriction && <RestrictionBand style={styleFor(restriction.start, restriction.end)} />}<button type="button" data-requested-id={task.id} className={`requested-block ${conflict ? "has-conflict" : ""} ${selected ? "selected" : ""}`} style={styleFor(task.requestedStart!, task.requestedEnd!)} onClick={onSelect} aria-pressed={selected} aria-label={`${language === "ar" ? task.nameAr : task.nameEn}, ${task.requestedStart}–${task.requestedEnd}, ${formatDuration(task.durationMinutes, language)}`}><b aria-hidden="true">{kind === "work" ? "W" : kind === "break" ? "B" : "M"}</b><span>{language === "ar" ? task.nameAr : task.nameEn}</span><time>{task.requestedStart}–{task.requestedEnd}</time>{conflict && <i aria-label={language === "ar" ? "تعارض" : "Conflict"}>!</i>}</button></div></div></>;
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
  const planned = linked.map((item) => `${item.start}–${item.end}`);
  const unscheduled = task ? result.unscheduled.find((item) => item.taskId === task.id) : undefined;
  const sourceIds = new Set<string>();
  for (const item of linked) { if (item.reasonCodes.some((code) => code.includes("MIDDAY"))) sourceIds.add(SOURCE_IDS.middayRestriction); if (item.reasonCodes.some((code) => code.startsWith("TWL_"))) sourceIds.add(SOURCE_IDS.twlGuidance); }
  const consequence = movementExplanation(task, linked, unscheduled?.unscheduledMinutes, language);
  const kind = task ? activityType(task) : block?.type;
  return <aside className="block-drawer" aria-live="polite"><div><p className="eyebrow">{t.blockDetails}</p><h3>{task ? (language === "ar" ? task.nameAr : task.nameEn) : block ? (language === "ar" ? block.labelAr : block.labelEn) : ""}</h3></div><dl><div><dt>{t.activityType}</dt><dd>{kind === "work" ? t.work : kind === "break" ? t.breakActivity : kind === "meal" ? t.meal : kind === "rest" ? t.rest : t.idle}</dd></div><div><dt>{t.originalTime}</dt><dd dir="ltr">{original}</dd></div><div><dt>{t.plannedTimes}</dt><dd dir="ltr">{planned.length ? planned.join(", ") : unscheduled ? `${t.unscheduledRemaining} — ${formatDuration(unscheduled.unscheduledMinutes, language)} ${language === "ar" ? "متبقية" : "remain"}.` : "—"}</dd></div>{task && <><div><dt>{t.duration}</dt><dd>{formatDuration(task.durationMinutes, language)}</dd></div><div><dt>{t.timing}</dt><dd>{task.timingPreference === "fixed" ? t.fixed : task.timingPreference === "preferred" ? t.preferred : t.flexible}</dd></div><div><dt>{t.mustStatus}</dt><dd>{task.mustSchedule ? t.required : t.normal}</dd></div></>}{task && isWorkActivity(task) && <><div><dt>{t.workload}</dt><dd>{displayWorkload(task.workload, language)}</dd></div><div><dt>{t.environment}</dt><dd>{displayEnvironment(task.environment, language)}</dd></div></>}</dl>{task?.operationalNotes?.length ? <div><strong>{t.notes}</strong><ul>{task.operationalNotes.map((note) => <li key={note}>{note}</li>)}</ul></div> : null}{linked.length > 0 && <div className="drawer-rules"><strong>{t.ruleApplied}</strong><ul>{[...new Set(linked.flatMap((item) => item.reasonCodes))].map((code) => <li key={code}>{displayReason(code, language)}</li>)}</ul></div>}<p><strong>{t.movedBecause}:</strong> {consequence}</p><p><strong>{t.consequence}:</strong> {optimizationConsequence(task, unscheduled?.unscheduledMinutes, language)}</p>{sourceIds.size > 0 && <div><strong>{t.source}</strong>{[...sourceIds].map((sourceId) => <SourceReference key={sourceId} sourceId={sourceId} language={language} />)}</div>}</aside>;
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
  if (unscheduledMinutes) return task?.mustSchedule ? (language === "ar" ? "تعذر استيعاب العمل الإلزامي دون خرق قيد صلب." : "Must-schedule work could not fit without violating a hard constraint.") : (language === "ar" ? "حُفظت السعة للعمل الأعلى أولوية." : "Capacity was preserved for higher-priority work.");
  return task?.mustSchedule ? (language === "ar" ? "أُعطيت الأولوية لإكمال هذا النشاط الإلزامي." : "Completion of this must-schedule activity was prioritized.") : (language === "ar" ? "تم اختياره ضمن أقل نتيجة مقارنة حتمية." : "Included in the selected lowest lexicographic candidate score.");
}

const blockMinutes = (blocks: ScheduleBlock[]) => blocks.reduce((sum, block) => sum + toMinutes(block.end) - toMinutes(block.start), 0);
const requestedMustMinutes = (plan: ShiftPlan) => plan.tasks.filter((task) => isWorkActivity(task) && task.mustSchedule).reduce((sum, task) => sum + task.durationMinutes, 0);
const scheduledMustMinutes = (plan: ShiftPlan, result: ScheduleResult) => { const ids = new Set(plan.tasks.filter((task) => isWorkActivity(task) && task.mustSchedule).map((task) => task.id)); return blockMinutes(result.blocks.filter((block) => block.type === "work" && block.taskId && ids.has(block.taskId))); };

function SummaryItem({ label, value, critical = false }: { label: string; value: string; critical?: boolean }) {
  return <div className={critical ? "critical" : ""}><span>{label}</span><strong className="tabular-nums" dir="ltr">{value}</strong></div>;
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
