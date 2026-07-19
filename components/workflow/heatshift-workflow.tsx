"use client";

import { useEffect, useReducer, useRef } from "react";
import type { Dispatch } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  CloudSun,
  FileInput,
  LoaderCircle,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { BrandHeader } from "@/components/layout/brand-header";
import { ResultsPage } from "@/components/report/results-page";
import { LocationPicker } from "@/components/workflow/location-picker";
import { getDemoScenario } from "@/lib/demo/get-demo-scenario";
import type { ExtractedPlan } from "@/lib/ai/plan-extraction-schema";
import { evaluateMiddayRestriction } from "@/lib/domain/midday-restriction";
import { generateSchedule } from "@/lib/domain/scheduler";
import { classifyForecastTemperature } from "@/lib/domain/temperature-category";
import type { ForecastHour, ShiftPlan, TwlZone } from "@/lib/domain/types";
import {
  displayEnvironment,
  displayError,
  displayTemperatureCategory,
  displayWorkload,
} from "@/lib/i18n/operations-display";
import { toScheduleActivities, type DraftWorkTask } from "@/lib/workflow/draft-task";
import { formatDuration } from "@/lib/workflow/format-duration";
import { filterForecastForShift } from "@/lib/weather/forecast-display";
import {
  createInitialWorkflowState,
  validatePlanDetails,
  validateVerifiedPlan,
  workflowReducer,
  type Language,
  type PlanForm,
  type WorkflowState,
} from "@/lib/workflow/state";

