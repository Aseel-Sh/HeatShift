import { SOURCE_IDS } from "../../data/official-sources";
import type { Conflict, TwlZone } from "./types";

export function getNonAcclimatizedConflict(
  twlZone: TwlZone,
  nonAcclimatizedWorkers: number,
): Conflict | null {
  if ((twlZone !== "intermediate" && twlZone !== "high") || nonAcclimatizedWorkers === 0) return null;

  if (twlZone === "intermediate") {
    return {
      id: "intermediate-twl-non-acclimatized-workers",
      severity: "warning",
      code: "INTERMEDIATE_TWL_NON_ACCLIMATIZED_WORKERS",
      titleEn: "Intermediate TWL with non-acclimatized workers",
      titleAr: "نطاق TWL متوسط مع عمال غير متأقلمين",
      descriptionEn: `${nonAcclimatizedWorkers} non-acclimatized worker(s) require supervisor review or reassignment before outdoor work. This is planning guidance, not an individualized medical plan.`,
      descriptionAr: `يحتاج ${nonAcclimatizedWorkers} من العمال غير المتأقلمين إلى مراجعة المشرف أو إعادة التوزيع قبل العمل الخارجي. هذه إرشادات تخطيط وليست خطة طبية فردية.`,
      sourceId: SOURCE_IDS.twlGuidance,
    };
  }

  return {
    id: "high-twl-non-acclimatized-workers",
    severity: "critical",
    code: "HIGH_TWL_NON_ACCLIMATIZED_WORKERS",
    titleEn: "High TWL with non-acclimatized workers",
    titleAr: "مؤشر TWL مرتفع مع عمال غير متأقلمين",
    descriptionEn:
      `${nonAcclimatizedWorkers} non-acclimatized worker(s) at the supervisor-entered high TWL zone require reassignment or supervisor intervention before outdoor work.`,
    descriptionAr:
      `يحتاج ${nonAcclimatizedWorkers} من العمال غير المتأقلمين عند نطاق TWL المرتفع الذي أدخله المشرف إلى إعادة التوزيع أو تدخل المشرف قبل العمل الخارجي.`,
    sourceId: SOURCE_IDS.twlGuidance,
  };
}

export function getLoneWorkConflict(twlZone: TwlZone): Conflict | null {
  if (twlZone !== "intermediate" && twlZone !== "high") return null;

  return {
    id: `twl-${twlZone}-outdoor-lone-work`,
    severity: "warning",
    code: "TWL_OUTDOOR_LONE_WORK",
    titleEn: "Avoid lone outdoor work",
    titleAr: "تجنب العمل الخارجي المنفرد",
    descriptionEn:
      "Outdoor workers should not work alone at intermediate or high TWL. This is planning guidance; the MVP does not assign individual workers.",
    descriptionAr:
      "ينبغي ألا يعمل العمال في الخارج بمفردهم عند مستوى TWL المتوسط أو المرتفع. هذا إرشاد تخطيطي، ولا يوزع المنتج الأولي العمال بشكل فردي.",
    sourceId: SOURCE_IDS.twlGuidance,
  };
}
