import { anthropic } from "@ai-sdk/anthropic";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { env } from "./env";
import { IntentSchema, type Intent, WorkflowSchema, type Workflow, type WorkflowStep } from "./schema";
import { SessionContextSchema, type SessionContext } from "./schema";
import { WorkflowLogEntry, WorkflowSummary, createSummary, WorkflowSummaryStatus } from "./workflow-log";
import { getDefaultRetryPolicy } from "./retry";

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
- For search commands, put the search query in the "value" field
- For navigation commands, put the URL in the "target" field
- For click commands, put the element description in the "target" field
- For type commands, put the text in the "value" field and target element in "target" field
- The "parameters" field is optional - omit it unless you have specific additional parameters as a valid JSON object
- Never return parameters as a string - it must be a valid object or omitted
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

  /**
   * Parse multi-step workflow commands
   */
  async parseWorkflow(
    transcript: string,
    sessionId: string,
    sessionContext?: SessionContext
  ): Promise<Workflow | null> {
    if (!this.client) {
      console.error("Anthropic client not initialized. Check ANTHROPIC_API_KEY environment variable.");
      return null;
    }

    try {
      const contextPrompt = sessionContext
        ? `\n\nSession Context:\n- Current URL: ${sessionContext.currentUrl || "Unknown"}\n- Recent actions: ${JSON.stringify(sessionContext.lastAction?.intent || "None")}\n- Conversation history: ${sessionContext.conversationHistory.slice(-3).map(h => `${h.role}: ${h.content}`).join("\n")}`
        : "";

      const systemPrompt = `You are an AI assistant that parses complex voice commands into multi-step browser automation workflows.

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

Guidelines for multi-step workflows:
- Break down complex commands into individual steps
- Set up dependencies between steps (e.g., type before click)
- Assign appropriate retry policies based on action type
- Set requiresConfirmation=true for sensitive actions
- Provide clear step descriptions
- Ensure steps are logically ordered

Examples of multi-step commands:
- "search for laptops and click the first result" → navigate to search, type "laptops", click search button, click first result
- "go to amazon, search for books, add first book to cart" → navigate to amazon, search for books, click first book, click add to cart
- "fill out contact form with my details" → navigate to form, type name, type email, type message, click submit

${contextPrompt}`;

      const result = await generateObject({
        model: this.client,
        system: systemPrompt,
        prompt: `Parse this voice command into a multi-step workflow: "${transcript}"`,
        schema: z.object({
          isMultiStep: z.boolean().describe("Whether this command requires multiple steps"),
          workflow: z.object({
            id: z.string().describe("Unique workflow ID"),
            name: z.string().describe("Descriptive workflow name"),
            description: z.string().describe("Brief workflow description"),
            steps: z.array(z.object({
              id: z.string().describe("Unique step ID"),
              action: z.enum(["navigate", "click", "type", "scroll", "search", "extract", "observe", "wait", "screenshot"]),
              target: z.string().optional().describe("CSS selector, URL, or semantic description"),
              value: z.string().optional().describe("Text to type, search query, etc."),
              parameters: z.record(z.any()).optional().describe("Additional parameters"),
              confidence: z.number().min(0).max(1).describe("Confidence in this step"),
              requiresConfirmation: z.boolean().describe("Whether this step requires confirmation"),
              dependencies: z.array(z.string()).describe("Step IDs this step depends on"),
              rollbackHandler: z.string().optional().describe("How to rollback this step"),
            })).describe("Array of workflow steps"),
          }).optional().describe("Workflow definition if isMultiStep is true"),
        }),
      });

      if (!result.object.isMultiStep || !result.object.workflow) {
        return null;
      }

      // Add retry policies to each step
      const stepsWithRetryPolicies: WorkflowStep[] = result.object.workflow.steps.map(step => ({
        ...step,
        retryPolicy: getDefaultRetryPolicy(step.action),
      }));

      const workflow: Workflow = {
        id: result.object.workflow.id,
        name: result.object.workflow.name,
        description: result.object.workflow.description,
        steps: stepsWithRetryPolicies,
        createdAt: Date.now(),
        sessionId,
      };

      return WorkflowSchema.parse(workflow);
    } catch (error) {
      console.error("Failed to parse workflow:", error);
      return null;
    }
  }

  /**
   * Detect if a command is multi-step
   */
  async isMultiStepCommand(transcript: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const result = await generateObject({
        model: this.client,
        system: "You are an AI assistant that determines if a voice command requires multiple browser automation steps.",
        prompt: `Determine if this voice command requires multiple steps: "${transcript}"`,
        schema: z.object({
          isMultiStep: z.boolean().describe("Whether this command requires multiple steps"),
          reasoning: z.string().describe("Brief explanation of why it is or isn't multi-step"),
        }),
      });

      return result.object.isMultiStep;
    } catch (error) {
      console.error("Failed to detect multi-step command:", error);
      return false;
    }
  }

  /**
   * Generate text using AI
   */
  async generateText(options: {
    messages: Array<{ role: string; content: string }>;
    model: string;
    maxTokens?: number;
  }): Promise<{ text: string }> {
    if (!this.client) {
      throw new Error("Anthropic client not initialized");
    }

    try {
      const result = await generateText({
        model: this.client,
        messages: options.messages as any,
        maxOutputTokens: options.maxTokens || 1000,
      });

      return { text: result.text };
    } catch (error) {
      console.error("Failed to generate text:", error);
      throw error;
    }
  }

  async generateWorkflowSummary(
    logs: WorkflowLogEntry[],
    executionResult: any,
    transcript?: string
  ): Promise<WorkflowSummary> {
    if (!this.client) {
      throw new Error("AI client not initialized");
    }

    try {
      const logSummary = logs.map(log => 
        `[${log.type}] ${log.level}: ${log.message}${log.metadata ? ` (${JSON.stringify(log.metadata)})` : ''}`
      ).join('\n');

      const systemPrompt = `You are an AI assistant that analyzes voice command execution workflows and provides clear, actionable summaries.

Your task is to analyze the workflow logs and provide:
1. Overall status (success/partial/failed)
2. Clear explanation of what happened
3. Key points about the execution
4. Error analysis if applicable
5. Actionable recommendations

Be concise but informative. Use plain language that non-technical users can understand.`;

      const userPrompt: string = `Analyze this voice command execution workflow:

Voice Command: "${transcript || 'Unknown'}"

Workflow Logs:
${logSummary}

Final Result: ${JSON.stringify(executionResult, null, 2)}

Please provide:
1. Status: success/partial/failed
2. Title: Brief summary title
3. Summary: 1-2 sentence explanation of what happened
4. Key Points: 3-5 bullet points of what occurred
5. Error Analysis: If failed/partial, explain why in plain language
6. Recommendations: 2-3 actionable suggestions for improvement

Format as JSON with these fields:
{
  "status": "success|partial|failed",
  "title": "Brief title",
  "summary": "1-2 sentence explanation",
  "keyPoints": ["point1", "point2", "point3"],
  "errorAnalysis": "explanation if applicable",
  "recommendations": ["rec1", "rec2", "rec3"]
}`;

      // Define the schema for the summary response
      const summaryResponseSchema = z.object({
        status: z.enum(['success', 'partial', 'failed']),
        title: z.string(),
        summary: z.string(),
        keyPoints: z.array(z.string()),
        errorAnalysis: z.string().optional(),
        recommendations: z.array(z.string()),
      });

      const aiResult = await generateObject({
        model: this.client,
        system: systemPrompt,
        prompt: userPrompt,
        schema: summaryResponseSchema,
      });

      const summaryData = aiResult.object;
      
      // Calculate metrics
      const totalSteps = logs.filter(log => ['stt', 'intent', 'action', 'execution'].includes(log.type)).length;
      const successfulSteps = logs.filter(log => log.level === 'success').length;
      const startTime = Math.min(...logs.map(log => log.timestamp));
      const endTime = Math.max(...logs.map(log => log.timestamp));
      const duration = endTime - startTime;

      return createSummary(
        summaryData.status as WorkflowSummaryStatus,
        summaryData.title,
        summaryData.summary,
        summaryData.keyPoints,
        summaryData.recommendations,
        {
          duration,
          stepsCompleted: successfulSteps,
          totalSteps,
          successRate: totalSteps > 0 ? successfulSteps / totalSteps : 0,
        },
        summaryData.errorAnalysis
      );
    } catch (error) {
      console.error("Failed to generate workflow summary:", error);
      
      // Fallback summary
      return createSummary(
        'failed',
        'Summary Generation Failed',
        'Unable to generate AI summary due to an error.',
        ['Workflow logs are available for manual review'],
        ['Check the logs for detailed information', 'Try the command again'],
        {
          duration: 0,
          stepsCompleted: 0,
          totalSteps: logs.length,
          successRate: 0,
        },
        'AI summary generation encountered an error.'
      );
    }
  }
}

export const aiClient = new AIClient();
