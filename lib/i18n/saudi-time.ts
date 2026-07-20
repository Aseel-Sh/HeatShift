import type { Language } from "../workflow/state";

export const SAUDI_TIME_ZONE = "Asia/Riyadh" as const;
export const SAUDI_UTC_OFFSET = "UTC+3" as const;

export function saudiTimeZoneName(language: Language): string {
  return language === "ar" ? "توقيت المملكة العربية السعودية" : "Saudi Arabia Standard Time";
}

export function saudiTimeZoneSentence(language: Language): string {
  return language === "ar"
    ? "جميع أوقات الجدول بتوقيت المملكة العربية السعودية (Asia/Riyadh، UTC+3)."
    : "All schedule times use Saudi Arabia Standard Time (Asia/Riyadh, UTC+3).";
}

export function formatSaudiRetrievedAt(value: string, language: Language): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return language === "ar" ? "وقت الاسترجاع غير متاح" : "Retrieval time unavailable";
  const parts = new Intl.DateTimeFormat(language === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
    timeZone: SAUDI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(timestamp);
  const valueFor = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const localDate = `${valueFor("year")}-${valueFor("month")}-${valueFor("day")}`;
  const localTime = `${valueFor("hour")}:${valueFor("minute")}`;
  return `${localDate} · ${localTime} · ${saudiTimeZoneName(language)} (${SAUDI_UTC_OFFSET})`;
}
