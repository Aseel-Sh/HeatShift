import { describe,expect,it } from "vitest";
import { GET } from "../../app/api/locations/route";

describe("location route validation",()=>{
  it("rejects queries shorter than two meaningful characters",async()=>{
    const response=await GET(new Request("http://localhost/api/locations?q=R&language=en"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({error:{code:"INVALID_INPUT"}});
  });

  it("rejects unsupported languages",async()=>{
    const response=await GET(new Request("http://localhost/api/locations?q=Riyadh&language=fr"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({error:{code:"INVALID_INPUT"}});
  });
});
