"use client";

import { AlertOctagon, ArrowLeft, CalendarDays, Droplets, MapPin, Printer, RefreshCw, RotateCcw, ShieldAlert, Users } from "lucide-react";
import { OFFICIAL_SOURCES } from "@/data/official-sources";
import { buildBriefings, buildHydrationPlan } from "@/lib/report/report-model";
import type { ShiftPlan, SiteConditions } from "@/lib/domain/types";
import type { ScheduleResult, ScheduleBlock } from "@/lib/domain/scheduler-types";
import { evaluateOriginalPlan } from "@/lib/domain/original-plan";
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

const copy = {
  en: { title:"Safer shift generated", preliminary:"Preliminary forecast plan", verified:"Site-verified TWL input", disclaimer:"Planning aid only. This report does not guarantee safety or regulatory compliance. Verify conditions through qualified on-site procedures.", before:"Before: requested plan", after:"After: planned timeline", tasks:"Original tasks", requested:"Original requested duration", conflicts:"Original-plan conflicts", noConflicts:"No original-plan conflicts detected.", work:"Work", rest:"Recovery", restriction:"Restriction", unscheduled:"Unscheduled work", metrics:"Planning summary", scheduled:"Scheduled work", recovery:"Recovery time", restrictionTime:"Restriction time", peak:"Peak forecast temperature", hydration:"Hydration planning", addressed:"Rules applied", remaining:"Remaining critical conflicts", capacity:"This shift cannot accommodate all planned work under the selected conditions.", workers:"Affected non-acclimatized workers need reassignment or supervisor intervention.", forecastNote:"Exact recovery cycles are not site verified. Reassess using an appropriate on-site TWL input.", twlNote:"Applied site-verified input", reason:"Why this block appears", briefing:"Supervisor briefing", briefingEn:"English briefing", briefingAr:"Arabic briefing", sources:"Official sources", noEndorsement:"Sources support the configured rules; their listing does not imply endorsement of HeatShift.", edit:"Edit plan", change:"Change conditions", recalculate:"Recalculate", startOver:"Start over", print:"Print supervisor report", calculation:"How hydration was calculated", minutes:"min" },
  ar: { title:"تم إنشاء وردية أكثر أمانًا", preliminary:"خطة توقعات أولية", verified:"إدخال TWL موثق من الموقع", disclaimer:"أداة مساعدة للتخطيط فقط. لا يضمن هذا التقرير السلامة أو الامتثال التنظيمي. تحقق من الظروف من خلال إجراءات ميدانية مؤهلة.", before:"قبل: الخطة المطلوبة", after:"بعد: الجدول المخطط", tasks:"المهام الأصلية", requested:"المدة الأصلية المطلوبة", conflicts:"تعارضات الخطة الأصلية", noConflicts:"لم يتم اكتشاف تعارضات في الخطة الأصلية.", work:"عمل", rest:"تعافٍ", restriction:"تقييد", unscheduled:"عمل غير مجدول", metrics:"ملخص التخطيط", scheduled:"العمل المجدول", recovery:"وقت التعافي", restrictionTime:"وقت التقييد", peak:"درجة حرارة التوقعات القصوى", hydration:"تخطيط الترطيب", addressed:"القواعد المطبقة", remaining:"التعارضات الحرجة المتبقية", capacity:"لا يمكن لهذه الوردية استيعاب كل العمل المخطط في ظل الظروف المحددة.", workers:"يحتاج العمال غير المتأقلمين المتأثرون إلى إعادة توزيع أو تدخل المشرف.", forecastNote:"دورات التعافي الدقيقة غير موثقة من الموقع. أعد التقييم باستخدام إدخال TWL موقعي مناسب.", twlNote:"تم تطبيق إدخال موثق من الموقع", reason:"سبب ظهور هذه الفترة", briefing:"إحاطة المشرف", briefingEn:"الإحاطة الإنجليزية", briefingAr:"الإحاطة العربية", sources:"المصادر الرسمية", noEndorsement:"تدعم المصادر القواعد المهيأة، ولا يعني إدراجها تأييد HeatShift.", edit:"تعديل الخطة", change:"تغيير الظروف", recalculate:"إعادة الحساب", startOver:"البدء من جديد", print:"طباعة تقرير المشرف", calculation:"كيفية حساب الترطيب", minutes:"دقيقة" },
} as const;

