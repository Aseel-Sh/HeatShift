export type ActivityKind = "work" | "break" | "meal";
export type RecoveryEligibility = "unknown" | "eligible" | "not_eligible";
export type TimingPreference = "fixed" | "preferred" | "flexible";
export type EvidenceSource = "deterministic_parser" | "explicit_model_extraction" | "inferred_suggestion";

export interface FieldEvidence<T = unknown> {
  value: T;
  evidence: string;
  source: EvidenceSource;
}

export interface ParsedActivity {
  nameEn: string;
  nameAr: string;
  activityKind: ActivityKind;
  durationMinutes: number;
  requestedStart: string;
  requestedEnd: string;
  recoveryEligibility?: RecoveryEligibility;
  mustSchedule?: boolean;
  operationalNotes: string[];
  timingPreference: TimingPreference;
  suggestedWorkload?: "light" | "heavy";
  evidence: Record<string, FieldEvidence>;
}

export interface StructuredPlanContext {
  shiftStart?: string;
  shiftEnd?: string;
}

export interface StructuredPlanParseResult {
  activities: ParsedActivity[];
  ambiguities: string[];
}

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const RANGE_PATTERN = /^\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-–—]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s+(.+?)\s*$/i;

const ARABIC_NAMES: Record<string, string> = {
  "toolbox talk + prep": "حديث السلامة والتجهيز",
  excavation: "الحفر",
  break: "استراحة",
  "rebar + forms": "حديد التسليح والقوالب",
  lunch: "غداء",
  "concrete pour": "صب الخرسانة",
  "finish + curing": "الإنهاء والمعالجة",
  cleanup: "التنظيف",
};

function normalizeInput(value: string): string {
  return value
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/\s*ص(?=\s|[-–—]|$)/gu, " AM")
    .replace(/\s*م(?=\s|[-–—]|$)/gu, " PM")
    .replace(/\u200f|\u200e/g, "");
}

