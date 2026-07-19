import { isWorkActivity,type Conflict, type ForecastHour, type ShiftPlan, type SiteConditions, type WorkTask } from "./types";
import type { OptimizationSummary, ScheduleBlock, ScheduleResult, UnscheduledTask } from "./scheduler-types";
import { evaluateMiddayRestriction } from "./midday-restriction";
import { getLoneWorkConflict, getNonAcclimatizedConflict } from "./twl-conflicts";
import { getHydrationGuidance, getWorkRestGuidance } from "./twl-guidance";
import { forecastAtOrBefore } from "./forecast";
import { validateDependencyGraph } from "./dependencies";

const SLOT_MINUTES = 5;
const CAPACITY_SOURCE_ID = "heatshift-scheduler-capacity";
export const CANDIDATE_STRATEGIES=["critical_must_schedule_first","preserve_requested_order","coolest_direct_sun_first","minimum_splitting","minimum_movement","indoor_midday_utilization"] as const;
export type CandidateStrategy=typeof CANDIDATE_STRATEGIES[number];
type CandidateResult=Omit<ScheduleResult,"optimizationSummary">;
export interface ScheduleCandidate{strategy:CandidateStrategy;result:ScheduleResult;optimizationSummary:OptimizationSummary;scoreVector:readonly number[]}

interface Slot {
  startMinutes: number;
  occupiedByTaskId?: string;
  restForTaskId?: string;
  occupiedByActivityId?:string;
  activityRecoveryEligible?:boolean;
  recoveryForTaskId?:string;
}

export function validateChronologicalRecovery(plan:ShiftPlan,conditions:SiteConditions,blocks:readonly ScheduleBlock[]):string[]{
  const violations=new Set<string>();
  const activities=new Map(plan.tasks.map(activity=>[activity.id,activity]));
  let exposure=0,maximumWork=Number.POSITIVE_INFINITY,recoveryRequired=0,recoveryReceived=0,cycleRecoveryMinutes=0;
  const chronological=[...blocks].filter(block=>block.type!=="restriction").sort((left,right)=>left.start.localeCompare(right.start)||left.end.localeCompare(right.end));
  for(const block of chronological){
    const duration=timeToMinutes(block.end)-timeToMinutes(block.start);
    const activity=block.taskId?activities.get(block.taskId):undefined;
    const recoveryCredit=block.type==="rest"||((block.type==="break"||block.type==="meal")&&activity&&!isWorkActivity(activity)&&activity.recoveryEligibility==="eligible");
    if(recoveryCredit&&exposure>0&&recoveryRequired===0)recoveryRequired=cycleRecoveryMinutes;
    if(recoveryCredit&&recoveryRequired>0){
      recoveryReceived+=duration;
      if(recoveryReceived>=recoveryRequired){exposure=0;maximumWork=Number.POSITIVE_INFINITY;recoveryRequired=0;recoveryReceived=0;cycleRecoveryMinutes=0;}
      continue;
    }
    if(block.type!=="work"||block.environment==="conditioned_indoor"||!block.workload)continue;
    const guidance=getWorkRestGuidance(conditions.twlZone,block.workload);
    if(guidance.kind!=="cycle")continue;
    if(recoveryRequired>0){violations.add("OUTDOOR_RECOVERY_REQUIRED");continue;}
    maximumWork=Math.min(maximumWork,guidance.workMinutes);
    cycleRecoveryMinutes=Math.max(cycleRecoveryMinutes,guidance.restMinutes);
    exposure+=duration;
    if(exposure>maximumWork)violations.add("OUTDOOR_WORK_LIMIT_EXCEEDED");
    if(exposure>=maximumWork){recoveryRequired=Math.max(recoveryRequired,guidance.restMinutes);recoveryReceived=0;}
  }
  return [...violations];
}

export function validateScheduleHardConstraints(plan:ShiftPlan,conditions:SiteConditions,result:Pick<ScheduleResult,"blocks"|"unscheduled">):string[]{
  const violations=new Set(validateChronologicalRecovery(plan,conditions,result.blocks));
  for(const issue of validateDependencyGraph(plan.tasks))violations.add(issue.code);
  const shiftStart=timeToMinutes(plan.shiftStart),shiftEnd=timeToMinutes(plan.shiftEnd);
  const occupancy=result.blocks.filter(block=>block.type!=="restriction").sort((left,right)=>left.start.localeCompare(right.start)||left.end.localeCompare(right.end));
  for(let index=0;index<occupancy.length;index+=1){
    const block=occupancy[index],start=timeToMinutes(block.start),end=timeToMinutes(block.end);
    if(start<shiftStart||end>shiftEnd||end<=start)violations.add("ACTIVITY_OUTSIDE_SHIFT");
    if(index>0&&occupancy[index-1].end>block.start)violations.add("SINGLE_CREW_OVERLAP");
    const restriction=evaluateMiddayRestriction({date:plan.shiftDate,time:"12:00",environment:"direct_sun"});
    if(block.type==="work"&&block.environment==="direct_sun"&&restriction.seasonActive&&start<15*60&&end>12*60)violations.add("DIRECT_SUN_RESTRICTION");
  }
  const unscheduledIds=new Set(result.unscheduled.map(item=>item.taskId));
  const intervals=new Map<string,{start:number;end:number;minutes:number;blocks:number}>();
  for(const activity of plan.tasks){
    const blocks=occupancy.filter(block=>block.taskId===activity.id&&(block.type==="work"||block.type==="break"||block.type==="meal"));
    if(blocks.length)intervals.set(activity.id,{start:timeToMinutes(blocks[0].start),end:timeToMinutes(blocks.at(-1)!.end),minutes:blocks.reduce((sum,block)=>sum+timeToMinutes(block.end)-timeToMinutes(block.start),0),blocks:blocks.length});
    const interval=intervals.get(activity.id);
    if(activity.timingPreference==="fixed"&&activity.requestedStart&&activity.requestedEnd){
      if(interval&&(interval.start!==timeToMinutes(activity.requestedStart)||interval.end!==timeToMinutes(activity.requestedEnd)||interval.minutes!==activity.durationMinutes))violations.add("FIXED_ACTIVITY_MOVED");
      if(!interval&&!unscheduledIds.has(activity.id))violations.add("FIXED_ACTIVITY_NOT_REPORTED");
    }
    if(isWorkActivity(activity)&&!activity.splittable&&interval&&interval.blocks>1)violations.add("NON_SPLITTABLE_FRAGMENTED");
  }
  for(const activity of plan.tasks){
    const dependent=intervals.get(activity.id);if(!dependent)continue;
    for(const predecessorId of activity.predecessorTaskIds??[]){
      const predecessor=intervals.get(predecessorId);
      if(!predecessor||predecessor.minutes<(plan.tasks.find(item=>item.id===predecessorId)?.durationMinutes??0))violations.add("SUCCESSOR_WITH_INCOMPLETE_PREDECESSOR");
      else if(predecessor.end>dependent.start)violations.add("DEPENDENCY_ORDER_VIOLATION");
    }
  }
  return [...violations];
}