const copy = {
  en: {
    steps: ["Shift setup", "Task plan", "Conditions", "Safer shift"],
    setupTitle: "Shift setup",
    setupIntro: "Turn an outdoor work plan into a safer shift. Enter details manually or import a plan, then verify every field.",
    details: "Shift details",
    site: "Site name",
    city: "City",
    location: "Location",
    date: "Shift date",
    start: "Shift start",
    end: "Shift end",
    crew: "Crew size",
    newWorkers: "Non-acclimatized workers",
    importPlan: "Import work plan",
    importHelp: "Paste the supervisor’s plan to extract tasks, durations, and requested times. Safety decisions remain deterministic.",
    structure: "Structure task list",
    structuring: "Structuring task list",
    manual: "Enter tasks manually",
    sample: "View sample shift",
    select: "Select",
    currentSummary: "Current shift",
    assumptionsTitle: "Planning assumptions",
    assumptionsList: ["One crew", "Five-minute planning grid", "Selected-coordinate forecast context", "No worker-level assignment"],
    taskPlan: "Task plan",
    taskReview: "Review extracted fields",
    reviewNotice: "Review every field before planning. Unknown values remain incomplete.",
    structured: "tasks structured. Review all fields before planning.",
    sampleNotice: "Sample data — no live plan extraction or weather request",
    manualNotice: "Manual task entry — complete every required field.",
    modelNote: "Plan structured using",
    reviewRequired: "Review required.",
    assumptions: "Extraction assumptions",
    missing: "Missing information",
    add: "Add task",
    back: "Back",
    next: "Continue to conditions",
    task: "Task",
    requestedTime: "Requested time",
    duration: "Duration",
    activity: "Activity",
    work: "Work",
    breakActivity: "Break",
    meal: "Meal",
    recovery: "Recovery eligibility",
    recoveryUnknown: "Unknown",
    recoveryEligible: "Eligible",
    recoveryNotEligible: "Not eligible",
    recoveryHelp: "A break counts toward heat recovery only after the supervisor confirms appropriate shaded or cooled conditions.",
    suggested: "Suggested",
    useSuggestion: "Use suggestion",
    timing: "Timing",
    flexible: "Flexible",
    preferred: "Preferred",
    fixed: "Fixed",
    mustComplete: "Must complete",
    operationalNotes: "Operational notes",
    shiftAttention: "Shift details need attention",
    editShift: "Edit shift details",
    workload: "Workload",
    area: "Work area",
    canSplit: "Can split?",
    validation: "Validation",
    delete: "Delete",
    enName: "English name",
    arName: "Arabic name",
    startOptional: "Requested start",
    endOptional: "Requested end",
    durationMinutes: "Duration (minutes)",
    environment: "Environment",
    splitQuestion: "May this task be split?",
    yes: "Yes",
    no: "No",
    complete: "Complete",
    incomplete: "Needs input",
    indoorNote: "Indoor means a cooled area. Heat-exposed indoor work needs a separate site assessment.",
    conditionsTitle: "Conditions",
    forecastContext: "A. Forecast context",
    cityForecast: "Model forecast for selected coordinates — preliminary planning only.",
    forecastMeasurement: "This is not an on-site measurement. TWL is not calculated from the weather forecast.",
    weatherAttribution: "Weather data by Open-Meteo",
    retrieved: "Retrieved",
    forecastDate: "Forecast date",
    peak: "Peak shift temperature",
    apparentPeak: "Peak apparent temperature",
    risk: "Forecast heat category",
    loadingWeather: "Loading shift forecast",
    unavailable: "Forecast unavailable",
    fallback: "Manual planning remains available. No weather values were invented.",
    temperature: "Temperature",
    apparent: "Apparent",
    humidity: "Humidity",
    wind: "Wind",
    hourlyForecast: "Hourly forecast",
    twlTitle: "B. Supervisor-entered TWL zone",
    twlExplain: "Enter the zone from an appropriate on-site assessment. HeatShift does not measure or verify TWL.",
    noTwl: "No site TWL input",
    low: "Low",
    intermediate: "Intermediate",
    high: "High",
    lowCycle: "Light and heavy: continuous guidance",
    intermediateCycle: "Heavy: 45 work / 15 recovery · Light: continuous",
    highCycle: "Heavy: 20 work / 40 recovery · Light: 45 / 15",
    preliminaryCycle: "Preliminary only — no exact recovery cycle claimed",
    generate: "Generate safer shift",
    generating: "Generating safer shift",
    invalidated: "Plan changed. Previous derived planning output was cleared.",
    guidance: "Planning guidance only. Verify conditions using qualified on-site safety procedures.",
  },
  ar: {
    steps: ["إعداد الوردية", "خطة المهام", "الظروف", "الوردية الأكثر أمانًا"],
    setupTitle: "إعداد الوردية",
    setupIntro: "حوّل خطة العمل الخارجي إلى وردية أكثر أمانًا. أدخل التفاصيل يدويًا أو استورد خطة، ثم تحقق من كل حقل.",
    details: "تفاصيل الوردية",
    site: "اسم الموقع",
    city: "المدينة",
    location: "الموقع",
    date: "تاريخ الوردية",
    start: "بداية الوردية",
    end: "نهاية الوردية",
    crew: "حجم الفريق",
    newWorkers: "العمال غير المتأقلمين",
    importPlan: "استيراد خطة العمل",
    importHelp: "ألصق خطة المشرف لاستخراج المهام والمدد والأوقات المطلوبة. تظل قرارات السلامة حتمية.",
    structure: "هيكلة قائمة المهام",
    structuring: "جارٍ هيكلة قائمة المهام",
    manual: "إدخال المهام يدويًا",
    sample: "عرض وردية نموذجية",
    select: "اختر",
    currentSummary: "الوردية الحالية",
    assumptionsTitle: "افتراضات التخطيط",
    assumptionsList: ["فريق واحد", "شبكة تخطيط كل خمس دقائق", "سياق توقعات مركز المدينة", "لا يوجد إسناد على مستوى العامل"],
    taskPlan: "خطة المهام",
    taskReview: "مراجعة الحقول المستخرجة",
    reviewNotice: "راجع كل حقل قبل التخطيط. تبقى القيم غير المعروفة غير مكتملة.",
    structured: "مهام تمت هيكلتها. راجع كل الحقول قبل التخطيط.",
    sampleNotice: "بيانات نموذجية — لا يوجد طلب مباشر لاستخراج الخطة أو الطقس",
    manualNotice: "إدخال يدوي للمهام — أكمل كل حقل مطلوب.",
    modelNote: "تمت هيكلة الخطة باستخدام",
    reviewRequired: "المراجعة مطلوبة.",
    assumptions: "افتراضات الاستخراج",
    missing: "المعلومات الناقصة",
    add: "إضافة مهمة",
    back: "رجوع",
    next: "متابعة إلى الظروف",
    task: "المهمة",
    requestedTime: "الوقت المطلوب",
    duration: "المدة",
    activity: "نوع النشاط",
    work: "عمل",
    breakActivity: "استراحة",
    meal: "وجبة",
    recovery: "أهلية التعافي",
    recoveryUnknown: "غير معروفة",
    recoveryEligible: "مؤهلة",
    recoveryNotEligible: "غير مؤهلة",
    recoveryHelp: "تُحسب الاستراحة كتعافٍ حراري فقط بعد تأكيد المشرف لظروف مظللة أو مبردة مناسبة.",
    suggested: "مقترح",
    useSuggestion: "استخدام الاقتراح",
    timing: "أولوية الوقت",
    flexible: "مرن",
    preferred: "مفضل",
    fixed: "ثابت",
    mustComplete: "يجب إكماله",
    operationalNotes: "ملاحظات تشغيلية",
    shiftAttention: "تفاصيل الوردية تحتاج انتباهًا",
    editShift: "تعديل تفاصيل الوردية",
    workload: "عبء العمل",
    area: "منطقة العمل",
    canSplit: "قابلة للتقسيم؟",
    validation: "التحقق",
    delete: "حذف",
    enName: "الاسم الإنجليزي",
    arName: "الاسم العربي",
    startOptional: "بداية الوقت المطلوب",
    endOptional: "نهاية الوقت المطلوب",
    durationMinutes: "المدة (بالدقائق)",
    environment: "بيئة العمل",
    splitQuestion: "هل يمكن تقسيم المهمة؟",
    yes: "نعم",
    no: "لا",
    complete: "مكتملة",
    incomplete: "تحتاج إدخالًا",
    indoorNote: "المنطقة الداخلية تعني منطقة مكيّفة. يحتاج العمل الداخلي المعرض للحرارة إلى تقييم منفصل للموقع.",
    conditionsTitle: "الظروف",
    forecastContext: "أ. سياق التوقعات",
    cityForecast: "توقع نموذجي للإحداثيات المحددة — للتخطيط الأولي فقط.",
    forecastMeasurement: "هذا ليس قياسًا ميدانيًا. لا يُحسب TWL من توقعات الطقس.",
    weatherAttribution: "بيانات الطقس من Open-Meteo",
    retrieved: "وقت الاسترجاع",
    forecastDate: "تاريخ التوقعات",
    peak: "أعلى حرارة خلال الوردية",
    apparentPeak: "أعلى حرارة محسوسة",
    risk: "فئة حرارة التوقعات",
    loadingWeather: "جارٍ تحميل توقعات الوردية",
    unavailable: "التوقعات غير متاحة",
    fallback: "يبقى التخطيط اليدوي متاحًا. لم يتم اختلاق أي قيم للطقس.",
    temperature: "الحرارة",
    apparent: "المحسوسة",
    humidity: "الرطوبة",
    wind: "الرياح",
    hourlyForecast: "التوقعات لكل ساعة",
    twlTitle: "ب. نطاق TWL أدخله المشرف",
    twlExplain: "أدخل النطاق من تقييم مناسب في الموقع. لا يقيس HeatShift مؤشر TWL ولا يتحقق منه.",
    noTwl: "لا يوجد إدخال TWL من الموقع",
    low: "منخفض",
    intermediate: "متوسط",
    high: "مرتفع",
    lowCycle: "العمل الخفيف والثقيل: إرشادات عمل متواصل",
    intermediateCycle: "الثقيل: 45 عمل / 15 تعافٍ · الخفيف: متواصل",
    highCycle: "الثقيل: 20 عمل / 40 تعافٍ · الخفيف: 45 / 15",
    preliminaryCycle: "أولي فقط — لا توجد مطالبة بدورة تعافٍ دقيقة",
    generate: "إنشاء وردية أكثر أمانًا",
    generating: "جارٍ إنشاء وردية أكثر أمانًا",
    invalidated: "تغيرت الخطة. تم مسح مخرجات التخطيط السابقة.",
    guidance: "إرشادات تخطيط فقط. تحقق من الظروف باستخدام إجراءات سلامة ميدانية مؤهلة.",
  },
} as const;

