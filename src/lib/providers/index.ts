import { env, requireEnvForProvider } from "@/lib/env";
import type { ImageProvider } from "./types";
import { OpenAIImageProvider } from "./openai";
import { GoogleImageProvider } from "./google";

export function getImageProvider(providerName: "openai" | "google"): ImageProvider {
  requireEnvForProvider(providerName);
  switch (providerName) {
    case "openai":
      return new OpenAIImageProvider();
    case "google":
      return new GoogleImageProvider();
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}
