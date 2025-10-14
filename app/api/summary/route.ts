import { NextRequest, NextResponse } from "next/server";
import { aiClient } from "@/lib/ai";
import { WorkflowLogEntrySchema, type WorkflowLogEntry } from "@/lib/workflow-log";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request body
    const { logs, result, transcript } = body;
    
    if (!Array.isArray(logs)) {
      return NextResponse.json({
        success: false,
        error: "Invalid logs format. Expected array.",
      }, { status: 400 });
    }

    // Validate each log entry
    const validatedLogs: WorkflowLogEntry[] = [];
    for (const log of logs) {
      try {
        validatedLogs.push(WorkflowLogEntrySchema.parse(log));
      } catch (error) {
        console.warn("Invalid log entry:", log, error);
        // Skip invalid entries
      }
    }

    // Generate the workflow summary
    const summary = await aiClient.generateWorkflowSummary(
      validatedLogs,
      result,
      transcript
    );

    return NextResponse.json({
      success: true,
      data: summary,
    });

  } catch (error) {
    console.error("Failed to generate workflow summary:", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }, { status: 500 });
  }
}
