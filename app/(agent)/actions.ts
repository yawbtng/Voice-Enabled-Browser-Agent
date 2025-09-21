import { NextRequest, NextResponse } from "next/server";
import { BrowserExecutor } from "./executor";
import { IntentSchema, type Intent } from "@/lib/schema";
import { mem0Client } from "@/lib/mem0";
import { aiClient } from "@/lib/ai";

// Store active executors by session ID
const activeExecutors = new Map<string, BrowserExecutor>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { intent, sessionId } = body;

    if (!intent || !sessionId) {
      return NextResponse.json(
        { success: false, error: "Intent and sessionId are required" },
        { status: 400 }
      );
    }

    // Validate the intent
    const validatedIntent = IntentSchema.parse(intent);

    // Check if confirmation is required
    if (validatedIntent.requiresConfirmation) {
      const confirmationPrompt = await aiClient.generateConfirmationPrompt(validatedIntent);
      
      return NextResponse.json({
        success: true,
        data: {
          requiresConfirmation: true,
          confirmationPrompt,
          intent: validatedIntent,
        },
        timestamp: Date.now(),
      });
    }

    // Get or create executor for this session
    let executor = activeExecutors.get(sessionId);
    if (!executor) {
      executor = new BrowserExecutor(sessionId);
      await executor.init();
      activeExecutors.set(sessionId, executor);
    }

    // Execute the action
    const result = await executor.executeAction(validatedIntent);

    // Generate action summary
    const summary = await aiClient.generateActionSummary(validatedIntent, result.result);

    return NextResponse.json({
      success: true,
      data: {
        action: result,
        summary,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Action execution error:", error);
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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { intent, sessionId, confirmed } = body;

    if (!intent || !sessionId || confirmed === undefined) {
      return NextResponse.json(
        { success: false, error: "Intent, sessionId, and confirmed status are required" },
        { status: 400 }
      );
    }

    if (!confirmed) {
      return NextResponse.json({
        success: true,
        data: { cancelled: true },
        timestamp: Date.now(),
      });
    }

    // Validate the intent
    const validatedIntent = IntentSchema.parse(intent);

    // Get or create executor for this session
    let executor = activeExecutors.get(sessionId);
    if (!executor) {
      executor = new BrowserExecutor(sessionId);
      await executor.init();
      activeExecutors.set(sessionId, executor);
    }

    // Execute the confirmed action
    const result = await executor.executeAction(validatedIntent);

    // Generate action summary
    const summary = await aiClient.generateActionSummary(validatedIntent, result.result);

    return NextResponse.json({
      success: true,
      data: {
        action: result,
        summary,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Confirmed action execution error:", error);
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "SessionId is required" },
        { status: 400 }
      );
    }

    // Close the executor for this session
    const executor = activeExecutors.get(sessionId);
    if (executor) {
      await executor.close();
      activeExecutors.delete(sessionId);
    }

    return NextResponse.json({
      success: true,
      data: { sessionClosed: true },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Session cleanup error:", error);
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
    message: "Browser actions API endpoint is running",
    activeSessions: Array.from(activeExecutors.keys()),
    timestamp: Date.now(),
  });
}
