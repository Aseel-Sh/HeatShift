import { errorResponse, IntegrationError } from "../../../lib/server/api-errors";
import {
  fetchLocationWeather,
  weatherQuerySchema,
} from "../../../lib/weather/open-meteo";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const query = weatherQuerySchema.safeParse({
    latitude: url.searchParams.get("latitude"),
    longitude: url.searchParams.get("longitude"),
    date: url.searchParams.get("date"),
    timezone: url.searchParams.get("timezone"),
    locationName: url.searchParams.get("locationName"),
  });
  if (!query.success) {
    return errorResponse(
      "INVALID_INPUT",
      "Coordinates, location, timezone, and date are invalid.",
      400,
    );
  }

  try {
    const hours = await fetchLocationWeather(query.data);
    return Response.json({
      data: { locationName:query.data.locationName,latitude:query.data.latitude,longitude:query.data.longitude,timezone:query.data.timezone,date:query.data.date,retrievedAt:new Date().toISOString(),hours },
    });
  } catch (error) {
    const integrationError =
      error instanceof IntegrationError
        ? error
        : new IntegrationError(
            "WEATHER_UNAVAILABLE",
            "Weather data is temporarily unavailable.",
            502,
          );
    return errorResponse(
      integrationError.code,
      integrationError.message,
      integrationError.status,
    );
  }
}
