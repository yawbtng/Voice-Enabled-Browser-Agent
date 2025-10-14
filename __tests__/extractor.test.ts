import { z } from 'zod';
import { generateSchemaFromInstruction, validateExtractedData } from '@/lib/schema-generator';
import { ExtractionExecutor } from '@/app/(agent)/extractor';
import { EXTRACTION_SCHEMAS } from '@/lib/extraction-schemas';

// Mock Stagehand
jest.mock('@browserbasehq/stagehand', () => ({
  Stagehand: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    page: {
      extract: jest.fn().mockResolvedValue({
        title: 'Test Article',
        content: 'This is test content',
        author: 'John Doe',
      }),
    },
    close: jest.fn(),
  })),
}));

// Mock Mem0
jest.mock('@/lib/mem0', () => ({
  mem0Client: {
    addExtractionMemory: jest.fn().mockResolvedValue({ id: 'test-memory' }),
    getExtractionHistory: jest.fn().mockResolvedValue([]),
  },
}));

// Mock AI client
jest.mock('@/lib/ai', () => ({
  aiClient: {
    generateText: jest.fn().mockResolvedValue({
      text: 'z.object({ title: z.string().describe("Title"), content: z.string().describe("Content") })',
    }),
  },
}));

// Mock retry utility
jest.mock('@/lib/retry', () => ({
  retryWithBackoff: jest.fn().mockImplementation(async (fn: () => Promise<any>) => {
    return await fn();
  }),
}));

describe('Extraction Schemas', () => {
  describe('Article Schema', () => {
    it('should validate article extraction data', () => {
      const ArticleSchema = EXTRACTION_SCHEMAS.article;

      const validArticle = {
        title: 'Test Article',
        content: 'This is test content',
        author: 'John Doe',
        publishDate: '2025-01-22',
        url: 'https://example.com/article',
        tags: ['tech', 'ai'],
      };

      expect(() => ArticleSchema.parse(validArticle)).not.toThrow();
    });

    it('should reject invalid article data', () => {
      const ArticleSchema = EXTRACTION_SCHEMAS.article;

      const invalidArticle = {
        title: 123, // Should be string
        content: 'This is test content',
      };

      expect(() => ArticleSchema.parse(invalidArticle)).toThrow();
    });
  });

  describe('Product Schema', () => {
    it('should validate product extraction data', () => {
      const ProductSchema = EXTRACTION_SCHEMAS.product;

      const validProduct = {
        name: 'Test Product',
        price: '$99.99',
        description: 'A great product',
        image: 'https://example.com/image.jpg',
        availability: 'In Stock',
        rating: 4.5,
        reviews: [
          {
            text: 'Great product!',
            rating: 5,
            author: 'John Doe',
          },
        ],
      };

      expect(() => ProductSchema.parse(validProduct)).not.toThrow();
    });
  });

  describe('Table Schema', () => {
    it('should validate table extraction data', () => {
      const TableSchema = EXTRACTION_SCHEMAS.table;

      const validTable = {
        headers: ['Name', 'Age', 'City'],
        rows: [
          ['John', '25', 'New York'],
          ['Jane', '30', 'Los Angeles'],
        ],
        title: 'User Data',
      };

      expect(() => TableSchema.parse(validTable)).not.toThrow();
    });
  });
});

describe('Schema Generation', () => {
  it('should generate schema from natural language instruction', async () => {
    const instruction = 'extract all products with name and price';
    
    const result = await generateSchemaFromInstruction(instruction);
    
    expect(result).toBeDefined();
    expect(result.schema).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.explanation).toBeDefined();
  });

  it('should handle complex extraction instructions', async () => {
    const instruction = 'extract article title, content, author, and all links';
    
    const result = await generateSchemaFromInstruction(instruction);
    
    expect(result).toBeDefined();
    expect(result.schema).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });
});

describe('Extraction Executor', () => {
  let executor: ExtractionExecutor;

  beforeEach(() => {
    executor = new ExtractionExecutor('test-session');
  });

  it('should execute extraction with valid schema', async () => {
    const schema = EXTRACTION_SCHEMAS.article;
    const instruction = 'extract article content';
    
    const result = await executor.executeExtraction({
      instruction,
      schema,
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.instruction).toBe(instruction);
    expect(result.schema).toBe(schema);
    expect(result.status).toBe('success');
    expect(result.data).toBeDefined();
  });

  it('should handle extraction failures gracefully', async () => {
    // Mock a failing extraction
    const mockStagehand = require('@browserbasehq/stagehand');
    mockStagehand.Stagehand.mockImplementationOnce(() => ({
      init: jest.fn(),
      page: {
        extract: jest.fn().mockRejectedValue(new Error('Extraction failed')),
      },
      close: jest.fn(),
    }));

    const executor = new ExtractionExecutor('test-session');
    const schema = EXTRACTION_SCHEMAS.article;
    const instruction = 'extract article content';
    
    const result = await executor.executeExtraction({
      instruction,
      schema,
    });

    expect(result).toBeDefined();
    expect(result.status).toBe('failed');
    expect(result.error).toBeDefined();
  });

  it('should persist extraction results to memory', async () => {
    const mem0Client = require('@/lib/mem0').mem0Client;
    
    const schema = EXTRACTION_SCHEMAS.article;
    const instruction = 'extract article content';
    
    await executor.executeExtraction({
      instruction,
      schema,
    });

    expect(mem0Client.addExtractionMemory).toHaveBeenCalled();
  });
});

describe('Data Validation', () => {
  it('should validate extracted data against schema', () => {
    const schema = z.object({
      title: z.string(),
      content: z.string(),
    });

    const validData = {
      title: 'Test Title',
      content: 'Test Content',
    };

    const result = validateExtractedData(schema, validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  it('should reject invalid data', () => {
    const schema = z.object({
      title: z.string(),
      content: z.string(),
    });

    const invalidData = {
      title: 123, // Should be string
      content: 'Test Content',
    };

    const result = validateExtractedData(schema, invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });
});