import type { Language } from "../workflow/state";
import type { SaudiCity, TwlZone, WorkEnvironment, Workload } from "../domain/types";
import type { ForecastTemperatureCategory } from "../domain/temperature-category";

const cityNames: Record<SaudiCity, Record<Language, string>> = {
  riyadh: { en: "Riyadh", ar: "الرياض" },
  jeddah: { en: "Jeddah", ar: "جدة" },
  dammam: { en: "Dammam", ar: "الدمام" },
  mecca: { en: "Mecca", ar: "مكة المكرمة" },
  medina: { en: "Medina", ar: "المدينة المنورة" },
};

const workloadNames: Record<Workload, Record<Language, string>> = {
  light: { en: "Light", ar: "خفيف" },
  heavy: { en: "Heavy", ar: "ثقيل" },
};

const environmentNames: Record<WorkEnvironment, Record<Language, string>> = {
  direct_sun: { en: "Direct sun", ar: "شمس مباشرة" },
  shaded_outdoor: { en: "Shaded outdoor", ar: "خارجي مظلل" },
  conditioned_indoor: { en: "Indoor / cooled area", ar: "داخلي / منطقة مكيّفة" },
};

const zoneNames: Record<TwlZone, Record<Language, string>> = {
  none: { en: "No site TWL input", ar: "لا يوجد إدخال TWL من الموقع" },
  low: { en: "Low", ar: "منخفض" },
  intermediate: { en: "Intermediate", ar: "متوسط" },
  high: { en: "High", ar: "مرتفع" },
};

const temperatureCategoryNames: Record<ForecastTemperatureCategory, Record<Language, string>> = {
  low: { en: "low", ar: "منخفض" },
  intermediate: { en: "intermediate", ar: "متوسط" },
  high: { en: "high", ar: "مرتفع" },
  high_risk: { en: "high risk", ar: "خطورة مرتفعة" },
};

const reasonNames: Record<string, Record<Language, string>> = {
  FIVE_MINUTE_SLOT: { en: "Placed on the five-minute planning grid.", ar: "وُضعت على شبكة التخطيط ذات الخمس دقائق." },
  MIDDAY_RESTRICTION_AVOIDED: { en: "Moved outside the configured midday direct-sun restriction.", ar: "نُقلت خارج فترة تقييد العمل تحت الشمس المباشرة في منتصف النهار." },
  CONDITIONED_INDOOR_MIDDAY_PREFERENCE: { en: "Cooled indoor work was preferred during the restricted outdoor period.", ar: "فُضّل العمل الداخلي المكيّف خلال فترة تقييد العمل الخارجي." },
  COOLER_FORECAST_SLOT: { en: "A cooler available forecast hour was preferred.", ar: "فُضّلت ساعة متاحة أقل حرارة في التوقعات." },
  CREW_REST: { en: "The single crew is in a recovery period.", ar: "الفريق الواحد في فترة تعافٍ." },
  TWL_HIGH_HEAVY_WORK_REST: { en: "High TWL heavy work: 20 minutes work / 40 minutes recovery.", ar: "TWL مرتفع وعمل ثقيل: 20 دقيقة عمل / 40 دقيقة تعافٍ." },
  TWL_HIGH_LIGHT_WORK_REST: { en: "High TWL light work: 45 minutes work / 15 minutes recovery.", ar: "TWL مرتفع وعمل خفيف: 45 دقيقة عمل / 15 دقيقة تعافٍ." },
  TWL_INTERMEDIATE_HEAVY_WORK_REST: { en: "Intermediate TWL heavy work: 45 minutes work / 15 minutes recovery.", ar: "TWL متوسط وعمل ثقيل: 45 دقيقة عمل / 15 دقيقة تعافٍ." },
  SAUDI_MIDDAY_DIRECT_SUN_RESTRICTION: { en: "Configured 2026 direct-sun restriction from 12:00 to 15:00.", ar: "تقييد العمل تحت الشمس المباشرة المهيأ لعام 2026 من 12:00 إلى 15:00." },
};

