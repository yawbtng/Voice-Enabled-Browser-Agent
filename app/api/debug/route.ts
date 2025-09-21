import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      data: {
        ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY ? "SET" : "NOT SET",
        DEEPGRAM_API_KEY: env.DEEPGRAM_API_KEY ? "SET" : "NOT SET",
        BROWSERBASE_API_KEY: env.BROWSERBASE_API_KEY ? "SET" : "NOT SET",
        MEM0_API_KEY: env.MEM0_API_KEY ? "SET" : "NOT SET",
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: Date.now(),
    });
  }
}
