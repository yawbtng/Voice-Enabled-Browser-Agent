import { MemoryClient } from "mem0ai";
import { env } from "./env";
import { SessionContextSchema, type SessionContext } from "./schema";

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
}

export const mem0Client = new Mem0Client();
