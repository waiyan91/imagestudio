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

  constructor(apiKey?: string) {
    const key = apiKey || env.OPENAI_API_KEY;
    if (!key) {
      throw new Error("OpenAI API key is not set");
    }
    this.client = new OpenAI({ apiKey: key });
  }

  async generate(params: GenerateImageParams): Promise<GeneratedImage[]> {
    const {
      prompt,
      model: modelId,
      n,
      size,
      quality,
      response_format,
      user,
      stream,
    } = params;

    const model = modelId || "dall-e-3";
    const count = n ?? 1;

    // DALL-E 3 only supports n=1
    if (model === "dall-e-3" && count > 1) {
      throw new Error("DALL-E 3 only supports generating 1 image at a time.");
    }

    // Determine appropriate default quality based on model
    let defaultQuality: "standard" | "hd" | "auto" | "low" | "medium" | "high";
    if (model === "gpt-image-1") {
      defaultQuality = "low"; // gpt-image-1 supports: low, medium, high, auto
    } else if (model === "dall-e-3") {
      defaultQuality = "standard"; // dall-e-3 supports: standard, hd
    } else {
      defaultQuality = "standard"; // dall-e-2 supports: standard
    }

    // Validate quality for gpt-image-1
    let finalQuality = quality ?? defaultQuality;
    if (model === "gpt-image-1" && finalQuality === "standard") {
      finalQuality = "auto"; // Convert invalid "standard" to "auto" for gpt-image-1
    }
    if (model === "gpt-image-1" && finalQuality === "hd") {
      finalQuality = "high"; // Convert invalid "hd" to "high" for gpt-image-1
    }

    // Handle streaming for gpt-image-1
    if (stream && model === "gpt-image-1") {
      return this.generateWithStreaming(params);
    }

    const generateParams: any = {
      model: model,
      prompt: prompt,
      size: size ?? "1024x1024",
      quality: finalQuality,
      n: count,
    };

    // Add optional parameters
    if (response_format) {
      generateParams.response_format = response_format;
    }
    if (user) {
      generateParams.user = user;
    }

    const res = await this.client.images.generate(generateParams);

    return (res.data || []).map((d) => ({ url: d.url || undefined, b64_json: d.b64_json || undefined }));
  }

  private async generateWithStreaming(params: GenerateImageParams): Promise<GeneratedImage[]> {
    const { prompt, model, size, quality } = params;

    // For now, fall back to regular generation
    // TODO: Implement proper streaming when OpenAI Node.js client supports it
    const streamParams: any = {
      model: model || "gpt-image-1",
      prompt: prompt,
      size: size ?? "1024x1024",
      quality: quality ?? "low",
      n: 1,
    };

    const res = await this.client.images.generate(streamParams);
    return (res.data || []).map((d) => ({ url: d.url || undefined, b64_json: d.b64_json || undefined }));
  }

  async edit(params: EditImageParams): Promise<GeneratedImage[]> {
    const { image, prompt, model: modelId, n, size, user } = params;

    const model = modelId || "gpt-image-1";
    const count = n ?? 1;

    // Only GPT Image 1 supports editing
    if (model !== "gpt-image-1") {
      throw new Error(`Image editing is only supported with GPT Image 1 model. Current model: ${model}`);
    }

    // Convert image data to the format expected by OpenAI using toFile
    const imageFiles = Array.isArray(image) ? image : [image];
    const imageBuffers = await Promise.all(
      imageFiles.map(async (img) => {
        // Convert base64 to buffer
        const base64Data = img.data.includes(',') ? img.data.split(',')[1] : img.data;
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Use toFile helper to create proper file objects
        return await toFile(buffer, 'image.png', {
          type: img.mimeType || 'image/png',
        });
      })
    );

    const editParams: any = {
      model: "gpt-image-1",
      prompt: prompt,
      image: imageBuffers.length === 1 ? imageBuffers[0] : imageBuffers,
      n: count,
    };

    // Only add parameters supported by GPT Image 1
    if (size) editParams.size = size;
    if (user) editParams.user = user;
    
    // Note: response_format is NOT supported for gpt-image-1 (always returns base64)
    // Note: quality parameter is also not supported in edit API for gpt-image-1

    const res = await this.client.images.edit(editParams);

    return (res.data || []).map((d) => ({ url: d.url || undefined, b64_json: d.b64_json || undefined }));
  }


  async createVariation(params: VariationImageParams): Promise<GeneratedImage[]> {
    const { image, model: modelId, n, response_format, size, user } = params;

    const model = modelId || "dall-e-2";
    const count = n ?? 1;

    // Only DALL-E 2 supports variations
    if (model !== "dall-e-2") {
      throw new Error("Image variations are only supported with DALL-E 2 model.");
    }

    // Validate count for DALL-E 2
    if (count < 1 || count > 10) {
      throw new Error("Number of variations must be between 1 and 10 for DALL-E 2.");
    }

    // Convert base64 to buffer
    const base64Data = image.data.includes(',') ? image.data.split(',')[1] : image.data;
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const variationParams: any = {
      image: await toFile(imageBuffer, 'image.png', { type: image.mimeType || 'image/png' }),
      model: model,
      n: count,
    };

    if (size) variationParams.size = size;
    if (response_format) variationParams.response_format = response_format;
    if (user) variationParams.user = user;

    const res = await this.client.images.createVariation(variationParams);

    return (res.data || []).map((d) => ({ url: d.url || undefined, b64_json: d.b64_json || undefined }));
  }
}
