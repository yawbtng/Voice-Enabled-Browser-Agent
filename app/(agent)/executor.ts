import { Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig from "@/stagehand.config";
import { BrowserActionSchema, type BrowserAction, type Intent } from "@/lib/schema";
import { mem0Client } from "@/lib/mem0";
import { aiClient } from "@/lib/ai";

export class BrowserExecutor {
  private stagehand: Stagehand;
  private sessionId: string;

  constructor(sessionId: string) {
    this.stagehand = new Stagehand(StagehandConfig);
    this.sessionId = sessionId;
  }

  async init() {
    await this.stagehand.init();
  }

  async executeAction(intent: Intent): Promise<BrowserAction> {
    const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const browserAction: BrowserAction = {
      id: actionId,
      intent,
      status: "pending",
      timestamp: Date.now(),
    };

    try {
      browserAction.status = "running";
      
      const page = this.stagehand.page;
      let result: any;

      switch (intent.action) {
        case "navigate":
          result = await this.handleNavigate(page, intent);
          break;
        case "click":
          result = await this.handleClick(page, intent);
          break;
        case "type":
          result = await this.handleType(page, intent);
          break;
        case "scroll":
          result = await this.handleScroll(page, intent);
          break;
        case "search":
          result = await this.handleSearch(page, intent);
          break;
        case "extract":
          result = await this.handleExtract(page, intent);
          break;
        case "observe":
          result = await this.handleObserve(page, intent);
          break;
        case "wait":
          result = await this.handleWait(page, intent);
          break;
        case "screenshot":
          result = await this.handleScreenshot(page, intent);
          break;
        default:
          throw new Error(`Unknown action: ${intent.action}`);
      }

      browserAction.status = "success";
      browserAction.result = result;

      // Store action in memory
      await mem0Client.addActionMemory(
        this.sessionId,
        intent.action,
        result,
        true
      );

    } catch (error) {
      browserAction.status = "failed";
      browserAction.error = error instanceof Error ? error.message : "Unknown error";
      
      // Store failed action in memory
      await mem0Client.addActionMemory(
        this.sessionId,
        intent.action,
        { error: browserAction.error },
        false
      );
    }

    return browserAction;
  }

  private async handleNavigate(page: any, intent: Intent) {
    const url = intent.value || intent.target;
    if (!url) {
      throw new Error("No URL provided for navigation");
    }

    try {
      await page.goto(url);
    } catch (error) {
      await page.act({
        action: `Navigate to ${url}`,
      });
    }

    return { url, success: true };
  }

  private async handleClick(page: any, intent: Intent) {
    const target = intent.target;
    if (!target) {
      throw new Error("No target provided for click action");
    }

    try {
      await page.locator(target).click();
    } catch (error) {
      await page.act({
        action: `Click on ${target}`,
      });
    }

    return { target, success: true };
  }

  private async handleType(page: any, intent: Intent) {
    const target = intent.target;
    const value = intent.value;
    
    if (!target || !value) {
      throw new Error("Target and value required for type action");
    }

    try {
      await page.locator(target).fill(value);
    } catch (error) {
      await page.act({
        action: `Type "${value}" into ${target}`,
      });
    }

    return { target, value, success: true };
  }

  private async handleScroll(page: any, intent: Intent) {
    const direction = intent.value || "down";
    const target = intent.target;

    try {
      if (target) {
        await page.locator(target).scrollIntoViewIfNeeded();
      } else {
        await page.evaluate((dir) => {
          const scrollAmount = dir === "up" ? -500 : 500;
          window.scrollBy(0, scrollAmount);
        }, direction);
      }
    } catch (error) {
      await page.act({
        action: `Scroll ${direction}${target ? ` to ${target}` : ""}`,
      });
    }

    return { direction, target, success: true };
  }

  private async handleSearch(page: any, intent: Intent) {
    const query = intent.value;
    if (!query) {
      throw new Error("No search query provided");
    }

    try {
      // Try to find a search input and search button
      await page.locator('input[type="search"], input[name*="search"], input[placeholder*="search"]').fill(query);
      await page.locator('button[type="submit"], button:has-text("Search"), input[type="submit"]').click();
    } catch (error) {
      await page.act({
        action: `Search for "${query}"`,
      });
    }

    return { query, success: true };
  }

  private async handleExtract(page: any, intent: Intent) {
    const instruction = intent.value || "Extract all visible text and data from the page";
    const schema = intent.parameters?.schema;

    try {
      const result = await page.extract({
        instruction,
        schema: schema || {
          type: "object",
          properties: {
            content: { type: "string" },
            links: { type: "array", items: { type: "string" } },
            images: { type: "array", items: { type: "string" } },
          },
        },
        useTextExtract: true,
      });

      return { instruction, result, success: true };
    } catch (error) {
      throw new Error(`Failed to extract data: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async handleObserve(page: any, intent: Intent) {
    const instruction = intent.value || "Observe the current page and describe what you see";

    try {
      const result = await page.observe({
        instruction,
      });

      return { instruction, result, success: true };
    } catch (error) {
      throw new Error(`Failed to observe page: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async handleWait(page: any, intent: Intent) {
    const duration = parseInt(intent.value || "1000");
    const target = intent.target;

    try {
      if (target) {
        await page.waitForSelector(target, { timeout: duration });
      } else {
        await page.waitForTimeout(duration);
      }
    } catch (error) {
      await page.act({
        action: `Wait for ${target || duration}ms`,
      });
    }

    return { duration, target, success: true };
  }

  private async handleScreenshot(page: any, intent: Intent) {
    try {
      const screenshot = await page.screenshot({ fullPage: true });
      const base64 = screenshot.toString('base64');
      
      return { 
        screenshot: `data:image/png;base64,${base64}`,
        success: true 
      };
    } catch (error) {
      throw new Error(`Failed to take screenshot: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async close() {
    await this.stagehand.close();
  }
}
