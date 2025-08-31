import { NextRequest, NextResponse } from "next/server";
import { getImageProvider } from "@/lib/providers";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const model = formData.get("model") as string;
    const nInput = formData.get("n");
    const sizeInput = formData.get("size");
    const responseFormatInput = formData.get("response_format");
    const imageFile = formData.get("image") as File;

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

    const size: string | undefined =
      typeof sizeInput === "string" ? sizeInput : undefined;

    const response_format: string | undefined =
      typeof responseFormatInput === "string" ? responseFormatInput : undefined;

    const n: number | undefined =
      typeof nInput === "string" && !isNaN(Number(nInput))
        ? Math.min(10, Math.max(1, Math.trunc(Number(nInput))))
        : undefined;

    // Default to dall-e-2 for variations (only supported model)
    const [providerName, modelId] = model && model.includes("/")
      ? model.split("/") as [string, string]
      : ["openai", "dall-e-2"];

    const provider = getImageProvider(providerName);

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
      size: size as any,
      response_format: response_format as any,
    });

    return NextResponse.json({ images: result, provider: provider.name });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("/api/variations error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}