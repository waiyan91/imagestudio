import OpenAI, { toFile } from "openai";
import { env } from "@/lib/env";
import type {
  GenerateImageParams,
  EditImageParams,
  VariationImageParams,
  GeneratedImage,
  ImageProvider
} from "./types";

export class OpenAIImageProvider implements ImageProvider {
  name = "openai";
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  async generate(params: GenerateImageParams): Promise<GeneratedImage[]> {
    const {
      prompt,
      model,
      n,
      size,
      quality,
      response_format,
      user,
    } = params;

    const generateParams: any = {
      model: model || "dall-e-3",
      prompt,
      size: size ?? "1024x1024",
      response_format: response_format || "b64_json"
    };

    if (quality) generateParams.quality = quality;
    if (user) generateParams.user = user;
    if (n) generateParams.n = n;

    const res = await this.client.images.generate(generateParams);
    return (res.data || []).map((d) => ({
      url: d.url,
      b64_json: d.b64_json
    }));

  }

  async edit(params: EditImageParams): Promise<GeneratedImage[]> {
    const { image, prompt, model, n, size } = params;

    // Handle single or multiple images
    const images = Array.isArray(image) ? image : [image];

    // Convert base64 to blobs
    const imageBuffers = await Promise.all(
      images.map(async (img) => {
        const base64Data = img.data.includes(',') ? img.data.split(',')[1] : img.data;
        const buffer = Buffer.from(base64Data, 'base64');
        return await toFile(buffer, 'image.png', { type: img.mimeType || 'image/png' });
      })
    );

    const editParams: any = {
      model: model || "gpt-image-1",
      prompt: prompt,
      image: imageBuffers.length === 1 ? imageBuffers[0] : imageBuffers,
      response_format: "b64_json"
    };

    if (n) editParams.n = n;
    if (size) editParams.size = size;

    const res = await this.client.images.edit(editParams);
    return (res.data || []).map((d) => ({
      url: d.url,
      b64_json: d.b64_json
    }));
  }

  async createVariation(params: VariationImageParams): Promise<GeneratedImage[]> {
    const { image, model, n, response_format, size } = params;

    const base64Data = image.data.includes(',') ? image.data.split(',')[1] : image.data;
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const variationParams: any = {
      image: await toFile(imageBuffer, 'image.png', { type: image.mimeType || 'image/png' }),
      model: model || "dall-e-2",
      response_format: response_format || "b64_json"
    };

    if (n) variationParams.n = n;
    if (size) variationParams.size = size;

    const res = await this.client.images.createVariation(variationParams);
    return (res.data || []).map((d) => ({
      url: d.url,
      b64_json: d.b64_json
    }));
  }
}