import { extractPlanWithGemini } from "../../../lib/ai/gemini-plan-extractor";
import { parsePlanRequestSchema } from "../../../lib/ai/plan-extraction-schema";
import {
  errorResponse,
  IntegrationError,
} from "../../../lib/server/api-errors";
import { getServerEnvironment } from "../../../lib/server/environment";

const MAX_BODY_BYTES = 10_240;
const REQUEST_TIMEOUT_MS = 12_000;

export async function POST(request: Request): Promise<Response> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return errorResponse(
      "INVALID_INPUT",
      "Content-Type must be application/json.",
      415,
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return errorResponse("INVALID_INPUT", "Request body is too large.", 413);
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return errorResponse("INVALID_INPUT", "Request body is too large.", 413);
    }
    body = JSON.parse(rawBody);
  } catch {
    return errorResponse("INVALID_INPUT", "Request body must be valid JSON.", 400);
  }

  const input = parsePlanRequestSchema.safeParse(body);
  if (!input.success) {
    return errorResponse(
      "INVALID_INPUT",
      input.error.issues[0]?.message ?? "Plan input is invalid.",
      400,
    );
  }

  const environment = getServerEnvironment();
  if (!environment.gemini.enabled || !environment.gemini.apiKey) {
    return errorResponse(
      "AI_NOT_CONFIGURED",
      "AI plan extraction is not configured.",
      503,
    );
  }

  const controller = new AbortController();
  const abortForDisconnectedRequest = () => controller.abort();
  request.signal.addEventListener("abort", abortForDisconnectedRequest, {
    once: true,
  });
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const plan = await extractPlanWithGemini(input.data.text, {
      apiKey: environment.gemini.apiKey,
      model: environment.gemini.model,
      signal: controller.signal,
    });
    return Response.json({ data: plan });
  } catch (error) {
    const integrationError =
      error instanceof IntegrationError
        ? error
        : new IntegrationError(
            "AI_UNAVAILABLE",
            "Plan extraction is temporarily unavailable.",
            503,
          );
    return errorResponse(
      integrationError.code,
      integrationError.message,
      integrationError.status,
    );
  } finally {
    clearTimeout(timeout);
    request.signal.removeEventListener("abort", abortForDisconnectedRequest);
  }
}
