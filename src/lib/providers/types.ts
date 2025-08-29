export type ImageSize =
  | "256x256"
  | "512x512"
  | "1024x1024"
  | "1024x1536"
  | "1536x1024"
  | "1792x1024"
  | "1024x1792";

export interface GenerateImageParams {
  prompt: string;
  model: string;
  size?: ImageSize;
  n?: number;
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
