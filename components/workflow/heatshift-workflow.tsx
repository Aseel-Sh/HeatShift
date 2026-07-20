"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import type { Dispatch } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  CloudSun,
  Pencil,
  FileInput,
  LoaderCircle,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { BrandHeader } from "@/components/layout/brand-header";
import { ResultsPage } from "@/components/report/results-page";
import { LocationPicker } from "@/components/workflow/location-picker";
import { getDemoScenario } from "@/lib/demo/get-demo-scenario";
import type { ExtractedPlan } from "@/lib/ai/plan-extraction-schema";
import type { ExtractionMessage } from "@/lib/ai/plan-extraction-schema";
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
import { formatSaudiRetrievedAt, SAUDI_TIME_ZONE, saudiTimeZoneSentence } from "@/lib/i18n/saudi-time";
import { filterForecastForShift } from "@/lib/weather/forecast-display";
import {
  createInitialWorkflowState,
  validatePlanDetails,
  validateDraftTask,
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
    useSuggestion: "Apply",
    timing: "Timing",
    flexible: "Flexible",
    preferred: "Preferred",
    fixed: "Fixed",
    mustComplete: "Required today",
    operationalNotes: "Operational notes",
    dependencies: "Must happen after",
    dependencySuggestion: "Suggested from work-plan order; confirm before scheduling.",
    confirmSuggestion: "Confirm suggestion",
    afterActivity: "After",
    shiftAttention: "Shift details need attention",
    editShift: "Edit shift details",
    workload: "Workload",
    area: "Work area",
    canSplit: "Can split?",
    validation: "Validation",
    status: "Status",
    editTask: "Edit",
    ready: "Ready",
    needsDecision: "Needs 1 input",
    needsDecisions: "Needs {count} inputs",
    needsArabicName: "Needs Arabic name",
    needsDependencyReview: "Needs dependency review",
    conflictStatus: "Conflict",
    taskHelp: "Work-area guidance",
    taskHelpText: "Indoor / cooled area means a genuinely conditioned recovery or work location. Heat-exposed indoor work requires a separate site assessment.",
    suggestionsTitle: "Review suggestions",
    unresolvedFields: "Unresolved fields",
    dismiss: "Dismiss",
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
    normalPriority: "Normal",
    cancel: "Cancel",
    save: "Save",
    saveNext: "Save and next",
    saveFinish: "Save and finish",
    previousTask: "Previous",
    nextTask: "Next",
    taskProgress: "Task {current} of {total}",
    tasksNeedReview: "{count} tasks still need review",
    discardTitle: "Discard unsaved changes?",
    discardText: "This task has changes that have not been saved.",
    discard: "Discard changes",
    keepEditing: "Keep editing",
    sourceEvidence: "Source evidence",
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
    editTask: "تعديل",
    needsArabicName: "يحتاج اسمًا عربيًا",
    unresolvedFields: "الحقول غير المحسومة",
    normalPriority: "عادي",
    cancel: "إلغاء",
    save: "حفظ",
    saveNext: "حفظ والتالي",
    saveFinish: "حفظ وإنهاء",
    previousTask: "السابق",
    nextTask: "التالي",
    taskProgress: "المهمة {current} من {total}",
    tasksNeedReview: "{count} مهام ما زالت تحتاج مراجعة",
    discardTitle: "هل تريد تجاهل التغييرات غير المحفوظة؟",
    discardText: "تحتوي هذه المهمة على تغييرات لم تُحفظ.",
    discard: "تجاهل التغييرات",
    keepEditing: "متابعة التعديل",
    sourceEvidence: "أدلة المصدر",
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
    assumptionsList: ["فريق واحد", "شبكة تخطيط كل خمس دقائق", "سياق توقعات الإحداثيات المحددة", "لا يوجد إسناد على مستوى العامل"],
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
    useSuggestion: "تطبيق",
    timing: "أولوية الوقت",
    flexible: "مرن",
    preferred: "مفضل",
    fixed: "ثابت",
    mustComplete: "مطلوب اليوم",
    operationalNotes: "ملاحظات تشغيلية",
    dependencies: "يجب أن يحدث بعد",
    dependencySuggestion: "اقتراح من ترتيب خطة العمل؛ أكّده قبل الجدولة.",
    confirmSuggestion: "تأكيد الاقتراح",
    afterActivity: "بعد",
    shiftAttention: "تفاصيل الوردية تحتاج انتباهًا",
    editShift: "تعديل تفاصيل الوردية",
    workload: "عبء العمل",
    area: "منطقة العمل",
    canSplit: "قابلة للتقسيم؟",
    validation: "التحقق",
    status: "الحالة",
    expand: "توسيع التفاصيل",
    collapse: "طي التفاصيل",
    ready: "جاهز",
    needsDecision: "يحتاج إلى إدخال واحد",
    needsDecisions: "يحتاج إلى {count} إدخالات",
    needsDependencyReview: "يحتاج إلى مراجعة التبعية",
    conflictStatus: "تعارض",
    taskHelp: "إرشادات منطقة العمل",
    taskHelpText: "تعني المنطقة الداخلية / المبرّدة موقع عمل أو تعافٍ مكيّفًا فعليًا. يحتاج العمل الداخلي المعرّض للحرارة إلى تقييم منفصل للموقع.",
    suggestionsTitle: "اقتراحات للمراجعة",
    dismiss: "تجاهل",
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
      const parameters=new URLSearchParams({latitude:String(location.latitude),longitude:String(location.longitude),date:state.plan.shiftDate,timezone:SAUDI_TIME_ZONE,locationName:location.name});
      const response = await fetch(`/api/weather?${parameters}`);
      const payload = await response.json() as { data?: { locationName?:string;latitude?:number;longitude?:number;timezone?:string;date?:string;retrievedAt?:string;hours?:ForecastHour[] }; error?: { message?: string } };
      if (!response.ok || !payload.data?.hours?.length) throw new Error(payload.error?.message || "Weather is unavailable.");
      if(!payload.data.locationName||payload.data.latitude===undefined||payload.data.longitude===undefined||payload.data.timezone!==SAUDI_TIME_ZONE||!payload.data.date||!payload.data.retrievedAt)throw new Error("Weather metadata is unavailable.");
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
          <p className="timezone-notice">{saudiTimeZoneSentence(state.language)}</p>
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
  const [editingTaskId,setEditingTaskId]=useState<string|null>(null);
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
      {state.assumptions.length > 0 && <Info title={t.assumptions} items={state.assumptions} language={state.language} />}
      {state.missingInformation.length > 0 && <Info title={t.missing} items={state.missingInformation} language={state.language} />}
      {shiftIssues.length > 0 && <section className="shift-attention" role="alert" aria-labelledby="shift-attention-title"><div><h2 id="shift-attention-title">{t.shiftAttention}</h2><ul>{shiftIssues.map(([field, label]) => <li key={field}><strong>{label}:</strong> {displayError(shiftErrors[field], state.language)}</li>)}</ul></div><button className="button-secondary" onClick={editShift}>{t.editShift}</button></section>}
      <ErrorText state={state} name="tasks" />
      <details className="task-page-help"><summary>{t.taskHelp}</summary><p>{t.taskHelpText}</p></details>
      <div className="task-table-wrap">
        <table className="task-table task-review-table">
          <caption className="sr-only">{t.taskPlan}</caption>
          <thead><tr><th>{t.task}</th><th>{t.activity}</th><th>{t.requestedTime}</th><th>{t.duration}</th><th>{t.workload} / {t.recovery}</th><th>{t.area}</th><th>{t.status}</th><th>{t.editTask}</th></tr></thead>
          {state.tasks.map((task,index)=><TaskSummary key={task.id} state={state} task={task} index={index} t={t} onEdit={()=>setEditingTaskId(task.id)} onDelete={()=>dispatch({type:"removeTask",id:task.id})}/>)}
        </table>
      </div>
      <button className="add-task-row" onClick={() => {const id=`manual-task-${state.nextTaskId}`;dispatch({ type: "addTask" });setEditingTaskId(id);}}><Plus aria-hidden="true" />{t.add}</button>
      <div className="footer-actions"><button className="button-tertiary" onClick={() => dispatch({ type: "setStep", step: "describe" })}><ArrowLeft aria-hidden="true" />{t.back}</button><button className="button-primary" onClick={next}>{t.next}<ArrowRight aria-hidden="true" /></button></div>
      {editingTaskId&&<TaskEditModal key={editingTaskId} state={state} taskId={editingTaskId} t={t} dispatch={dispatch} onNavigate={setEditingTaskId} onClose={()=>{const id=editingTaskId;setEditingTaskId(null);requestAnimationFrame(()=>document.getElementById(`edit-${id}`)?.focus());}}/>}
    </section>
  );
}

