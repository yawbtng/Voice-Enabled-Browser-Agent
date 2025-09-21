import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import { env } from "./env";
import { IntentSchema, type Intent } from "./schema";
import { SessionContextSchema, type SessionContext } from "./schema";

export class AIClient {
  private client;

  constructor() {
    try {
      console.log("Initializing Anthropic client with API key:", env.ANTHROPIC_API_KEY ? "SET" : "NOT SET");
      this.client = anthropic("claude-3-haiku-20240307");
      console.log("Anthropic client initialized:", typeof this.client, this.client);
    } catch (error) {
      console.error("Failed to initialize Anthropic client:", error);
      this.client = null;
    }
  }

  async parseIntent(
    transcript: string,
    sessionContext?: SessionContext
  ): Promise<Intent> {
    console.log("parseIntent called, client type:", typeof this.client, "client value:", this.client);
    if (!this.client) {
      console.error("Anthropic client not initialized. Check ANTHROPIC_API_KEY environment variable.");
      return {
        action: "unknown",
        confidence: 0.1,
        requiresConfirmation: false,
      };
    }

    try {
      const contextPrompt = sessionContext
        ? `\n\nSession Context:\n- Current URL: ${sessionContext.currentUrl || "Unknown"}\n- Recent actions: ${JSON.stringify(sessionContext.lastAction?.intent || "None")}\n- Conversation history: ${sessionContext.conversationHistory.slice(-3).map(h => `${h.role}: ${h.content}`).join("\n")}`
        : "";

      const systemPrompt = `You are an AI assistant that parses voice commands into structured browser automation intents.

Available actions:
- navigate: Go to a URL or search for something
- click: Click on an element (button, link, etc.)
- type: Type text into an input field
- scroll: Scroll up, down, or to a specific element
- search: Perform a search on the current page
- extract: Extract data from the current page
- observe: Get information about the current page
- wait: Wait for something to happen
- screenshot: Take a screenshot
- unknown: When the intent is unclear

Guidelines:
- Be specific about the target element when possible
- Set requiresConfirmation=true for sensitive actions (login, checkout, payment, data entry)
- Provide confidence score based on clarity of the command
- Extract search queries, URLs, and text content accurately
${contextPrompt}`;

      const result = await generateObject({
        model: this.client,
        system: systemPrompt,
        prompt: `Parse this voice command into a structured intent: "${transcript}"`,
        schema: IntentSchema,
      });

      return result.object;
    } catch (error) {
      console.error("Failed to parse intent:", error);
      
      // Return a fallback intent for unknown commands
      return {
        action: "unknown",
        confidence: 0.1,
        requiresConfirmation: false,
      };
    }
  }

  async generateConfirmationPrompt(intent: Intent): Promise<string> {
    if (!this.client) {
      console.error("Anthropic client not initialized. Check ANTHROPIC_API_KEY environment variable.");
      return `Are you sure you want to ${intent.action}${intent.target ? ` on ${intent.target}` : ""}?`;
    }

    try {
      const result = await generateObject({
        model: this.client,
        system: "You are an AI assistant that generates user-friendly confirmation prompts for browser automation actions.",
        prompt: `Generate a clear, concise confirmation prompt for this browser action: ${JSON.stringify(intent)}`,
        schema: z.object({
          prompt: z.string().describe("User-friendly confirmation prompt"),
        }),
      });

      return result.object.prompt;
    } catch (error) {
      console.error("Failed to generate confirmation prompt:", error);
      return `Are you sure you want to ${intent.action}${intent.target ? ` on ${intent.target}` : ""}?`;
    }
  }

  async generateActionSummary(action: any, result: any): Promise<string> {
    if (!this.client) {
      console.error("Anthropic client not initialized. Check ANTHROPIC_API_KEY environment variable.");
      return `Completed ${action.action}${action.target ? ` on ${action.target}` : ""}`;
    }

    try {
      const result_text = await generateObject({
        model: this.client,
        system: "You are an AI assistant that generates brief summaries of browser automation actions and their results.",
        prompt: `Generate a brief summary of this action and its result: Action: ${JSON.stringify(action)}, Result: ${JSON.stringify(result)}`,
        schema: z.object({
          summary: z.string().describe("Brief summary of the action and result"),
        }),
      });

      return result_text.object.summary;
    } catch (error) {
      console.error("Failed to generate action summary:", error);
      return `Completed ${action.action}${action.target ? ` on ${action.target}` : ""}`;
    }
  }
}

export const aiClient = new AIClient();
