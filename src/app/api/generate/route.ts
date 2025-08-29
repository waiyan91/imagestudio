import { NextRequest, NextResponse } from "next/server";
import { getImageProvider } from "@/lib/providers";
import type { ImageSize } from "@/lib/providers/types";

const ALLOWED_SIZES = [
  "256x256",
  "512x512",
  "1024x1024",
  "1024x1536",
  "1536x1024",
  "1024x1792",
  "1792x1024",
] as const satisfies Readonly<ImageSize[]>;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt: string = body?.prompt;
    const model: string = body?.model;
    const nInput: unknown = body?.n;
    const imagesInput: unknown = body?.images;

    // Remove custom sizing: Gemini always generates default square images, do not set size
    const size: ImageSize | undefined = undefined;

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
    const result = await provider.generate({ prompt, n, images, model: modelId });

    return NextResponse.json({ images: result, provider: provider.name });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("/api/generate error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
