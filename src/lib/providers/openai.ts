import OpenAI from "openai";
import { env } from "@/lib/env";
import type { GenerateImageParams, GeneratedImage, ImageProvider } from "./types";

export class OpenAIImageProvider implements ImageProvider {
  name = "openai";
  private client: OpenAI;

  constructor() {
    if (!env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  async generate(params: GenerateImageParams): Promise<GeneratedImage[]> {
    const { prompt, model: modelId, n, size, quality } = params;

    const model = modelId || "dall-e-3";
    const count = n ?? 1;

    // DALL-E 3 only supports n=1
    if (model === "dall-e-3" && count > 1) {
      throw new Error("DALL-E 3 only supports generating 1 image at a time.");
    }

    // Determine appropriate default quality based on model
    let defaultQuality: "standard" | "hd" | "auto" | "low" | "medium" | "high";
    if (model === "gpt-image-1") {
      defaultQuality = "auto"; // gpt-image-1 supports: low, medium, high, auto
    } else if (model === "dall-e-3") {
      defaultQuality = "standard"; // dall-e-3 supports: standard, hd
    } else {
      defaultQuality = "standard"; // dall-e-2 supports: standard
    }

    const finalQuality = quality ?? defaultQuality;
    console.log(`[OpenAI Provider] Using model: ${model}, quality: ${finalQuality}`);

    const res = await this.client.images.generate({
      model: model,
      prompt: prompt,
      size: size ?? "1024x1024",
      quality: finalQuality,
      n: count,
    });

    return (res.data || []).map((d) => ({ url: d.url || undefined, b64_json: d.b64_json || undefined }));
  }
}
