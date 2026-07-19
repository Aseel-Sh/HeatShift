import { errorResponse, IntegrationError } from "../../../lib/server/api-errors";
import {
  fetchCityWeather,
  weatherQuerySchema,
} from "../../../lib/weather/open-meteo";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const query = weatherQuerySchema.safeParse({
    city: url.searchParams.get("city"),
    date: url.searchParams.get("date"),
  });
  if (!query.success) {
    return errorResponse(
      "INVALID_INPUT",
      "City and date must use a supported city ID and YYYY-MM-DD date.",
      400,
    );
  }

  try {
    const hours = await fetchCityWeather(query.data.city, query.data.date);
    return Response.json({
      data: { city: query.data.city, date: query.data.date, hours },
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
