export type Provider = "openai" | "google";

export const env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
};

export function requireEnvForProvider(provider: Provider, apiKey?: string) {
  if (provider === "openai" && !apiKey && !env.OPENAI_API_KEY) {
    throw new Error("Missing OpenAI API Key. Please provide one.");
  }
  if (provider === "google" && !apiKey && !env.GOOGLE_API_KEY) {
    throw new Error("Missing Google API Key. Please provide one.");
  }
}
