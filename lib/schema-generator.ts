import { z } from 'zod';
import { aiClient } from '@/lib/ai';
import { EXTRACTION_SCHEMAS, SchemaType, getSchema } from './extraction-schemas';

/**
 * AI-powered schema generation from natural language instructions
 */

export interface SchemaGenerationResult {
  schema: z.ZodObject<any, any, any>;
  schemaType: SchemaType | 'custom';
  confidence: number;
  explanation: string;
}

/**
 * Generate a Zod schema from natural language instruction
 */
export async function generateSchemaFromInstruction(
  instruction: string
): Promise<SchemaGenerationResult> {
  try {
    // First, try to match against predefined schemas
    const predefinedMatch = matchPredefinedSchema(instruction);
    if (predefinedMatch.confidence > 0.8) {
      return predefinedMatch;
    }

    // If no good match, generate custom schema using AI
    const customSchema = await generateCustomSchema(instruction);
    return customSchema;
  } catch (error) {
    console.error('Schema generation failed:', error);
    // Fallback to generic object schema
    return {
      schema: z.object({
        data: z.string().describe('Extracted data'),
        metadata: z.record(z.string()).optional().describe('Additional metadata'),
      }),
      schemaType: 'custom',
      confidence: 0.1,
      explanation: 'Failed to generate schema, using fallback',
    };
  }
}

/**
 * Match instruction against predefined schemas
 */
function matchPredefinedSchema(instruction: string): SchemaGenerationResult {
  const lowerInstruction = instruction.toLowerCase();
  
  // Define keywords for each schema type
  const schemaKeywords: Record<SchemaType, string[]> = {
    article: ['article', 'blog', 'post', 'content', 'title', 'author', 'publish'],
    product: ['product', 'item', 'price', 'buy', 'shop', 'store', 'review', 'rating'],
    table: ['table', 'data', 'rows', 'columns', 'grid', 'spreadsheet'],
    form: ['form', 'input', 'field', 'submit', 'register', 'login'],
    contact: ['contact', 'email', 'phone', 'address', 'social', 'profile'],
    job: ['job', 'career', 'position', 'hiring', 'employment', 'salary'],
    event: ['event', 'meeting', 'conference', 'date', 'time', 'location'],
    list: ['list', 'items', 'bullets', 'points', 'checklist'],
  };

  let bestMatch: SchemaType | null = null;
  let bestScore = 0;

  for (const [schemaType, keywords] of Object.entries(schemaKeywords)) {
    const score = keywords.reduce((acc, keyword) => {
      return acc + (lowerInstruction.includes(keyword) ? 1 : 0);
    }, 0);
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = schemaType as SchemaType;
    }
  }

  if (bestMatch && bestScore > 0) {
    return {
      schema: getSchema(bestMatch),
      schemaType: bestMatch,
      confidence: Math.min(bestScore / 3, 1), // Normalize to 0-1
      explanation: `Matched to ${bestMatch} schema based on keywords`,
    };
  }

  return {
    schema: z.object({}),
    schemaType: 'custom',
    confidence: 0,
    explanation: 'No predefined schema match found',
  };
}

/**
 * Generate custom schema using AI
 */
async function generateCustomSchema(instruction: string): Promise<SchemaGenerationResult> {
  const prompt = `
Generate a Zod schema for extracting data based on this instruction: "${instruction}"

The schema should:
1. Include all relevant fields mentioned in the instruction
2. Use appropriate Zod types (string, number, boolean, array, object)
3. Add descriptive comments for each field
4. Make optional fields optional
5. Use arrays for multiple items

Return only the Zod schema definition as a string, no explanations.
Example format:
z.object({
  fieldName: z.string().describe('Description'),
  optionalField: z.string().optional().describe('Description'),
  items: z.array(z.string()).describe('Array of items'),
})
`;

  try {
    const response = await aiClient.generateText({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'claude-3-haiku-20240307',
      maxTokens: 1000,
    });

    // Parse the AI response to extract the schema
    const schemaString = response.text.trim();
    
    // Create a safe evaluation context
    const context = {
      z: z,
    };

    // Evaluate the schema string safely
    const schemaFunction = new Function('z', `return ${schemaString}`);
    const schema = schemaFunction(z);

    return {
      schema,
      schemaType: 'custom',
      confidence: 0.7, // Medium confidence for AI-generated schemas
      explanation: `AI-generated schema based on instruction: "${instruction}"`,
    };
  } catch (error) {
    console.error('AI schema generation failed:', error);
    
    // Fallback to a generic schema
    return {
      schema: z.object({
        extractedData: z.string().describe('Extracted data'),
        metadata: z.record(z.string()).optional().describe('Additional metadata'),
      }),
      schemaType: 'custom',
      confidence: 0.3,
      explanation: 'AI generation failed, using generic fallback schema',
    };
  }
}

/**
 * Validate extracted data against a schema
 */
export function validateExtractedData(
  schema: z.ZodObject<any, any, any>,
  data: unknown
): { success: true; data: any } | { success: false; error: string } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation failed: ${error.errors.map(e => e.message).join(', ')}`,
      };
    }
    return {
      success: false,
      error: 'Unknown validation error',
    };
  }
}

/**
 * Get schema preview for UI display
 */
export function getSchemaPreview(schema: z.ZodSchema<any>): string {
  try {
    // This is a simplified preview - in a real implementation,
    // you might want to parse the schema structure more deeply
    if ('shape' in schema && schema.shape) {
      return JSON.stringify(schema.shape, null, 2);
    }
    return 'Schema preview unavailable';
  } catch {
    return 'Schema preview unavailable';
  }
}
