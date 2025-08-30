export type ImageSize =
  | "256x256"
  | "512x512"
  | "1024x1024"
  | "1024x1536"
  | "1536x1024"
  | "1792x1024"
  | "1024x1792";

export type ImageQuality = "standard" | "hd" | "auto" | "low" | "medium" | "high";

export type ImagenAspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
export type ImagenSampleImageSize = "1K" | "2K";
export type ImagenPersonGeneration = "dont_allow" | "allow_adult" | "allow_all";

export interface GenerateImageParams {
  prompt: string;
  model: string;
  size?: ImageSize;
  quality?: ImageQuality;
  n?: number;
  aspectRatio?: ImagenAspectRatio;
  sampleImageSize?: ImagenSampleImageSize;
  personGeneration?: ImagenPersonGeneration;
  // Future: negativePrompt, seed, steps, guidance, etc.
  images?: { mimeType: string; data: string }[]; // Optional inline images for editing/composition
}

export interface GeneratedImage {
  url?: string; // when provider returns a hosted URL
  b64_json?: string; // when provider returns base64
}

export interface ImageProvider {
  name: string;
  generate(params: GenerateImageParams): Promise<GeneratedImage[]>;
}
