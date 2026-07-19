import type { SaudiCity, SiteLocation } from "../lib/domain/types";

export interface SaudiCityRecord {
  id: SaudiCity;
  nameEn: string;
  nameAr: string;
  latitude: number;
  longitude: number;
  timezone: string;
  location: SiteLocation;
}

export const SAUDI_CITIES: Record<SaudiCity, SaudiCityRecord> = {
  riyadh: {
    id: "riyadh",
    nameEn: "Riyadh",
    nameAr: "الرياض",
    latitude: 24.7136,
    longitude: 46.6753,
    timezone: "Asia/Riyadh",
    location: { id:"preset-riyadh",name:"Riyadh",admin1:"Riyadh Region",countryCode:"SA",latitude:24.7136,longitude:46.6753,timezone:"Asia/Riyadh",source:"preset" },
  },
  jeddah: {
    id: "jeddah",
    nameEn: "Jeddah",
    nameAr: "جدة",
    latitude: 21.4858,
    longitude: 39.1925,
    timezone: "Asia/Riyadh",
    location: { id:"preset-jeddah",name:"Jeddah",admin1:"Makkah Region",countryCode:"SA",latitude:21.4858,longitude:39.1925,timezone:"Asia/Riyadh",source:"preset" },
  },
  dammam: {
    id: "dammam",
    nameEn: "Dammam",
    nameAr: "الدمام",
    latitude: 26.4207,
    longitude: 50.0888,
    timezone: "Asia/Riyadh",
    location: { id:"preset-dammam",name:"Dammam",admin1:"Eastern Province",countryCode:"SA",latitude:26.4207,longitude:50.0888,timezone:"Asia/Riyadh",source:"preset" },
  },
  mecca: {
    id: "mecca",
    nameEn: "Mecca",
    nameAr: "مكة المكرمة",
    latitude: 21.3891,
    longitude: 39.8579,
    timezone: "Asia/Riyadh",
    location: { id:"preset-mecca",name:"Mecca",admin1:"Makkah Region",countryCode:"SA",latitude:21.3891,longitude:39.8579,timezone:"Asia/Riyadh",source:"preset" },
  },
  medina: {
    id: "medina",
    nameEn: "Medina",
    nameAr: "المدينة المنورة",
    latitude: 24.5247,
    longitude: 39.5692,
    timezone: "Asia/Riyadh",
    location: { id:"preset-medina",name:"Medina",admin1:"Al Madinah Region",countryCode:"SA",latitude:24.5247,longitude:39.5692,timezone:"Asia/Riyadh",source:"preset" },
  },
};

export const SAUDI_LOCATION_PRESETS: Record<SaudiCity, SiteLocation> = Object.fromEntries(
  Object.entries(SAUDI_CITIES).map(([id, city]) => [id, city.location]),
) as Record<SaudiCity, SiteLocation>;
