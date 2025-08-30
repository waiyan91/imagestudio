import { GoogleGenAI, PersonGeneration } from "@google/genai";
import { env } from "@/lib/env";
import type { GenerateImageParams, GeneratedImage, ImageProvider } from "./types";

export class GoogleImageProvider implements ImageProvider {
  name = "google";
  private client: GoogleGenAI;

  constructor(apiKey?: string) {
    const key = apiKey || env.GOOGLE_API_KEY;
    if (!key) {
      throw new Error("Google API key is not set");
    }
    this.client = new GoogleGenAI({ apiKey: key });
  }

  async generate(params: GenerateImageParams): Promise<GeneratedImage[]> {
    const { prompt, model, n, images, aspectRatio, sampleImageSize, personGeneration } = params;

    if (model.startsWith("gemini")) {
      return this.generateWithGemini(prompt, model, n, images);
    } else if (model.startsWith("imagen-4.0")) {
      return this.generateWithImagen(
        prompt,
        model,
        n,
        aspectRatio,
        sampleImageSize,
        personGeneration as PersonGeneration
      );
    } else {
      throw new Error(`Unknown Google model: ${model}`);
    }
  }

  private async generateWithImagen(
    prompt: string,
    model: string,
    n?: number,
    aspectRatio?: string,
    sampleImageSize?: string,
    personGeneration?: PersonGeneration
  ): Promise<GeneratedImage[]> {
    const target = Math.max(1, Math.min(4, n ?? 1));
    const config: {
      numberOfImages: number;
      aspectRatio?: string;
      sampleImageSize?: string;
      personGeneration?: PersonGeneration;
    } = {
      numberOfImages: target,
    };
    if (aspectRatio) config.aspectRatio = aspectRatio;
    if (sampleImageSize) config.sampleImageSize = sampleImageSize;
    if (personGeneration) config.personGeneration = personGeneration;

    const response = await this.client.models.generateImages({
      model: model,
      prompt: prompt,
      config,
    });

    return (response.generatedImages || []).map((img) => ({
      b64_json: img.image?.imageBytes,
    }));
  }

  private async generateWithGemini(
    prompt: string,
    model: string,
    n?: number,
    images?: { mimeType: string; data: string }[]
  ): Promise<GeneratedImage[]> {
    const target = Math.max(1, Math.min(4, n ?? 1));
    const imageParts = (images ?? []).map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.data },
    }));

    const contents = [...imageParts, { text: prompt }];

    const callOnce = async (): Promise<GeneratedImage[]> => {
      const response = await this.client.models.generateContent({
        model: model,
        contents: contents,
      });

      type InlineDataPart = { inlineData?: { data?: string } };
      const isInlineDataPart = (p: unknown): p is InlineDataPart =>
        typeof (p as InlineDataPart).inlineData !== "undefined";

      const out: GeneratedImage[] = [];
      for (const cand of response.candidates || []) {
        for (const part of cand.content?.parts || []) {
          if (isInlineDataPart(part)) {
            const b64 = part.inlineData?.data;
            if (typeof b64 === "string" && b64.length > 0) {
              out.push({ b64_json: b64 });
            }
          }
        }
      }
      return out;
    };

    const collected: GeneratedImage[] = [];
    let attempts = 0;
    while (collected.length < target && attempts < Math.max(1, target)) {
      attempts += 1;
      const got = await callOnce();
      for (const g of got) {
        collected.push(g);
        if (collected.length >= target) break;
      }
    }

    return collected.slice(0, target);
  }
}