const priorityByTask: Record<`${WorkTask["environment"]}_${WorkTask["workload"]}`, number> = {
  direct_sun_heavy: 0,
  direct_sun_light: 1,
  shaded_outdoor_heavy: 2,
  shaded_outdoor_light: 3,
  conditioned_indoor_heavy: 4,
  conditioned_indoor_light: 5,
};

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function buildSlots(start: number, end: number): Slot[] {
  const slots: Slot[] = [];
  for (let minute = start; minute + SLOT_MINUTES <= end; minute += SLOT_MINUTES) {
    slots.push({ startMinutes: minute });
  }
  return slots;
}

function taskPriority(task: WorkTask): number {
  return priorityByTask[`${task.environment}_${task.workload}`];
}

function orderTasksByDependencies(entries:Array<{task:WorkTask;originalIndex:number}>):Array<{task:WorkTask;originalIndex:number}>{
  const pending=[...entries],ordered:Array<{task:WorkTask;originalIndex:number}>=[],known=new Set(entries.map(entry=>entry.task.id));
  while(pending.length){
    const index=pending.findIndex(entry=>(entry.task.predecessorTaskIds??[]).filter(id=>known.has(id)).every(id=>ordered.some(candidate=>candidate.task.id===id)));
    if(index<0)return entries;
    ordered.push(pending.splice(index,1)[0]);
  }
  return ordered;
}

function workReasonCodes(
  task: WorkTask,
  restrictionActive: boolean,
  forecastAvailable: boolean,
): string[] {
  const codes = [
    `TASK_PRIORITY_${task.environment.toUpperCase()}_${task.workload.toUpperCase()}`,
    "FIVE_MINUTE_SLOT",
  ];
  if (restrictionActive && task.environment === "direct_sun") {
    codes.push("MIDDAY_RESTRICTION_AVOIDED");
  }
  if (restrictionActive && task.environment === "conditioned_indoor") {
    codes.push("CONDITIONED_INDOOR_MIDDAY_PREFERENCE");
  }
  if (forecastAvailable && task.environment === "direct_sun") {
    codes.push("COOLER_FORECAST_SLOT");
  }
  return codes;
}

function forecastTemperatureAt(
  minute: number,
  forecastHours: readonly ForecastHour[],
): number {
  return forecastAtOrBefore(forecastHours,minutesToTime(minute))?.temperatureCelsius??Number.POSITIVE_INFINITY;
}

function cycleReasonCode(task: WorkTask, twlZone: SiteConditions["twlZone"]): string {
  return `TWL_${twlZone.toUpperCase()}_${task.workload.toUpperCase()}_WORK_REST`;
}

function buildWorkRestPattern(
  requiredWorkSlots: number,
  maximumWorkSlots: number,
  restSlots: number,
  appendFinalRest: boolean,
): Array<"work" | "rest"> {
  const pattern: Array<"work" | "rest"> = [];
  let remainingWorkSlots = requiredWorkSlots;

  while (remainingWorkSlots > 0) {
    const workSlots = Math.min(remainingWorkSlots, maximumWorkSlots);
    pattern.push(...Array<"work">(workSlots).fill("work"));
    remainingWorkSlots -= workSlots;
    if (remainingWorkSlots > 0) {
      pattern.push(...Array<"rest">(restSlots).fill("rest"));
    }
  }

  if (appendFinalRest) {
    pattern.push(...Array<"rest">(restSlots).fill("rest"));
  }

  return pattern;
}

function buildWorkBlocks(
  slots: Slot[],
  tasksById: ReadonlyMap<string, WorkTask>,
  restrictionActive: boolean,
  twlZone: SiteConditions["twlZone"],
  forecastAvailable: boolean,
): ScheduleBlock[] {
  const blocks: ScheduleBlock[] = [];
  let blockStart = 0;

  while (blockStart < slots.length) {
    const slotType = slots[blockStart].occupiedByTaskId
      ? "work"
      : slots[blockStart].restForTaskId
        ? "rest"
        : undefined;
    const taskId =
      slots[blockStart].occupiedByTaskId ?? slots[blockStart].restForTaskId;
    if (!taskId || !slotType) {
      blockStart += 1;
      continue;
    }

    let blockEnd = blockStart + 1;
    while (
      blockEnd < slots.length &&
      (slotType === "work"
        ? slots[blockEnd].occupiedByTaskId === taskId
        : slots[blockEnd].restForTaskId === taskId)
    ) {
      blockEnd += 1;
    }

    const task = tasksById.get(taskId);
    if (!task) throw new Error(`Unknown scheduled task: ${taskId}`);
    const isRest = slotType === "rest";
    const reasonCodes = isRest
      ? ["CREW_REST", cycleReasonCode(task, twlZone)]
      : workReasonCodes(task, restrictionActive, forecastAvailable);
    if (!isRest && task.environment !== "conditioned_indoor" && getWorkRestGuidance(twlZone, task.workload).kind === "cycle") {
      reasonCodes.push(cycleReasonCode(task, twlZone));
    }
    blocks.push({
      id: `${slotType}-${task.id}-${minutesToTime(slots[blockStart].startMinutes)}`,
      taskId: task.id,
      type: slotType,
      start: minutesToTime(slots[blockStart].startMinutes),
      end: minutesToTime(slots[blockEnd - 1].startMinutes + SLOT_MINUTES),
      labelEn: isRest ? `Crew rest after ${task.nameEn}` : task.nameEn,
      labelAr: isRest ? `راحة الطاقم بعد ${task.nameAr}` : task.nameAr,
      workload: task.workload,
      environment: isRest ? undefined : task.environment,
      reasonCodes,
    });
    blockStart = blockEnd;
  }

  return blocks;
}

