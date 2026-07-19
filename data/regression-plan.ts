import type { ShiftPlan,SiteConditions } from "../lib/domain/types";
import { SAUDI_LOCATION_PRESETS } from "./cities";

export const REGRESSION_SHIFT_PLAN:ShiftPlan={
  siteName:"Crew A — Riyadh regression site",location:SAUDI_LOCATION_PRESETS.riyadh,
  shiftDate:"2026-07-20",shiftStart:"06:00",shiftEnd:"16:30",crewSize:8,nonAcclimatizedWorkers:2,
  tasks:[
    {id:"toolbox",nameEn:"Toolbox talk and preparation",nameAr:"حديث السلامة والتجهيز",durationMinutes:30,workload:"light",environment:"shaded_outdoor",splittable:false,timingPreference:"preferred",requestedStart:"06:00",requestedEnd:"06:30"},
    {id:"excavation",nameEn:"Excavation",nameAr:"الحفر",durationMinutes:150,workload:"heavy",environment:"direct_sun",splittable:true,timingPreference:"preferred",requestedStart:"06:30",requestedEnd:"09:00"},
    {id:"break",nameEn:"Morning break",nameAr:"استراحة صباحية",activityKind:"break",durationMinutes:15,recoveryEligibility:"eligible",timingPreference:"fixed",requestedStart:"09:00",requestedEnd:"09:15"},
    {id:"rebar",nameEn:"Rebar and forms",nameAr:"حديد التسليح والقوالب",durationMinutes:135,workload:"heavy",environment:"shaded_outdoor",splittable:true,timingPreference:"preferred",requestedStart:"09:15",requestedEnd:"11:30"},
    {id:"lunch",nameEn:"Lunch",nameAr:"غداء",activityKind:"meal",durationMinutes:30,recoveryEligibility:"eligible",timingPreference:"fixed",requestedStart:"11:30",requestedEnd:"12:00"},
    {id:"concrete",nameEn:"Concrete pour",nameAr:"صب الخرسانة",durationMinutes:150,workload:"heavy",environment:"direct_sun",splittable:true,mustSchedule:true,timingPreference:"preferred",requestedStart:"12:00",requestedEnd:"14:30",operationalNotes:["Pump booked only today."]},
    {id:"curing",nameEn:"Finish and curing",nameAr:"الإنهاء والمعالجة",durationMinutes:30,workload:"light",environment:"direct_sun",splittable:true,timingPreference:"preferred",requestedStart:"14:30",requestedEnd:"15:00"},
    {id:"cleanup",nameEn:"Cleanup",nameAr:"التنظيف",durationMinutes:60,workload:"light",environment:"direct_sun",splittable:true,timingPreference:"preferred",requestedStart:"15:00",requestedEnd:"16:00"},
  ],
};

export const REGRESSION_SITE_CONDITIONS:SiteConditions={measurementMode:"onsite_twl",twlZone:"high"};
