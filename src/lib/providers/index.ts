import { requireEnvForProvider } from "@/lib/env";
import type { ImageProvider } from "./types";
import { OpenAIImageProvider } from "./openai";
import { GoogleImageProvider } from "./google";

export function getImageProvider(providerName: "openai" | "google", apiKey?: string): ImageProvider {
  requireEnvForProvider(providerName, apiKey);
  switch (providerName) {
    case "openai":
      return new OpenAIImageProvider(apiKey);
    case "google":
      return new GoogleImageProvider(apiKey);
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}