function insufficientCapacityConflict(task: WorkTask, minutes: number): Conflict {
  return {
    id: `insufficient-safe-capacity-${task.id}`,
    severity: "critical",
    code: "INSUFFICIENT_SAFE_CAPACITY",
    titleEn: "Insufficient planning capacity",
    titleAr: "سعة التخطيط غير كافية",
    descriptionEn: `${minutes} minutes of ${task.nameEn} remain unscheduled. Supervisor verification required before revising the safer plan.`,
    descriptionAr: `تعذر جدولة ${minutes} دقيقة من مهمة ${task.nameAr}. يلزم تحقق المشرف قبل مراجعة الخطة الأكثر أمانًا.`,
    taskId: task.id,
    sourceId: CAPACITY_SOURCE_ID,
  };
}

function fixedActivityConflict(activity:ShiftPlan["tasks"][number]):Conflict{
  return {id:`fixed-activity-infeasible-${activity.id}`,severity:"critical",code:"FIXED_ACTIVITY_INFEASIBLE",titleEn:"Fixed activity is infeasible",titleAr:"تعذر تثبيت النشاط",descriptionEn:`${activity.nameEn} cannot remain at its confirmed fixed time without violating a hard constraint. It remains unscheduled for supervisor intervention.`,descriptionAr:`تعذر إبقاء ${activity.nameAr} في وقته الثابت دون مخالفة قيد إلزامي. بقي النشاط غير مجدول لتدخل المشرف.`,taskId:activity.id,sourceId:CAPACITY_SOURCE_ID};
}

function dependencyConflict(task:WorkTask):Conflict{
  return {id:`dependency-infeasible-${task.id}`,severity:"critical",code:"DEPENDENCY_INFEASIBLE",titleEn:"Confirmed dependency cannot be satisfied",titleAr:"تعذر تحقيق الاعتماد المؤكد",descriptionEn:`${task.nameEn} remains unscheduled because a confirmed predecessor is incomplete or unavailable.`,descriptionAr:`بقيت ${task.nameAr} غير مجدولة لأن نشاطًا سابقًا مؤكدًا غير مكتمل أو غير متاح.`,taskId:task.id,sourceId:CAPACITY_SOURCE_ID};
}

