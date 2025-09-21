import { Mem0 } from "mem0ai";
import { env } from "./env";
import { SessionContextSchema, type SessionContext } from "./schema";

export class Mem0Client {
  private client: Mem0 | null = null;

  constructor() {
    if (env.MEM0_API_KEY) {
      this.client = new Mem0({
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
      const memory = await this.client.addMemory({
        content,
        metadata: {
          sessionId,
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
      const memories = await this.client.searchMemories({
        query,
        limit,
        metadata: {
          sessionId,
        },
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
      const memories = await this.client.getMemories({
        limit,
        metadata: {
          sessionId,
        },
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
      const memory = await this.client.updateMemory({
        id: memoryId,
        content,
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
      await this.client.deleteMemory(memoryId);
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
      .map(memory => ({
        role: memory.metadata?.role || "user",
        content: memory.content,
        timestamp: memory.metadata?.timestamp || Date.now(),
      }))
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
}

export const mem0Client = new Mem0Client();
