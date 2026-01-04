import { z } from 'zod';

export type WorkflowLogType = 
  | 'stt'           // Speech-to-Text
  | 'intent'        // Intent Parsing
  | 'action'        // Action Generation
  | 'execution'     // Browser Execution
  | 'error'         // Error
  | 'info'          // General Info
  | 'debug';        // Debug Info

export type WorkflowLogLevel = 
  | 'debug'         // Debug information
  | 'info'          // General information
  | 'success'       // Successful operation
  | 'warning'       // Warning
  | 'error';        // Error

export interface WorkflowLogEntry {
  id: string;
  timestamp: number;
  type: WorkflowLogType;
  level: WorkflowLogLevel;
  message: string;
  metadata?: Record<string, any>;
  duration?: number; // Duration in milliseconds
}

// Zod schema for WorkflowLogEntry validation
export const WorkflowLogEntrySchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  type: z.enum(['stt', 'intent', 'action', 'execution', 'error', 'info', 'debug']),
  level: z.enum(['debug', 'info', 'success', 'warning', 'error']),
  message: z.string(),
  metadata: z.record(z.any()).optional(),
  duration: z.number().optional(),
});

export type WorkflowSummaryStatus = 
  | 'success'       // Command completed successfully
  | 'partial'       // Command partially completed
  | 'failed'        // Command failed
  | 'pending';      // Still processing

export interface WorkflowSummary {
  id: string;
  status: WorkflowSummaryStatus;
  title: string;
  summary: string;
  keyPoints: string[];
  errorAnalysis?: string;
  recommendations: string[];
  metrics: {
    duration: number;
    stepsCompleted: number;
    totalSteps: number;
    successRate: number;
  };
  timestamp: number;
}

export interface WorkflowSession {
  id: string;
  startTime: number;
  endTime?: number;
  logs: WorkflowLogEntry[];
  summary?: WorkflowSummary;
  transcript?: string;
  intent?: any;
  result?: any;
}

// Helper functions for creating log entries
export function createLogEntry(
  type: WorkflowLogType,
  level: WorkflowLogLevel,
  message: string,
  metadata?: Record<string, any>
): WorkflowLogEntry {
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    type,
    level,
    message,
    metadata,
  };
}

export function createSummary(
  status: WorkflowSummaryStatus,
  title: string,
  summary: string,
  keyPoints: string[],
  recommendations: string[],
  metrics: WorkflowSummary['metrics'],
  errorAnalysis?: string
): WorkflowSummary {
  return {
    id: `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    status,
    title,
    summary,
    keyPoints,
    errorAnalysis,
    recommendations,
    metrics,
    timestamp: Date.now(),
  };
}

// Log level colors for UI
export const LOG_LEVEL_COLORS = {
  debug: 'text-gray-500',
  info: 'text-blue-600',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  error: 'text-red-600',
} as const;

// Log type icons
export const LOG_TYPE_ICONS = {
  stt: '🎤',
  intent: '🧠',
  action: '🤖',
  execution: '⚡',
  error: '❌',
  info: 'ℹ️',
  debug: '🐛',
} as const;

// Summary status colors
export const SUMMARY_STATUS_COLORS = {
  success: 'border-green-200 bg-green-50 dark:bg-green-950/20',
  partial: 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20',
  failed: 'border-red-200 bg-red-50 dark:bg-red-950/20',
  pending: 'border-blue-200 bg-blue-50 dark:bg-blue-950/20',
} as const;
