export function formatDuration(minutes: number, language: "en" | "ar" = "en"): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (language === "ar") {
    if (!hours) return `${remainder} دقيقة`;
    return remainder ? `${hours} ساعة ${remainder} دقيقة` : `${hours} ساعة`;
  }
  if (!hours) return `${remainder} min`;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}
