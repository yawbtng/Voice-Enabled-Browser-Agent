import { MemoryClient } from "mem0ai";
import { env } from "./env";
import { SessionContextSchema, type SessionContext, type Workflow, type WorkflowState } from "./schema";

export class Mem0Client {
  private client: MemoryClient | null = null;

  constructor() {
    if (env.MEM0_API_KEY) {
      this.client = new MemoryClient({
        apiKey: env.MEM0_API_KEY,
      });
    }
  }

  async addMemory(
    sessionId: string,
    content: string,
    metadata?: Record<string, any>
  ) {
    if (!this.client) {
      console.warn("Mem0 client not initialized. Skipping memory storage.");
      return null;
    }

    try {
      const memory = await this.client.add([
        {
          role: "user",
          content: content,
        },
      ], {
        user_id: sessionId,
        metadata: {
          timestamp: Date.now(),
          ...metadata,
        },
      });

      return memory;
    } catch (error) {
      console.error("Failed to add memory:", error);
      throw error;
    }
  }

  async searchMemories(
    sessionId: string,
    query: string,
    limit: number = 10
  ) {
    if (!this.client) {
      console.warn("Mem0 client not initialized. Returning empty results.");
      return [];
    }

    try {
      const memories = await this.client.search(query, {
        limit,
        user_id: sessionId,
      });

      return memories;
    } catch (error) {
      console.error("Failed to search memories:", error);
      throw error;
    }
  }

  async getMemories(sessionId: string, limit: number = 50) {
    if (!this.client) {
      console.warn("Mem0 client not initialized. Returning empty results.");
      return [];
    }

    try {
      const memories = await this.client.getAll({
        limit,
        user_id: sessionId,
      });

      return memories;
    } catch (error) {
      console.error("Failed to get memories:", error);
      throw error;
    }
  }

  async updateMemory(memoryId: string, content: string) {
    if (!this.client) {
      console.warn("Mem0 client not initialized. Cannot update memory.");
      return null;
    }

    try {
      const memory = await this.client.update(memoryId, {
        text: content,
      });

      return memory;
    } catch (error) {
      console.error("Failed to update memory:", error);
      throw error;
    }
  }

  async deleteMemory(memoryId: string) {
    if (!this.client) {
      console.warn("Mem0 client not initialized. Cannot delete memory.");
      return false;
    }

    try {
      await this.client.delete(memoryId);
      return true;
    } catch (error) {
      console.error("Failed to delete memory:", error);
      throw error;
    }
  }