function Info({ title, items, language }: { title: string; items: ExtractionMessage[]; language: Language }) {
  return <details className="compact-details"><summary>{title} <span>{items.length}</span></summary><ul>{items.map((item,index) => <li key={`${item.code}-${index}`}>{language === "ar" ? item.messageAr : item.messageEn}</li>)}</ul></details>;
}

function reviewModel(task:DraftWorkTask,tasks:DraftWorkTask[],language:Language,t:UiCopy){
  const kind=task.activityKind??"work";
  const errors=validateDraftTask(task,tasks);
  const missing:Array<[string,string]>=[];
  if(!task.nameEn.trim())missing.push(["nameEn",t.enName]);
  if(task.durationMinutes===null||task.durationMinutes<=0||task.durationMinutes%5!==0)missing.push(["durationMinutes",t.duration]);
  if(kind==="work"&&!task.workload)missing.push(["workload",t.workload]);
  if(kind==="work"&&!task.environment)missing.push(["environment",t.area]);
  if(kind==="work"&&task.splittable===null)missing.push(["splittable",t.canSplit]);
  const arabicInvalid=false;
  const conflict=Boolean(errors[`task-${task.id}-requestedTime`]||errors[`task-${task.id}-dependencies`]);
  const predecessorOptions=tasks.filter(candidate=>candidate.id!==task.id&&(candidate.activityKind??"work")==="work");
  const dismissed=new Set(task.dismissedSuggestionKeys??[]);
  const suggestedPredecessors=predecessorOptions.filter(candidate=>(task.suggestedPredecessorTaskIds??[]).includes(candidate.id));
  const dependencyReview=kind==="work"&&!dismissed.has("dependency")&&suggestedPredecessors.some(candidate=>!(task.predecessorTaskIds??[]).includes(candidate.id));
  const status=conflict?t.conflictStatus:arabicInvalid?t.needsArabicName:missing.length===1?t.needsDecision:missing.length?t.needsDecisions.replace("{count}",String(missing.length)):dependencyReview?t.needsDependencyReview:t.ready;
  const statusClass=conflict?"conflict":arabicInvalid||missing.length||dependencyReview?"attention":"ready";
  const unresolved=[...missing.map(([,label])=>label),...(arabicInvalid?[t.arName]:[]),...(conflict?[displayError(Object.values(errors)[0],language)]:[]),...(dependencyReview?[t.dependencies]:[])];
  return {kind,errors,missing,arabicInvalid,dependencyReview,status,statusClass,unresolved,predecessorOptions,suggestedPredecessors};
}

