import { NextRequest, NextResponse } from "next/server";
import { getImageProvider } from "@/lib/providers";
import type { ImageSize, ResponseFormat } from "@/lib/providers/types";

const ALLOWED_SIZES = [
  "256x256",
  "512x512", 
  "1024x1024",
] as const satisfies Readonly<ImageSize[]>;

const ALLOWED_RESPONSE_FORMATS = ["url", "b64_json"] as const satisfies Readonly<ResponseFormat[]>;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    const model = formData.get("model") as string;
    const nInput = formData.get("n");
    const sizeInput = formData.get("size");
    const responseFormatInput = formData.get("response_format");
    const user = formData.get("user") as string;
    const imageFile = formData.get("image") as File;
    const openaiApiKey = formData.get("openaiApiKey") as string;

    if (!imageFile || !(imageFile instanceof File)) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    // Validate image file
    if (!imageFile.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    if (imageFile.size > 4 * 1024 * 1024) { // 4MB limit
      return NextResponse.json({ error: "Image file must be less than 4MB" }, { status: 400 });
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

    // Default to dall-e-2 for variations (only supported model)
    const [providerName, modelId] = model && model.includes("/") 
      ? model.split("/") as [string, string]
      : ["openai", "dall-e-2"];

    const provider = getImageProvider(providerName as "openai" | "google", openaiApiKey);

    if (!provider.createVariation) {
      return NextResponse.json({ error: "Image variations not supported by this provider" }, { status: 400 });
    }

    // Convert file to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const image = {
      mimeType: imageFile.type,
      data: base64
    };

    const result = await provider.createVariation({
      image,
      model: modelId,
      n,
      size,
      response_format,
      user: user || undefined,
    });

    return NextResponse.json({ images: result, provider: provider.name });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("/api/variations error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}