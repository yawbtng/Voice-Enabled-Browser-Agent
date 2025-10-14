import { RetryPolicy } from "@/lib/schema";

/**
 * Calculate the delay for a retry attempt based on the retry policy
 */
export function calculateBackoffDelay(policy: RetryPolicy, attemptNumber: number): number {
  const { backoffStrategy, baseDelay } = policy;
  
  let delay: number;
  
  switch (backoffStrategy) {
    case "exponential":
      delay = baseDelay * Math.pow(2, attemptNumber);
      // Cap exponential backoff at 30 seconds
      return Math.min(delay, 30000);
      
    case "linear":
      delay = baseDelay * (attemptNumber + 1);
      return delay;
      
    case "fixed":
      return baseDelay;
      
    default:
      return baseDelay;
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy,
  context?: string
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < policy.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't wait after the last attempt
      if (attempt < policy.maxAttempts - 1) {
        const delay = calculateBackoffDelay(policy, attempt);
        console.log(
          `Retry attempt ${attempt + 1}/${policy.maxAttempts}${context ? ` for ${context}` : ""} failed, retrying in ${delay}ms...`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(
    `Function failed after ${policy.maxAttempts} attempts${context ? ` (${context})` : ""}: ${lastError!.message}`
  );
}

/**
 * Get default retry policy for different action types
 */
export function getDefaultRetryPolicy(action: string): RetryPolicy {
  const policies: Record<string, RetryPolicy> = {
    navigate: {
      maxAttempts: 3,
      backoffStrategy: "exponential",
      baseDelay: 1000,
    },
    click: {
      maxAttempts: 5,
      backoffStrategy: "exponential",
      baseDelay: 1000,
    },
    type: {
      maxAttempts: 2,
      backoffStrategy: "linear",
      baseDelay: 500,
    },
    scroll: {
      maxAttempts: 3,
      backoffStrategy: "fixed",
      baseDelay: 1000,
    },
    search: {
      maxAttempts: 3,
      backoffStrategy: "exponential",
      baseDelay: 1000,
    },
    extract: {
      maxAttempts: 2,
      backoffStrategy: "linear",
      baseDelay: 1000,
    },
    observe: {
      maxAttempts: 2,
      backoffStrategy: "fixed",
      baseDelay: 500,
    },
    wait: {
      maxAttempts: 1,
      backoffStrategy: "fixed",
      baseDelay: 0,
    },
    screenshot: {
      maxAttempts: 3,
      backoffStrategy: "exponential",
      baseDelay: 1000,
    },
  };
  
  return policies[action] || {
    maxAttempts: 3,
    backoffStrategy: "exponential",
    baseDelay: 1000,
  };
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  // Network errors are usually retryable
  if (error.message.includes("timeout") || 
      error.message.includes("network") ||
      error.message.includes("connection")) {
    return true;
  }
  
  // Element not found errors are retryable (element might appear later)
  if (error.message.includes("not found") ||
      error.message.includes("not visible") ||
      error.message.includes("not attached")) {
    return true;
  }
  
  // Generic automation errors are retryable
  if (error.message.includes("element") ||
      error.message.includes("selector") ||
      error.message.includes("click")) {
    return true;
  }
  
  // Non-retryable errors
  if (error.message.includes("permission") ||
      error.message.includes("blocked") ||
      error.message.includes("forbidden")) {
    return false;
  }
  
  // Default to retryable for unknown errors
  return true;
}
