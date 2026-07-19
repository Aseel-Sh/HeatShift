import { z } from "zod";
import { siteLocationSchema, type SiteLocation } from "../domain/types";
import { IntegrationError } from "../server/api-errors";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const DEFAULT_TIMEOUT_MS = 6_000;
const CACHE_TTL_MS = 5 * 60_000;
const cache = new Map<string,{expires:number;locations:SiteLocation[]}>();

const upstreamResultSchema = z.object({
  id: z.number().int().optional(),
  name: z.string().trim().min(1),
  admin1: z.string().trim().min(1).optional(),
  country_code: z.string().length(2),
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string().trim().min(1),
}).passthrough();
const upstreamResponseSchema = z.object({ results:z.array(upstreamResultSchema).optional() }).passthrough();

export const locationQuerySchema = z.object({
  q:z.string().trim().min(2,"Location query must contain at least 2 characters.").max(100),
  language:z.enum(["en","ar"]).default("en"),
});

export interface LocationSearchOptions { fetchImpl?:typeof fetch; timeoutMs?:number }

export function normalizeGeocodingResponse(payload:unknown):SiteLocation[] {
  const parsed=upstreamResponseSchema.safeParse(payload);
  if(!parsed.success) throw new IntegrationError("LOCATION_UNAVAILABLE","Location search is temporarily unavailable.",502);
  const locations:SiteLocation[]=[];
  for(const result of parsed.data.results??[]){
    if(result.country_code!=="SA") continue;
    const location=siteLocationSchema.safeParse({
      id:result.id!==undefined?`geocoding-${result.id}`:`geocoding-${result.latitude}-${result.longitude}`,
      name:result.name,admin1:result.admin1,countryCode:"SA",latitude:result.latitude,longitude:result.longitude,timezone:result.timezone,source:"geocoding",
    });
    if(!location.success) throw new IntegrationError("LOCATION_UNAVAILABLE","Location search is temporarily unavailable.",502);
    locations.push(location.data);
    if(locations.length===8) break;
  }
  return locations;
}

export async function searchSaudiLocations(query:string,language:"en"|"ar",options:LocationSearchOptions={}):Promise<SiteLocation[]> {
  const cacheKey=`${language}:${query.trim().toLowerCase()}`;
  if(!options.fetchImpl){const hit=cache.get(cacheKey);if(hit&&hit.expires>Date.now())return structuredClone(hit.locations);}
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),options.timeoutMs??DEFAULT_TIMEOUT_MS);
  const parameters=new URLSearchParams({name:query.trim(),count:"20",language,format:"json"});
  try{
    const response=await(options.fetchImpl??fetch)(`${GEOCODING_URL}?${parameters}`,{signal:controller.signal});
    if(!response.ok)throw new IntegrationError("LOCATION_UNAVAILABLE","Location search is temporarily unavailable.",502);
    const locations=normalizeGeocodingResponse(await response.json());
    if(!options.fetchImpl)cache.set(cacheKey,{expires:Date.now()+CACHE_TTL_MS,locations});
    return locations;
  }catch(error){
    if(error instanceof IntegrationError)throw error;
    if(typeof error==="object"&&error!==null&&"name" in error&&error.name==="AbortError")throw new IntegrationError("LOCATION_TIMEOUT","Location search timed out. Try a preset or search again.",504);
    throw new IntegrationError("LOCATION_UNAVAILABLE","Location search is temporarily unavailable.",502);
  }finally{clearTimeout(timeout);}
}
