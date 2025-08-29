import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";
import type { GenerateImageParams, GeneratedImage, ImageProvider } from "./types";

// Default model from docs: gemini-2.5-flash-image-preview (aka Nano Banana)
const DEFAULT_MODEL = "gemini-2.5-flash-image-preview";

export class GoogleImageProvider implements ImageProvider {
  name = "google";
  private client: GoogleGenAI;

  constructor() {
    if (!env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not set");
    }
    this.client = new GoogleGenAI({ apiKey: env.GOOGLE_API_KEY });
  }

  async generate(params: GenerateImageParams): Promise<GeneratedImage[]> {
      const prompt = params.prompt;
      const model = DEFAULT_MODEL;
      const target = Math.max(1, Math.min(4, params.n ?? 1));
      const images = params.images ?? [];
      // Remove custom sizing: Gemini always generates default square images, ignore params.size
      // Build contents: if images provided, interleave images first then text per docs best-practice
      // Build contents in the structure expected by the SDK
      const contents = images.length
        ? ([
          ...images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
          { text: prompt },
        ] as Array<{ inlineData: { mimeType: string; data: string } } | { text: string }>)
      : (prompt as string);

    // Helper to call the API once and extract any inline image data
    const callOnce = async (): Promise<GeneratedImage[]> => {
      // The SDK's type definitions are broad; our union matches runtime expectations
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const response = await this.client.models.generateContent({
        model,
        contents: contents as unknown as Parameters<typeof this.client.models.generateContent>[0]["contents"],
      });

      // The SDK returns candidates[].content.parts[] with interleaved text and inlineData (base64)
      type InlineDataPart = { inlineData?: { data?: string } };
      type TextPart = { text?: string };
      type InlinePart = InlineDataPart | TextPart;
      const isInlineDataPart = (p: InlinePart): p is InlineDataPart =>
        typeof (p as InlineDataPart).inlineData !== "undefined";
      type Candidate = { content?: { parts?: InlinePart[] } };
  const maybeCandidates = (response as unknown as { candidates?: Candidate[] }).candidates;
  const candidates: Candidate[] = Array.isArray(maybeCandidates) ? maybeCandidates : [];

  const out: GeneratedImage[] = [];
      for (const cand of candidates) {
        const parts: InlinePart[] = cand?.content?.parts || [];
        for (const part of parts) {
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

    // First attempt
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

    // Return up to requested count (may be fewer if provider didn't return enough)
    return collected.slice(0, target);
  }
}
