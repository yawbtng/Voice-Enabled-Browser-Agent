import { NextRequest, NextResponse } from "next/server";
import { aiClient } from "@/lib/ai";
import { IntentSchema } from "@/lib/schema";
import { mem0Client } from "@/lib/mem0";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript, sessionId } = body;

    if (!transcript) {
      return NextResponse.json(
        { success: false, error: "No transcript provided" },
        { status: 400 }
      );
    }

    // Get session context if sessionId is provided
    let sessionContext;
    if (sessionId) {
      try {
        sessionContext = await mem0Client.getSessionContext(sessionId);
      } catch (error) {
        console.warn("Failed to get session context:", error);
      }
    }

    // Parse the intent
    const intent = await aiClient.parseIntent(transcript, sessionContext);

    // Validate the intent
    const validatedIntent = IntentSchema.parse(intent);

    // Store the conversation in memory
    if (sessionId) {
      try {
        await mem0Client.addConversationMemory(sessionId, "user", transcript);
        await mem0Client.addConversationMemory(
          sessionId,
          "assistant",
          `Parsed intent: ${JSON.stringify(validatedIntent)}`
        );
      } catch (error) {
        console.warn("Failed to store conversation in memory:", error);
      }
    }

    return NextResponse.json({
      success: true,
      data: validatedIntent,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Intent parsing API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Intent parsing API endpoint is running",
    timestamp: Date.now(),
  });
}