function suggestionModels(task:DraftWorkTask,tasks:DraftWorkTask[],language:Language,t:UiCopy){
  const model=reviewModel(task,tasks,language,t);const dismissed=new Set(task.dismissedSuggestionKeys??[]);
  return [
    task.suggestedWorkload&&task.suggestedWorkload!==task.workload&&!dismissed.has("workload")?{key:"workload",label:`${language==="ar"?"اقتراح عبء العمل":"Workload suggestion"}: ${displayWorkload(task.suggestedWorkload,language)}`,field:"workload" as const,value:task.suggestedWorkload}:null,
    task.suggestedEnvironment&&task.suggestedEnvironment!==task.environment&&!dismissed.has("environment")?{key:"environment",label:`${language==="ar"?"اقتراح منطقة العمل":"Work-area suggestion"}: ${displayEnvironment(task.suggestedEnvironment,language)}`,field:"environment" as const,value:task.suggestedEnvironment}:null,
    task.suggestedSplittable!==undefined&&task.suggestedSplittable!==task.splittable&&!dismissed.has("splittable")?{key:"splittable",label:`${language==="ar"?"اقتراح إعداد التقسيم":"Split-setting suggestion"}: ${task.suggestedSplittable?t.yes:t.no}`,field:"splittable" as const,value:task.suggestedSplittable}:null,
    model.dependencyReview?{key:"dependency",label:`${language==="ar"?"اقتراح التبعية":"Dependency suggestion"}: ${language==="ar"?"بعد":"After"} ${model.suggestedPredecessors.map(candidate=>language==="ar"?candidate.nameAr:candidate.nameEn).join(", ")}`,field:"predecessorTaskIds" as const,value:[...new Set([...(task.predecessorTaskIds??[]),...model.suggestedPredecessors.map(candidate=>candidate.id)])]}:null,
  ].filter((item):item is NonNullable<typeof item>=>Boolean(item));
}

