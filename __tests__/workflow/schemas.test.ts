import { z } from "zod";
import {
  WorkflowStepSchema,
  WorkflowSchema,
  WorkflowStateSchema,
  type WorkflowStep,
  type Workflow,
  type WorkflowState,
} from "@/lib/schema";

describe("Workflow Schemas", () => {
  describe("WorkflowStepSchema", () => {
    it("should validate a valid workflow step", () => {
      const validStep: WorkflowStep = {
        id: "step-1",
        action: "navigate",
        target: "https://example.com",
        value: undefined,
        parameters: {},
        confidence: 0.9,
        requiresConfirmation: false,
        retryPolicy: {
          maxAttempts: 3,
          backoffStrategy: "exponential",
          baseDelay: 1000,
        },
        dependencies: [],
        rollbackHandler: "navigate_back",
      };

      expect(() => WorkflowStepSchema.parse(validStep)).not.toThrow();
    });

    it("should reject invalid action types", () => {
      const invalidStep = {
        id: "step-1",
        action: "invalid_action",
        target: "https://example.com",
        retryPolicy: {
          maxAttempts: 3,
          backoffStrategy: "exponential",
          baseDelay: 1000,
        },
        dependencies: [],
      };

      expect(() => WorkflowStepSchema.parse(invalidStep)).toThrow();
    });

    it("should validate retry policy", () => {
      const stepWithRetry: WorkflowStep = {
        id: "step-1",
        action: "click",
        target: "button",
        retryPolicy: {
          maxAttempts: 5,
          backoffStrategy: "linear",
          baseDelay: 2000,
        },
        dependencies: [],
      };

      expect(() => WorkflowStepSchema.parse(stepWithRetry)).not.toThrow();
    });

    it("should validate dependencies array", () => {
      const stepWithDeps: WorkflowStep = {
        id: "step-2",
        action: "type",
        target: "input",
        value: "test",
        dependencies: ["step-1"],
        retryPolicy: {
          maxAttempts: 2,
          backoffStrategy: "exponential",
          baseDelay: 1000,
        },
      };

      expect(() => WorkflowStepSchema.parse(stepWithDeps)).not.toThrow();
    });
  });

  describe("WorkflowSchema", () => {
    it("should validate a complete workflow", () => {
      const workflow: Workflow = {
        id: "workflow-1",
        name: "Search and Click",
        description: "Search for a term and click the first result",
        steps: [
          {
            id: "step-1",
            action: "navigate",
            target: "https://google.com",
            retryPolicy: {
              maxAttempts: 3,
              backoffStrategy: "exponential",
              baseDelay: 1000,
            },
            dependencies: [],
          },
          {
            id: "step-2",
            action: "type",
            target: "input[name='q']",
            value: "test search",
            dependencies: ["step-1"],
            retryPolicy: {
              maxAttempts: 2,
              backoffStrategy: "exponential",
              baseDelay: 1000,
            },
          },
        ],
        createdAt: Date.now(),
        sessionId: "session-123",
      };

      expect(() => WorkflowSchema.parse(workflow)).not.toThrow();
    });

    it("should reject workflow with invalid step dependencies", () => {
      const invalidWorkflow = {
        id: "workflow-1",
        name: "Invalid Workflow",
        steps: [
          {
            id: "step-1",
            action: "navigate",
            target: "https://example.com",
            retryPolicy: {
              maxAttempts: 3,
              backoffStrategy: "exponential",
              baseDelay: 1000,
            },
            dependencies: [],
          },
          {
            id: "step-2",
            action: "click",
            target: "button",
            dependencies: ["nonexistent-step"], // Invalid dependency
            retryPolicy: {
              maxAttempts: 3,
              backoffStrategy: "exponential",
              baseDelay: 1000,
            },
          },
        ],
        createdAt: Date.now(),
        sessionId: "session-123",
      };

      expect(() => WorkflowSchema.parse(invalidWorkflow)).toThrow();
    });
  });

  describe("WorkflowStateSchema", () => {
    it("should validate workflow execution state", () => {
      const state: WorkflowState = {
        workflowId: "workflow-1",
        currentStepIndex: 1,
        status: "running",
        startedAt: Date.now(),
        completedSteps: ["step-1"],
        failedSteps: [],
        retryCounts: { "step-1": 0 },
        checkpoints: [
          {
            stepIndex: 0,
            timestamp: Date.now(),
            data: { url: "https://example.com" },
          },
        ],
        error: undefined,
      };

      expect(() => WorkflowStateSchema.parse(state)).not.toThrow();
    });

    it("should validate failed workflow state", () => {
      const failedState: WorkflowState = {
        workflowId: "workflow-1",
        currentStepIndex: 2,
        status: "failed",
        startedAt: Date.now(),
        completedSteps: ["step-1"],
        failedSteps: ["step-2"],
        retryCounts: { "step-1": 0, "step-2": 3 },
        checkpoints: [],
        error: "Step failed after maximum retries",
      };

      expect(() => WorkflowStateSchema.parse(failedState)).not.toThrow();
    });
  });
});
