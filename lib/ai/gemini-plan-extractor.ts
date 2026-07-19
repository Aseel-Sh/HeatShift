import { GoogleGenAI } from "@google/genai";
import { IntegrationError } from "../server/api-errors";
import {
  extractedPlanJsonSchema,
  extractedPlanSchema,
  type ExtractedPlan,
} from "./plan-extraction-schema";

const SYSTEM_INSTRUCTION = `You extract structured work-plan facts only.
- Never invent a regulation.
- Never determine whether the plan is safe.
- Never invent absent dates, times, durations, crew counts, or locations.
- Put uncertain or absent information in missingInformation.
- Put interpretation decisions in assumptions.
- Translate task names into concise Arabic.
- Return only schema-valid data.`;

export interface GeminiGenerateClient {
  generateContent(input: {
    model: string;
    contents: string;
    config: {
      systemInstruction: string;
      responseMimeType: "application/json";
      responseJsonSchema: typeof extractedPlanJsonSchema;
      abortSignal?: AbortSignal;
    };
  }): Promise<{ text?: string }>;
}

export interface GeminiExtractionOptions {
  apiKey: string;
  model: string;
  signal?: AbortSignal;
  client?: GeminiGenerateClient;
}

function classifyGeminiError(error: unknown): IntegrationError {
  if (error instanceof IntegrationError) return error;
  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  ) {
    return new IntegrationError("AI_TIMEOUT", "Plan extraction timed out.", 504);
  }
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number(error.status)
      : undefined;
  if (status === 429) {
    return new IntegrationError(
      "AI_RATE_LIMITED",
      "Plan extraction is temporarily rate limited.",
      429,
    );
  }
  return new IntegrationError(
    "AI_UNAVAILABLE",
    "Plan extraction is temporarily unavailable.",
    503,
  );
}

export async function extractPlanWithGemini(
  text: string,
  options: GeminiExtractionOptions,
): Promise<ExtractedPlan> {
  const client =
    options.client ?? new GoogleGenAI({ apiKey: options.apiKey }).models;

  try {
    const response = await client.generateContent({
      model: options.model,
      contents: text,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseJsonSchema: extractedPlanJsonSchema,
        abortSignal: options.signal,
      },
    });
    if (!response.text) {
      throw new IntegrationError(
        "AI_INVALID_RESPONSE",
        "Plan extraction returned an invalid response.",
        502,
      );
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(response.text);
    } catch {
      throw new IntegrationError(
        "AI_INVALID_RESPONSE",
        "Plan extraction returned an invalid response.",
        502,
      );
    }
    const parsed = extractedPlanSchema.safeParse(decoded);
    if (!parsed.success) {
      throw new IntegrationError(
        "AI_INVALID_RESPONSE",
        "Plan extraction returned an invalid response.",
        502,
      );
    }
    return parsed.data;
  } catch (error) {
    throw classifyGeminiError(error);
  }
}
