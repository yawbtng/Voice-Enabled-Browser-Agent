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
