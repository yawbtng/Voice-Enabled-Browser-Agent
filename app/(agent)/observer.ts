import { Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig from "@/stagehand.config";
import { mem0Client } from "@/lib/mem0";
import { retryWithBackoff } from "@/lib/retry";
import { 
  ObservationResult, 
  Element, 
  ElementSearchResult,
  categorizeElementByDescription,
  isElementInteractive
} from "@/lib/observation-schemas";

export interface ObservationRequestOptions {
  instruction: string;
  filters?: {
    categories?: string[];
    isVisible?: boolean;
    isInteractive?: boolean;
  };
  searchQuery?: string;
  maxElements?: number;
}

export class ObservationExecutor {
  private stagehand: Stagehand;
  private sessionId: string;

  constructor(sessionId: string) {
    this.stagehand = new Stagehand(StagehandConfig);
    this.sessionId = sessionId;
  }

  async init() {
    await this.stagehand.init();
    
    // Navigate to a default page to ensure Stagehand scripts are injected
    const page = this.stagehand.page;
    try {
      await page.goto('https://www.google.com');
      // Wait for Stagehand scripts to be injected
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    } catch (error) {
      console.warn('Failed to navigate to default page:', error);
    }
  }

  /**
   * Execute observation with enhanced element categorization and semantic search
   */
  async executeObservation(request: ObservationRequestOptions): Promise<ObservationResult> {
    const observationId = `observation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result: ObservationResult = {
      id: observationId,
      instruction: request.instruction,
      elements: [],
      categories: {},
      totalElements: 0,
      status: 'failed',
      timestamp: Date.now(),
      retryCount: 0,
    };

    try {
      // Execute observation with retry logic
      const rawElements = await retryWithBackoff(
        async () => {
          return await this.performObservation(request.instruction);
        },
        {
          maxAttempts: 3,
          baseDelay: 1000,
          backoffStrategy: 'exponential',
        }
      );

      // Enhance elements with categorization and metadata
      const enhancedElements = this.enhanceElements(rawElements);

      // Apply filters
      let filteredElements = this.applyFilters(enhancedElements, request.filters);

      // Apply search query if provided
      if (request.searchQuery) {
        filteredElements = this.searchElements(filteredElements, request.searchQuery);
      }

      // Limit results
      if (request.maxElements && filteredElements.length > request.maxElements) {
        filteredElements = filteredElements.slice(0, request.maxElements);
      }

      // Categorize elements
      const categories = this.categorizeElements(filteredElements);

      result.elements = filteredElements;
      result.categories = categories;
      result.totalElements = filteredElements.length;
      result.status = 'success';

      // Store successful observation in memory
      await mem0Client.addObservationMemory(
        this.sessionId,
        result.instruction,
        result.elements,
        true
      );

    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Store failed observation in memory
      await mem0Client.addObservationMemory(
        this.sessionId,
        result.instruction,
        { error: result.error },
        false
      );
    }

    return result;
  }

  /**
   * Perform the actual observation using Stagehand
   */
  private async performObservation(instruction: string): Promise<Array<{ selector: string; description: string }>> {
    const page = this.stagehand.page;

    try {
      // Wait for page to be ready and Stagehand scripts to be injected
      await page.waitForLoadState('networkidle');
      
      // Wait a bit more for Stagehand scripts to initialize
      await page.waitForTimeout(2000);

      const result = await page.observe({
        instruction,
      });

      return result;
    } catch (error) {
      console.error('Stagehand observation failed:', error);
      throw new Error(`Observation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enhance raw elements with categorization and metadata
   */
  private enhanceElements(rawElements: Array<{ selector: string; description: string }>): Element[] {
    return rawElements.map(element => {
      const category = categorizeElementByDescription(element.description);
      
      return {
        selector: element.selector,
        description: element.description,
        category,
        isVisible: true, // Assume visible unless proven otherwise
        isInteractive: isElementInteractive(category),
        attributes: this.extractAttributesFromSelector(element.selector),
        text: this.extractTextFromDescription(element.description),
      };
    });
  }

  /**
   * Apply filters to elements
   */
  private applyFilters(elements: Element[], filters?: ObservationRequestOptions['filters']): Element[] {
    if (!filters) return elements;

    return elements.filter(element => {
      // Category filter
      if (filters.categories && filters.categories.length > 0) {
        if (!filters.categories.includes(element.category)) {
          return false;
        }
      }

      // Visibility filter
      if (filters.isVisible !== undefined) {
        if (element.isVisible !== filters.isVisible) {
          return false;
        }
      }

      // Interactivity filter
      if (filters.isInteractive !== undefined) {
        if (element.isInteractive !== filters.isInteractive) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Search elements by semantic description
   */
  searchElements(elements: Element[], query: string): Element[] {
    const keywords = query.toLowerCase().split(/\s+/).filter(keyword => keyword.length > 0);
    
    return elements.filter(element => {
      const searchableText = [
        element.description,
        element.text,
        element.category,
        ...Object.values(element.attributes || {}),
      ].join(' ').toLowerCase();

      // Check if all keywords are present in the searchable text
      return keywords.every(keyword => searchableText.includes(keyword));
    });
  }

  /**
   * Categorize elements by type
   */
  categorizeElements(elements: Element[]): Record<string, number> {
    const categories: Record<string, number> = {};
    
    elements.forEach(element => {
      categories[element.category] = (categories[element.category] || 0) + 1;
    });

    return categories;
  }

  /**
   * Extract attributes from XPath selector
   */
  private extractAttributesFromSelector(selector: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    
    // Simple regex to extract attributes from XPath
    const attrMatches = selector.match(/@(\w+)="([^"]+)"/g);
    if (attrMatches) {
      attrMatches.forEach(match => {
        const [, name, value] = match.match(/@(\w+)="([^"]+)"/) || [];
        if (name && value) {
          attributes[name] = value;
        }
      });
    }

    return attributes;
  }

  /**
   * Extract text content from description
   */
  private extractTextFromDescription(description: string): string | undefined {
    // Look for quoted text in description
    const textMatch = description.match(/"([^"]+)"/);
    return textMatch ? textMatch[1] : undefined;
  }

  /**
   * Get observation history for this session
   */
  async getObservationHistory(): Promise<ObservationResult[]> {
    try {
      const memories = await mem0Client.getObservationHistory(this.sessionId);
      return memories.map(memory => ({
        id: memory.id || `memory_${Date.now()}`,
        instruction: memory.instruction,
        elements: memory.data?.elements || [],
        categories: memory.data?.categories || {},
        totalElements: memory.data?.totalElements || 0,
        status: memory.success ? 'success' : 'failed',
        timestamp: memory.timestamp,
        error: memory.success ? undefined : memory.data?.error,
        retryCount: 0,
      }));
    } catch (error) {
      console.error('Failed to get observation history:', error);
      return [];
    }
  }

  /**
   * Batch observe multiple instructions
   */
  async batchObserve(instructions: string[]): Promise<ObservationResult[]> {
    const results: ObservationResult[] = [];

    for (const instruction of instructions) {
      try {
        const result = await this.executeObservation({
          instruction,
        });
        results.push(result);
      } catch (error) {
        results.push({
          id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          instruction,
          elements: [],
          categories: {},
          totalElements: 0,
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
   * Get interactive elements only
   */
  async getInteractiveElements(instruction: string = 'observe all interactive elements'): Promise<Element[]> {
    const result = await this.executeObservation({
      instruction,
      filters: {
        isInteractive: true,
      },
    });

    return result.elements;
  }

  /**
   * Get elements by category
   */
  async getElementsByCategory(category: string, instruction?: string): Promise<Element[]> {
    const defaultInstruction = `observe all ${category} elements`;
    
    const result = await this.executeObservation({
      instruction: instruction || defaultInstruction,
      filters: {
        categories: [category],
      },
    });

    return result.elements;
  }

  /**
   * Search for elements with semantic query
   */
  async searchForElements(query: string, instruction?: string): Promise<ElementSearchResult> {
    const defaultInstruction = `observe all elements`;
    
    const result = await this.executeObservation({
      instruction: instruction || defaultInstruction,
      searchQuery: query,
    });

    return {
      query,
      results: result.elements,
      totalResults: result.elements.length,
      categories: result.categories,
    };
  }

  /**
   * Get page structure analysis
   */
  async getPageStructure(instruction: string = 'observe page structure and layout'): Promise<{
    elements: Element[];
    sections: Array<{ name: string; elements: string[]; description?: string }>;
    interactiveElements: {
      buttons: Element[];
      inputs: Element[];
      links: Element[];
    };
  }> {
    const result = await this.executeObservation({
      instruction,
    });

    const buttons = result.elements.filter(el => el.category === 'button');
    const inputs = result.elements.filter(el => el.category === 'input');
    const links = result.elements.filter(el => el.category === 'link');

    // Group elements into sections based on common patterns
    const sections = this.groupElementsIntoSections(result.elements);

    return {
      elements: result.elements,
      sections,
      interactiveElements: {
        buttons,
        inputs,
        links,
      },
    };
  }

  /**
   * Group elements into logical sections
   */
  private groupElementsIntoSections(elements: Element[]): Array<{ name: string; elements: string[]; description?: string }> {
    const sections: Array<{ name: string; elements: string[]; description?: string }> = [];
    
    // Simple grouping based on element types and descriptions
    const navigationElements = elements.filter(el => 
      el.category === 'navigation' || 
      el.description.toLowerCase().includes('nav') ||
      el.description.toLowerCase().includes('menu')
    );

    const formElements = elements.filter(el => 
      el.category === 'form' || 
      el.category === 'input' ||
      el.description.toLowerCase().includes('form')
    );

    const contentElements = elements.filter(el => 
      el.category === 'text' || 
      el.category === 'container' ||
      el.description.toLowerCase().includes('content')
    );

    if (navigationElements.length > 0) {
      sections.push({
        name: 'Navigation',
        elements: navigationElements.map(el => el.selector),
        description: 'Navigation and menu elements',
      });
    }

    if (formElements.length > 0) {
      sections.push({
        name: 'Forms',
        elements: formElements.map(el => el.selector),
        description: 'Form inputs and controls',
      });
    }

    if (contentElements.length > 0) {
      sections.push({
        name: 'Content',
        elements: contentElements.map(el => el.selector),
        description: 'Main content areas',
      });
    }

    return sections;
  }

  async close() {
    await this.stagehand.close();
  }
}
