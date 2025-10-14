import { z } from "zod";

// Speech-to-Text Schema
export const STTResultSchema = z.object({
  transcript: z.string(),
  confidence: z.number().min(0).max(1),
  isFinal: z.boolean(),
  timestamp: z.number(),
});

export type STTResult = z.infer<typeof STTResultSchema>;

// Intent Parsing Schema
export const IntentSchema = z.object({
  action: z.enum([
    "navigate",
    "click",
    "type",
    "scroll",
    "search",
    "extract",
    "observe",
    "wait",
    "screenshot",
    "unknown"
  ]),
  target: z.string().optional(), // CSS selector, URL, or semantic description
  value: z.string().optional(), // Text to type, search query, etc.
  parameters: z.record(z.any()).optional(), // Additional parameters
  confidence: z.number().min(0).max(1),
  requiresConfirmation: z.boolean().default(false),
});

export type Intent = z.infer<typeof IntentSchema>;

// Browser Action Schema
export const BrowserActionSchema = z.object({
  id: z.string(),
  intent: IntentSchema,
  status: z.enum(["pending", "running", "success", "failed"]),
  timestamp: z.number(),
  error: z.string().optional(),
  screenshot: z.string().optional(), // Base64 or URL
  result: z.any().optional(), // Action result data
});

export type BrowserAction = z.infer<typeof BrowserActionSchema>;

// Data Extraction Schema
export const ExtractionSchema = z.object({
  id: z.string(),
  instruction: z.string(),
  schema: z.any(), // Zod schema for validation
  result: z.any().optional(),
  status: z.enum(["pending", "running", "success", "failed"]),
  timestamp: z.number(),
  error: z.string().optional(),
});

export type Extraction = z.infer<typeof ExtractionSchema>;

// Session Context Schema
export const SessionContextSchema = z.object({
  sessionId: z.string(),
  conversationHistory: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
    timestamp: z.number(),
  })),
  currentUrl: z.string().optional(),
  lastAction: BrowserActionSchema.optional(),
  memory: z.record(z.any()).optional(),
});

export type SessionContext = z.infer<typeof SessionContextSchema>;

// API Response Schemas
export const APIResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  timestamp: z.number(),
});

export type APIResponse = z.infer<typeof APIResponseSchema>;

// Retry Policy Schema
export const RetryPolicySchema = z.object({
  maxAttempts: z.number().min(1).max(10),
  backoffStrategy: z.enum(["exponential", "linear", "fixed"]),
  baseDelay: z.number().min(100).max(10000), // milliseconds
});

export type RetryPolicy = z.infer<typeof RetryPolicySchema>;

// Workflow Step Schema
export const WorkflowStepSchema = z.object({
  id: z.string(),
  action: z.enum([
    "navigate",
    "click",
    "type",
    "scroll",
    "search",
    "extract",
    "observe",
    "wait",
    "screenshot",
  ]),
  target: z.string().optional(),
  value: z.string().optional(),
  parameters: z.record(z.any()).optional(),
  confidence: z.number().min(0).max(1).default(1),
  requiresConfirmation: z.boolean().default(false),
  retryPolicy: RetryPolicySchema,
  dependencies: z.array(z.string()).default([]),
  rollbackHandler: z.string().optional(),
});

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

// Workflow Schema
export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  steps: z.array(WorkflowStepSchema),
  createdAt: z.number(),
  sessionId: z.string(),
}).refine(
  (workflow) => {
    // Validate that all dependencies reference existing step IDs
    const stepIds = new Set(workflow.steps.map(step => step.id));
    return workflow.steps.every(step => 
      step.dependencies.every(dep => stepIds.has(dep))
    );
  },
  {
    message: "All step dependencies must reference existing step IDs",
  }
);

export type Workflow = z.infer<typeof WorkflowSchema>;

// Checkpoint Schema
export const CheckpointSchema = z.object({
  stepIndex: z.number(),
  timestamp: z.number(),
  data: z.record(z.any()),
});

export type Checkpoint = z.infer<typeof CheckpointSchema>;

// Workflow State Schema
export const WorkflowStateSchema = z.object({
  workflowId: z.string(),
  currentStepIndex: z.number(),
  status: z.enum(["pending", "running", "completed", "failed", "cancelled"]),
  startedAt: z.number(),
  completedSteps: z.array(z.string()),
  failedSteps: z.array(z.string()),
  retryCounts: z.record(z.number()),
  checkpoints: z.array(CheckpointSchema),
  error: z.string().optional(),
});

export type WorkflowState = z.infer<typeof WorkflowStateSchema>;