function generateCandidateSchedule(
  shiftPlan: ShiftPlan,
  siteConditions: SiteConditions,
  forecastHours: readonly ForecastHour[],
  strategy:CandidateStrategy,
): CandidateResult {
  const shiftStart = timeToMinutes(shiftPlan.shiftStart);
  const shiftEnd = timeToMinutes(shiftPlan.shiftEnd);
  const workTasks=shiftPlan.tasks.filter(isWorkActivity);
  const shiftForecast = forecastHours.filter((hour) => {
    const minute = timeToMinutes(hour.time);
    return minute >= shiftStart && minute < shiftEnd;
  });
  const sortedForecast = [...forecastHours].sort(
    (left, right) => timeToMinutes(left.time) - timeToMinutes(right.time),
  );
  const slots = buildSlots(shiftStart, shiftEnd);
  const hasDirectSunWork = workTasks.some(
    (task) => task.environment === "direct_sun",
  );
  const restrictionEvaluation = evaluateMiddayRestriction({
    date: shiftPlan.shiftDate,
    time: "12:00",
    environment: "direct_sun",
  });
  const seasonActive = restrictionEvaluation.seasonActive;
  const restrictionActive = seasonActive && hasDirectSunWork;
  const restrictedSlots = new Set<number>();
  const activityBlocks:ScheduleBlock[]=[];
  const unscheduled: UnscheduledTask[] = [];
  const capacityConflicts: Conflict[] = [];

  if (restrictionActive) {
    slots.forEach((slot, index) => {
      if (slot.startMinutes >= 12 * 60 && slot.startMinutes < 15 * 60) {
        restrictedSlots.add(index);
      }
    });
  }

  const nonWorkActivities=shiftPlan.tasks.filter(activity=>!isWorkActivity(activity)).sort((left,right)=>Number(right.timingPreference==="fixed")-Number(left.timingPreference==="fixed")||shiftPlan.tasks.indexOf(left)-shiftPlan.tasks.indexOf(right));
  for(const activity of nonWorkActivities){
    const slotCount=activity.durationMinutes/SLOT_MINUTES;
    const requestedStart=activity.requestedStart?timeToMinutes(activity.requestedStart):undefined;
    const requestedEnd=activity.requestedEnd?timeToMinutes(activity.requestedEnd):undefined;
    const candidateStarts=slots.map((_,index)=>index).filter(index=>index+slotCount<=slots.length&&slots.slice(index,index+slotCount).every(slot=>!slot.occupiedByActivityId&&!slot.occupiedByTaskId&&!slot.restForTaskId));
    const exactIndex=requestedStart===undefined?-1:slots.findIndex(slot=>slot.startMinutes===requestedStart);
    const exactValid=exactIndex>=0&&candidateStarts.includes(exactIndex)&&requestedEnd!==undefined&&requestedStart!==undefined&&requestedEnd-requestedStart===activity.durationMinutes;
    const exploreMiddayMeal=strategy==="indoor_midday_utilization"&&activity.activityKind==="meal"&&restrictionActive&&activity.timingPreference!=="fixed";
    let startIndex=exactValid&&!exploreMiddayMeal?exactIndex:-1;
    if(activity.timingPreference==="fixed"&&!exactValid){
      unscheduled.push({taskId:activity.id,taskName:activity.nameEn,unscheduledMinutes:activity.durationMinutes,reasonCode:"FIXED_ACTIVITY_INFEASIBLE"});
      capacityConflicts.push(fixedActivityConflict(activity));
      continue;
    }
    if(startIndex<0&&candidateStarts.length){
      startIndex=[...candidateStarts].sort((left,right)=>{
        if(strategy==="indoor_midday_utilization"&&activity.activityKind==="meal"&&restrictionActive){
          const leftMidday=restrictedSlots.has(left),rightMidday=restrictedSlots.has(right);
          if(leftMidday!==rightMidday)return leftMidday?-1:1;
        }
        if(activity.timingPreference==="preferred"&&requestedStart!==undefined)return Math.abs(slots[left].startMinutes-requestedStart)-Math.abs(slots[right].startMinutes-requestedStart)||left-right;
        return left-right;
      })[0];
    }
    if(startIndex<0){
      unscheduled.push({taskId:activity.id,taskName:activity.nameEn,unscheduledMinutes:activity.durationMinutes,reasonCode:"INSUFFICIENT_SAFE_CAPACITY"});
      capacityConflicts.push(fixedActivityConflict(activity));
      continue;
    }
    const candidate=slots.slice(startIndex,startIndex+slotCount);
    candidate.forEach(slot=>{slot.occupiedByActivityId=activity.id;slot.activityRecoveryEligible=activity.recoveryEligibility==="eligible";});
    const activityKind=activity.activityKind as "break"|"meal";
    const start=minutesToTime(slots[startIndex].startMinutes),end=minutesToTime(slots[startIndex+slotCount-1].startMinutes+SLOT_MINUTES);
    const timingReason=activity.timingPreference==="fixed"?"FIXED_ACTIVITY_TIME":requestedStart===slots[startIndex].startMinutes?"PREFERRED_ACTIVITY_TIME":"ACTIVITY_TIME_ADJUSTED";
    activityBlocks.push({id:`${activityKind}-${activity.id}-${start}`,taskId:activity.id,type:activityKind,start,end,labelEn:activity.nameEn,labelAr:activity.nameAr,reasonCodes:[timingReason,"SINGLE_CREW_ACTIVITY"]});
  }

  const fixedWorkIds=new Set<string>();
  for(const task of workTasks){
    if(task.timingPreference!=="fixed")continue;
    const requestedStart=task.requestedStart?timeToMinutes(task.requestedStart):undefined,requestedEnd=task.requestedEnd?timeToMinutes(task.requestedEnd):undefined;
    const slotCount=task.durationMinutes/SLOT_MINUTES,startIndex=requestedStart===undefined?-1:slots.findIndex(slot=>slot.startMinutes===requestedStart);
    const candidate=startIndex<0?[]:slots.slice(startIndex,startIndex+slotCount);
    const guidance=task.environment==="conditioned_indoor"?({kind:"continuous"} as const):getWorkRestGuidance(siteConditions.twlZone,task.workload);
    const feasible=requestedStart!==undefined&&requestedEnd!==undefined&&requestedEnd-requestedStart===task.durationMinutes&&candidate.length===slotCount&&candidate.every((slot,offset)=>!slot.occupiedByActivityId&&!slot.occupiedByTaskId&&!slot.restForTaskId&&!(task.environment==="direct_sun"&&restrictedSlots.has(startIndex+offset)))&&(guidance.kind!=="cycle"||task.durationMinutes<=guidance.workMinutes);
    if(!feasible){
      unscheduled.push({taskId:task.id,taskName:task.nameEn,unscheduledMinutes:task.durationMinutes,reasonCode:"FIXED_ACTIVITY_INFEASIBLE"});capacityConflicts.push(fixedActivityConflict(task));fixedWorkIds.add(task.id);continue;
    }
    candidate.forEach(slot=>{slot.occupiedByTaskId=task.id;});fixedWorkIds.add(task.id);
    const laterOutdoorPossible=workTasks.some(other=>other.id!==task.id&&other.environment!=="conditioned_indoor");
    if(guidance.kind==="cycle"&&laterOutdoorPossible){
      let recoveryRemaining=guidance.restMinutes;
      for(let index=startIndex+slotCount;index<slots.length&&recoveryRemaining>0;index+=1){
        const slot=slots[index];
        if(slot.occupiedByActivityId){if(slot.activityRecoveryEligible){slot.recoveryForTaskId=task.id;recoveryRemaining-=SLOT_MINUTES;const block=activityBlocks.find(item=>item.taskId===slot.occupiedByActivityId);if(block&&!block.reasonCodes.includes("TWL_RECOVERY_CREDIT"))block.reasonCodes.push("TWL_RECOVERY_CREDIT");}continue;}
        if(slot.occupiedByTaskId||slot.restForTaskId)break;
        slot.restForTaskId=task.id;recoveryRemaining-=SLOT_MINUTES;
      }
    }
  }

  const tasks = orderTasksByDependencies(workTasks.filter(task=>!fixedWorkIds.has(task.id))
    .map((task, originalIndex) => ({ task, originalIndex }))
    .sort(
      (left,right)=>{
        if(strategy==="preserve_requested_order")return left.originalIndex-right.originalIndex;
        if(strategy==="critical_must_schedule_first")return Number(Boolean(right.task.mustSchedule))-Number(Boolean(left.task.mustSchedule))||taskPriority(left.task)-taskPriority(right.task)||left.originalIndex-right.originalIndex;
        if(strategy==="minimum_splitting")return Number(left.task.splittable)-Number(right.task.splittable)||taskPriority(left.task)-taskPriority(right.task)||left.originalIndex-right.originalIndex;
        if(strategy==="minimum_movement")return Number(Boolean(right.task.requestedStart))-Number(Boolean(left.task.requestedStart))||(left.task.requestedStart??"99:99").localeCompare(right.task.requestedStart??"99:99")||left.originalIndex-right.originalIndex;
        if(strategy==="indoor_midday_utilization")return Number(right.task.environment==="conditioned_indoor")-Number(left.task.environment==="conditioned_indoor")||taskPriority(left.task)-taskPriority(right.task)||left.originalIndex-right.originalIndex;
        return taskPriority(left.task)-taskPriority(right.task)||left.originalIndex-right.originalIndex;
      },
    ));

  for (let taskOrderIndex = 0; taskOrderIndex < tasks.length; taskOrderIndex += 1) {
    const { task } = tasks[taskOrderIndex];
    const requiredSlots = Math.ceil(task.durationMinutes / SLOT_MINUTES);
    const incompletePredecessor=(task.predecessorTaskIds??[]).some(id=>{
      const predecessor=shiftPlan.tasks.find(activity=>activity.id===id);if(!predecessor)return true;
      const scheduled=slots.filter(slot=>slot.occupiedByTaskId===id||slot.occupiedByActivityId===id).length*SLOT_MINUTES;
      return scheduled<predecessor.durationMinutes;
    });
    if(incompletePredecessor){unscheduled.push({taskId:task.id,taskName:task.nameEn,unscheduledMinutes:task.durationMinutes,reasonCode:"DEPENDENCY_INFEASIBLE"});capacityConflicts.push(dependencyConflict(task));continue;}
    const predecessorEnds=(task.predecessorTaskIds??[]).map(id=>{
      const occupied=slots.map((slot,index)=>slot.occupiedByTaskId===id||slot.occupiedByActivityId===id?index:-1).filter(index=>index>=0);
      return occupied.length?Math.max(...occupied)+1:0;
    });
    const earliestStartIndex=predecessorEnds.length?Math.max(...predecessorEnds):0;
    const isValidSlot = (slot: Slot, index: number) =>
      index>=earliestStartIndex&&
      !slot.occupiedByTaskId &&
      !slot.restForTaskId &&
      !slot.occupiedByActivityId &&
      !(task.environment === "direct_sun" && restrictedSlots.has(index));
    let scheduledSlots = 0;
    const workRestGuidance = task.environment === "conditioned_indoor"
      ? ({ kind: "continuous" } as const)
      : getWorkRestGuidance(siteConditions.twlZone, task.workload);

    if(workRestGuidance.kind==="cycle"&&task.mustSchedule&&task.splittable){
      let workInCycle=0,recoveryRemaining=0;
      for(let index=earliestStartIndex;index<slots.length&&scheduledSlots<requiredSlots;index+=1){
        const slot=slots[index];
        if(slot.occupiedByActivityId){
          if(slot.activityRecoveryEligible&&workInCycle>0){
            if(recoveryRemaining===0)recoveryRemaining=workRestGuidance.restMinutes;
            recoveryRemaining=Math.max(0,recoveryRemaining-SLOT_MINUTES);
            slot.recoveryForTaskId=task.id;
            const block=activityBlocks.find(candidate=>candidate.taskId===slot.occupiedByActivityId);
            if(block&&!block.reasonCodes.includes("TWL_RECOVERY_CREDIT"))block.reasonCodes.push("TWL_RECOVERY_CREDIT");
            if(recoveryRemaining===0)workInCycle=0;
          }
          continue;
        }
        if(slot.occupiedByTaskId||slot.restForTaskId)continue;
        if(recoveryRemaining>0){slot.restForTaskId=task.id;recoveryRemaining-=SLOT_MINUTES;if(recoveryRemaining===0)workInCycle=0;continue;}
        if(task.environment==="direct_sun"&&restrictedSlots.has(index))continue;
        slot.occupiedByTaskId=task.id;scheduledSlots+=1;workInCycle+=SLOT_MINUTES;
        if(workInCycle>=workRestGuidance.workMinutes&&scheduledSlots<requiredSlots)recoveryRemaining=workRestGuidance.restMinutes;
      }
    } else if (workRestGuidance.kind === "cycle") {
      const maximumWorkSlots = workRestGuidance.workMinutes / SLOT_MINUTES;
      const restSlots = workRestGuidance.restMinutes / SLOT_MINUTES;
      const hasFurtherOutdoorWork =
        task.environment !== "conditioned_indoor" &&
        tasks
          .slice(taskOrderIndex + 1)
          .some(({ task: laterTask }) => laterTask.environment !== "conditioned_indoor");
      const minimumCandidateSlots = task.splittable ? 1 : requiredSlots;
      while (scheduledSlots < requiredSlots) {
        const scheduledBeforeSearch = scheduledSlots;
        const remainingWorkSlots = requiredSlots - scheduledSlots;
        for (
          let candidateWorkSlots = Math.min(remainingWorkSlots, maximumWorkSlots);
          candidateWorkSlots >= minimumCandidateSlots && scheduledSlots === scheduledBeforeSearch;
          candidateWorkSlots -= 1
        ) {
        const pattern = buildWorkRestPattern(
          candidateWorkSlots,
          maximumWorkSlots,
          restSlots,
          true,
        );
        const startIndices = slots
          .map((_, index) => index)
          .filter((index) => index + pattern.length <= slots.length)
          .sort((left, right) => {
            const recoveryCredit=(startIndex:number)=>pattern.reduce((minutes,type,offset)=>minutes+(type==="rest"&&slots[startIndex+offset].activityRecoveryEligible?SLOT_MINUTES:0),0);
            const recoveryDifference=recoveryCredit(right)-recoveryCredit(left);
            if(recoveryDifference!==0)return recoveryDifference;
            if (restrictionActive && task.environment === "conditioned_indoor") {
              const middayWorkSlots = (startIndex: number) => pattern.reduce(
                (count, type, offset) => count + (type === "work" && restrictedSlots.has(startIndex + offset) ? 1 : 0),
                0,
              );
              const preferenceDifference = middayWorkSlots(right) - middayWorkSlots(left);
              if (preferenceDifference !== 0) return preferenceDifference;
            }
            if (
              task.environment !== "direct_sun" ||
              sortedForecast.length === 0
            ) {
              return left - right;
            }
            const patternTemperature = (startIndex: number) => {
              const workTemperatures = pattern.flatMap((type, offset) =>
                type === "work"
                  ? [
                      forecastTemperatureAt(
                        slots[startIndex + offset].startMinutes,
                        sortedForecast,
                      ),
                    ]
                  : [],
              );
              return (
                workTemperatures.reduce((total, value) => total + value, 0) /
                workTemperatures.length
              );
            };
            return (
              patternTemperature(left) - patternTemperature(right) || left - right
            );
          });

        for (const startIndex of startIndices) {
          const patternFits = pattern.every((type, offset) => {
            const index = startIndex + offset;
            const slot = slots[index];
            if (slot.occupiedByTaskId || slot.restForTaskId) return false;
            if(type==="work"&&slot.occupiedByActivityId)return false;
            if(type==="rest"&&slot.occupiedByActivityId&&!slot.activityRecoveryEligible)return false;
            if(type==="work"&&index<earliestStartIndex)return false;
            return !(
              type === "work" &&
              task.environment === "direct_sun" &&
              restrictedSlots.has(index)
            );
          });
          if (!patternFits) continue;

          pattern.forEach((type, offset) => {
            const slot = slots[startIndex + offset];
            if (type === "work") {
              slot.occupiedByTaskId = task.id;
              scheduledSlots += 1;
            } else {
              if(slot.occupiedByActivityId){
                slot.recoveryForTaskId=task.id;
                const block=activityBlocks.find(candidate=>candidate.taskId===slot.occupiedByActivityId);
                if(block&&!block.reasonCodes.includes("TWL_RECOVERY_CREDIT"))block.reasonCodes.push("TWL_RECOVERY_CREDIT");
              }else slot.restForTaskId = task.id;
            }
          });
          break;
        }
        }
        if (scheduledSlots === scheduledBeforeSearch && task.splittable && !hasFurtherOutdoorWork) {
          const remainingWorkSlots = requiredSlots - scheduledSlots;
          let placedFinalPartial = false;
          for (let candidateWorkSlots = Math.min(remainingWorkSlots, maximumWorkSlots); candidateWorkSlots >= 1 && !placedFinalPartial; candidateWorkSlots -= 1) {
            const startIndices = slots.map((_, index) => index).filter((index) => index + candidateWorkSlots <= slots.length).sort((left, right) => {
              if (task.environment !== "direct_sun" || sortedForecast.length === 0) return left - right;
              return forecastTemperatureAt(slots[left].startMinutes, sortedForecast) - forecastTemperatureAt(slots[right].startMinutes, sortedForecast) || left - right;
            });
            for (const startIndex of startIndices) {
              const candidate = slots.slice(startIndex, startIndex + candidateWorkSlots);
              if (!candidate.every((slot, offset) => isValidSlot(slot, startIndex + offset))) continue;
              candidate.forEach((slot) => { slot.occupiedByTaskId = task.id; scheduledSlots += 1; });
              placedFinalPartial = true;
              break;
            }
          }
          break;
        }
        if (scheduledSlots === scheduledBeforeSearch) break;
      }
    } else if (task.splittable) {
      const candidateIndices = slots
        .map((_, index) => index)
        .filter((index) => isValidSlot(slots[index], index))
        .sort((left, right) => {
          if(task.timingPreference==="preferred"&&task.requestedStart){
            const requested=timeToMinutes(task.requestedStart);
            const movementDifference=Math.abs(slots[left].startMinutes-requested)-Math.abs(slots[right].startMinutes-requested);
            if(movementDifference!==0)return movementDifference;
          }
          if (restrictionActive && task.environment === "conditioned_indoor") {
            const leftIsMidday = restrictedSlots.has(left);
            const rightIsMidday = restrictedSlots.has(right);
            if (leftIsMidday !== rightIsMidday) return leftIsMidday ? -1 : 1;
          }
          if (task.environment === "direct_sun" && sortedForecast.length > 0) {
            const temperatureDifference =
              forecastTemperatureAt(slots[left].startMinutes, sortedForecast) -
              forecastTemperatureAt(slots[right].startMinutes, sortedForecast);
            if (temperatureDifference !== 0) return temperatureDifference;
          }
          return left - right;
        });
      for (const index of candidateIndices) {
        if (scheduledSlots >= requiredSlots) break;
        slots[index].occupiedByTaskId = task.id;
        scheduledSlots += 1;
      }
    } else {
      const startIndices = slots
        .map((_, index) => index)
        .filter((index) => index + requiredSlots <= slots.length)
        .sort((left, right) => {
          if(task.timingPreference==="preferred"&&task.requestedStart){
            const requested=timeToMinutes(task.requestedStart);
            const movementDifference=Math.abs(slots[left].startMinutes-requested)-Math.abs(slots[right].startMinutes-requested);
            if(movementDifference!==0)return movementDifference;
          }
          if (restrictionActive && task.environment === "conditioned_indoor") {
            const middaySlots = (startIndex: number) => {
              let count = 0;
              for (let offset = 0; offset < requiredSlots; offset += 1) {
                if (restrictedSlots.has(startIndex + offset)) count += 1;
              }
              return count;
            };
            const preferenceDifference = middaySlots(right) - middaySlots(left);
            if (preferenceDifference !== 0) return preferenceDifference;
          }
          if (task.environment !== "direct_sun" || sortedForecast.length === 0) {
            return left - right;
          }
          const averageTemperature = (startIndex: number) => {
            let total = 0;
            for (let offset = 0; offset < requiredSlots; offset += 1) {
              total += forecastTemperatureAt(
                slots[startIndex + offset].startMinutes,
                sortedForecast,
              );
            }
            return total / requiredSlots;
          };
          return averageTemperature(left) - averageTemperature(right) || left - right;
        });
      for (const startIndex of startIndices) {
        const candidate = slots.slice(startIndex, startIndex + requiredSlots);
        if (!candidate.every((slot, offset) => isValidSlot(slot, startIndex + offset))) {
          continue;
        }
        candidate.forEach((slot) => {
          slot.occupiedByTaskId = task.id;
        });
        scheduledSlots = requiredSlots;
        break;
      }
    }

    const scheduledMinutes = Math.min(
      task.durationMinutes,
      scheduledSlots * SLOT_MINUTES,
    );
    const unscheduledMinutes = task.durationMinutes - scheduledMinutes;
    if (unscheduledMinutes > 0) {
      unscheduled.push({
        taskId: task.id,
        taskName: task.nameEn,
        unscheduledMinutes,
        reasonCode: "INSUFFICIENT_SAFE_CAPACITY",
      });
      capacityConflicts.push(insufficientCapacityConflict(task, unscheduledMinutes));
    }
  }

  const outdoorWorkIndices=slots.map((slot,index)=>({slot,index})).filter(({slot})=>{
    const activity=slot.occupiedByTaskId?workTasks.find(task=>task.id===slot.occupiedByTaskId):undefined;
    return activity&&activity.environment!=="conditioned_indoor";
  });
  const finalOutdoor=outdoorWorkIndices.at(-1);
  if(finalOutdoor?.slot.occupiedByTaskId){
    for(let index=finalOutdoor.index+1;index<slots.length&&slots[index].restForTaskId===finalOutdoor.slot.occupiedByTaskId;index+=1)slots[index].restForTaskId=undefined;
  }
  const blocks = buildWorkBlocks(
    slots,
    new Map(workTasks.map((task) => [task.id, task])),
    restrictionActive,
    siteConditions.twlZone,
    sortedForecast.length > 0,
  );
  blocks.push(...activityBlocks);
  if (restrictionActive && restrictedSlots.size > 0) {
    const firstIndex = Math.min(...restrictedSlots);
    const lastIndex = Math.max(...restrictedSlots);
    blocks.push({
      id: "restriction-midday-direct-sun",
      type: "restriction",
      start: minutesToTime(slots[firstIndex].startMinutes),
      end: minutesToTime(slots[lastIndex].startMinutes + SLOT_MINUTES),
      labelEn: "Direct-sun work restriction",
      labelAr: "تقييد العمل تحت أشعة الشمس المباشرة",
      reasonCodes: ["SAUDI_MIDDAY_DIRECT_SUN_RESTRICTION"],
    });
  }
  blocks.sort((left, right) => left.start.localeCompare(right.start) || left.id.localeCompare(right.id));

  const ruleConflicts = [
    getNonAcclimatizedConflict(
      siteConditions.twlZone,
      shiftPlan.nonAcclimatizedWorkers,
    ),
    getLoneWorkConflict(siteConditions.twlZone),
  ].filter((conflict): conflict is Conflict => conflict !== null);
  const scheduledWorkMinutes = slots.filter((slot) => slot.occupiedByTaskId).length * SLOT_MINUTES;
  const restMinutes = slots.filter((slot) => slot.restForTaskId||slot.recoveryForTaskId).length * SLOT_MINUTES;
  const peakForecastTemperature = shiftForecast.length
    ? Math.max(...shiftForecast.map((hour) => hour.temperatureCelsius))
    : null;
  const peakApparentTemperature = shiftForecast.length
    ? Math.max(...shiftForecast.map((hour) => hour.apparentTemperatureCelsius))
    : null;

  return {
    blocks,
    conflicts: [...ruleConflicts, ...capacityConflicts],
    unscheduled,
    metrics: {
      totalShiftMinutes: shiftEnd - shiftStart,
      scheduledWorkMinutes,
      restMinutes,
      restrictionMinutes: restrictedSlots.size * SLOT_MINUTES,
      unscheduledMinutes: unscheduled.reduce(
        (total, task) => total + task.unscheduledMinutes,
        0,
      ),
      peakForecastTemperature,
      peakApparentTemperature,
      hydrationPlanning: {
        twlZone: siteConditions.twlZone,
        light: getHydrationGuidance(siteConditions.twlZone, "light"),
        heavy: getHydrationGuidance(siteConditions.twlZone, "heavy"),
      },
    },
    explanationSummary: `${scheduledWorkMinutes} work minutes scheduled in five-minute slots; ${unscheduled.reduce((total, task) => total + task.unscheduledMinutes, 0)} minutes remain unscheduled.`,
    isPreliminary: siteConditions.twlZone === "none" || !restrictionEvaluation.regulatoryGuidanceAvailable,
    regulatoryGuidanceAvailable: restrictionEvaluation.regulatoryGuidanceAvailable,
  };
}

