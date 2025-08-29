import { env, requireEnvForProvider } from "@/lib/env";
import type { ImageProvider } from "./types";
import { OpenAIImageProvider } from "./openai";
import { GoogleImageProvider } from "./google";

export function getImageProvider(): ImageProvider {
  const provider = env.PROVIDER;
  requireEnvForProvider(provider);
  switch (provider) {
    case "openai":
      return new OpenAIImageProvider();
    case "google":
      return new GoogleImageProvider();
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
