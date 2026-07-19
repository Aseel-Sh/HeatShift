import { describe,expect,it,vi } from "vitest";
import { OpenRouterClient } from "../../lib/ai/provider";

describe("OpenRouter provider",()=>{
  it("requires structured-output parameters and returns the actual model",async()=>{
    const fetchImpl=vi.fn().mockResolvedValue(new Response(JSON.stringify({model:"google/gemma-3-27b-it:free",choices:[{message:{content:"{}"}}]}),{status:200,headers:{"content-type":"application/json"}}));
    const client=new OpenRouterClient("secret",fetchImpl as typeof fetch);
    const result=await client.complete({model:"openrouter/free",system:"system",user:"plan",responseFormat:{type:"json_schema",json_schema:{name:"plan",strict:true,schema:{type:"object"}}}});
    const body=JSON.parse(fetchImpl.mock.calls[0][1]?.body as string);
    expect(body.provider).toEqual({require_parameters:true});
    expect(body.response_format.type).toBe("json_schema");
    expect(result).toEqual({content:"{}",model:"google/gemma-3-27b-it:free"});
  });
});
