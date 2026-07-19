import { IntegrationError } from "../server/api-errors";

export interface StructuredResponseFormat {
  type: "json_schema";
  json_schema: { name: string; strict: true; schema: object };
}

export interface ChatCompletionRequest {
  model: string;
  system: string;
  user: string;
  responseFormat: StructuredResponseFormat;
  signal?: AbortSignal;
}

export interface ChatCompletionsClient {
  complete(request: ChatCompletionRequest): Promise<{ content: string }>;
}

export class OpenRouterClient implements ChatCompletionsClient {
  constructor(private readonly apiKey: string, private readonly fetchImpl: typeof fetch = fetch) {}

  async complete(request: ChatCompletionRequest): Promise<{ content: string }> {
    const response = await this.fetchImpl("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: request.model,
        messages: [{ role: "system", content: request.system }, { role: "user", content: request.user }],
        response_format: request.responseFormat,
        temperature: 0,
      }),
      signal: request.signal,
    });
    if (!response.ok) {
      const error = new Error("OpenRouter request failed") as Error & { status: number };
      error.status = response.status;
      throw error;
    }
    const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new IntegrationError("AI_INVALID_RESPONSE", "Plan extraction returned an invalid response.", 502);
    }
    return { content };
  }
}
