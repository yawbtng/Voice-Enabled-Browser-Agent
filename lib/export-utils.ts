/**
 * Export utility functions for handling JSON data export
 */

export interface ValidationResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Format data as pretty JSON string
 */
export function formatJSON(data: any): string {
  try {
    // Handle undefined specifically
    if (data === undefined) {
      return 'undefined';
    }
    return JSON.stringify(data, null, 2);
  } catch (error) {
    throw new Error(`Failed to format JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a unique filename with timestamp
 */
export function generateFilename(baseName?: string): string {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
  
  // Sanitize baseName - remove invalid characters
  let sanitizedName = 'export';
  if (baseName && typeof baseName === 'string') {
    sanitizedName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
    // Remove multiple consecutive underscores
    sanitizedName = sanitizedName.replace(/_+/g, '_');
    // Remove leading/trailing underscores
    sanitizedName = sanitizedName.replace(/^_+|_+$/g, '');
    if (sanitizedName.length === 0) {
      sanitizedName = 'export';
    }
  }
  
  return `${sanitizedName}_${timestamp}.json`;
}

/**
 * Validate data for export (check for circular references, etc.)
 */
export function validateExportData(data: any): ValidationResult {
  try {
    // Check for circular references by attempting to stringify
    JSON.stringify(data);
    
    return {
      success: true,
      data: data
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('circular')) {
      return {
        success: false,
        error: 'Data contains circular references and cannot be exported'
      };
    }
    
    return {
      success: false,
      error: `Data validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get the downloads directory path
 */
export function getDownloadsPath(): string {
  return '/downloads';
}

/**
 * Ensure downloads directory exists
 */
export function ensureDownloadsDir(): void {
  const fs = require('fs');
  const path = require('path');
  
  const downloadsPath = path.join(process.cwd(), 'downloads');
  
  if (!fs.existsSync(downloadsPath)) {
    fs.mkdirSync(downloadsPath, { recursive: true });
  }
}
