export type ImageSize =
  | "256x256"
  | "512x512"
  | "1024x1024"
  | "1024x1536"
  | "1536x1024"
  | "1024x1792"
  | "1792x1024";

export type ImageQuality = "standard" | "hd" | "auto" | "low" | "medium" | "high";

export interface GenerateImageParams {
  prompt: string;
  model: string;
  size?: string;
  quality?: string;
  n?: number;
  response_format?: "url" | "b64_json";
  user?: string;
  stream?: boolean;
  partial_images?: number;
  images?: { mimeType: string; data: string }[];
  aspectRatio?: string;
  sampleImageSize?: string;
  personGeneration?: string;
}

export interface EditImageParams {
  image: { mimeType: string; data: string }[] | { mimeType: string; data: string };
  prompt: string;
  model: string;
  n?: number;
  size?: string;
  response_format?: "url" | "b64_json";
  user?: string;
}

export interface VariationImageParams {
  image: { mimeType: string; data: string };
  model?: string;
  n?: number;
  response_format?: "url" | "b64_json";
  size?: string;
  user?: string;
}

export interface GeneratedImage {
  url?: string;
  b64_json?: string;
}

// OpenAI API calls
export class OpenAIClient {
  constructor(private apiKey: string) {}

  async generateImages(params: GenerateImageParams): Promise<GeneratedImage[]> {
    const { prompt, model, n, size, quality, response_format, user, images } = params;

    const payload: any = {
      model: model || "dall-e-3",
      prompt,
      n: n || 1,
      size: size || "1024x1024",
      response_format: response_format || "b64_json"
    };

    if (quality) payload.quality = quality;
    if (user) payload.user = user;
    if (images && images.length > 0) {
      payload.images = images;
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const result = await response.json();
    return (result.data || []).map((d: any) => ({
      url: d.url,
      b64_json: d.b64_json
    }));
  }

  async editImage(params: EditImageParams): Promise<GeneratedImage[]> {
    const { image, prompt, model, n, size } = params;

    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("model", model || "gpt-image-1");
    formData.append("n", String(n || 1));
    if (size) formData.append("size", size);

    // Handle single or multiple images
    const images = Array.isArray(image) ? image : [image];
    images.forEach((img, index) => {
      const imageBlob = this.base64ToBlob(img.data, img.mimeType || "image/png");
      formData.append(`image${index > 0 ? `_${index}` : ""}`, imageBlob, `image_${index}.png`);
    });

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const result = await response.json();
    return (result.data || []).map((d: any) => ({
      url: d.url,
      b64_json: d.b64_json
    }));
  }

  async createVariation(params: VariationImageParams): Promise<GeneratedImage[]> {
    const { image, model, n, response_format, size } = params;

    const formData = new FormData();
    formData.append("image", this.base64ToBlob(image.data, image.mimeType || "image/png"), "image.png");
    formData.append("model", model || "dall-e-2");
    formData.append("n", String(n || 1));
    if (response_format) formData.append("response_format", response_format);
    if (size) formData.append("size", size);

    const response = await fetch("https://api.openai.com/v1/images/variations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const result = await response.json();
    return (result.data || []).map((d: any) => ({
      url: d.url,
      b64_json: d.b64_json
    }));
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteString = atob(base64.includes(',') ? base64.split(',')[1] : base64);
    const arrayBuffer = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      arrayBuffer[i] = byteString.charCodeAt(i);
    }
    return new Blob([arrayBuffer], { type: mimeType });
  }
}

// Google API calls
export class GoogleClient {
  constructor(private apiKey: string) {}

  async generateImages(params: GenerateImageParams): Promise<GeneratedImage[]> {
    const { prompt, model, n, aspectRatio, sampleImageSize, personGeneration, images } = params;

    if (model.startsWith("gemini")) {
      return this.generateWithGemini(prompt, model, n, images);
    } else if (model.startsWith("imagen-4.0")) {
      return this.generateWithImagen(prompt, model, n, aspectRatio, sampleImageSize, personGeneration);
    } else {
      throw new Error(`Unknown Google model: ${model}`);
    }
  }

  private async generateWithGemini(
    prompt: string,
    model: string,
    n?: number,
    imageInputs?: { mimeType: string; data: string }[]
  ): Promise<GeneratedImage[]> {
    const parts: any[] = imageInputs ? imageInputs.map(img => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.data
      }
    })) : [];

    parts.push({ text: prompt });

    const payload = {
      contents: [{
        parts: parts
      }]
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google API error: ${response.status} ${error}`);
    }

    const result = await response.json();
    const generatedImages: GeneratedImage[] = [];

    if (result.candidates?.[0]?.content?.parts) {
      for (const part of result.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          generatedImages.push({ b64_json: part.inlineData.data });
        }
      }
    }

    return generatedImages.slice(0, n || 1);
  }

  private async generateWithImagen(
    prompt: string,
    model: string,
    n?: number,
    aspectRatio?: string,
    sampleImageSize?: string,
    personGeneration?: string
  ): Promise<GeneratedImage[]> {
    const payload = {
      prompt,
      numberOfImages: n || 1
    };

    if (aspectRatio) (payload as any).aspectRatio = aspectRatio;
    if (sampleImageSize) (payload as any).sampleImageSize = sampleImageSize;
    if (personGeneration) (payload as any).personGeneration = personGeneration;

    const response = await fetch(
      `https://us-central1-aiplatform.googleapis.com/v1/projects/demo-project/locations/us-central1/publishers/google/models/${model}:predict`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ instances: [payload] })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Imagen API error: ${response.status} ${error}`);
    }

    const result = await response.json();
    return (result.predictions || []).map((pred: any) => ({
      b64_json: pred.bytesBase64Encoded
    }));
  }
}

// Main client factory
export function createImageClient(provider: "openai" | "google", apiKey: string) {
  switch (provider) {
    case "openai":
      return new OpenAIClient(apiKey);
    case "google":
      return new GoogleClient(apiKey);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export type ImageClient = OpenAIClient | GoogleClient;