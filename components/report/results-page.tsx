"use client";

import { useState } from "react";
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
import type { ShiftPlan, SiteConditions, WorkTask } from "@/lib/domain/types";
import {
  displayCity,
  displayEnvironment,
  displayOriginalFinding,
  displayReason,
  displayTwlZone,
  displayWorkload,
} from "@/lib/i18n/operations-display";
import { buildBriefings, buildHydrationPlan } from "@/lib/report/report-model";
import type { ForecastSource, Language, PlanSource } from "@/lib/workflow/state";

interface ResultsPageProps {
  language: Language;
  plan: ShiftPlan;
  conditions: SiteConditions;
  result: ScheduleResult;
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
    title: "Safer shift generated",
    preliminary: "Preliminary",
    twlEntered: "Supervisor-entered TWL",
    disclaimer: "Planning aid only. This report does not guarantee safety or regulatory compliance. Verify conditions through qualified on-site procedures.",
    requestedWork: "Requested work",
    scheduledWork: "Scheduled work",
    recovery: "Recovery",
    unscheduled: "Unscheduled",
    peak: "Peak shift temperature",
    rules: "Rules applied",
    capacity: "This shift cannot accommodate all planned work under the selected conditions.",
    workers: "Affected non-acclimatized workers need reassignment or supervisor intervention.",
    requestedPlan: "Requested plan",
    saferPlan: "Safer shift",
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
    critical: "Critical",
    warning: "Warning",
    info: "Information",
    unknownSource: "HeatShift deterministic planning rule",
    noRegulation: "No verified HeatShift restriction configuration is available for this date.",
    sample: "Sample shift",
    extracted: "Imported plan",
    manual: "Manual plan",
    forecastLive: "Live city-center forecast",
    forecastSample: "Sample city-center forecast",
    forecastNone: "No forecast data",
  },
  ar: {
    title: "تم إنشاء وردية أكثر أمانًا",
    preliminary: "أولية",
    twlEntered: "نطاق TWL أدخله المشرف",
    disclaimer: "أداة مساعدة للتخطيط فقط. لا يضمن هذا التقرير السلامة أو الامتثال التنظيمي. تحقق من الظروف من خلال إجراءات ميدانية مؤهلة.",
    requestedWork: "العمل المطلوب",
    scheduledWork: "العمل المجدول",
    recovery: "التعافي",
    unscheduled: "غير المجدول",
    peak: "أعلى حرارة خلال الوردية",
    rules: "القواعد المطبقة",
    capacity: "لا يمكن لهذه الوردية استيعاب كل العمل المخطط في ظل الظروف المحددة.",
    workers: "يحتاج العمال غير المتأقلمين المتأثرون إلى إعادة توزيع أو تدخل المشرف.",
    requestedPlan: "الخطة المطلوبة",
    saferPlan: "الوردية الأكثر أمانًا",
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
    critical: "حرج",
    warning: "تحذير",
    info: "معلومة",
    unknownSource: "قاعدة تخطيط حتمية في HeatShift",
    noRegulation: "لا يتوفر إعداد تقييد موثّق في HeatShift لهذا التاريخ.",
    sample: "وردية نموذجية",
    extracted: "خطة مستوردة",
    manual: "خطة يدوية",
    forecastLive: "توقع مباشر لمركز المدينة",
    forecastSample: "توقع نموذجي لمركز المدينة",
    forecastNone: "لا توجد بيانات توقعات",
  },
} as const;

const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const formatDuration = (minutes: number, unit: string) => `${minutes} ${unit}`;

