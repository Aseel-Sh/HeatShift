import { z } from "zod";

const serverEnvironmentSchema = z.object({
  GEMINI_API_KEY: z.string().trim().min(1).optional(),
  GEMINI_MODEL: z.string().trim().min(1).default("gemini-3.5-flash"),
});

export interface ServerEnvironment {
  gemini: {
    enabled: boolean;
    apiKey?: string;
    model: string;
  };
}

export function getServerEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): ServerEnvironment {
  const parsed = serverEnvironmentSchema.safeParse(source);
  if (!parsed.success) {
    return {
      gemini: { enabled: false, model: "gemini-3.5-flash" },
    };
  }

  return {
    gemini: {
      enabled: Boolean(parsed.data.GEMINI_API_KEY),
      apiKey: parsed.data.GEMINI_API_KEY,
      model: parsed.data.GEMINI_MODEL,
    },
  };
}
