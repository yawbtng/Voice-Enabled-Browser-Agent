import { NextRequest, NextResponse } from "next/server";
import { WorkflowEngine } from "@/app/(agent)/workflow";
import { WorkflowSchema, type Workflow } from "@/lib/schema";
import { mem0Client } from "@/lib/mem0";
import { aiClient } from "@/lib/ai";

// Store active workflow engines by session ID
const activeWorkflowEngines = new Map<string, WorkflowEngine>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript, sessionId } = body;

    if (!transcript || !sessionId) {
      return NextResponse.json(
        { success: false, error: "Transcript and sessionId are required" },
        { status: 400 }
      );
    }

    // Get session context
    let sessionContext;
    try {
      sessionContext = await mem0Client.getSessionContext(sessionId);
    } catch (error) {
      console.warn("Failed to get session context:", error);
    }

    // First check if this is a multi-step command
    const isMultiStep = await aiClient.isMultiStepCommand(transcript);
    
    if (isMultiStep) {
      // Parse as workflow
      const workflow = await aiClient.parseWorkflow(transcript, sessionId, sessionContext);
      
      if (!workflow) {
        return NextResponse.json(
          { success: false, error: "Failed to parse workflow from command" },
          { status: 400 }
        );
      }

      // Validate workflow
      const validatedWorkflow = WorkflowSchema.parse(workflow);

      // Get or create workflow engine for this session
      let engine = activeWorkflowEngines.get(sessionId);
      if (!engine) {
        engine = new WorkflowEngine(sessionId);
        await engine.init();
        activeWorkflowEngines.set(sessionId, engine);
      }

      // Execute workflow
      const workflowState = await engine.executeWorkflow(validatedWorkflow);

      // Store conversation in memory
      try {
        await mem0Client.addConversationMemory(sessionId, "user", transcript);
        await mem0Client.addConversationMemory(
          sessionId,
          "assistant",
          `Executed workflow: ${workflow.name} - Status: ${workflowState.status}`
        );
      } catch (error) {
        console.warn("Failed to store conversation in memory:", error);
      }

      return NextResponse.json({
        success: true,
        data: {
          type: "workflow",
          workflow: validatedWorkflow,
          state: workflowState,
        },
        timestamp: Date.now(),
      });
    } else {
      // Fall back to single-step intent parsing
      const intent = await aiClient.parseIntent(transcript, sessionContext);
      
      return NextResponse.json({
        success: true,
        data: {
          type: "intent",
          intent,
        },
        timestamp: Date.now(),
      });
    }
  } catch (error) {
    console.error("Workflow API error:", error);
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "SessionId is required" },
        { status: 400 }
      );
    }

    const engine = activeWorkflowEngines.get(sessionId);
    if (!engine) {
      return NextResponse.json(
        { success: false, error: "No active workflow for this session" },
        { status: 404 }
      );
    }

    const state = engine.getState();
    return NextResponse.json({
      success: true,
      data: state,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Get workflow state error:", error);
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
    const { sessionId, action, stepId, stepIndex } = body;

    if (!sessionId || !action) {
      return NextResponse.json(
        { success: false, error: "SessionId and action are required" },
        { status: 400 }
      );
    }

    const engine = activeWorkflowEngines.get(sessionId);
    if (!engine) {
      return NextResponse.json(
        { success: false, error: "No active workflow for this session" },
        { status: 404 }
      );
    }

    let result;
    switch (action) {
      case "retry":
        if (!stepId) {
          return NextResponse.json(
            { success: false, error: "StepId is required for retry action" },
            { status: 400 }
          );
        }
        await engine.retryStep(stepId);
        result = { action: "retry", stepId, success: true };
        break;

      case "rollback":
        if (stepIndex === undefined) {
          return NextResponse.json(
            { success: false, error: "StepIndex is required for rollback action" },
            { status: 400 }
          );
        }
        await engine.rollbackToStep(stepIndex);
        result = { action: "rollback", stepIndex, success: true };
        break;

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action. Use 'retry' or 'rollback'" },
          { status: 400 }
        );
    }

    const state = engine.getState();
    return NextResponse.json({
      success: true,
      data: {
        result,
        state,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Workflow action error:", error);
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

    // Close the workflow engine for this session
    const engine = activeWorkflowEngines.get(sessionId);
    if (engine) {
      await engine.close();
      activeWorkflowEngines.delete(sessionId);
    }

    return NextResponse.json({
      success: true,
      data: { workflowClosed: true },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Workflow cleanup error:", error);
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
