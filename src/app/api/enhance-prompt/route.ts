import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";

const client = new GoogleGenAI({ apiKey: env.GOOGLE_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt: string = body?.prompt;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const enhancedPrompt = `Rewrite the following prompt to be a single, highly descriptive prompt for image generation. Do not provide options or suggestions, just return the enhanced prompt only: ${prompt}`;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: [{ parts: [{ text: enhancedPrompt }] }]
    });

    if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
      return NextResponse.json({ enhancedPrompt: response.candidates[0].content.parts[0].text });
    } else {
      return NextResponse.json({ error: "Failed to enhance prompt" }, { status: 500 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("/api/enhance-prompt error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}