function TaskSummary({state,task,index,t,onEdit,onDelete}:{state:WorkflowState;task:DraftWorkTask;index:number;t:UiCopy;onEdit:()=>void;onDelete:()=>void}){
  const model=reviewModel(task,state.tasks,state.language,t);
  const primary=state.language==="ar"?task.nameAr:task.nameEn;
  const secondary=state.language==="ar"?task.nameEn:task.nameAr;
  const kindLabel=model.kind==="work"?t.work:model.kind==="break"?t.breakActivity:t.meal;
  const requested=task.requestedStart&&task.requestedEnd?`${task.requestedStart}–${task.requestedEnd}`:state.language==="ar"?"الوقت غير محدد":"Time not specified";
  const workOrRecovery=model.kind==="work"
    ? task.workload?displayWorkload(task.workload,state.language):t.incomplete
    : task.recoveryEligibility==="eligible"?t.recoveryEligible:task.recoveryEligibility==="not_eligible"?t.recoveryNotEligible:t.recoveryUnknown;
  return <tbody data-testid={`task-row-${index}`}>
    <tr className="task-main-row">
      <td data-label={t.task} className="task-summary"><span className="row-number">{String(index+1).padStart(2,"0")}</span><strong title={primary||t.incomplete}>{primary||t.incomplete}</strong><small title={secondary||undefined}>{secondary||t.incomplete}</small><span className={`priority-badge ${task.mustSchedule?"required":"normal"}`}>{task.mustSchedule?t.mustComplete:t.normalPriority}</span></td>
      <td data-label={t.activity}><strong>{kindLabel}</strong></td>
      <td data-label={t.requestedTime} dir="ltr">{requested}</td>
      <td data-label={t.duration}>{task.durationMinutes?formatDuration(task.durationMinutes,state.language):t.incomplete}</td>
      <td data-label={model.kind==="work"?t.workload:t.recovery}><strong>{workOrRecovery}</strong>{model.kind==="work"&&<small>{t.canSplit}: {task.splittable===null?t.incomplete:task.splittable?t.yes:t.no}</small>}</td>
      <td data-label={t.area}>{model.kind==="work"?(task.environment?displayEnvironment(task.environment,state.language):t.incomplete):"—"}</td>
      <td data-label={t.status}><span className={`task-status ${model.statusClass}`}>{model.status}</span></td>
      <td data-label={t.editTask}><div className="task-review-actions"><button id={`edit-${task.id}`} type="button" className="button-secondary" onClick={onEdit}><Pencil aria-hidden="true"/>{t.editTask}</button><button type="button" className="icon-button danger" aria-label={`${t.delete} ${index+1}`} onClick={onDelete}><Trash2 aria-hidden="true"/><span className="sr-only">{t.delete}</span></button></div></td>
    </tr>
  </tbody>;
}

