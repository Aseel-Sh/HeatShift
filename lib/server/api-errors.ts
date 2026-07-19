export type ApiErrorCode =
  | "INVALID_INPUT"
  | "AI_NOT_CONFIGURED"
  | "AI_TIMEOUT"
  | "AI_RATE_LIMITED"
  | "AI_INVALID_RESPONSE"
  | "AI_UNAVAILABLE"
  | "LOCATION_UNAVAILABLE"
  | "LOCATION_TIMEOUT"
  | "WEATHER_UNAVAILABLE"
  | "WEATHER_TIMEOUT"
  | "WEATHER_EMPTY_FORECAST"
  | "WEATHER_DATE_UNAVAILABLE";

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

export class IntegrationError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "IntegrationError";
  }
}

export function errorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
): Response {
  const body: ApiErrorBody = { error: { code, message } };
  return Response.json(body, { status });
}
