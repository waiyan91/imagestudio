export const env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY!,
  GLOBAL_PASSWORD: process.env.GLOBAL_PASSWORD!,
} as const;

export function requireEnvForProvider(providerName: string, apiKey?: string): void {
  if (apiKey) return;

  if (providerName === "openai" && !env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is required");
  }

  if (providerName === "google" && !env.GOOGLE_API_KEY) {
    throw new Error("Google API key is required");
  }
}