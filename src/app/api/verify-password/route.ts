import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const password: string = body?.password;

    if (!password || typeof password !== "string") {
      return NextResponse.json({ success: false, error: "Password required" }, { status: 400 });
    }

    if (password === env.GLOBAL_PASSWORD) {
      // Password is correct, set the authentication cookie
      const response = NextResponse.json({ success: true });

      // Set the authentication cookie with the correct password
      response.cookies.set("site_auth", env.GLOBAL_PASSWORD, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: "lax"
      });

      return response;
    } else {
      return NextResponse.json({ success: false, error: "Incorrect password" }, { status: 401 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("/api/verify-password error", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}