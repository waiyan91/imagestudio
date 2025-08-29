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
    const size = params.size ?? "1024x1024";
    const n = params.n ?? 1;

    const res = await this.client.images.generate({
      model: "gpt-image-1",
      prompt: params.prompt,
      size,
      n,
    });

    return (res.data || []).map((d) => ({ url: d.url || undefined, b64_json: d.b64_json || undefined }));
  }
}
