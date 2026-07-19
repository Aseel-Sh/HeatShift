import { SOURCE_IDS } from "../../data/official-sources";
import type { Conflict, TwlZone } from "./types";

export function getNonAcclimatizedConflict(
  twlZone: TwlZone,
  nonAcclimatizedWorkers: number,
): Conflict | null {
  if (twlZone !== "high" || nonAcclimatizedWorkers === 0) return null;

  return {
    id: "high-twl-non-acclimatized-workers",
    severity: "critical",
    code: "HIGH_TWL_NON_ACCLIMATIZED_WORKERS",
    titleEn: "High TWL with non-acclimatized workers",
    titleAr: "مؤشر TWL مرتفع مع عمال غير متأقلمين",
    descriptionEn:
      "Site-verified high TWL and non-acclimatized workers require the supervisor to revise the safer plan before outdoor work.",
    descriptionAr:
      "يتطلب مؤشر TWL المرتفع المتحقق منه في الموقع مع وجود عمال غير متأقلمين مراجعة المشرف للخطة الأكثر أمانًا قبل العمل الخارجي.",
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
