import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ExtractionExecutor } from '@/app/(agent)/extractor';
import { generateSchemaFromInstruction } from '@/lib/schema-generator';
import { EXTRACTION_SCHEMAS, SchemaType } from '@/lib/extraction-schemas';

// Request schema for extraction API
const ExtractionRequestSchema = z.object({
  instruction: z.string().min(1, 'Instruction is required'),
  schemaType: z.enum(['article', 'product', 'table', 'form', 'contact', 'job', 'event', 'list', 'custom']).optional(),
  customSchema: z.string().optional(),
  useTextExtract: z.boolean().optional().default(true),
  maxRetries: z.number().min(1).max(10).optional().default(3),
  sessionId: z.string().min(1, 'Session ID is required'),
});

// Batch extraction request schema
const BatchExtractionRequestSchema = z.object({
  instructions: z.array(z.string()).min(1, 'At least one instruction is required'),
  schemaType: z.enum(['article', 'product', 'table', 'form', 'contact', 'job', 'event', 'list', 'custom']).optional(),
  customSchema: z.string().optional(),
  useTextExtract: z.boolean().optional().default(true),
  sessionId: z.string().min(1, 'Session ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'batch') {
      return handleBatchExtraction(body);
    } else {
      return handleSingleExtraction(body);
    }
  } catch (error) {
    console.error('Extraction API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request format',
        timestamp: Date.now(),
      },
      { status: 400 }
    );
  }
}

async function handleSingleExtraction(body: any) {
  try {
    const validatedRequest = ExtractionRequestSchema.parse(body);
    const { instruction, schemaType, customSchema, useTextExtract, maxRetries, sessionId } = validatedRequest;

    // Initialize extraction executor
    const executor = new ExtractionExecutor(sessionId);
    await executor.init();

    try {
      // Determine schema to use
      let schema: z.ZodObject<any, any, any>;
      
      if (schemaType && schemaType !== 'custom') {
        schema = EXTRACTION_SCHEMAS[schemaType as SchemaType];
      } else if (customSchema) {
        try {
          // Parse custom schema string
          const schemaFunction = new Function('z', `return ${customSchema}`);
          schema = schemaFunction(z);
        } catch (error) {
          throw new Error('Invalid custom schema format');
        }
      } else {
        // Generate schema from instruction
        const schemaResult = await generateSchemaFromInstruction(instruction);
        schema = schemaResult.schema;
      }

      // Execute extraction
      const result = await executor.executeExtraction({
        instruction,
        schema,
        useTextExtract,
        maxRetries,
      });

      await executor.close();

      return NextResponse.json({
        success: true,
        data: result,
        timestamp: Date.now(),
      });

    } catch (extractionError) {
      await executor.close();
      throw extractionError;
    }

  } catch (error) {
    console.error('Single extraction error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: `Validation failed: ${error.errors.map(e => e.message).join(', ')}`,
          timestamp: Date.now(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Extraction failed',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

async function handleBatchExtraction(body: any) {
  try {
    const validatedRequest = BatchExtractionRequestSchema.parse(body);
    const { instructions, schemaType, customSchema, useTextExtract, sessionId } = validatedRequest;

    // Initialize extraction executor
    const executor = new ExtractionExecutor(sessionId);
    await executor.init();

    try {
      // Determine schema to use
      let schema: z.ZodObject<any, any, any>;
      
      if (schemaType && schemaType !== 'custom') {
        schema = EXTRACTION_SCHEMAS[schemaType as SchemaType];
      } else if (customSchema) {
        try {
          // Parse custom schema string
          const schemaFunction = new Function('z', `return ${customSchema}`);
          schema = schemaFunction(z);
        } catch (error) {
          throw new Error('Invalid custom schema format');
        }
      } else {
        // Use a generic schema for batch extraction
        schema = z.object({
          data: z.string().describe('Extracted data'),
          metadata: z.record(z.string()).optional().describe('Additional metadata'),
        });
      }

      // Execute batch extraction
      const results = await executor.batchExtract(instructions, schema, useTextExtract);

      await executor.close();

      return NextResponse.json({
        success: true,
        data: {
          results,
          totalCount: results.length,
          successCount: results.filter(r => r.status === 'success').length,
          failureCount: results.filter(r => r.status === 'failed').length,
        },
        timestamp: Date.now(),
      });

    } catch (extractionError) {
      await executor.close();
      throw extractionError;
    }

  } catch (error) {
    console.error('Batch extraction error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: `Validation failed: ${error.errors.map(e => e.message).join(', ')}`,
          timestamp: Date.now(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Batch extraction failed',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve extraction history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session ID is required',
          timestamp: Date.now(),
        },
        { status: 400 }
      );
    }

    // Initialize extraction executor
    const executor = new ExtractionExecutor(sessionId);
    await executor.init();

    try {
      // Get extraction history
      const history = await executor.getExtractionHistory();
      
      await executor.close();

      return NextResponse.json({
        success: true,
        data: history,
        timestamp: Date.now(),
      });

    } catch (historyError) {
      await executor.close();
      throw historyError;
    }

  } catch (error) {
    console.error('Get extraction history error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get extraction history',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