export function ResultsPage(props: ResultsPageProps) {
  const { language, plan, conditions, result } = props;
  const t = copy[language];
  const [selection, setSelection] = useState<Selection>(null);
  const hydration = buildHydrationPlan(plan, result);
  const briefings = buildBriefings(plan, conditions, result);
  const originalConflicts = evaluateOriginalPlan(plan, conditions);
  const requestedMinutes = plan.tasks.reduce((sum, task) => sum + task.durationMinutes, 0);
  const appliedReasons = new Set(result.blocks.filter((block) => block.type !== "restriction").flatMap((block) => block.reasonCodes)).size;
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
          <div><dt><MapPin aria-hidden="true" />{language === "ar" ? "الموقع" : "Site"}</dt><dd>{plan.siteName} · {displayCity(plan.city, language)}</dd></div>
          <div><dt><CalendarDays aria-hidden="true" />{language === "ar" ? "التاريخ" : "Date"}</dt><dd dir="ltr">{plan.shiftDate}</dd></div>
          <div><dt><Clock3 aria-hidden="true" />{language === "ar" ? "الوردية" : "Shift"}</dt><dd dir="ltr">{plan.shiftStart}–{plan.shiftEnd}</dd></div>
          <div><dt><Users aria-hidden="true" />{language === "ar" ? "الفريق" : "Crew"}</dt><dd>{plan.crewSize}</dd></div>
        </dl>
        <p className="result-disclaimer">{t.disclaimer}</p>
        <p className="result-provenance">{props.planSource === "sample" ? t.sample : props.planSource === "ai" ? t.extracted : t.manual} · {props.forecastSource === "live" ? t.forecastLive : props.forecastSource === "sample" ? t.forecastSample : t.forecastNone} · {displayTwlZone(conditions.twlZone, language)}</p>
      </header>

      {!result.regulatoryGuidanceAvailable && <div role="status" className="operational-alert warning"><AlertOctagon aria-hidden="true" /><strong>{t.noRegulation}</strong></div>}
      {result.metrics.unscheduledMinutes > 0 && <div role="alert" className="operational-alert critical"><AlertOctagon aria-hidden="true" /><div><strong>{t.capacity}</strong><span>{formatDuration(result.metrics.unscheduledMinutes, t.minutes)} · {t.unscheduled}</span></div></div>}
      {highNewWorkers && <div role="alert" className="operational-alert critical"><ShieldAlert aria-hidden="true" /><div><strong>{t.workers}</strong><span>{plan.nonAcclimatizedWorkers} / {plan.crewSize}</span></div></div>}

      <section aria-label={language === "ar" ? "ملخص التخطيط" : "Planning summary"} className="summary-bar">
        <SummaryItem label={t.requestedWork} value={formatDuration(requestedMinutes, t.minutes)} />
        <SummaryItem label={t.scheduledWork} value={formatDuration(result.metrics.scheduledWorkMinutes, t.minutes)} />
        <SummaryItem label={t.recovery} value={formatDuration(result.metrics.restMinutes, t.minutes)} />
        <SummaryItem label={t.unscheduled} value={formatDuration(result.metrics.unscheduledMinutes, t.minutes)} critical={result.metrics.unscheduledMinutes > 0} />
        <SummaryItem label={t.peak} value={result.metrics.peakForecastTemperature === null ? "—" : `${result.metrics.peakForecastTemperature.toFixed(1)}°C`} />
        <SummaryItem label={t.rules} value={String(appliedReasons)} />
      </section>

      <section className="timeline-section" aria-labelledby="comparison-title">
        <div className="timeline-heading"><div><p className="eyebrow">{language === "ar" ? "مقارنة زمنية" : "Time comparison"}</p><h2 id="comparison-title">{t.requestedPlan} / {t.saferPlan}</h2><span>{t.selectBlock}</span></div>{restriction && <div className="restriction-key"><i />{language === "ar" ? <span>تقييد الشمس المباشرة <bdi dir="ltr">12:00–15:00</bdi></span> : t.restriction}</div>}</div>
        <ShiftBoard plan={plan} result={result} originalConflicts={originalConflicts} language={language} selection={selection} onSelect={setSelection} />
        {(selectedTask || selectedBlock) && <BlockDetails language={language} task={selectedTask ?? selectedBlockTask} block={selectedBlock} result={result} />}
        <details className="timeline-text"><summary><ChevronDown aria-hidden="true" />{t.textAlternative}</summary><div><h3>{t.requestedPlan}</h3><ul>{plan.tasks.map((task) => <li key={task.id}>{language === "ar" ? task.nameAr : task.nameEn}: <span dir="ltr">{task.requestedStart && task.requestedEnd ? `${task.requestedStart}–${task.requestedEnd}` : t.notSpecified}</span></li>)}</ul><h3>{t.saferPlan}</h3><ul>{result.blocks.filter((block) => block.type !== "restriction").map((block) => <li key={block.id}>{block.type === "rest" ? t.rest : t.work}: {language === "ar" ? block.labelAr : block.labelEn}, <span dir="ltr">{block.start}–{block.end}</span></li>)}</ul></div></details>
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

function ShiftBoard({ plan, result, originalConflicts, language, selection, onSelect }: { plan: ShiftPlan; result: ScheduleResult; originalConflicts: OriginalPlanConflict[]; language: Language; selection: Selection; onSelect: (selection: Selection) => void }) {
  const t = copy[language];
  const start = toMinutes(plan.shiftStart);
  const end = toMinutes(plan.shiftEnd);
  const duration = end - start;
  const timedTasks = plan.tasks.filter((task) => task.requestedStart && task.requestedEnd);
  const untimedTasks = plan.tasks.filter((task) => !task.requestedStart || !task.requestedEnd);
  const restriction = result.blocks.find((block) => block.type === "restriction");
  const ticks: number[] = [];
  for (let minute = start; minute <= end; minute += 60) ticks.push(minute);
  if (ticks.at(-1) !== end) ticks.push(end);
  const styleFor = (from: string, to: string) => ({ left: `${Math.max(0, ((toMinutes(from) - start) / duration) * 100)}%`, width: `${Math.max(1.1, ((toMinutes(to) - Math.max(start, toMinutes(from))) / duration) * 100)}%` });
  const conflictTaskIds = new Set(originalConflicts.filter((finding) => finding.severity !== "info").flatMap((finding) => finding.taskIds));
  return (
    <div className="shift-board-scroll" role="region" aria-label={`${t.requestedPlan} / ${t.saferPlan}`} tabIndex={0}>
      <div className="shift-board" dir="ltr" data-testid="shift-board">
        <div className="board-ruler-label" />
        <div className="time-ruler">{ticks.map((minute) => <time key={minute} style={{ left: `${((minute - start) / duration) * 100}%` }}>{String(Math.floor(minute / 60)).padStart(2, "0")}:{String(minute % 60).padStart(2, "0")}</time>)}</div>
        <div className="lane-label" dir={language === "ar" ? "rtl" : "ltr"}><strong>{t.requestedPlan}</strong><span>{timedTasks.length} {language === "ar" ? "مهام مؤقتة" : "timed tasks"}</span></div>
        <div className="timeline-plot requested-plot" style={{ height: `${Math.max(72, timedTasks.length * 48 + 16)}px` }}>
          <GridLines ticks={ticks} start={start} duration={duration} />
          {restriction && <RestrictionBand block={restriction} style={styleFor(restriction.start, restriction.end)} />}
          {timedTasks.map((task, index) => <button key={task.id} className={`requested-block ${conflictTaskIds.has(task.id) ? "has-conflict" : ""} ${selection?.kind === "requested" && selection.id === task.id ? "selected" : ""}`} style={{ ...styleFor(task.requestedStart!, task.requestedEnd!), top: `${index * 48 + 8}px` }} onClick={() => onSelect({ kind: "requested", id: task.id })} aria-label={`${language === "ar" ? task.nameAr : task.nameEn}, ${task.requestedStart}–${task.requestedEnd}`}><span>{language === "ar" ? task.nameAr : task.nameEn}</span><time>{task.requestedStart}–{task.requestedEnd}</time>{conflictTaskIds.has(task.id) && <b aria-label={language === "ar" ? "تعارض" : "Conflict"}>!</b>}</button>)}
        </div>
        <div className="lane-label" dir={language === "ar" ? "rtl" : "ltr"}><strong>{t.saferPlan}</strong><span>{language === "ar" ? "فريق واحد" : "Single crew"}</span></div>
        <div className="timeline-plot safer-plot">
          <GridLines ticks={ticks} start={start} duration={duration} />
          {restriction && <RestrictionBand block={restriction} style={styleFor(restriction.start, restriction.end)} />}
          {result.blocks.filter((block) => block.type !== "restriction").map((block) => <button key={block.id} data-block-type={block.type} data-start={block.start} data-end={block.end} data-task-id={block.taskId} className={`scheduled-block ${block.type} ${block.environment === "conditioned_indoor" ? "indoor" : ""} ${selection?.kind === "scheduled" && selection.id === block.id ? "selected" : ""}`} style={styleFor(block.start, block.end)} onClick={() => onSelect({ kind: "scheduled", id: block.id })} aria-label={`${block.type === "rest" ? t.rest : t.work}: ${language === "ar" ? block.labelAr : block.labelEn}, ${block.start}–${block.end}`}><span>{block.type === "rest" ? t.rest : language === "ar" ? block.labelAr : block.labelEn}</span><time>{block.start}–{block.end}</time></button>)}
        </div>
        {(untimedTasks.length > 0 || result.unscheduled.length > 0) && <><div className="lane-label capacity-label" dir={language === "ar" ? "rtl" : "ltr"}><strong>{t.notSpecified} / {t.unscheduled}</strong></div><div className="capacity-lane">{untimedTasks.map((task) => <span key={task.id}>{language === "ar" ? task.nameAr : task.nameEn} · {t.notSpecified}</span>)}{result.unscheduled.map((task) => <span key={`unscheduled-${task.taskId}`} className="unscheduled-item">{task.taskName} · {task.unscheduledMinutes} {t.minutes}</span>)}</div></>}
      </div>
    </div>
  );
}

function GridLines({ ticks, start, duration }: { ticks: number[]; start: number; duration: number }) {
  return <>{ticks.map((minute) => <i key={minute} className="grid-line" style={{ left: `${((minute - start) / duration) * 100}%` }} />)}</>;
}

function RestrictionBand({ block, style }: { block: ScheduleBlock; style: React.CSSProperties }) {
  return <div className="restriction-band" style={style} aria-hidden="true"><span>{block.start}–{block.end}</span></div>;
}

function BlockDetails({ language, task, block, result }: { language: Language; task?: WorkTask; block?: ScheduleBlock; result: ScheduleResult }) {
  const t = copy[language];
  const original = task?.requestedStart && task.requestedEnd ? `${task.requestedStart}–${task.requestedEnd}` : t.notSpecified;
  const planned = block ? `${block.start}–${block.end}` : "—";
  const moved = Boolean(block && task && (block.start !== task.requestedStart || block.end !== task.requestedEnd || result.blocks.filter((item) => item.taskId === task.id && item.type === "work").length > 1));
  const sourceIds = new Set<string>();
  if (block?.reasonCodes.some((code) => code.includes("MIDDAY"))) sourceIds.add(SOURCE_IDS.middayRestriction);
  if (block?.reasonCodes.some((code) => code.startsWith("TWL_"))) sourceIds.add(SOURCE_IDS.twlGuidance);
  return <aside className="block-drawer" aria-live="polite"><div><p className="eyebrow">{t.blockDetails}</p><h3>{task ? (language === "ar" ? task.nameAr : task.nameEn) : block ? (language === "ar" ? block.labelAr : block.labelEn) : ""}</h3></div><dl><div><dt>{t.originalTime}</dt><dd dir="ltr">{original}</dd></div><div><dt>{t.plannedTime}</dt><dd dir="ltr">{planned}</dd></div>{task && <><div><dt>{t.workload}</dt><dd>{displayWorkload(task.workload, language)}</dd></div><div><dt>{t.environment}</dt><dd>{displayEnvironment(task.environment, language)}</dd></div></>}</dl>{block && <div className="drawer-rules"><strong>{t.ruleApplied}</strong><ul>{block.reasonCodes.map((code) => <li key={code}>{displayReason(code, language)}</li>)}</ul></div>}<p><strong>{t.movedBecause}:</strong> {moved ? t.moved : t.noMove}</p>{sourceIds.size > 0 && <div><strong>{t.source}</strong>{[...sourceIds].map((sourceId) => <SourceReference key={sourceId} sourceId={sourceId} language={language} />)}</div>}</aside>;
}

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
