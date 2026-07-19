import type { ForecastHour, ShiftPlan, SiteConditions } from "../lib/domain/types";

export interface DemoScenario {
  isDemo: true;
  label: string;
  shiftPlan: ShiftPlan;
  siteConditions: SiteConditions;
  forecastHours: ForecastHour[];
}

export const DEMO_SCENARIO: DemoScenario = {
  isDemo: true,
  label: "Demo data — Riyadh July heat-planning scenario",
  shiftPlan: {
    siteName: "Riyadh North Utilities Demonstration Site",
    city: "riyadh",
    shiftDate: "2026-07-20",
    shiftStart: "06:30",
    shiftEnd: "16:30",
    crewSize: 8,
    nonAcclimatizedWorkers: 2,
    tasks: [
      {
        id: "demo-trenching",
        nameEn: "Heavy trenching",
        nameAr: "حفر خندق ثقيل",
        durationMinutes: 60,
        workload: "heavy",
        environment: "direct_sun",
        splittable: true,
      },
      {
        id: "demo-contiguous-placement",
        nameEn: "Contiguous concrete placement",
        nameAr: "صب الخرسانة المتواصل",
        durationMinutes: 30,
        workload: "heavy",
        environment: "direct_sun",
        splittable: false,
      },
      {
        id: "demo-equipment-preparation",
        nameEn: "Indoor equipment preparation",
        nameAr: "تجهيز المعدات داخليًا",
        durationMinutes: 45,
        workload: "light",
        environment: "indoor",
        splittable: false,
      },
      {
        id: "demo-material-inspection",
        nameEn: "Shaded material inspection",
        nameAr: "فحص المواد في منطقة مظللة",
        durationMinutes: 45,
        workload: "light",
        environment: "shaded_outdoor",
        splittable: false,
      },
      {
        id: "demo-cleanup",
        nameEn: "Direct-sun cleanup",
        nameAr: "تنظيف تحت أشعة الشمس المباشرة",
        durationMinutes: 45,
        workload: "light",
        environment: "direct_sun",
        splittable: true,
      },
    ],
  },
  siteConditions: {
    measurementMode: "onsite_twl",
    twlZone: "high",
    manualTemperatureCelsius: 44.6,
  },
  forecastHours: [
    { time: "06:30", temperatureCelsius: 30.5, apparentTemperatureCelsius: 32.1, relativeHumidityPercent: 31, windSpeedKph: 7.8 },
    { time: "07:30", temperatureCelsius: 32.2, apparentTemperatureCelsius: 34.1, relativeHumidityPercent: 29, windSpeedKph: 8.1 },
    { time: "08:30", temperatureCelsius: 34.8, apparentTemperatureCelsius: 37.2, relativeHumidityPercent: 27, windSpeedKph: 8.6 },
    { time: "09:30", temperatureCelsius: 37.1, apparentTemperatureCelsius: 39.8, relativeHumidityPercent: 25, windSpeedKph: 9.1 },
    { time: "10:30", temperatureCelsius: 39.6, apparentTemperatureCelsius: 42.5, relativeHumidityPercent: 23, windSpeedKph: 9.7 },
    { time: "11:30", temperatureCelsius: 41.8, apparentTemperatureCelsius: 44.6, relativeHumidityPercent: 21, windSpeedKph: 10.2 },
    { time: "12:30", temperatureCelsius: 43.7, apparentTemperatureCelsius: 46.4, relativeHumidityPercent: 19, windSpeedKph: 10.8 },
    { time: "13:30", temperatureCelsius: 45.2, apparentTemperatureCelsius: 47.9, relativeHumidityPercent: 18, windSpeedKph: 11.1 },
    { time: "14:30", temperatureCelsius: 46.3, apparentTemperatureCelsius: 48.8, relativeHumidityPercent: 17, windSpeedKph: 11.5 },
    { time: "15:30", temperatureCelsius: 46.7, apparentTemperatureCelsius: 49.1, relativeHumidityPercent: 17, windSpeedKph: 11.7 },
    { time: "16:30", temperatureCelsius: 45.9, apparentTemperatureCelsius: 48.0, relativeHumidityPercent: 18, windSpeedKph: 11.3 },
  ],
};
