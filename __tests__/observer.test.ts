import { z } from 'zod';
import { ObservationExecutor } from '@/app/(agent)/observer';
import { OBSERVATION_SCHEMAS, Element } from '@/lib/observation-schemas';

// Mock Stagehand
jest.mock('@browserbasehq/stagehand', () => ({
  Stagehand: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    page: {
      observe: jest.fn().mockResolvedValue([
        {
          selector: '//button[@class="btn-primary"]',
          description: 'Primary action button',
        },
        {
          selector: '//input[@type="text"]',
          description: 'Text input field',
        },
        {
          selector: '//a[@href="/login"]',
          description: 'Login link',
        },
      ]),
    },
    close: jest.fn(),
  })),
}));

// Mock Mem0
jest.mock('@/lib/mem0', () => ({
  mem0Client: {
    addObservationMemory: jest.fn().mockResolvedValue({ id: 'test-memory' }),
    getObservationHistory: jest.fn().mockResolvedValue([]),
  },
}));

// Mock AI client
jest.mock('@/lib/ai', () => ({
  aiClient: {
    generateText: jest.fn().mockResolvedValue({
      text: 'button, input, link',
    }),
  },
}));

// Mock retry utility
jest.mock('@/lib/retry', () => ({
  retryWithBackoff: jest.fn().mockImplementation(async (fn: () => Promise<any>) => {
    return await fn();
  }),
}));

describe('Observation Schemas', () => {
  describe('Element Schema', () => {
    it('should validate element observation data', () => {
      const ElementSchema = OBSERVATION_SCHEMAS.element;

      const validElement = {
        selector: '//button[@class="btn-primary"]',
        description: 'Primary action button',
        category: 'button',
        attributes: {
          class: 'btn-primary',
          type: 'button',
        },
        text: 'Submit',
        isVisible: true,
        isInteractive: true,
      };

      expect(() => ElementSchema.parse(validElement)).not.toThrow();
    });

    it('should reject invalid element data', () => {
      const ElementSchema = OBSERVATION_SCHEMAS.element;

      const invalidElement = {
        selector: 123, // Should be string
        description: 'Primary action button',
      };

      expect(() => ElementSchema.parse(invalidElement)).toThrow();
    });
  });

  describe('Page Structure Schema', () => {
    it('should validate page structure observation data', () => {
      const PageStructureSchema = OBSERVATION_SCHEMAS.pageStructure;

      const validPageStructure = {
        title: 'Test Page',
        url: 'https://example.com',
        elements: [
          {
            selector: '//button[@class="btn-primary"]',
            description: 'Primary action button',
            category: 'button',
          },
          {
            selector: '//input[@type="text"]',
            description: 'Text input field',
            category: 'input',
          },
        ],
        sections: [
          {
            name: 'Header',
            elements: ['//nav', '//header'],
          },
          {
            name: 'Main Content',
            elements: ['//main', '//article'],
          },
        ],
      };

      expect(() => PageStructureSchema.parse(validPageStructure)).not.toThrow();
    });
  });

  describe('Interactive Elements Schema', () => {
    it('should validate interactive elements observation data', () => {
      const InteractiveElementsSchema = OBSERVATION_SCHEMAS.interactiveElements;

      const validInteractiveElements = {
        buttons: [
          {
            selector: '//button[@class="btn-primary"]',
            description: 'Primary action button',
            category: 'button',
            text: 'Submit',
            isEnabled: true,
            isVisible: true,
            isInteractive: true,
          },
        ],
        inputs: [
          {
            selector: '//input[@type="text"]',
            description: 'Text input field',
            category: 'input',
            inputType: 'text',
            placeholder: 'Enter text',
            isRequired: true,
            isVisible: true,
            isInteractive: true,
          },
        ],
        links: [
          {
            selector: '//a[@href="/login"]',
            description: 'Login link',
            category: 'link',
            text: 'Login',
            href: '/login',
            isVisible: true,
            isInteractive: true,
          },
        ],
        totalCount: 3,
      };

      expect(() => InteractiveElementsSchema.parse(validInteractiveElements)).not.toThrow();
    });
  });
});

