export const SOURCE_IDS = {
  middayRestriction: "saudi-midday-work-ban-2026",
  temperatureIndicator: "ncosh-outdoor-temperature-indicator",
  twlGuidance: "ncosh-twl-work-rest-hydration",
} as const;

export type OfficialSourceId = (typeof SOURCE_IDS)[keyof typeof SOURCE_IDS];

export interface OfficialSource {
  id: OfficialSourceId;
  title: string;
  publisher: string;
  url: string;
  supports: string;
}

const NCOSH_HOT_ENVIRONMENTS_GUIDE_URL =
  "https://ncosh.gov.sa/media/w0ng1zh0/preventing-effects-of-working-in-high-temperature-%D8%A7%D9%84%D8%AA%D8%B5%D9%85%D9%8A%D9%85-%D8%A7%D9%84%D9%86%D9%87%D8%A7%D9%8A-%D9%8A-%D9%84%D8%BA%D8%A9-%D8%A7%D9%86%D8%AC%D9%84%D9%8A%D8%B2%D9%8A%D8%A9.pdf";

export const OFFICIAL_SOURCES: readonly OfficialSource[] = [
  {
    id: SOURCE_IDS.middayRestriction,
    title: "Implementation of the Midday Work Ban Decision Begins on 15 June",
    publisher: "Saudi Ministry of Human Resources and Social Development",
    url: "https://www.hrsd.gov.sa/en/media-center/news/%D8%AA%D8%B7%D8%A8%D9%8A%D9%82-%D9%82%D8%B1%D8%A7%D8%B1-%D8%AD%D8%B8%D8%B1-%D8%A7%D9%84%D8%B9%D9%85%D9%84-%D8%AA%D8%AD%D8%AA-%D8%A3%D8%B4%D8%B9%D8%A9-%D8%A7%D9%84%D8%B4%D9%85%D8%B3",
    supports: "The 2026 seasonal dates and midday direct-sun work restriction.",
  },
  {
    id: SOURCE_IDS.temperatureIndicator,
    title: "Guideline: Preventing Effects of Working in High-Temperature Environments",
    publisher: "National Council for Occupational Safety and Health",
    url: NCOSH_HOT_ENVIRONMENTS_GUIDE_URL,
    supports: "The NCOSH outdoor-temperature indicator categories.",
  },
  {
    id: SOURCE_IDS.twlGuidance,
    title: "Guideline: Preventing Effects of Working in High-Temperature Environments",
    publisher: "National Council for Occupational Safety and Health",
    url: NCOSH_HOT_ENVIRONMENTS_GUIDE_URL,
    supports: "The NCOSH TWL work/rest and hydration planning table.",
  },
];
