import { Stagehand } from "@browserbasehq/stagehand";
import { z } from 'zod';
import StagehandConfig from "@/stagehand.config";
import { mem0Client } from "@/lib/mem0";
import { generateSchemaFromInstruction, validateExtractedData } from "@/lib/schema-generator";
import { retryWithBackoff } from "@/lib/retry";

export interface ExtractionRequest {
  instruction: string;
  schema?: z.ZodObject<any, any, any>;
  schemaType?: string;
  useTextExtract?: boolean;
  maxRetries?: number;
}

export interface ExtractionResult {
  id: string;
  instruction: string;
  schema: z.ZodObject<any, any, any>;
  data: any;
  status: 'success' | 'failed';
  timestamp: number;
  error?: string;
  retryCount: number;
  confidence?: number;
}

export class ExtractionExecutor {
  private stagehand: Stagehand;
  private sessionId: string;

  constructor(sessionId: string) {
    this.stagehand = new Stagehand(StagehandConfig);
    this.sessionId = sessionId;
  }

  async init() {
    await this.stagehand.init();
  }

  /**
   * Execute data extraction with schema validation and retry logic
   */
  async executeExtraction(request: ExtractionRequest): Promise<ExtractionResult> {
    const extractionId = `extraction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result: ExtractionResult = {
      id: extractionId,
      instruction: request.instruction,
      schema: request.schema || z.object({}),
      data: null,
      status: 'failed',
      timestamp: Date.now(),
      retryCount: 0,
    };

    try {
      // Generate schema if not provided
      if (!request.schema) {
        const schemaResult = await generateSchemaFromInstruction(request.instruction);
        result.schema = schemaResult.schema;
        result.confidence = schemaResult.confidence;
      }

      // Execute extraction with retry logic
      const extractedData = await retryWithBackoff(
        async () => {
          return await this.performExtraction(request.instruction, result.schema, request.useTextExtract);
        },
        {
          maxAttempts: request.maxRetries || 3,
          baseDelay: 1000,
          backoffStrategy: 'exponential',
        }
      );

      // Validate extracted data
      const validation = validateExtractedData(result.schema, extractedData);
      if (!validation.success) {
        throw new Error(`Data validation failed: ${validation.error}`);
      }

      result.data = validation.data;
      result.status = 'success';

      // Store successful extraction in memory
      await mem0Client.addExtractionMemory(
        this.sessionId,
        result.instruction,
        result.data,
        true
      );

    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Store failed extraction in memory
      await mem0Client.addExtractionMemory(
        this.sessionId,
        result.instruction,
        { error: result.error },
        false
      );
    }

    return result;
  }

  /**
   * Perform the actual extraction using Stagehand
   */
  private async performExtraction(
    instruction: string,
    schema: z.ZodObject<any, any, any>,
    useTextExtract: boolean = true
  ): Promise<any> {
    const page = this.stagehand.page;

    try {
      const result = await page.extract({
        instruction,
        schema,
        useTextExtract,
      });

      return result;
    } catch (error) {
      console.error('Stagehand extraction failed:', error);
      throw new Error(`Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get extraction history for this session
   */
  async getExtractionHistory(): Promise<ExtractionResult[]> {
    try {
      const memories = await mem0Client.getExtractionHistory(this.sessionId);
      return memories.map(memory => ({
        id: memory.id || `memory_${Date.now()}`,
        instruction: memory.instruction,
        schema: z.object({}), // Simplified for history display
        data: memory.data,
        status: memory.success ? 'success' : 'failed',
        timestamp: memory.timestamp,
        error: memory.success ? undefined : memory.data?.error,
        retryCount: 0,
      }));
    } catch (error) {
      console.error('Failed to get extraction history:', error);
      return [];
    }
  }

  /**
   * Batch extract multiple items using the same schema
   */
  async batchExtract(
    instructions: string[],
    schema: z.ZodObject<any, any, any>,
    useTextExtract: boolean = true
  ): Promise<ExtractionResult[]> {
    const results: ExtractionResult[] = [];

    for (const instruction of instructions) {
      try {
        const result = await this.executeExtraction({
          instruction,
          schema,
          useTextExtract,
        });
        results.push(result);
      } catch (error) {
        results.push({
          id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          instruction,
          schema,
          data: null,
          status: 'failed',
          timestamp: Date.now(),
          error: error instanceof Error ? error.message : 'Unknown error',
          retryCount: 0,
        });
      }
    }

    return results;
  }

  /**
   * Extract data with custom retry policy
   */
  async extractWithRetryPolicy(
    request: ExtractionRequest,
    retryPolicy: {
      maxAttempts: number;
      baseDelay: number;
      backoffStrategy: 'exponential' | 'linear' | 'fixed';
    }
  ): Promise<ExtractionResult> {
    const extractionId = `retry_extraction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result: ExtractionResult = {
      id: extractionId,
      instruction: request.instruction,
      schema: request.schema || z.object({}),
      data: null,
      status: 'failed',
      timestamp: Date.now(),
      retryCount: 0,
    };

    try {
      // Generate schema if not provided
      if (!request.schema) {
        const schemaResult = await generateSchemaFromInstruction(request.instruction);
        result.schema = schemaResult.schema;
        result.confidence = schemaResult.confidence;
      }

      // Execute extraction with custom retry policy
      const extractedData = await retryWithBackoff(
        async () => {
          return await this.performExtraction(request.instruction, result.schema, request.useTextExtract);
        },
        retryPolicy
      );

      // Validate extracted data
      const validation = validateExtractedData(result.schema, extractedData);
      if (!validation.success) {
        throw new Error(`Data validation failed: ${validation.error}`);
      }

      result.data = validation.data;
      result.status = 'success';

      // Store successful extraction in memory
      await mem0Client.addExtractionMemory(
        this.sessionId,
        result.instruction,
        result.data,
        true
      );

    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Store failed extraction in memory
      await mem0Client.addExtractionMemory(
        this.sessionId,
        result.instruction,
        { error: result.error },
        false
      );
    }

    return result;
  }

  async close() {
    await this.stagehand.close();
  }
}