describe('Observation Executor', () => {
  let executor: ObservationExecutor;

  beforeEach(() => {
    executor = new ObservationExecutor('test-session');
  });

  it('should execute observation with valid instruction', async () => {
    const instruction = 'observe all interactive elements on the page';
    
    const result = await executor.executeObservation({
      instruction,
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.instruction).toBe(instruction);
    expect(result.status).toBe('success');
    expect(result.elements).toBeDefined();
    expect(Array.isArray(result.elements)).toBe(true);
  });

  it('should categorize elements by type', async () => {
    const instruction = 'observe all buttons and inputs';
    
    const result = await executor.executeObservation({
      instruction,
    });

    expect(result).toBeDefined();
    expect(result.elements).toBeDefined();
    
    // Check that elements are properly categorized
    const buttons = result.elements.filter((el: Element) => el.category === 'button');
    const inputs = result.elements.filter((el: Element) => el.category === 'input');
    
    expect(buttons.length).toBeGreaterThan(0);
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('should handle observation failures gracefully', async () => {
    // Mock a failing observation
    const mockStagehand = require('@browserbasehq/stagehand');
    mockStagehand.Stagehand.mockImplementationOnce(() => ({
      init: jest.fn(),
      page: {
        observe: jest.fn().mockRejectedValue(new Error('Observation failed')),
      },
      close: jest.fn(),
    }));

    const executor = new ObservationExecutor('test-session');
    const instruction = 'observe all interactive elements';
    
    const result = await executor.executeObservation({
      instruction,
    });

    expect(result).toBeDefined();
    expect(result.status).toBe('failed');
    expect(result.error).toBeDefined();
  });

  it('should persist observation results to memory', async () => {
    const mem0Client = require('@/lib/mem0').mem0Client;
    
    const instruction = 'observe all interactive elements';
    
    await executor.executeObservation({
      instruction,
    });

    expect(mem0Client.addObservationMemory).toHaveBeenCalled();
  });

  it('should filter elements by category', async () => {
    const instruction = 'observe all buttons';
    
    const result = await executor.executeObservation({
      instruction,
      filters: {
        categories: ['button'],
      },
    });

    expect(result).toBeDefined();
    expect(result.elements).toBeDefined();
    
    // All elements should be buttons
    result.elements.forEach((element: Element) => {
      expect(element.category).toBe('button');
    });
  });

  it('should search elements by description', async () => {
    const instruction = 'observe all interactive elements';
    
    const result = await executor.executeObservation({
      instruction,
      searchQuery: 'login',
    });

    expect(result).toBeDefined();
    expect(result.elements).toBeDefined();
    
    // At least one element should contain 'login' in description
    const hasLoginElement = result.elements.some((element: Element) => 
      element.description.toLowerCase().includes('login')
    );
    expect(hasLoginElement).toBe(true);
  });
});

describe('Element Categorization', () => {
  it('should categorize elements correctly', () => {
    const executor = new ObservationExecutor('test-session');
    
    const elements = [
      {
        selector: '//button[@class="btn-primary"]',
        description: 'Primary action button',
        category: 'button' as const,
        isVisible: true,
        isInteractive: true,
      },
      {
        selector: '//input[@type="text"]',
        description: 'Text input field',
        category: 'input' as const,
        isVisible: true,
        isInteractive: true,
      },
      {
        selector: '//a[@href="/login"]',
        description: 'Login link',
        category: 'link' as const,
        isVisible: true,
        isInteractive: true,
      },
      {
        selector: '//div[@class="content"]',
        description: 'Content container',
        category: 'container' as const,
        isVisible: true,
        isInteractive: false,
      },
    ];

    const categorized = executor.categorizeElements(elements);
    
    expect(categorized.button).toBe(1);
    expect(categorized.input).toBe(1);
    expect(categorized.link).toBe(1);
    expect(categorized.container).toBe(1);
  });
});

describe('Semantic Search', () => {
  it('should find elements by semantic description', () => {
    const executor = new ObservationExecutor('test-session');
    
    const elements = [
      {
        selector: '//button[@class="btn-primary"]',
        description: 'Primary action button',
        category: 'button' as const,
        isVisible: true,
        isInteractive: true,
      },
      {
        selector: '//input[@type="text"]',
        description: 'Text input field',
        category: 'input' as const,
        isVisible: true,
        isInteractive: true,
      },
      {
        selector: '//a[@href="/login"]',
        description: 'Login link',
        category: 'link' as const,
        isVisible: true,
        isInteractive: true,
      },
    ];

    const searchResults = executor.searchElements(elements, 'login');
    
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].description.toLowerCase()).toContain('login');
  });

  it('should find elements by multiple keywords', () => {
    const executor = new ObservationExecutor('test-session');
    
    const elements = [
      {
        selector: '//button[@class="btn-primary"]',
        description: 'Primary action button',
        category: 'button' as const,
        isVisible: true,
        isInteractive: true,
      },
      {
        selector: '//input[@type="text"]',
        description: 'Text input field',
        category: 'input' as const,
        isVisible: true,
        isInteractive: true,
      },
      {
        selector: '//a[@href="/login"]',
        description: 'Login link',
        category: 'link' as const,
        isVisible: true,
        isInteractive: true,
      },
    ];

    const searchResults = executor.searchElements(elements, 'button primary');
    
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].description.toLowerCase()).toContain('primary');
  });
});