type WorkflowDispatch = Dispatch<Parameters<typeof workflowReducer>[1]>;
type UiCopy = (typeof copy)[Language];

function ErrorText({ state, name, id = name }: { state: WorkflowState; name: string; id?: string }) {
  const message = state.errors[name];
  return message ? <p id={`${id}-error`} role="alert" className="field-error">{displayError(message, state.language)}</p> : null;
}

export function HeatShiftWorkflow() {
  const [state, dispatch] = useReducer(workflowReducer, undefined, createInitialWorkflowState);
  const generating = useRef(false);
  const t = copy[state.language];

  useEffect(() => {
    document.documentElement.lang = state.language;
    document.documentElement.dir = state.language === "ar" ? "rtl" : "ltr";
  }, [state.language]);

  const buildPlan = (): ShiftPlan => ({
    siteName: state.plan.siteName,
    location: state.plan.location!,
    shiftDate: state.plan.shiftDate,
    shiftStart: state.plan.shiftStart,
    shiftEnd: state.plan.shiftEnd,
    crewSize: Number(state.plan.crewSize),
    nonAcclimatizedWorkers: Number(state.plan.nonAcclimatizedWorkers),
    tasks: toScheduleActivities(state.tasks),
  });

  async function analyze() {
    if (state.aiStatus === "loading") return;
    if (state.plan.planText.trim().length < 10) {
      dispatch({ type: "setErrors", errors: { planText: "Enter at least 10 meaningful characters." } });
      return;
    }
    dispatch({ type: "setAiStatus", status: "loading" });
    try {
      const response = await fetch("/api/parse-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: state.plan.planText,
          context: {
            siteName: state.plan.siteName || undefined,
            locationName: state.plan.location?.name,
            shiftDate: state.plan.shiftDate || undefined,
            shiftStart: state.plan.shiftStart || undefined,
            shiftEnd: state.plan.shiftEnd || undefined,
            crewSize: state.plan.crewSize === "" ? undefined : Number(state.plan.crewSize),
            nonAcclimatizedWorkers: state.plan.nonAcclimatizedWorkers === "" ? undefined : Number(state.plan.nonAcclimatizedWorkers),
          },
        }),
      });
      const payload = await response.json() as { data?: ExtractedPlan; metadata?: { actualModel?: string | null }; error?: { message?: string; code?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message || payload.error?.code || "Plan extraction is unavailable.");
      dispatch({ type: "applyExtraction", extraction: payload.data, actualModel: payload.metadata?.actualModel });
    } catch (error) {
      dispatch({ type: "setAiStatus", status: "error", error: error instanceof Error ? error.message : "Plan extraction is unavailable." });
    }
  }

  function manual() {
    const errors = validatePlanDetails(state.plan);
    if (Object.keys(errors).length) {
      dispatch({ type: "setErrors", errors });
      return;
    }
    dispatch({ type: "setStep", step: "verify" });
  }

  async function openConditions() {
    const errors = validateVerifiedPlan(state.plan, state.tasks);
    if (Object.keys(errors).length) {
      dispatch({ type: "setErrors", errors });
      return;
    }
    dispatch({ type: "setStep", step: "conditions" });
    if (state.isDemo) return;
    dispatch({ type: "weatherLoading" });
    try {
      const location=state.plan.location!;
      const parameters=new URLSearchParams({latitude:String(location.latitude),longitude:String(location.longitude),date:state.plan.shiftDate,timezone:location.timezone,locationName:location.name});
      const response = await fetch(`/api/weather?${parameters}`);
      const payload = await response.json() as { data?: { locationName?:string;latitude?:number;longitude?:number;timezone?:string;date?:string;retrievedAt?:string;hours?:ForecastHour[] }; error?: { message?: string } };
      if (!response.ok || !payload.data?.hours?.length) throw new Error(payload.error?.message || "Weather is unavailable.");
      if(!payload.data.locationName||payload.data.latitude===undefined||payload.data.longitude===undefined||!payload.data.timezone||!payload.data.date||!payload.data.retrievedAt)throw new Error("Weather metadata is unavailable.");
      dispatch({type:"weatherSuccess",forecast:payload.data.hours,metadata:{locationName:payload.data.locationName,latitude:payload.data.latitude,longitude:payload.data.longitude,timezone:payload.data.timezone,date:payload.data.date,retrievedAt:payload.data.retrievedAt}});
    } catch (error) {
      dispatch({ type: "weatherError", error: error instanceof Error ? error.message : "Weather is unavailable." });
    }
  }

  function generate() {
    if (generating.current) return;
    const errors = validateVerifiedPlan(state.plan, state.tasks);
    if (Object.keys(errors).length) {
      dispatch({ type: "setErrors", errors });
      dispatch({ type: "setStep", step: "verify" });
      return;
    }
    generating.current = true;
    dispatch({ type: "setScheduleResult", result: generateSchedule(buildPlan(), state.conditions, state.forecast) });
    requestAnimationFrame(() => { generating.current = false; });
  }

  const active = { describe: 0, verify: 1, conditions: 2, results: 3 }[state.step];
  const shiftForecast = filterForecastForShift(state.forecast,state.plan.shiftStart,state.plan.shiftEnd);
  const peak = shiftForecast.length ? Math.max(...shiftForecast.map((hour) => hour.temperatureCelsius)) : null;
  const apparentPeak = shiftForecast.length ? Math.max(...shiftForecast.map((hour) => hour.apparentTemperatureCelsius)) : null;

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <BrandHeader language={state.language} plan={state.plan} status={state.step} onLanguageChange={(language) => dispatch({ type: "setLanguage", language })} />
      <main id="main-content" className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8">
        <WorkflowSteps labels={t.steps} active={active} />
        {state.derivedDataInvalidated && <div role="status" className="invalidation-notice print:hidden"><AlertTriangle aria-hidden="true" />{t.invalidated}</div>}
        <div className="workspace-shell">
          {state.step === "describe" && <ShiftSetup state={state} t={t} dispatch={dispatch} analyze={analyze} manual={manual} />}
          {state.step === "verify" && <TaskPlan state={state} t={t} dispatch={dispatch} next={openConditions} />}
          {state.step === "conditions" && <Conditions state={state} t={t} peak={peak} apparentPeak={apparentPeak} dispatch={dispatch} generate={generate} />}
          {state.step === "results" && state.scheduleResult && (
            <ResultsPage
              language={state.language}
              plan={buildPlan()}
              conditions={state.conditions}
              result={state.scheduleResult}
              forecast={state.forecast}
              planSource={state.planSource}
              forecastSource={state.forecastSource}
              onEditPlan={() => dispatch({ type: "setStep", step: "verify" })}
              onChangeConditions={() => dispatch({ type: "setStep", step: "conditions" })}
              onRecalculate={generate}
              onStartOver={() => dispatch({ type: "startOver" })}
            />
          )}
        </div>
        <footer className="planning-footer print:hidden"><ShieldCheck aria-hidden="true" />{t.guidance}</footer>
      </main>
    </div>
  );
}