function scoreCandidate(plan:ShiftPlan,result:CandidateResult,strategy:CandidateStrategy,forecastHours:readonly ForecastHour[],conditions:SiteConditions):OptimizationSummary{
  const unscheduledById=new Map(result.unscheduled.map(item=>[item.taskId,item.unscheduledMinutes]));
  let unscheduledMustScheduleMinutes=0,unscheduledOtherMinutes=0,movementMinutes=0,splitCount=0,orderInversions=0,heatExposurePenalty=0;
  const starts=new Map<string,number>();
  for(const activity of plan.tasks){
    const missing=unscheduledById.get(activity.id)??0;
    if(isWorkActivity(activity)){if(activity.mustSchedule)unscheduledMustScheduleMinutes+=missing;else unscheduledOtherMinutes+=missing;}
    const blocks=result.blocks.filter(block=>block.taskId===activity.id&&(block.type==="work"||block.type==="break"||block.type==="meal"));
    if(blocks.length){
      const start=timeToMinutes(blocks[0].start);starts.set(activity.id,start);
      if(activity.requestedStart)movementMinutes+=Math.abs(start-timeToMinutes(activity.requestedStart));
      if(isWorkActivity(activity))splitCount+=Math.max(0,blocks.filter(block=>block.type==="work").length-1);
    }
  }
  for(let left=0;left<plan.tasks.length;left+=1)for(let right=left+1;right<plan.tasks.length;right+=1){const a=starts.get(plan.tasks[left].id),b=starts.get(plan.tasks[right].id);if(a!==undefined&&b!==undefined&&a>b)orderInversions+=1;}
  for(const block of result.blocks){
    if(block.type!=="work"||block.environment!=="direct_sun")continue;
    const forecast=forecastAtOrBefore(forecastHours,block.start);
    const temperature=forecast?.temperatureCelsius;
    if(temperature!==undefined)heatExposurePenalty+=Math.max(0,temperature-32.7)*(timeToMinutes(block.end)-timeToMinutes(block.start));
  }
  return {candidatesEvaluated:CANDIDATE_STRATEGIES.length,selectedStrategy:strategy,hardConstraintViolations:validateScheduleHardConstraints(plan,conditions,result),unscheduledMustScheduleMinutes,unscheduledOtherMinutes,movementMinutes,splitCount,orderInversions,heatExposurePenalty:Number(heatExposurePenalty.toFixed(2))};
}