  async getSessionContext(sessionId: string): Promise<SessionContext> {
    const memories = await this.getMemories(sessionId);
    
    // Build conversation history from memories
    const conversationHistory = memories
      .filter(memory => memory.metadata?.type === "conversation")
      .map(memory => {
        const content = memory.messages?.[0]?.content;
        return {
          role: memory.metadata?.role || "user",
          content: typeof content === "string" ? content : "",
          timestamp: memory.metadata?.timestamp || Date.now(),
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    const context: SessionContext = {
      sessionId,
      conversationHistory,
      memory: memories.reduce((acc, memory) => {
        acc[memory.id] = memory;
        return acc;
      }, {} as Record<string, any>),
    };

    return SessionContextSchema.parse(context);
  }

  async addConversationMemory(
    sessionId: string,
    role: "user" | "assistant" | "system",
    content: string
  ) {
    return this.addMemory(sessionId, content, {
      type: "conversation",
      role,
    });
  }

  async addActionMemory(
    sessionId: string,
    action: string,
    result: any,
    success: boolean
  ) {
    return this.addMemory(sessionId, `Action: ${action}`, {
      type: "action",
      action,
      result,
      success,
    });
  }

  /**
   * Add workflow execution memory
   */
  async addWorkflowMemory(
    sessionId: string,
    workflow: Workflow,
    state: WorkflowState,
    success: boolean
  ) {
    const content = `Workflow: ${workflow.name} - ${success ? "Completed" : "Failed"}`;
    const metadata = {
      type: "workflow",
      workflowId: workflow.id,
      workflowName: workflow.name,
      success,
      status: state.status,
      completedSteps: state.completedSteps.length,
      failedSteps: state.failedSteps.length,
      totalSteps: workflow.steps.length,
      duration: Date.now() - state.startedAt,
      error: state.error,
    };

    return this.addMemory(sessionId, content, metadata);
  }

  /**
   * Get workflow history for a session
   */
  async getWorkflowHistory(sessionId: string, limit: number = 20) {
    if (!this.client) {
      console.warn("Mem0 client not initialized. Returning empty results.");
      return [];
    }

    try {
      const memories = await this.client.search("workflow", {
        limit,
        user_id: sessionId,
        metadata: {
          type: "workflow",
        },
      });

      return memories;
    } catch (error) {
      console.error("Failed to get workflow history:", error);
      throw error;
    }
  }

  /**
   * Get recovery patterns from failed workflows
   */
  async getRecoveryPatterns(sessionId: string) {
    if (!this.client) {
      console.warn("Mem0 client not initialized. Returning empty results.");
      return [];
    }

    try {
      const failedWorkflows = await this.client.search("workflow failed", {
        limit: 50,
        user_id: sessionId,
        metadata: {
          type: "workflow",
          success: false,
        },
      });

      // Extract patterns from failed workflows
      const patterns = failedWorkflows.map(memory => ({
        workflowName: memory.metadata?.workflowName,
        failedSteps: memory.metadata?.failedSteps,
        error: memory.metadata?.error,
        timestamp: memory.metadata?.timestamp,
      }));

      return patterns;
    } catch (error) {
      console.error("Failed to get recovery patterns:", error);
      throw error;
    }
  }

  /**
   * Get successful workflow patterns
   */
  async getSuccessfulPatterns(sessionId: string) {
    if (!this.client) {
      console.warn("Mem0 client not initialized. Returning empty results.");
      return [];
    }

    try {
      const successfulWorkflows = await this.client.search("workflow completed", {
        limit: 50,
        user_id: sessionId,
        metadata: {
          type: "workflow",
          success: true,
        },
      });

      // Extract patterns from successful workflows
      const patterns = successfulWorkflows.map(memory => ({
        workflowName: memory.metadata?.workflowName,
        completedSteps: memory.metadata?.completedSteps,
        duration: memory.metadata?.duration,
        timestamp: memory.metadata?.timestamp,
      }));

      return patterns;
    } catch (error) {
      console.error("Failed to get successful patterns:", error);
      throw error;
    }
  }

  /**
   * Resume a workflow from a checkpoint
   */
  async resumeWorkflow(sessionId: string, workflowId: string) {
    if (!this.client) {
      console.warn("Mem0 client not initialized. Cannot resume workflow.");
      return null;
    }

    try {
      const memories = await this.client.search(`workflow ${workflowId}`, {
        limit: 1,
        user_id: sessionId,
        metadata: {
          type: "workflow",
          workflowId,
        },
      });

      if (memories.length === 0) {
        return null;
      }

      const memory = memories[0];
      return {
        workflowId: memory.metadata?.workflowId,
        lastCheckpoint: memory.metadata?.lastCheckpoint,
        completedSteps: memory.metadata?.completedSteps || [],
        failedSteps: memory.metadata?.failedSteps || [],
        retryCounts: memory.metadata?.retryCounts || {},
      };
    } catch (error) {
      console.error("Failed to resume workflow:", error);
      throw error;
    }
  }

  /**
   * Add extraction memory
   */
  async addExtractionMemory(
    sessionId: string,
    instruction: string,
    data: any,
    success: boolean
  ) {
    const content = `Extraction: ${instruction} - ${success ? "Success" : "Failed"}`;
    const metadata = {
      type: "extraction",
      instruction,
      success,
      timestamp: Date.now(),
      dataSize: JSON.stringify(data).length,
    };

    return this.addMemory(sessionId, content, metadata);
  }

  /**
   * Get extraction history for a session
   */
  async getExtractionHistory(sessionId: string, limit: number = 20) {
    if (!this.client) {
      console.warn("Mem0 client not initialized. Returning empty results.");
      return [];
    }

    try {
      const memories = await this.client.search("extraction", {
        limit,
        user_id: sessionId,
        metadata: {
          type: "extraction",
        },
      });

      return memories.map(memory => ({
        id: memory.id,
        instruction: memory.metadata?.instruction,
        success: memory.metadata?.success,
        timestamp: memory.metadata?.timestamp,
        data: memory.metadata?.data,
      }));
    } catch (error) {
      console.error("Failed to get extraction history:", error);
      throw error;
    }
  }

  /**
   * Get successful extraction patterns
   */
  async getSuccessfulExtractionPatterns(sessionId: string) {
    if (!this.client) {
      console.warn("Mem0 client not initialized. Returning empty results.");
      return [];
    }

    try {
      const successfulExtractions = await this.client.search("extraction success", {
        limit: 50,
        user_id: sessionId,
        metadata: {
          type: "extraction",
          success: true,
        },
      });

      return successfulExtractions.map(memory => ({
        instruction: memory.metadata?.instruction,
        dataSize: memory.metadata?.dataSize,
        timestamp: memory.metadata?.timestamp,
      }));
    } catch (error) {
      console.error("Failed to get successful extraction patterns:", error);
      throw error;
    }
  }
}

export const mem0Client = new Mem0Client();
