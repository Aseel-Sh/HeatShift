import { z } from "zod";

const serverEnvironmentSchema = z.object({
  OPENROUTER_API_KEY: z.string().trim().min(1).optional(),
  OPENROUTER_MODEL: z.string().trim().min(1).default("openrouter/free"),
});

export interface ServerEnvironment {
  ai: {
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
      ai: { enabled: false, model: "openrouter/free" },
    };
  }

  return {
    ai: {
      enabled: Boolean(parsed.data.OPENROUTER_API_KEY),
      apiKey: parsed.data.OPENROUTER_API_KEY,
      model: parsed.data.OPENROUTER_MODEL,
    },
  };
}