function TaskEditModal({state,taskId,t,dispatch,onNavigate,onClose}:{state:WorkflowState;taskId:string;t:UiCopy;dispatch:WorkflowDispatch;onNavigate:(id:string)=>void;onClose:()=>void}){
  const source=state.tasks.find(task=>task.id===taskId)!;const index=state.tasks.findIndex(task=>task.id===taskId);
  const [draft,setDraft]=useState<DraftWorkTask>(()=>structuredClone(source));const [errors,setErrors]=useState<Record<string,string>>({});const [pending,setPending]=useState<{kind:"close"}|{kind:"navigate";id:string}|null>(null);const dialogRef=useRef<HTMLDivElement>(null);
  const suggestions=suggestionModels(draft,state.tasks.map(task=>task.id===draft.id?draft:task),state.language,t);const dirty=JSON.stringify(draft)!==JSON.stringify(source);const kind=draft.activityKind??"work";
  const [initialFocusField]=useState(()=>{const initial=reviewModel(source,state.tasks,state.language,t);return initial.missing[0]?.[0]??(initial.dependencyReview?"dependencies":"nameEn");});
  const set=<K extends keyof Omit<DraftWorkTask,"id">>(field:K,value:DraftWorkTask[K])=>{setDraft(current=>({...current,[field]:value,...(field==="activityKind"&&value!=="work"?{predecessorTaskIds:[]}: {})}));setErrors(current=>({...current,[`task-${draft.id}-${String(field)}`]:""}));};
  const error=(field:string)=>errors[`task-${draft.id}-${field}`];const fieldError=(field:string)=>error(field)?<p id={`modal-${field}-error`} role="alert" className="field-error">{displayError(error(field),state.language)}</p>:null;
  const closeOrConfirm=()=>dirty?setPending({kind:"close"}):onClose();const navigateOrConfirm=(id:string)=>dirty?setPending({kind:"navigate",id}):onNavigate(id);
  useEffect(()=>{const previous=document.body.style.overflow;document.body.style.overflow="hidden";const timer=window.setTimeout(()=>{dialogRef.current?.querySelector<HTMLElement>(`[data-field="${initialFocusField}"]`)?.focus();},0);return()=>{window.clearTimeout(timer);document.body.style.overflow=previous;};},[initialFocusField]);
  const onKeyDown=(event:React.KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();closeOrConfirm();return;}if(event.key!=="Tab")return;const focusable=[...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary')??[])].filter(item=>item.offsetParent!==null);if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1)!;if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}};
  const save=(advance:boolean)=>{const tasks=state.tasks.map(task=>task.id===draft.id?draft:task);const nextErrors=validateDraftTask(draft,tasks);if(Object.keys(nextErrors).length){setErrors(nextErrors);requestAnimationFrame(()=>{const field=Object.keys(nextErrors)[0].split(`task-${draft.id}-`)[1];dialogRef.current?.querySelector<HTMLElement>(`[data-field="${field}"]`)?.focus();});return;}dispatch({type:"saveTask",task:draft});if(!advance){onClose();return;}const later=tasks.slice(index+1).find(task=>Object.keys(validateDraftTask(task,tasks)).length>0||reviewModel(task,tasks,state.language,t).dependencyReview);const target=later??tasks[index+1];if(target)onNavigate(target.id);else onClose();};
  const predecessorOptions=state.tasks.filter(candidate=>candidate.id!==draft.id&&(candidate.activityKind??"work")==="work");const evidence=Object.entries(draft.evidence??{});
  const progress=t.taskProgress.replace("{current}",String(index+1)).replace("{total}",String(state.tasks.length));const needCount=state.tasks.filter(task=>{const tasks=state.tasks.map(candidate=>candidate.id===draft.id?draft:candidate);return Object.keys(validateDraftTask(task,tasks)).length>0||reviewModel(task,tasks,state.language,t).dependencyReview;}).length;
  return <div className="task-modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)closeOrConfirm();}}><div ref={dialogRef} className="task-edit-modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title" onKeyDown={onKeyDown}><header><div><p>{progress} · {t.tasksNeedReview.replace("{count}",String(needCount))}</p><h2 id="task-modal-title">{t.editTask}: {state.language==="ar"?draft.nameAr||draft.nameEn:draft.nameEn||draft.nameAr}</h2></div><button type="button" className="modal-close" aria-label={t.cancel} onClick={closeOrConfirm}><X aria-hidden="true"/></button></header><div className="task-modal-body"><section className="modal-field-grid"><label><span>{t.enName}</span><input data-field="nameEn" className="form-control" value={draft.nameEn} onChange={event=>set("nameEn",event.target.value)} aria-invalid={Boolean(error("nameEn"))} aria-describedby={error("nameEn")?"modal-nameEn-error":undefined}/>{fieldError("nameEn")}</label><label><span>{t.arName}</span><input data-field="nameAr" className="form-control" lang="ar" dir="rtl" value={draft.nameAr} onChange={event=>set("nameAr",event.target.value)} aria-invalid={Boolean(error("nameAr"))} aria-describedby={error("nameAr")?"modal-nameAr-error":undefined}/>{fieldError("nameAr")}</label><label><span>{t.activity}</span><select data-field="activityKind" className="form-control" value={kind} onChange={event=>set("activityKind",event.target.value as DraftWorkTask["activityKind"])}><option value="work">{t.work}</option><option value="break">{t.breakActivity}</option><option value="meal">{t.meal}</option></select></label><label><span>{t.timing}</span><select className="form-control" value={draft.timingPreference??"flexible"} onChange={event=>set("timingPreference",event.target.value as DraftWorkTask["timingPreference"])}><option value="fixed">{t.fixed}</option><option value="preferred">{t.preferred}</option><option value="flexible">{t.flexible}</option></select></label><label><span>{t.startOptional}</span><input data-field="requestedTime" className="form-control" type="time" step="300" dir="ltr" value={draft.requestedStart??""} onChange={event=>set("requestedStart",event.target.value)}/>{fieldError("requestedTime")}</label><label><span>{t.endOptional}</span><input className="form-control" type="time" step="300" dir="ltr" value={draft.requestedEnd??""} onChange={event=>set("requestedEnd",event.target.value)}/></label><label><span>{t.durationMinutes}</span><input data-field="durationMinutes" className="form-control" type="number" min="5" step="5" dir="ltr" value={draft.durationMinutes??""} onChange={event=>set("durationMinutes",event.target.value===""?null:Number(event.target.value))} aria-invalid={Boolean(error("durationMinutes"))}/>{fieldError("durationMinutes")}</label><label><span>{state.language==="ar"?"الأولوية":"Priority"}</span><select className="form-control" value={draft.mustSchedule?"required":"normal"} onChange={event=>set("mustSchedule",event.target.value==="required")}><option value="required">{t.mustComplete}</option><option value="normal">{t.normalPriority}</option></select></label>{kind==="work"?<><label><span>{t.workload}</span><select data-field="workload" className="form-control" value={draft.workload} onChange={event=>set("workload",event.target.value as DraftWorkTask["workload"])} aria-invalid={Boolean(error("workload"))}><option value="">{t.incomplete}</option><option value="heavy">{displayWorkload("heavy",state.language)}</option><option value="light">{displayWorkload("light",state.language)}</option></select>{fieldError("workload")}</label><label><span>{t.area}</span><select data-field="environment" className="form-control" value={draft.environment} onChange={event=>set("environment",event.target.value as DraftWorkTask["environment"])} aria-invalid={Boolean(error("environment"))}><option value="">{t.incomplete}</option><option value="direct_sun">{displayEnvironment("direct_sun",state.language)}</option><option value="shaded_outdoor">{displayEnvironment("shaded_outdoor",state.language)}</option><option value="conditioned_indoor">{displayEnvironment("conditioned_indoor",state.language)}</option></select>{fieldError("environment")}</label><label><span>{t.canSplit}</span><select data-field="splittable" className="form-control" value={draft.splittable===null?"":String(draft.splittable)} onChange={event=>set("splittable",event.target.value===""?null:event.target.value==="true")} aria-invalid={Boolean(error("splittable"))}><option value="">{t.incomplete}</option><option value="true">{t.yes}</option><option value="false">{t.no}</option></select>{fieldError("splittable")}</label></>:<label><span>{t.recovery}</span><select className="form-control" value={draft.recoveryEligibility??"unknown"} onChange={event=>set("recoveryEligibility",event.target.value as DraftWorkTask["recoveryEligibility"])}><option value="unknown">{t.recoveryUnknown}</option><option value="eligible">{t.recoveryEligible}</option><option value="not_eligible">{t.recoveryNotEligible}</option></select></label>}</section>{kind==="work"&&predecessorOptions.length>0&&<fieldset className="dependency-selector" aria-invalid={Boolean(error("dependencies"))}><legend>{t.dependencies}</legend>{predecessorOptions.map(candidate=><label key={candidate.id}><input data-field="dependencies" type="checkbox" checked={(draft.predecessorTaskIds??[]).includes(candidate.id)} onChange={event=>set("predecessorTaskIds",event.target.checked?[...new Set([...(draft.predecessorTaskIds??[]),candidate.id])]:(draft.predecessorTaskIds??[]).filter(id=>id!==candidate.id))}/>{t.afterActivity} {state.language==="ar"?candidate.nameAr:candidate.nameEn}</label>)}{fieldError("dependencies")}</fieldset>}<label className="modal-notes"><span>{t.operationalNotes}</span><textarea className="form-control" rows={3} value={(draft.operationalNotes??[]).join("\n")} onChange={event=>set("operationalNotes",event.target.value.split(/\n/).map(value=>value.trim()).filter(Boolean))}/></label>{suggestions.length>0&&<section className="modal-suggestions"><h3>{t.suggestionsTitle}</h3>{suggestions.map(suggestion=><Suggestion key={suggestion.key} label={suggestion.label} apply={t.useSuggestion} dismiss={t.dismiss} onApply={()=>set(suggestion.field,suggestion.value as never)} onDismiss={()=>set("dismissedSuggestionKeys",[...new Set([...(draft.dismissedSuggestionKeys??[]),suggestion.key])])}/>)}</section>}{evidence.length>0&&<details className="task-evidence"><summary>{t.sourceEvidence}</summary><ul>{evidence.map(([field,item])=><li key={field}><strong>{displayEvidenceField(field,state.language)}:</strong> {item.evidence}<em>{displayEvidenceSource(item.source,state.language)}</em></li>)}</ul></details>}</div><footer><div className="modal-navigation"><button type="button" className="button-tertiary" disabled={index===0} onClick={()=>navigateOrConfirm(state.tasks[index-1].id)}>{t.previousTask}</button><button type="button" className="button-tertiary" disabled={index===state.tasks.length-1} onClick={()=>navigateOrConfirm(state.tasks[index+1].id)}>{t.nextTask}</button></div><div className="modal-save-actions"><button type="button" className="button-tertiary" onClick={closeOrConfirm}>{t.cancel}</button><button type="button" className="button-secondary" onClick={()=>save(false)}>{t.save}</button><button type="button" className="button-primary" onClick={()=>save(true)}>{index===state.tasks.length-1?t.saveFinish:t.saveNext}</button></div></footer>{pending&&<div className="unsaved-confirmation" role="alertdialog" aria-modal="true" aria-labelledby="discard-title"><h3 id="discard-title">{t.discardTitle}</h3><p>{t.discardText}</p><div><button type="button" className="button-tertiary" onClick={()=>setPending(null)}>{t.keepEditing}</button><button type="button" className="button-secondary" autoFocus onClick={()=>{const action=pending;setPending(null);if(action.kind==="close")onClose();else onNavigate(action.id);}}>{t.discard}</button></div></div>}</div></div>;
}

function Suggestion({label,apply,dismiss,onApply,onDismiss}:{label:string;apply:string;dismiss:string;onApply:()=>void;onDismiss:()=>void}){
  const normalized=label.toLowerCase();
  const field=normalized.includes("workload")||label.includes("عبء")?"workload":normalized.includes("work-area")||label.includes("منطقة")?"environment":normalized.includes("split-setting")||label.includes("تقسيم")?"splittable":"dependency";
  return <div className="suggestion-chip" data-suggestion-field={field}><span>{label}</span><button type="button" onClick={onApply}>{apply}</button><button type="button" onClick={onDismiss}>{dismiss}</button></div>;
}

function displayEvidenceField(field:string,language:Language){const labels:Record<string,{en:string;ar:string}>={durationMinutes:{en:"Duration",ar:"المدة"},mustSchedule:{en:"Required today",ar:"مطلوب اليوم"},operationalNotes:{en:"Operational notes",ar:"ملاحظات تشغيلية"},requestedStart:{en:"Requested start",ar:"البداية المطلوبة"},requestedEnd:{en:"Requested end",ar:"النهاية المطلوبة"}};return labels[field]?.[language]??(language==="ar"?"حقل مستخرج":"Extracted field");}
function displayEvidenceSource(source:string,language:Language){if(source==="deterministic_parser")return language==="ar"?"استخراج حتمي":"Deterministic extraction";if(source==="explicit_model_extraction")return language==="ar"?"استخراج صريح من النص":"Explicit text extraction";return language==="ar"?"اقتراح يحتاج إلى مراجعة":"Suggestion requiring review";}

function Conditions({ state, t, peak, apparentPeak, dispatch, generate }: { state: WorkflowState; t: UiCopy; peak: number | null; apparentPeak: number | null; dispatch: WorkflowDispatch; generate: () => void }) {
  const shiftHours = filterForecastForShift(state.forecast,state.plan.shiftStart,state.plan.shiftEnd);
  const retrieved = state.weatherMetadata ? formatSaudiRetrievedAt(state.weatherMetadata.retrievedAt, state.language) : null;
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
          <div className="forecast-header"><div><strong>{t.cityForecast}</strong>{state.weatherMetadata && <p>{state.weatherMetadata.locationName} · <span dir="ltr">{state.weatherMetadata.latitude.toFixed(4)}, {state.weatherMetadata.longitude.toFixed(4)}</span> · {t.forecastDate}: <span dir="ltr">{state.weatherMetadata.date}</span> · {t.retrieved}: <span dir="ltr">{retrieved}</span></p>}<p className="timezone-notice">{saudiTimeZoneSentence(state.language)}</p><p>{t.forecastMeasurement}</p><a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="source-link">{t.weatherAttribution}</a></div><dl><div><dt>{t.peak}</dt><dd dir="ltr">{peak === null ? "—" : `${peak.toFixed(1)}°C`}</dd></div><div><dt>{t.apparentPeak}</dt><dd dir="ltr">{apparentPeak === null ? "—" : `${apparentPeak.toFixed(1)}°C`}</dd></div><div><dt>{t.risk}</dt><dd>{category}</dd></div></dl></div>
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
