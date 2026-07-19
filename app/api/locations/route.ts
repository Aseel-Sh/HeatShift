import { errorResponse,IntegrationError } from "../../../lib/server/api-errors";
import { locationQuerySchema,searchSaudiLocations } from "../../../lib/location/open-meteo-geocoding";

export async function GET(request:Request):Promise<Response>{
  const url=new URL(request.url);
  const query=locationQuerySchema.safeParse({q:url.searchParams.get("q")??"",language:url.searchParams.get("language")??"en"});
  if(!query.success)return errorResponse("INVALID_INPUT",query.error.issues[0]?.message??"Location query is invalid.",400);
  try{return Response.json({data:await searchSaudiLocations(query.data.q,query.data.language)});}
  catch(error){const integrationError=error instanceof IntegrationError?error:new IntegrationError("LOCATION_UNAVAILABLE","Location search is temporarily unavailable.",502);return errorResponse(integrationError.code,integrationError.message,integrationError.status);}
}
