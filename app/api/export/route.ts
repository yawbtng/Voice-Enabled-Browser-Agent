import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { formatJSON, generateFilename, validateExportData, ensureDownloadsDir } from '@/lib/export-utils';
import fs from 'fs';
import path from 'path';

// Request schema for export API
const ExportRequestSchema = z.object({
  data: z.any().min(1, 'Data is required'),
  filename: z.string().optional(),
  format: z.enum(['json']).default('json'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedRequest = ExportRequestSchema.parse(body);
    
    const { data, filename, format } = validatedRequest;

    // Validate data for export
    const validation = validateExportData(data);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          timestamp: Date.now(),
        },
        { status: 400 }
      );
    }

    // Ensure downloads directory exists
    ensureDownloadsDir();

    // Generate filename if not provided
    const exportFilename = filename ? generateFilename(filename) : generateFilename();
    
    // Format data as JSON
    const jsonContent = formatJSON(data);
    
    // Create full file path
    const downloadsPath = path.join(process.cwd(), 'downloads');
    const filePath = path.join(downloadsPath, exportFilename);
    
    // Write file to downloads directory
    fs.writeFileSync(filePath, jsonContent, 'utf8');

    return NextResponse.json({
      success: true,
      filePath: path.join('downloads', exportFilename),
      filename: exportFilename,
      format: format,
      size: Buffer.byteLength(jsonContent, 'utf8'),
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Export API error:', error);
    
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
        error: error instanceof Error ? error.message : 'Export failed',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
