import { GoogleGenAI, PersonGeneration } from "@google/genai";
import { env } from "@/lib/env";
import type {
  GenerateImageParams,
  GeneratedImage,
  ImageProvider
} from "./types";

export class GoogleImageProvider implements ImageProvider {
  name = "google";
  private client: GoogleGenAI;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: env.GOOGLE_API_KEY });
  }

  async generate(params: GenerateImageParams): Promise<GeneratedImage[]> {
    const { prompt, model, n, aspectRatio, sampleImageSize, personGeneration, images } = params;

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
    const config: any = {
      numberOfImages: n || 1,
      aspectRatio,
      sampleImageSize,
      personGeneration
    };

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
    const parts: any[] = [{ text: prompt }];

    if (images) {
      const imageParts = images.map((img) => ({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data
        }
      }));
      parts.unshift(...imageParts);
    }

    const response = await this.client.models.generateContent({
      model: model,
      contents: [{ parts }]
    });

    const generatedImages: GeneratedImage[] = [];
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          generatedImages.push({ b64_json: part.inlineData.data });
        }
      }
    }

    return generatedImages.slice(0, n || 1);
  }
}