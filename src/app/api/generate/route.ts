import { NextRequest, NextResponse } from "next/server";
import { getImageProvider } from "@/lib/providers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt: string = body?.prompt;
    const model: string = body?.model;
    const n: number = body?.n;
    const size: string = body?.size;
    const quality: string = body?.quality;
    const aspectRatio: string = body?.aspectRatio;
    const sampleImageSize: string = body?.sampleImageSize;
    const personGeneration: string = body?.personGeneration;
    const images: { mimeType: string; data: string }[] = body?.images;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    if (!model || typeof model !== "string" || !model.includes("/")) {
      return NextResponse.json({ error: "Invalid model ID" }, { status: 400 });
    }

    const [providerName, modelId] = model.split("/") as [string, string];
    const provider = getImageProvider(providerName);

    const result = await provider.generate({
      prompt,
      n,
      size: size as any,
      quality: quality as any,
      aspectRatio: aspectRatio as any,
      sampleImageSize: sampleImageSize as any,
      personGeneration: personGeneration as any,
      model: modelId,
      response_format: "b64_json",
      images,
    });

    return NextResponse.json({ images: result, provider: provider.name });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("/api/generate error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}