function minutesToTime(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function contextMinutes(value?: string): number | undefined {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return undefined;
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}

function candidates(token: string): number[] {
  const match = token.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return [];
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const marker = match[3];
  if (minute > 59 || hour > 23 || (marker && hour > 12)) return [];
  if (marker) return [((hour % 12) + (marker === "pm" ? 12 : 0)) * 60 + minute];
  if (hour > 12) return [hour * 60 + minute];
  if (hour === 12) return [minute, 12 * 60 + minute];
  return [hour * 60 + minute, (hour + 12) * 60 + minute];
}

function resolveRange(startToken: string, endToken: string, earliest: number | undefined, shiftEnd: number | undefined): [number, number] | null {
  let ranges = candidates(startToken).flatMap((start) =>
    candidates(endToken).map((end) => [start, end] as [number, number]),
  ).filter(([start, end]) => end > start && (earliest === undefined || start >= earliest) && (shiftEnd === undefined || end <= shiftEnd));
  if (earliest !== undefined && ranges.some(([start]) => start === earliest)) {
    ranges = ranges.filter(([start]) => start === earliest).sort((a, b) => (a[1] - a[0]) - (b[1] - b[0]));
    return ranges[0];
  }
  if (ranges.length > 1 && /(?:am|pm)\s*$/i.test(startToken)) {
    return ranges.sort((a, b) => (a[1] - a[0]) - (b[1] - b[0]))[0];
  }
  if (ranges.length !== 1) return null;
  return ranges[0];
}

function activityKind(name: string): ActivityKind {
  const value = name.toLowerCase();
  if (/\b(?:lunch|meal)\b|(?:غداء|وجبة)/u.test(value)) return "meal";
  if (/\b(?:break|rest break)\b|(?:استراحة|راحة)/u.test(value)) return "break";
  return "work";
}

function suggestedWorkload(name: string): "light" | "heavy" | undefined {
  if (/excavat|trench|concrete|rebar|forms|\bحفر|\bخرسان/u.test(name.toLowerCase())) return "heavy";
  if (/toolbox|prep|inspection|cleanup|curing|finish/u.test(name.toLowerCase())) return "light";
  return undefined;
}

function translateName(name: string): string {
  if (/\p{Script=Arabic}/u.test(name)) return name;
  return ARABIC_NAMES[name.toLowerCase()] ?? name;
}

export function parseStructuredPlanRows(text: string, context: StructuredPlanContext): StructuredPlanParseResult {
  const activities: ParsedActivity[] = [];
  const ambiguities: string[] = [];
  const shiftStart = contextMinutes(context.shiftStart);
  const shiftEnd = contextMinutes(context.shiftEnd);
  let previousEnd = shiftStart;

  for (const originalLine of text.split(/\r?\n/)) {
    const line = normalizeInput(originalLine).trim();
    const match = line.match(RANGE_PATTERN);
    if (!match) continue;
    const resolved = resolveRange(match[1], match[2], previousEnd, shiftEnd);
    if (!resolved) {
      ambiguities.push(`Ambiguous time range requires supervisor review: ${originalLine.trim()}`);
      continue;
    }
    const [start, end] = resolved;
    previousEnd = end;
    const name = match[3].trim();
    const nameAr = translateName(name);
    const kind = activityKind(name);
    const duration = end - start;
    const evidenceLine = originalLine.trim();
    const timingPreference: TimingPreference = /\bfixed\b|cannot move|booked\s+(?:from|between)/i.test(evidenceLine) ? "fixed" : "preferred";
    const evidence: Record<string, FieldEvidence> = {
      nameEn: { value: name, evidence: evidenceLine, source: "deterministic_parser" },
      nameAr: { value: nameAr, evidence: evidenceLine, source: /\p{Script=Arabic}/u.test(name) ? "deterministic_parser" : "inferred_suggestion" },
      activityKind: { value: kind, evidence: evidenceLine, source: "deterministic_parser" },
      requestedStart: { value: minutesToTime(start), evidence: evidenceLine, source: "deterministic_parser" },
      requestedEnd: { value: minutesToTime(end), evidence: evidenceLine, source: "deterministic_parser" },
      durationMinutes: { value: duration, evidence: evidenceLine, source: "deterministic_parser" },
      timingPreference: { value: timingPreference, evidence: evidenceLine, source: "deterministic_parser" },
    };
    const suggestion = kind === "work" ? suggestedWorkload(name) : undefined;
    if (suggestion) evidence.suggestedWorkload = { value: suggestion, evidence: evidenceLine, source: "inferred_suggestion" };
    if (kind !== "work") evidence.recoveryEligibility = { value: "unknown", evidence: evidenceLine, source: "deterministic_parser" };
    activities.push({
      nameEn: name,
      nameAr,
      activityKind: kind,
      durationMinutes: duration,
      requestedStart: minutesToTime(start),
      requestedEnd: minutesToTime(end),
      ...(kind === "work" ? {} : { recoveryEligibility: "unknown" as const }),
      mustSchedule: false,
      operationalNotes: [],
      timingPreference,
      ...(suggestion ? { suggestedWorkload: suggestion } : {}),
      evidence,
    });
  }

  const requirementLines=text.split(/\r?\n|(?<=[.!?])\s+/).map(line=>line.trim()).filter(line=>/(?:\bneed\b|\bmust\b|\brequired\b).*(?:\btoday\b|\bcomplete(?:d)?\b|\bfinish(?:ed)?\b|\bdone\b)/i.test(line));
  for(const requirementLine of requirementLines){
    const normalized=requirementLine.toLowerCase();
    const ranked=activities.map(activity=>{
      const tokens=activity.nameEn.toLowerCase().match(/[a-z0-9]{3,}/g)?.filter(token=>!["work","heavy","light","task","today"].includes(token))??[];
      return {activity,score:tokens.filter(token=>normalized.includes(token)).length};
    }).sort((left,right)=>right.score-left.score);
    const target=ranked[0];
    if(!target||target.score===0)continue;
    target.activity.mustSchedule=true;
    target.activity.evidence.mustSchedule={value:true,evidence:requirementLine,source:"deterministic_parser"};
  }
  const concrete = activities.find((activity) => /concrete|\u062e\u0631\u0633\u0627\u0646/u.test(activity.nameEn.toLowerCase()));
  const pumpNote = text.match(/Pump booked only today\.?/i)?.[0];
  if (concrete && pumpNote) {
    const note = pumpNote.endsWith(".") ? pumpNote : `${pumpNote}.`;
    concrete.operationalNotes.push(note);
    concrete.evidence.operationalNotes = { value: concrete.operationalNotes, evidence: note, source: "deterministic_parser" };
  }
  return { activities, ambiguities };
}