export function compareOptimizationSummaries(left:OptimizationSummary,right:OptimizationSummary):number{
  const hardDifference=left.hardConstraintViolations.length-right.hardConstraintViolations.length;
  if(hardDifference!==0)return hardDifference;
  const fields:(keyof OptimizationSummary)[]=["unscheduledMustScheduleMinutes","unscheduledOtherMinutes","movementMinutes","splitCount","orderInversions","heatExposurePenalty"];
  for(const field of fields){const difference=Number(left[field])-Number(right[field]);if(difference!==0)return difference;}
  return 0;
}

function candidateScoreVector(plan:ShiftPlan,result:ScheduleResult,summary:OptimizationSummary):readonly number[]{
  let preferredMovement=0,indoorMiddayPenalty=0;
  const occupancy=result.blocks.filter(block=>block.type!=="restriction");
  for(const activity of plan.tasks){
    if(activity.timingPreference!=="preferred"||!activity.requestedStart)continue;
    const block=occupancy.find(candidate=>candidate.taskId===activity.id&&(candidate.type==="work"||candidate.type==="break"||candidate.type==="meal"));
    if(block)preferredMovement+=Math.abs(timeToMinutes(block.start)-timeToMinutes(activity.requestedStart));
  }
  const restriction=result.blocks.find(block=>block.type==="restriction");
  if(restriction)for(const block of occupancy)if(block.type==="work"&&block.environment==="conditioned_indoor"){
    const overlap=Math.max(0,Math.min(timeToMinutes(block.end),timeToMinutes(restriction.end))-Math.max(timeToMinutes(block.start),timeToMinutes(restriction.start)));
    indoorMiddayPenalty+=timeToMinutes(block.end)-timeToMinutes(block.start)-overlap;
  }
  const sorted=occupancy.slice().sort((left,right)=>left.start.localeCompare(right.start));
  const completion=sorted.length?timeToMinutes(sorted.at(-1)!.end)-timeToMinutes(plan.shiftStart):0;
  let idleGaps=0;
  for(let index=1;index<sorted.length;index+=1)idleGaps+=Math.max(0,timeToMinutes(sorted[index].start)-timeToMinutes(sorted[index-1].end));
  return [summary.hardConstraintViolations.length,summary.unscheduledMustScheduleMinutes,summary.unscheduledOtherMinutes,preferredMovement,summary.movementMinutes,summary.splitCount,summary.orderInversions,summary.heatExposurePenalty,indoorMiddayPenalty,completion,idleGaps];
}

