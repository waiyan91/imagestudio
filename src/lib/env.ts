export type Provider = "openai" | "google";

export const env = {
  PROVIDER: (process.env.PROVIDER as Provider) || "openai",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
};

export function requireEnvForProvider(provider: Provider) {
  if (provider === "openai" && !env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY. Set it in .env.local");
  }
  if (provider === "google" && !env.GOOGLE_API_KEY) {
    throw new Error("Missing GOOGLE_API_KEY. Set it in .env.local");
  }
}
