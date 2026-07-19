import type { SaudiCity } from "../lib/domain/types";

export interface SaudiCityRecord {
  id: SaudiCity;
  nameEn: string;
  nameAr: string;
  latitude: number;
  longitude: number;
}

export const SAUDI_CITIES: Record<SaudiCity, SaudiCityRecord> = {
  riyadh: {
    id: "riyadh",
    nameEn: "Riyadh",
    nameAr: "الرياض",
    latitude: 24.7136,
    longitude: 46.6753,
  },
  jeddah: {
    id: "jeddah",
    nameEn: "Jeddah",
    nameAr: "جدة",
    latitude: 21.4858,
    longitude: 39.1925,
  },
  dammam: {
    id: "dammam",
    nameEn: "Dammam",
    nameAr: "الدمام",
    latitude: 26.4207,
    longitude: 50.0888,
  },
  mecca: {
    id: "mecca",
    nameEn: "Mecca",
    nameAr: "مكة المكرمة",
    latitude: 21.3891,
    longitude: 39.8579,
  },
  medina: {
    id: "medina",
    nameEn: "Medina",
    nameAr: "المدينة المنورة",
    latitude: 24.5247,
    longitude: 39.5692,
  },
};
