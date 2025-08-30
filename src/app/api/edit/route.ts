import { NextRequest, NextResponse } from "next/server";
import { getImageProvider } from "@/lib/providers";
import type { ImageSize, ResponseFormat } from "@/lib/providers/types";

const ALLOWED_SIZES = [
  "256x256",
  "512x512", 
  "1024x1024",
  "1024x1536",
  "1536x1024",
  "1024x1792",
  "1792x1024",
] as const satisfies Readonly<ImageSize[]>;

const ALLOWED_RESPONSE_FORMATS = ["url", "b64_json"] as const satisfies Readonly<ResponseFormat[]>;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    const prompt = formData.get("prompt") as string;
    const model = formData.get("model") as string;
    const nInput = formData.get("n");
    const sizeInput = formData.get("size");
    const responseFormatInput = formData.get("response_format");
    const user = formData.get("user") as string;
    const openaiApiKey = formData.get("openaiApiKey") as string;

    // Handle multiple image files
    const imageFiles: File[] = [];
    const imageEntries = Array.from(formData.entries()).filter(([key]) => key.startsWith("image"));
    
    for (const [, value] of imageEntries) {
      if (value instanceof File) {
        imageFiles.push(value);
      }
    }

    if (imageFiles.length === 0) {
      return NextResponse.json({ error: "At least one image file is required" }, { status: 400 });
    }

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    if (!model || typeof model !== "string" || !model.includes("/")) {
      return NextResponse.json({ error: "Invalid model ID" }, { status: 400 });
    }

    const size: ImageSize | undefined =
      typeof sizeInput === "string" && (ALLOWED_SIZES as readonly string[]).includes(sizeInput)
        ? (sizeInput as ImageSize)
        : undefined;

    const response_format: ResponseFormat | undefined =
      typeof responseFormatInput === "string" && (ALLOWED_RESPONSE_FORMATS as readonly string[]).includes(responseFormatInput)
        ? (responseFormatInput as ResponseFormat)
        : undefined;

    const n: number | undefined =
      typeof nInput === "string" && !isNaN(Number(nInput))
        ? Math.min(10, Math.max(1, Math.trunc(Number(nInput))))
        : undefined;

    const [providerName, modelId] = model.split("/") as [string, string];
    const provider = getImageProvider(providerName as "openai" | "google", openaiApiKey);

    if (!provider.edit) {
      return NextResponse.json({ error: "Image editing not supported by this provider" }, { status: 400 });
    }

    // Convert files to base64
    const images = await Promise.all(
      imageFiles.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        return {
          mimeType: file.type,
          data: base64
        };
      })
    );

    const result = await provider.edit({
      image: images.length === 1 ? images[0] : images,
      prompt,
      model: modelId,
      n,
      size,
      // Note: response_format not supported for gpt-image-1 (always returns base64)
      response_format: modelId === "gpt-image-1" ? undefined : response_format,
      user: user || undefined,
    });

    return NextResponse.json({ images: result, provider: provider.name });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("/api/edit error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}