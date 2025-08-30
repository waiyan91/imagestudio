import { NextRequest, NextResponse } from "next/server";
import { getImageProvider } from "@/lib/providers";
import type {
  ImageSize,
  ImageQuality,
  ImagenAspectRatio,
  ImagenSampleImageSize,
  ImagenPersonGeneration,
} from "@/lib/providers/types";

const ALLOWED_SIZES = [
  "256x256",
  "512x512",
  "1024x1024",
  "1024x1536",
  "1536x1024",
  "1024x1792",
  "1792x1024",
] as const satisfies Readonly<ImageSize[]>;

const ALLOWED_QUALITIES = ["standard", "hd"] as const satisfies Readonly<ImageQuality[]>;
const ALLOWED_ASPECT_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9"] as const satisfies Readonly<
  ImagenAspectRatio[]
>;
const ALLOWED_SAMPLE_IMAGE_SIZES = ["1K", "2K"] as const satisfies Readonly<ImagenSampleImageSize[]>;
const ALLOWED_PERSON_GENERATION = ["dont_allow", "allow_adult", "allow_all"] as const satisfies Readonly<
  ImagenPersonGeneration[]
>;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt: string = body?.prompt;
    const model: string = body?.model;
    const nInput: unknown = body?.n;
    const sizeInput: unknown = body?.size;
    const qualityInput: unknown = body?.quality;
    const aspectRatioInput: unknown = body?.aspectRatio;
    const sampleImageSizeInput: unknown = body?.sampleImageSize;
    const personGenerationInput: unknown = body?.personGeneration;
    const imagesInput: unknown = body?.images;

    const size: ImageSize | undefined =
      typeof sizeInput === "string" && (ALLOWED_SIZES as readonly string[]).includes(sizeInput)
        ? (sizeInput as ImageSize)
        : undefined;

    const quality: ImageQuality | undefined =
      typeof qualityInput === "string" && (ALLOWED_QUALITIES as readonly string[]).includes(qualityInput)
        ? (qualityInput as ImageQuality)
        : undefined;

    const aspectRatio: ImagenAspectRatio | undefined =
      typeof aspectRatioInput === "string" &&
      (ALLOWED_ASPECT_RATIOS as readonly string[]).includes(aspectRatioInput)
        ? (aspectRatioInput as ImagenAspectRatio)
        : undefined;

    const sampleImageSize: ImagenSampleImageSize | undefined =
      typeof sampleImageSizeInput === "string" &&
      (ALLOWED_SAMPLE_IMAGE_SIZES as readonly string[]).includes(sampleImageSizeInput)
        ? (sampleImageSizeInput as ImagenSampleImageSize)
        : undefined;

    const personGeneration: ImagenPersonGeneration | undefined =
      typeof personGenerationInput === "string" &&
      (ALLOWED_PERSON_GENERATION as readonly string[]).includes(personGenerationInput)
        ? (personGenerationInput as ImagenPersonGeneration)
        : undefined;

    const n: number | undefined =
      typeof nInput === "number" && Number.isFinite(nInput)
        ? Math.min(4, Math.max(1, Math.trunc(nInput)))
        : undefined;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    if (!model || typeof model !== "string" || !model.includes("/")) {
      return NextResponse.json({ error: "Invalid model ID" }, { status: 400 });
    }

    const [providerName, modelId] = model.split("/") as [string, string];
    const provider = getImageProvider(providerName as "openai" | "google");

    const images = Array.isArray(imagesInput)
      ? imagesInput
          .map((it: unknown) => {
            const rec = it as { mimeType?: unknown; data?: unknown };
            const mimeType = typeof rec?.mimeType === "string" ? rec.mimeType : undefined;
            const data = typeof rec?.data === "string" ? rec.data : undefined;
            if (mimeType && data) return { mimeType, data } as { mimeType: string; data: string };
            return undefined;
          })
          .filter((v): v is { mimeType: string; data: string } => Boolean(v))
      : undefined;
    const result = await provider.generate({
      prompt,
      n,
      size,
      quality,
      aspectRatio,
      sampleImageSize,
      personGeneration,
      images,
      model: modelId,
    });

    return NextResponse.json({ images: result, provider: provider.name });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("/api/generate error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
