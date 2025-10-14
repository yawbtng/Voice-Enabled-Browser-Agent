import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ObservationExecutor } from '@/app/(agent)/observer';
import { mem0Client } from '@/lib/mem0';

// Request validation schema
const ObserveRequestSchema = z.object({
  instruction: z.string().min(1).max(1000),
  filters: z.object({
    categories: z.array(z.string()).optional(),
    isVisible: z.boolean().optional(),
    isInteractive: z.boolean().optional(),
  }).optional(),
  searchQuery: z.string().optional(),
  maxElements: z.number().min(1).max(1000).default(100),
  sessionId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ObserveRequestSchema.parse(body);

    const sessionId = validatedData.sessionId || `session_${Date.now()}`;
    const executor = new ObservationExecutor(sessionId);

    try {
      await executor.init();

      const result = await executor.executeObservation({
        instruction: validatedData.instruction,
        filters: validatedData.filters,
        searchQuery: validatedData.searchQuery,
        maxElements: validatedData.maxElements,
      });

      return NextResponse.json({
        success: true,
        data: result,
        timestamp: Date.now(),
      });

    } finally {
      await executor.close();
    }

  } catch (error) {
    console.error('Observation API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
        timestamp: Date.now(),
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    }, { status: 500 });
  }
}

// GET endpoint for observation history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID is required',
        timestamp: Date.now(),
      }, { status: 400 });
    }

    const executor = new ObservationExecutor(sessionId);
    
    try {
      await executor.init();
      const history = await executor.getObservationHistory();

      return NextResponse.json({
        success: true,
        data: history,
        timestamp: Date.now(),
      });

    } finally {
      await executor.close();
    }

  } catch (error) {
    console.error('Observation history API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    }, { status: 500 });
  }
}

// PUT endpoint for batch observations
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const BatchObserveRequestSchema = z.object({
      instructions: z.array(z.string()).min(1).max(10),
      sessionId: z.string().optional(),
    });

    const validatedData = BatchObserveRequestSchema.parse(body);
    const sessionId = validatedData.sessionId || `session_${Date.now()}`;
    const executor = new ObservationExecutor(sessionId);

    try {
      await executor.init();
      const results = await executor.batchObserve(validatedData.instructions);

      return NextResponse.json({
        success: true,
        data: results,
        timestamp: Date.now(),
      });

    } finally {
      await executor.close();
    }

  } catch (error) {
    console.error('Batch observation API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
        timestamp: Date.now(),
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    }, { status: 500 });
  }
}

// DELETE endpoint for clearing observation history
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID is required',
        timestamp: Date.now(),
      }, { status: 400 });
    }

    // Clear observation history from memory
    await mem0Client.clearObservationHistory(sessionId);

    return NextResponse.json({
      success: true,
      message: 'Observation history cleared',
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Clear observation history API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    }, { status: 500 });
  }
}