export function compareScheduleCandidates(left:ScheduleCandidate,right:ScheduleCandidate):number{
  for(let index=0;index<Math.max(left.scoreVector.length,right.scoreVector.length);index+=1){const difference=(left.scoreVector[index]??0)-(right.scoreVector[index]??0);if(difference!==0)return difference;}
  return CANDIDATE_STRATEGIES.indexOf(left.strategy)-CANDIDATE_STRATEGIES.indexOf(right.strategy);
}

export function generateScheduleCandidates(shiftPlan:ShiftPlan,siteConditions:SiteConditions,forecastHours:readonly ForecastHour[]):ScheduleCandidate[]{
  return CANDIDATE_STRATEGIES.map(strategy=>{
    const base=generateCandidateSchedule(shiftPlan,siteConditions,forecastHours,strategy);
    const optimizationSummary=scoreCandidate(shiftPlan,base,strategy,forecastHours,siteConditions);
    const result:ScheduleResult={...base,optimizationSummary};
    return {strategy,result,optimizationSummary,scoreVector:candidateScoreVector(shiftPlan,result,optimizationSummary)};
  });
}

export function generateSchedule(shiftPlan:ShiftPlan,siteConditions:SiteConditions,forecastHours:readonly ForecastHour[]):ScheduleResult{
  const candidates=generateScheduleCandidates(shiftPlan,siteConditions,forecastHours);
  const validCandidates=candidates.filter(candidate=>candidate.optimizationSummary.hardConstraintViolations.length===0);
  const selected=[...(validCandidates.length?validCandidates:candidates)].sort(compareScheduleCandidates)[0];
  const infeasibility=selected.optimizationSummary.unscheduledMustScheduleMinutes>0?` Even confirmed must-schedule work could not fit without violating a hard constraint; ${selected.optimizationSummary.unscheduledMustScheduleMinutes} minutes require supervisor intervention.`:"";
  const operationalNotes=shiftPlan.tasks.filter(activity=>activity.mustSchedule&&(activity.operationalNotes?.length??0)>0).flatMap(activity=>activity.operationalNotes??[]);
  const noteExplanation=operationalNotes.length?` Operational priority note: ${operationalNotes.join(" ")} This affects candidate priority but does not create a clock window unless an explicit time window is confirmed.`:"";
  return {...selected.result,explanationSummary:`Selected from ${candidates.length} deterministic candidate schedules.${infeasibility}${noteExplanation} ${selected.result.explanationSummary}`};
}