function readableReason(code: string): string { return code.toLowerCase().replaceAll("_"," ").replace(/^./, c=>c.toUpperCase()); }
function blockStyle(block: ScheduleBlock): string {
  if (block.type === "restriction") return "border-slate-500 bg-slate-100 print:border-black print:bg-white";
  if (block.type === "rest") return "border-sky-500 bg-sky-50 print:border-black print:bg-white";
  return "border-amber-500 bg-amber-50 print:border-black print:bg-white";
}

export function ResultsPage(props: ResultsPageProps) {
  const { language, plan, conditions, result } = props; const t=copy[language];
  const hydration=buildHydrationPlan(plan,result); const briefings=buildBriefings(plan,conditions,result); const originalConflicts=evaluateOriginalPlan(plan,conditions);
  const requested=plan.tasks.reduce((sum,task)=>sum+task.durationMinutes,0);
  const critical=result.conflicts.filter(c=>c.severity==="critical");
  const addressed=new Set(result.blocks.flatMap(b=>b.reasonCodes)).size;
  const highNewWorkers=conditions.twlZone==="high"&&plan.nonAcclimatizedWorkers>0;
  const cycleCodes=[...new Set(result.blocks.flatMap(b=>b.reasonCodes).filter(code=>code.includes("WORK_REST")))];
  const cycleDescription=conditions.twlZone==="high"?"Heavy 20/40 · Light 45/15":conditions.twlZone==="intermediate"?"Heavy 45/15 · Light continuous":"Continuous work guidance";
  const currentBriefing=language==="ar"?briefings.ar:briefings.en;
  return <div className="results-report space-y-6">
    <header className="rounded-2xl bg-[var(--navy-950)] p-6 text-white print:border print:border-black print:bg-white print:text-black sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-widest text-amber-300 print:text-black">HeatShift — وردية آمنة</p><h2 className="mt-2 text-3xl font-bold">{t.title}</h2></div><span className={`rounded-full px-3 py-1.5 text-sm font-bold ${result.isPreliminary?"bg-amber-300 text-slate-950":"bg-emerald-200 text-emerald-950"}`}>{result.isPreliminary?t.preliminary:t.verified}</span></div>
      <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><span className="flex gap-2"><MapPin className="size-4"/>{plan.siteName} · {plan.city}</span><span className="flex gap-2"><CalendarDays className="size-4"/>{plan.shiftDate}</span><span className="tabular-nums" dir="ltr">{plan.shiftStart}–{plan.shiftEnd}</span><span className="flex gap-2"><Users className="size-4"/>{plan.crewSize} crew</span></div>
      <p className="mt-5 border-t border-white/25 pt-4 text-sm leading-6 print:border-black">{t.disclaimer}</p>
      <p className="mt-3 text-sm font-bold">{props.planSource==="sample"?"Sample shift · Sample data — no live AI or weather request":props.planSource==="ai"?"AI-extracted plan · supervisor verified fields":"Manual plan"} · {conditions.measurementMode==="onsite_twl"?"Supervisor-entered TWL":props.forecastSource==="live"?"Live forecast retrieval":props.forecastSource==="sample"?"Sample forecast":"No forecast data"}</p>
    </header>

    {result.metrics.unscheduledMinutes>0&&<div role="alert" className="rounded-xl border-2 border-red-700 bg-red-50 p-5 text-red-950 print:border-black print:bg-white"><div className="flex gap-3"><AlertOctagon className="mt-0.5 size-6 shrink-0"/><div><h3 className="text-lg font-bold">{t.capacity}</h3><p className="mt-1">{result.metrics.unscheduledMinutes} {t.minutes} — {t.unscheduled}</p></div></div></div>}
    {highNewWorkers&&<div role="alert" className="rounded-xl border-2 border-red-700 bg-red-50 p-5 text-red-950 print:border-black print:bg-white"><div className="flex gap-3"><ShieldAlert className="mt-0.5 size-6 shrink-0"/><div><h3 className="text-lg font-bold">{t.workers}</h3><p className="mt-1">{plan.nonAcclimatizedWorkers} / {plan.crewSize}</p></div></div></div>}

    <section aria-labelledby="metrics-title"><h3 id="metrics-title" className="text-xl font-bold">{t.metrics}</h3><div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Metric label={t.scheduled} value={`${result.metrics.scheduledWorkMinutes} ${t.minutes}`}/><Metric label={t.recovery} value={`${result.metrics.restMinutes} ${t.minutes}`}/><Metric label={t.restrictionTime} value={`${result.metrics.restrictionMinutes} ${t.minutes}`}/><Metric label={t.unscheduled} value={`${result.metrics.unscheduledMinutes} ${t.minutes}`} critical={result.metrics.unscheduledMinutes>0}/><Metric label={t.peak} value={result.metrics.peakForecastTemperature===null?"—":`${result.metrics.peakForecastTemperature.toFixed(1)}°C`}/><Metric label={t.hydration} value={hydration.minimumLiters===null?t.preliminary:hydration.maximumLiters===null?`≥ ${hydration.minimumLiters} L`:`${hydration.minimumLiters}–${hydration.maximumLiters} L`}/><Metric label={t.addressed} value={String(addressed)}/><Metric label={t.remaining} value={String(critical.length)} critical={critical.length>0}/>
    </div><details className="mt-3 rounded-lg border border-[var(--sand-300)] p-4" open><summary className="cursor-pointer font-bold"><Droplets className="me-2 inline size-5"/>{t.calculation}</summary><p className="mt-3 leading-7">{language==="ar"?hydration.wordingAr:hydration.wordingEn}</p><p className="mt-2 text-sm leading-6 text-[var(--navy-700)]">{language==="ar"?hydration.detailsAr:hydration.detailsEn}</p></details></section>

    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.35fr]">
      <section className="rounded-xl border border-[var(--sand-300)] p-5"><h3 className="text-xl font-bold">{t.before}</h3><h4 className="mt-5 font-bold">{t.tasks}</h4><ul className="mt-3 space-y-3">{plan.tasks.map(task=><li key={task.id} className="rounded-lg bg-[var(--sand-100)] p-3"><span className="font-bold">{language==="ar"?task.nameAr:task.nameEn}</span><span className="mt-1 block text-sm">{task.durationMinutes} {t.minutes} · {task.workload} · {task.environment.replaceAll("_"," ")} · {task.requestedStart&&task.requestedEnd?`${task.requestedStart}–${task.requestedEnd}`:"Original time not stated"}</span></li>)}</ul><p className="mt-4 font-semibold">{t.requested}: <span className="tabular-nums">{requested} {t.minutes}</span></p>
        <h4 className="mt-6 font-bold">{t.conflicts}</h4>{originalConflicts.length?<ul className="mt-3 space-y-3">{originalConflicts.map(conflict=><li key={conflict.id} className="border-s-4 border-red-600 ps-3"><span className="inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-bold uppercase text-red-900">{conflict.severity}</span><strong className="ms-2">{language==="ar"?conflict.titleAr:conflict.titleEn}</strong><p className="mt-1 text-sm leading-6">{language==="ar"?conflict.descriptionAr:conflict.descriptionEn}</p><SourceReference sourceId={conflict.sourceId}/></li>)}</ul>:<p className="mt-2 text-sm">{t.noConflicts}</p>}
        {result.conflicts.length>0&&<><h4 className="mt-6 font-bold">Scheduling capacity and worker-readiness findings</h4><ul className="mt-3 space-y-3">{result.conflicts.map(conflict=><li key={conflict.id} className="border-s-4 border-amber-600 ps-3"><span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-bold uppercase">{conflict.severity}</span><strong className="ms-2">{language==="ar"?conflict.titleAr:conflict.titleEn}</strong><p className="mt-1 text-sm">{language==="ar"?conflict.descriptionAr:conflict.descriptionEn}</p><SourceReference sourceId={conflict.sourceId}/></li>)}</ul></>}
      </section>
      <section className="rounded-xl border border-[var(--sand-300)] p-5"><h3 className="text-xl font-bold">{t.after}</h3><p className="mt-2 text-sm font-semibold">{result.isPreliminary?t.forecastNote:`${t.twlNote}: ${conditions.twlZone}. ${cycleDescription}. ${cycleCodes.join(", ")}`}</p><ol className="relative mt-5 space-y-3 border-s-2 border-[var(--sand-300)] ps-5">{result.blocks.map(block=><li key={block.id} className={`rounded-lg border-s-4 p-4 ${blockStyle(block)}`} data-block-type={block.type} data-start={block.start} data-end={block.end} data-task-id={block.taskId}><div className="flex flex-wrap justify-between gap-2"><span className="font-bold">{block.type==="work"?t.work:block.type==="rest"?t.rest:t.restriction}: {language==="ar"?block.labelAr:block.labelEn}</span><time className="font-bold tabular-nums" dir="ltr">{block.start}–{block.end}</time></div><details className="mt-2 text-sm"><summary className="cursor-pointer font-semibold">{t.reason}</summary><ul className="mt-2 list-disc ps-5">{block.reasonCodes.map(code=><li key={code}>{readableReason(code)}</li>)}</ul></details></li>)}</ol>
        {result.unscheduled.length>0&&<div className="mt-5 rounded-lg border border-red-500 p-4"><h4 className="font-bold text-red-900">{t.unscheduled}</h4><ul className="mt-2 space-y-1">{result.unscheduled.map(item=><li key={item.taskId}>{item.taskName}: <strong>{item.unscheduledMinutes} {t.minutes}</strong></li>)}</ul></div>}
      </section>
    </div>

    <section className="rounded-xl border border-[var(--sand-300)] p-5"><h3 className="text-xl font-bold">{t.briefing}</h3><div className="mt-4 rounded-lg bg-[var(--sand-100)] p-5" lang={language} dir={language==="ar"?"rtl":"ltr"}><h4 className="font-bold">{language==="ar"?t.briefingAr:t.briefingEn}</h4><ol className="mt-3 list-decimal space-y-2 ps-5 leading-7">{currentBriefing.map((line,index)=><li key={index}>{line}</li>)}</ol></div></section>
    <section className="rounded-xl border border-[var(--sand-300)] p-5"><h3 className="text-xl font-bold">{t.sources}</h3><p className="mt-2 text-sm">{t.noEndorsement}</p><ul className="mt-4 space-y-3">{OFFICIAL_SOURCES.map(source=><li key={source.id}><a className="font-bold text-blue-800 underline" href={source.url} target="_blank" rel="noreferrer">{source.title}</a><span className="block text-sm">{source.publisher} — {source.supports}</span></li>)}</ul></section>
    <div className="report-actions flex flex-wrap gap-3 border-t border-[var(--sand-300)] pt-6"><button className="button-secondary" onClick={props.onEditPlan}><ArrowLeft className="size-4"/>{t.edit}</button><button className="button-secondary" onClick={props.onChangeConditions}>{t.change}</button><button className="button-secondary" onClick={props.onRecalculate}><RefreshCw className="size-4"/>{t.recalculate}</button><button className="button-quiet" onClick={props.onStartOver}><RotateCcw className="size-4"/>{t.startOver}</button><button className="button-primary ms-auto" onClick={()=>window.print()}><Printer className="size-4"/>{t.print}</button></div>
  </div>;
}

function Metric({label,value,critical=false}:{label:string;value:string;critical?:boolean}) { return <div className={`rounded-xl border p-4 ${critical?"border-red-500 bg-red-50":"border-[var(--sand-300)] bg-white"}`}><span className="block text-sm text-[var(--navy-600)]">{label}</span><strong className="mt-1 block text-xl tabular-nums">{value}</strong></div>; }
function SourceReference({sourceId}:{sourceId:string}) { const source=OFFICIAL_SOURCES.find(item=>item.id===sourceId); return source?<a className="mt-1 inline-block text-xs font-semibold text-blue-800 underline" href={source.url} target="_blank" rel="noreferrer">{source.title}</a>:<span className="mt-1 block text-xs text-[var(--navy-600)]">HeatShift deterministic capacity rule</span>; }
