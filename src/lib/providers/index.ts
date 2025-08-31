import { requireEnvForProvider } from "@/lib/env";
import type { ImageProvider } from "./types";
import { OpenAIImageProvider } from "./openai";
import { GoogleImageProvider } from "./google";

export function getImageProvider(providerName: string, apiKey?: string): ImageProvider {
  requireEnvForProvider(providerName, apiKey);
  switch (providerName) {
    case "openai":
      return new OpenAIImageProvider();
    case "google":
      return new GoogleImageProvider();
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}