const originalFindingNames: Record<string, Record<Language, { title: string; description: string }>> = {
  ORIGINAL_WORK_EXCEEDS_SHIFT: {
    en: { title: "Requested work exceeds shift length", description: "Requested task duration is longer than the available shift." },
    ar: { title: "العمل المطلوب يتجاوز مدة الوردية", description: "مدة المهام المطلوبة أطول من الوقت المتاح في الوردية." },
  },
  ORIGINAL_TIME_MISSING: {
    en: { title: "Requested time not stated", description: "No complete requested time was supplied, so time-specific checks remain preliminary." },
    ar: { title: "وقت التنفيذ المطلوب غير محدد", description: "لم يُدخل وقت مطلوب كامل، لذلك تظل الفحوصات المرتبطة بالوقت أولية." },
  },
  ORIGINAL_TASK_OUTSIDE_SHIFT: {
    en: { title: "Requested task is outside the shift", description: "The requested interval is not fully inside the shift." },
    ar: { title: "المهمة المطلوبة خارج الوردية", description: "الفترة المطلوبة ليست داخل الوردية بالكامل." },
  },
  ORIGINAL_INTERVAL_TOO_SHORT: {
    en: { title: "Requested interval is too short", description: "The requested interval is shorter than the task duration." },
    ar: { title: "الفترة المطلوبة أقصر من اللازم", description: "الفترة المطلوبة أقصر من مدة المهمة." },
  },
  ORIGINAL_MIDDAY_DIRECT_SUN: {
    en: { title: "Direct-sun work requested during restriction", description: "The requested interval overlaps the configured 12:00–15:00 restriction." },
    ar: { title: "عمل تحت الشمس المباشرة مطلوب خلال التقييد", description: "تتداخل الفترة المطلوبة مع التقييد المهيأ من 12:00 إلى 15:00." },
  },
  ORIGINAL_TWL_CYCLE_INCOMPATIBLE: {
    en: { title: "Requested interval cannot contain the selected cycle", description: "The requested interval does not include enough time for the selected work/recovery cycle." },
    ar: { title: "الفترة المطلوبة لا تستوعب الدورة المحددة", description: "لا تتضمن الفترة المطلوبة وقتًا كافيًا لدورة العمل والتعافي المحددة." },
  },
  ORIGINAL_TASK_OVERLAP: {
    en: { title: "Requested tasks overlap", description: "The original plan assigns overlapping work to the single crew." },
    ar: { title: "المهام المطلوبة متداخلة", description: "تسند الخطة الأصلية أعمالًا متداخلة إلى الفريق الواحد." },
  },
};

const errorTranslations: Record<string, string> = {
  "Site name is required.": "اسم الموقع مطلوب.",
  "Select a city.": "اختر مدينة.",
  "Select a shift date.": "اختر تاريخ الوردية.",
  "Enter a start time.": "أدخل وقت البداية.",
  "Enter an end time.": "أدخل وقت النهاية.",
  "Shift end must be after shift start; overnight shifts are not supported.": "يجب أن تكون نهاية الوردية بعد بدايتها؛ الورديات الليلية غير مدعومة.",
  "Crew size must be a positive whole number.": "يجب أن يكون حجم الفريق عددًا صحيحًا موجبًا.",
  "New workers must be zero or a positive whole number.": "يجب أن يكون عدد العمال غير المتأقلمين صفرًا أو عددًا صحيحًا موجبًا.",
  "New workers cannot exceed crew size.": "لا يمكن أن يتجاوز عدد العمال غير المتأقلمين حجم الفريق.",
  "Add at least one task before continuing.": "أضف مهمة واحدة على الأقل قبل المتابعة.",
  "English name is required.": "الاسم الإنجليزي مطلوب.",
  "Arabic name is required.": "الاسم العربي مطلوب.",
  "Duration must be a positive multiple of five minutes.": "يجب أن تكون المدة عددًا موجبًا من مضاعفات خمس دقائق.",
  "Select a workload.": "اختر عبء العمل.",
  "Select an environment.": "اختر منطقة العمل.",
  "Select whether the task may be split.": "حدد ما إذا كان يمكن تقسيم المهمة.",
  "Enter both requested times or leave both blank.": "أدخل وقتي الطلب معًا أو اتركهما فارغين.",
  "Enter at least 10 meaningful characters.": "أدخل عشرة أحرف ذات معنى على الأقل.",
};

export const displayCity = (city: SaudiCity, language: Language) => cityNames[city][language];
export const displayWorkload = (workload: Workload, language: Language) => workloadNames[workload][language];
export const displayEnvironment = (environment: WorkEnvironment, language: Language) => environmentNames[environment][language];
export const displayTwlZone = (zone: TwlZone, language: Language) => zoneNames[zone][language];
export const displayTemperatureCategory = (category: ForecastTemperatureCategory, language: Language) => temperatureCategoryNames[category][language];

export function displayReason(code: string, language: Language): string {
  if (reasonNames[code]) return reasonNames[code][language];
  if (code.startsWith("TASK_PRIORITY_")) {
    return language === "ar" ? "وُضعت المهمة وفق ترتيب أولوية العمل المحدد." : "Placed using the fixed task-priority order.";
  }
  return language === "ar" ? "طُبقت قاعدة تخطيط محددة." : "A configured planning rule was applied.";
}

export function displayOriginalFinding(code: string, language: Language): { title: string; description: string } {
  return originalFindingNames[code]?.[language] ?? {
    title: language === "ar" ? "ملاحظة على الخطة المطلوبة" : "Requested-plan finding",
    description: language === "ar" ? "تتطلب هذه الملاحظة مراجعة المشرف." : "This finding requires supervisor review.",
  };
}

export function displayError(message: string, language: Language): string {
  return language === "ar" ? (errorTranslations[message] ?? message) : message;
}
