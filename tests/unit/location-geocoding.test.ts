import { describe, expect, it, vi } from "vitest";
import { normalizeGeocodingResponse, searchSaudiLocations } from "../../lib/location/open-meteo-geocoding";

const upstream = {
  results: [
    { id:108410, name:"Riyadh", admin1:"Riyadh Region", country_code:"SA", latitude:24.6877, longitude:46.7219, timezone:"Asia/Riyadh" },
    { id:292223, name:"Dubai", admin1:"Dubai", country_code:"AE", latitude:25.0773, longitude:55.3093, timezone:"Asia/Dubai" },
    { id:110336, name:"Al Olaya", admin1:"Riyadh Region", country_code:"SA", latitude:24.6901, longitude:46.685, timezone:"Asia/Riyadh" },
  ],
};

describe("Open-Meteo Saudi location search", () => {
  it("normalizes only Saudi results and limits output to eight", () => {
    const payload = { results:[...upstream.results, ...Array.from({length:10},(_,index)=>({id:2000+index,name:`Saudi ${index}`,country_code:"SA",latitude:20+index/10,longitude:40,timezone:"Asia/Riyadh"}))] };
    const results = normalizeGeocodingResponse(payload);
    expect(results).toHaveLength(8);
    expect(results.every((location)=>location.countryCode==="SA" && location.source==="geocoding")).toBe(true);
    expect(results[0]).toEqual({id:"geocoding-108410",name:"Riyadh",admin1:"Riyadh Region",countryCode:"SA",latitude:24.6877,longitude:46.7219,timezone:"Asia/Riyadh",source:"geocoding"});
  });

  it.each([["الرياض","ar"],["Al Olaya","en"]] as const)("sends %s using %s search", async (query, language) => {
    const fetchImpl=vi.fn().mockResolvedValue(new Response(JSON.stringify(upstream),{status:200}));
    const results=await searchSaudiLocations(query,language,{fetchImpl:fetchImpl as typeof fetch});
    expect(results.map(result=>result.name)).toEqual(["Riyadh","Al Olaya"]);
    const url=new URL(String(fetchImpl.mock.calls[0][0]));
    expect(url.searchParams.get("name")).toBe(query);
    expect(url.searchParams.get("language")).toBe(language);
  });

  it("returns an empty list without fabricating matches", async () => {
    const fetchImpl=vi.fn().mockResolvedValue(new Response(JSON.stringify({}),{status:200}));
    await expect(searchSaudiLocations("zz", "en", {fetchImpl:fetchImpl as typeof fetch})).resolves.toEqual([]);
  });

  it("rejects malformed upstream output", () => {
    expect(()=>normalizeGeocodingResponse({results:[{name:"Broken",country_code:"SA",latitude:"north"}]})).toThrowError(expect.objectContaining({code:"LOCATION_UNAVAILABLE"}));
  });

  it("aborts a timed-out search", async () => {
    const fetchImpl=vi.fn((_url:URL|RequestInfo,init?:RequestInit)=>new Promise<Response>((_resolve,reject)=>init?.signal?.addEventListener("abort",()=>reject(new DOMException("Aborted","AbortError")))));
    await expect(searchSaudiLocations("Riyadh","en",{fetchImpl:fetchImpl as typeof fetch,timeoutMs:1})).rejects.toMatchObject({code:"LOCATION_TIMEOUT",status:504});
  });
});