function WorkflowSteps({ labels, active }: { labels: readonly string[]; active: number }) {
  return (
    <nav aria-label="Planning progress" className="workflow-nav print:hidden">
      <ol>{labels.map((label, index) => (
        <li key={label} aria-current={index === active ? "step" : undefined} className={index === active ? "is-active" : index < active ? "is-complete" : ""}>
          <span>{index < active ? <Check aria-hidden="true" /> : index + 1}</span><strong>{label}</strong>
        </li>
      ))}</ol>
    </nav>
  );
}

function ShiftSetup({ state, t, dispatch, analyze, manual }: { state: WorkflowState; t: UiCopy; dispatch: WorkflowDispatch; analyze: () => void; manual: () => void }) {
  const set = (field: Exclude<keyof PlanForm,"location">, value: string) => dispatch({ type: "setPlanField", field, value });
  const fields: Array<[Exclude<keyof PlanForm,"location">, string, string]> = [
    ["siteName", t.site, "text"], ["shiftDate", t.date, "date"], ["shiftStart", t.start, "time"],
    ["shiftEnd", t.end, "time"], ["crewSize", t.crew, "number"], ["nonAcclimatizedWorkers", t.newWorkers, "number"],
  ];
  return (
    <section aria-labelledby="setup-title" className="setup-grid">
      <div className="workspace-main">
        <header className="section-heading"><div><p>01 / {t.steps[0]}</p><h1 id="setup-title">{t.setupTitle}</h1><span>{t.setupIntro}</span></div></header>
        <fieldset className="section-block">
          <legend>{t.details}</legend>
          <div className="shift-fields">
            <LocationPicker language={state.language} value={state.plan.location} error={state.errors.location} onSelect={location=>dispatch({type:"selectLocation",location})} onClear={()=>dispatch({type:"clearLocation"})}/>
            {fields.map(([field, label, type]) => <label key={field}><span className="form-label">{label}</span><input id={`plan-${field}`} className="form-control" dir={type === "text" ? undefined : "ltr"} type={type} step={type === "time" ? 300 : undefined} min={type === "number" ? (field === "crewSize" ? 1 : 0) : undefined} value={state.plan[field]} onChange={(event) => set(field, event.target.value)} aria-invalid={Boolean(state.errors[field])} /><ErrorText state={state} name={field} /></label>)}
          </div>
        </fieldset>

        <section className="section-block import-block">
          <div className="block-title"><FileInput aria-hidden="true" /><div><h2 id="import-title">{t.importPlan}</h2><p>{t.importHelp}</p></div></div>
          <label><span className="sr-only">{t.importPlan}</span><textarea className="form-control plan-input" rows={7} maxLength={5000} value={state.plan.planText} onChange={(event) => set("planText", event.target.value)} aria-invalid={Boolean(state.errors.planText)} /></label>
          <ErrorText state={state} name="planText" />
          {state.aiStatus === "loading" && <div className="extraction-skeleton" role="status" aria-live="polite"><LoaderCircle aria-hidden="true" /><span>{t.structuring}</span><i /><i /><i /></div>}
          {state.aiError && <div role="alert" className="integration-error"><strong>{state.language === "ar" ? "تعذر استيراد الخطة" : "Plan import unavailable"}</strong><span>{displayError(state.aiError, state.language)}</span><span>{t.manual}</span></div>}
          <div className="action-row">
            <button className="button-primary" onClick={analyze} disabled={state.aiStatus === "loading"}><ClipboardList aria-hidden="true" />{state.aiStatus === "loading" ? t.structuring : t.structure}</button>
            <button className="button-secondary" onClick={manual}>{t.manual}</button>
            <button className="button-tertiary" onClick={() => dispatch({ type: "loadDemo", demo: getDemoScenario() })}>{t.sample}</button>
          </div>
        </section>
      </div>
      <aside className="summary-rail" aria-label={t.currentSummary}>
        <h2>{t.currentSummary}</h2>
        <dl>
          <div><dt>{t.site}</dt><dd>{state.plan.siteName || "—"}</dd></div>
          <div><dt>{t.location}</dt><dd>{state.plan.location?.name ?? "—"}</dd></div>
          <div><dt>{t.date}</dt><dd dir="ltr">{state.plan.shiftDate || "—"}</dd></div>
          <div><dt>{t.start} / {t.end}</dt><dd dir="ltr">{state.plan.shiftStart || "—"} – {state.plan.shiftEnd || "—"}</dd></div>
          <div><dt>{t.crew}</dt><dd>{state.plan.crewSize || "—"}</dd></div>
        </dl>
        <h3>{t.assumptionsTitle}</h3>
        <ul>{t.assumptionsList.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul>
      </aside>
    </section>
  );
}

function TaskPlan({ state, t, dispatch, next }: { state: WorkflowState; t: UiCopy; dispatch: WorkflowDispatch; next: () => void }) {
  const notice = state.planSource === "ai" ? `${state.tasks.length} ${t.structured}` : state.planSource === "sample" ? t.sampleNotice : t.manualNotice;
  const shiftFields: Array<[keyof PlanForm, string]> = [["siteName", t.site], ["location", t.location], ["shiftDate", t.date], ["shiftStart", t.start], ["shiftEnd", t.end], ["crewSize", t.crew], ["nonAcclimatizedWorkers", t.newWorkers]];
  const shiftErrors = {...validatePlanDetails(state.plan), ...state.errors};
  const shiftIssues = shiftFields.filter(([field]) => Boolean(shiftErrors[field]));
  const editShift = () => {
    const first = shiftIssues[0]?.[0] ?? "siteName";
    dispatch({ type: "setStep", step: "describe" });
    requestAnimationFrame(() => document.getElementById(`plan-${first}`)?.focus());
  };
  return (
    <section aria-labelledby="task-plan-title" className="workspace-main">
      <header className="section-heading task-plan-heading">
        <div><p>02 / {t.steps[1]}</p><h1 id="task-plan-title">{t.taskPlan}</h1><span>{t.taskReview}. {t.reviewNotice}</span></div>
      </header>
      <div role="status" className="review-status"><Check aria-hidden="true" /><span>{notice}</span></div>
      {state.planSource === "ai" && state.aiModel && <p className="model-note">{t.modelNote} <span dir="ltr">{state.aiModel}</span>. {t.reviewRequired}</p>}
      {state.assumptions.length > 0 && <Info title={t.assumptions} items={state.assumptions} />}
      {state.missingInformation.length > 0 && <Info title={t.missing} items={state.missingInformation} />}
      {shiftIssues.length > 0 && <section className="shift-attention" role="alert" aria-labelledby="shift-attention-title"><div><h2 id="shift-attention-title">{t.shiftAttention}</h2><ul>{shiftIssues.map(([field, label]) => <li key={field}><strong>{label}:</strong> {displayError(shiftErrors[field], state.language)}</li>)}</ul></div><button className="button-secondary" onClick={editShift}>{t.editShift}</button></section>}
      <ErrorText state={state} name="tasks" />
      <div className="task-table-wrap">
        <table className="task-table">
          <caption className="sr-only">{t.taskPlan}</caption>
          <thead><tr><th>{t.task}</th><th>{t.activity}</th><th>{t.requestedTime}</th><th>{t.duration}</th><th>{t.workload}</th><th>{t.area}</th><th>{t.canSplit}</th><th>{t.validation}</th><th>{t.delete}</th></tr></thead>
          <tbody>{state.tasks.map((task, index) => <TaskRow key={task.id} state={state} task={task} index={index} t={t} dispatch={dispatch} />)}</tbody>
        </table>
      </div>
      <button className="add-task-row" onClick={() => dispatch({ type: "addTask" })}><Plus aria-hidden="true" />{t.add}</button>
      <div className="footer-actions"><button className="button-tertiary" onClick={() => dispatch({ type: "setStep", step: "describe" })}><ArrowLeft aria-hidden="true" />{t.back}</button><button className="button-primary" onClick={next}>{t.next}<ArrowRight aria-hidden="true" /></button></div>
    </section>
  );
}

function Info({ title, items }: { title: string; items: string[] }) {
  return <details className="compact-details"><summary>{title} <span>{items.length}</span></summary><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></details>;
}

function TaskRow({ state, task, index, t, dispatch }: { state: WorkflowState; task: DraftWorkTask; index: number; t: UiCopy; dispatch: WorkflowDispatch }) {
  const update = (field: keyof Omit<DraftWorkTask, "id">, value: DraftWorkTask[keyof Omit<DraftWorkTask, "id">]) => dispatch({ type: "updateTask", id: task.id, field, value });
  const error = (field: string) => state.errors[`task-${task.id}-${field}`];
  const hasErrors = ["nameEn", "nameAr", "durationMinutes", "workload", "environment", "splittable", "requestedTime"].some((field) => Boolean(error(field)));
  const kind = task.activityKind ?? "work";
  const complete = Boolean(task.nameEn && task.nameAr && task.durationMinutes && (kind !== "work" || (task.workload && task.environment && task.splittable !== null))) && !hasErrors;
  const fieldError = (field: string) => error(field) ? <p role="alert" className="field-error">{displayError(error(field), state.language)}</p> : null;
  const evidence = Object.entries(task.evidence ?? {});
  return (
    <tr data-testid={`task-row-${index}`}>
      <td data-label={t.task} className="task-name-cell"><span className="row-number">{String(index + 1).padStart(2, "0")}</span><label><span>{t.enName}</span><input className="table-control" value={task.nameEn} onChange={(event) => update("nameEn", event.target.value)} aria-invalid={Boolean(error("nameEn"))} />{fieldError("nameEn")}</label><label><span>{t.arName}</span><input className="table-control" lang="ar" dir="rtl" value={task.nameAr} onChange={(event) => update("nameAr", event.target.value)} aria-invalid={Boolean(error("nameAr"))} />{fieldError("nameAr")}</label>{evidence.length > 0 && <details className="task-evidence"><summary>{state.language === "ar" ? "الأدلة" : "Source evidence"}</summary><ul>{evidence.map(([field, item]) => <li key={field}><strong>{field}:</strong> {item.evidence} <em>{item.source.replaceAll("_", " ")}</em></li>)}</ul></details>}</td>
      <td data-label={t.activity}><label><span className="sr-only">{t.activity}</span><select aria-label={t.activity} className="table-control" value={kind} onChange={(event) => update("activityKind", event.target.value as DraftWorkTask["activityKind"])}><option value="work">{t.work}</option><option value="break">{t.breakActivity}</option><option value="meal">{t.meal}</option></select></label><label><span>{t.timing}</span><select aria-label={t.timing} className="table-control" value={task.timingPreference ?? "flexible"} onChange={(event) => update("timingPreference", event.target.value as DraftWorkTask["timingPreference"])}><option value="flexible">{t.flexible}</option><option value="preferred">{t.preferred}</option><option value="fixed">{t.fixed}</option></select></label>{kind === "work" && <label className="check-line"><input type="checkbox" checked={task.mustSchedule ?? false} onChange={(event) => update("mustSchedule", event.target.checked)} />{t.mustComplete}</label>}{kind === "work" && <label><span>{t.operationalNotes}</span><textarea aria-label={`${t.operationalNotes} ${index + 1}`} className="table-control" rows={2} value={(task.operationalNotes ?? []).join("\n")} onChange={(event) => update("operationalNotes", event.target.value.split(/\n/).map(value=>value.trim()).filter(Boolean))} /></label>}</td>
      <td data-label={t.requestedTime}><div className="time-pair"><label><span>{t.startOptional}</span><input className="table-control" type="time" step="300" dir="ltr" value={task.requestedStart ?? ""} onChange={(event) => update("requestedStart", event.target.value)} /></label><label><span>{t.endOptional}</span><input className="table-control" type="time" step="300" dir="ltr" value={task.requestedEnd ?? ""} onChange={(event) => update("requestedEnd", event.target.value)} /></label></div>{fieldError("requestedTime")}</td>
      <td data-label={t.duration}><label><span className="sr-only">{t.durationMinutes}</span><input aria-label={t.durationMinutes} className="table-control numeric" type="number" min="5" step="5" dir="ltr" value={task.durationMinutes ?? ""} onChange={(event) => update("durationMinutes", event.target.value === "" ? null : Number(event.target.value))} aria-invalid={Boolean(error("durationMinutes"))} /></label>{task.durationMinutes ? <strong className="human-duration">{formatDuration(task.durationMinutes, state.language)}</strong> : null}{task.durationMinutes ? <small>{task.durationMinutes} min</small> : null}{fieldError("durationMinutes")}</td>
      <td data-label={kind === "work" ? t.workload : t.recovery}>{kind === "work" ? <><label><span className="sr-only">{t.workload}</span><select aria-label={t.workload} className="table-control" value={task.workload} onChange={(event) => update("workload", event.target.value as DraftWorkTask["workload"])} aria-invalid={Boolean(error("workload"))}><option value="">{t.incomplete}</option><option value="heavy">{displayWorkload("heavy", state.language)}</option><option value="light">{displayWorkload("light", state.language)}</option></select></label>{task.suggestedWorkload && !task.workload && <Suggestion label={`${t.suggested}: ${displayWorkload(task.suggestedWorkload,state.language)}`} action={t.useSuggestion} onUse={() => update("workload", task.suggestedWorkload!)} />}{fieldError("workload")}</> : <><label><span className="sr-only">{t.recovery}</span><select aria-label={t.recovery} className="table-control" value={task.recoveryEligibility ?? "unknown"} onChange={(event) => update("recoveryEligibility", event.target.value as DraftWorkTask["recoveryEligibility"])}><option value="unknown">{t.recoveryUnknown}</option><option value="eligible">{t.recoveryEligible}</option><option value="not_eligible">{t.recoveryNotEligible}</option></select></label><small>{t.recoveryHelp}</small></>}</td>
      <td data-label={t.area}>{kind === "work" ? <><label><span className="sr-only">{t.environment}</span><select aria-label={t.environment} className="table-control" value={task.environment} onChange={(event) => update("environment", event.target.value as DraftWorkTask["environment"])} aria-invalid={Boolean(error("environment"))}><option value="">{t.incomplete}</option><option value="direct_sun">{displayEnvironment("direct_sun", state.language)}</option><option value="shaded_outdoor">{displayEnvironment("shaded_outdoor", state.language)}</option><option value="conditioned_indoor">{displayEnvironment("conditioned_indoor", state.language)}</option></select></label>{task.suggestedEnvironment && !task.environment && <Suggestion label={`${t.suggested}: ${displayEnvironment(task.suggestedEnvironment,state.language)}`} action={t.useSuggestion} onUse={() => update("environment", task.suggestedEnvironment!)} />}{fieldError("environment")}<small>{t.indoorNote}</small></> : <span>—</span>}</td>
      <td data-label={t.canSplit}>{kind === "work" ? <><label><span className="sr-only">{t.splitQuestion}</span><select aria-label={t.splitQuestion} className="table-control" value={task.splittable === null ? "" : String(task.splittable)} onChange={(event) => update("splittable", event.target.value === "" ? null : event.target.value === "true")} aria-invalid={Boolean(error("splittable"))}><option value="">{t.incomplete}</option><option value="true">{t.yes}</option><option value="false">{t.no}</option></select></label>{task.suggestedSplittable !== undefined && task.splittable === null && <Suggestion label={`${t.suggested}: ${task.suggestedSplittable?t.yes:t.no}`} action={t.useSuggestion} onUse={() => update("splittable", task.suggestedSplittable!)} />}{fieldError("splittable")}</> : <span>—</span>}</td>
      <td data-label={t.validation}><span className={`validation-state ${complete ? "complete" : "incomplete"}`}>{complete ? <Check aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}{complete ? t.complete : t.incomplete}</span></td>
      <td data-label={t.delete}><button className="icon-button danger" aria-label={`${t.delete} ${index + 1}`} onClick={() => dispatch({ type: "removeTask", id: task.id })}><Trash2 aria-hidden="true" /></button></td>
    </tr>
  );
}

function Suggestion({ label, action, onUse }: { label: string; action: string; onUse: () => void }) {
  return <div className="suggestion"><span>{label}</span><button type="button" onClick={onUse}>{action}</button></div>;
}

function Conditions({ state, t, peak, apparentPeak, dispatch, generate }: { state: WorkflowState; t: UiCopy; peak: number | null; apparentPeak: number | null; dispatch: WorkflowDispatch; generate: () => void }) {
  const shiftHours = filterForecastForShift(state.forecast,state.plan.shiftStart,state.plan.shiftEnd);
  const retrieved = state.weatherMetadata ? new Date(state.weatherMetadata.retrievedAt).toLocaleString(state.language === "ar" ? "ar-SA" : "en-GB") : null;
  const category = peak === null ? "—" : displayTemperatureCategory(classifyForecastTemperature(peak).category, state.language);
  const options: Array<{ zone: TwlZone; label: string; cycle: string }> = [
    { zone: "none", label: t.noTwl, cycle: t.preliminaryCycle },
    { zone: "low", label: t.low, cycle: t.lowCycle },
    { zone: "intermediate", label: t.intermediate, cycle: t.intermediateCycle },
    { zone: "high", label: t.high, cycle: t.highCycle },
  ];
  return (
    <section aria-labelledby="conditions-title" className="workspace-main conditions-workspace">
      <header className="section-heading"><div><p>03 / {t.steps[2]}</p><h1 id="conditions-title">{t.conditionsTitle}</h1></div></header>
      <section className="conditions-section" aria-labelledby="forecast-context-title">
        <div className="conditions-title-row"><div><p className="section-index">A</p><h2 id="forecast-context-title">{t.forecastContext.slice(3)}</h2></div>{state.forecastSource === "sample" && <span className="data-provenance">{t.sampleNotice}</span>}</div>
        {state.weatherStatus === "loading" && <div className="weather-skeleton" role="status"><LoaderCircle aria-hidden="true" /><strong>{t.loadingWeather}</strong><div /><div /><div /><div /></div>}
        {state.weatherStatus === "error" && <div role="alert" className="weather-error"><AlertTriangle aria-hidden="true" /><div><strong>{t.unavailable}</strong><p>{displayError(state.weatherError ?? "Weather is unavailable.", state.language)}</p><p>{t.fallback}</p></div></div>}
        {state.weatherStatus === "success" && <>
          <div className="forecast-header"><div><strong>{t.cityForecast}</strong>{state.weatherMetadata && <p>{state.weatherMetadata.locationName} · <span dir="ltr">{state.weatherMetadata.latitude.toFixed(4)}, {state.weatherMetadata.longitude.toFixed(4)}</span> · {state.weatherMetadata.timezone} · {t.forecastDate}: <span dir="ltr">{state.weatherMetadata.date}</span> · {t.retrieved}: <span dir="ltr">{retrieved}</span></p>}<p>{t.forecastMeasurement}</p><a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="source-link">{t.weatherAttribution}</a></div><dl><div><dt>{t.peak}</dt><dd dir="ltr">{peak === null ? "—" : `${peak.toFixed(1)}°C`}</dd></div><div><dt>{t.apparentPeak}</dt><dd dir="ltr">{apparentPeak === null ? "—" : `${apparentPeak.toFixed(1)}°C`}</dd></div><div><dt>{t.risk}</dt><dd>{category}</dd></div></dl></div>
          <div className="forecast-strip" aria-label={t.hourlyForecast} role="region" tabIndex={0}>
            <table><caption className="sr-only">{t.hourlyForecast}</caption><thead><tr><th>{state.language === "ar" ? "المقياس" : "Measure"}</th>{shiftHours.map((hour) => <th key={hour.time} className={isRestrictedHour(state.plan.shiftDate, hour.time) ? "restricted-hour" : ""} dir="ltr">{hour.time}</th>)}</tr></thead><tbody>
              <tr><th>{t.temperature}</th>{shiftHours.map((hour) => <td key={hour.time} className={isRestrictedHour(state.plan.shiftDate, hour.time) ? "restricted-hour" : ""} dir="ltr">{hour.temperatureCelsius.toFixed(1)}°</td>)}</tr>
              <tr><th>{t.apparent}</th>{shiftHours.map((hour) => <td key={hour.time} className={isRestrictedHour(state.plan.shiftDate, hour.time) ? "restricted-hour" : ""} dir="ltr">{hour.apparentTemperatureCelsius.toFixed(1)}°</td>)}</tr>
              <tr><th>{t.humidity}</th>{shiftHours.map((hour) => <td key={hour.time} className={isRestrictedHour(state.plan.shiftDate, hour.time) ? "restricted-hour" : ""} dir="ltr">{hour.relativeHumidityPercent}%</td>)}</tr>
              <tr><th>{t.wind}</th>{shiftHours.map((hour) => <td key={hour.time} className={isRestrictedHour(state.plan.shiftDate, hour.time) ? "restricted-hour" : ""} dir="ltr">{hour.windSpeedKph.toFixed(1)} kph</td>)}</tr>
            </tbody></table>
          </div>
        </>}
      </section>

      <section className="conditions-section" aria-labelledby="twl-title">
        <div className="conditions-title-row"><div><p className="section-index">B</p><h2 id="twl-title">{t.twlTitle.slice(3)}</h2></div></div>
        <p className="twl-explanation">{t.twlExplain}</p>
        <fieldset className="twl-selector"><legend className="sr-only">{t.twlTitle}</legend>{options.map((option) => {
          const selected = state.conditions.twlZone === option.zone;
          return <label key={option.zone} className={selected ? "selected" : ""}><input type="radio" name="twl-zone" checked={selected} onChange={() => dispatch({ type: "setConditions", conditions: option.zone === "none" ? { measurementMode: "forecast", twlZone: "none" } : { measurementMode: "onsite_twl", twlZone: option.zone } })} /><span><strong>{option.label}</strong><small>{option.cycle}</small></span></label>;
        })}</fieldset>
      </section>
      <div className="footer-actions"><button className="button-tertiary" onClick={() => dispatch({ type: "setStep", step: "verify" })}><ArrowLeft aria-hidden="true" />{t.back}</button><button className="button-primary" onClick={generate}><CloudSun aria-hidden="true" />{t.generate}</button></div>
    </section>
  );
}

function isRestrictedHour(date: string, time: string): boolean {
  return evaluateMiddayRestriction({ date, time, environment: "direct_sun" }).restrictedWindowActive;
}
