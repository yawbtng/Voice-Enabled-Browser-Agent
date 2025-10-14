import { Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig from "@/stagehand.config";
import { 
  WorkflowSchema, 
  WorkflowStateSchema,
  type Workflow, 
  type WorkflowStep, 
  type WorkflowState,
  type Checkpoint,
  type Intent 
} from "@/lib/schema";
import { mem0Client } from "@/lib/mem0";
import { retryWithBackoff, getDefaultRetryPolicy, isRetryableError } from "@/lib/retry";
import { BrowserExecutor } from "./executor";

export class WorkflowEngine {
  private stagehand: Stagehand;
  private sessionId: string;
  private workflowState: WorkflowState | null = null;
  private executor: BrowserExecutor | null = null;
  private workflowSteps: WorkflowStep[] = [];

  constructor(sessionId: string) {
    this.stagehand = new Stagehand(StagehandConfig);
    this.sessionId = sessionId;
  }

  async init() {
    await this.stagehand.init();
    this.executor = new BrowserExecutor(this.sessionId);
    await this.executor.init();
  }

  /**
   * Execute a complete workflow with error recovery and retries
   */
  async executeWorkflow(workflow: Workflow): Promise<WorkflowState> {
    // Validate workflow
    const validatedWorkflow = WorkflowSchema.parse(workflow);
    
    // Store workflow steps for reference
    this.workflowSteps = validatedWorkflow.steps;
    
    // Initialize workflow state
    this.workflowState = {
      workflowId: validatedWorkflow.id,
      currentStepIndex: 0,
      status: "running",
      startedAt: Date.now(),
      completedSteps: [],
      failedSteps: [],
      retryCounts: {},
      checkpoints: [],
      error: undefined,
    };

    try {
      // Execute steps in dependency order
      await this.executeSteps(validatedWorkflow.steps);
      
      this.workflowState.status = "completed";
      
      // Store successful workflow in memory
      await mem0Client.addWorkflowMemory(
        this.sessionId,
        validatedWorkflow,
        this.workflowState,
        true
      );
      
    } catch (error) {
      this.workflowState.status = "failed";
      this.workflowState.error = error instanceof Error ? error.message : "Unknown error";
      
      // Store failed workflow in memory
      await mem0Client.addWorkflowMemory(
        this.sessionId,
        validatedWorkflow,
        this.workflowState,
        false
      );
    }

    return this.workflowState;
  }

  /**
   * Execute workflow steps in dependency order
   */
  private async executeSteps(steps: WorkflowStep[]): Promise<void> {
    const executedSteps = new Set<string>();
    const stepMap = new Map(steps.map(step => [step.id, step]));

    while (executedSteps.size < steps.length) {
      const readySteps = steps.filter(step => 
        !executedSteps.has(step.id) &&
        step.dependencies.every(dep => executedSteps.has(dep))
      );

      if (readySteps.length === 0) {
        throw new Error("Circular dependency detected in workflow steps");
      }

      // Execute ready steps in parallel
      await Promise.all(
        readySteps.map(step => this.executeStep(step))
      );

      // Mark steps as executed
      readySteps.forEach(step => executedSteps.add(step.id));
    }
  }

  /**
   * Execute a single workflow step with retry logic
   */
  private async executeStep(step: WorkflowStep): Promise<void> {
    if (!this.workflowState) {
      throw new Error("Workflow state not initialized");
    }

    const stepId = step.id;
    const retryPolicy = step.retryPolicy || getDefaultRetryPolicy(step.action);
    
    // Initialize retry count
    if (!this.workflowState.retryCounts[stepId]) {
      this.workflowState.retryCounts[stepId] = 0;
    }

    try {
      // Save checkpoint before executing step
      await this.saveCheckpoint(step);

      // Convert workflow step to intent
      const intent: Intent = {
        action: step.action,
        target: step.target,
        value: step.value,
        parameters: step.parameters,
        confidence: step.confidence,
        requiresConfirmation: step.requiresConfirmation,
      };

      // Execute step with retry logic
      const result = await retryWithBackoff(
        () => this.executor!.executeAction(intent),
        retryPolicy,
        `step ${stepId}`
      );

      // Mark step as completed
      this.workflowState.completedSteps.push(stepId);
      this.workflowState.currentStepIndex = Math.max(
        this.workflowState.currentStepIndex,
        this.getStepIndex(stepId)
      );

      console.log(`Step ${stepId} completed successfully`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Check if error is retryable
      if (isRetryableError(error as Error) && 
          this.workflowState.retryCounts[stepId] < retryPolicy.maxAttempts - 1) {
        
        this.workflowState.retryCounts[stepId]++;
        console.log(`Step ${stepId} failed (attempt ${this.workflowState.retryCounts[stepId]}), retrying...`);
        
        // Retry the step
        await this.executeStep(step);
      } else {
        // Mark step as failed
        this.workflowState.failedSteps.push(stepId);
        throw new Error(`Step ${stepId} failed after ${this.workflowState.retryCounts[stepId]} attempts: ${errorMessage}`);
      }
    }
  }

  /**
   * Retry a specific failed step
   */
  async retryStep(stepId: string): Promise<void> {
    if (!this.workflowState) {
      throw new Error("No active workflow");
    }

    const step = this.getStepById(stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found`);
    }

    // Reset retry count for this step
    this.workflowState.retryCounts[stepId] = 0;
    
    // Remove from failed steps
    this.workflowState.failedSteps = this.workflowState.failedSteps.filter(id => id !== stepId);

    // Execute the step
    await this.executeStep(step);
  }

  /**
   * Rollback to a previous checkpoint
   */
  async rollbackToStep(stepIndex: number): Promise<void> {
    if (!this.workflowState) {
      throw new Error("No active workflow");
    }

    const checkpoint = this.workflowState.checkpoints.find(cp => cp.stepIndex === stepIndex);
    if (!checkpoint) {
      throw new Error(`No checkpoint found for step index ${stepIndex}`);
    }

    // Restore state from checkpoint
    this.workflowState.currentStepIndex = stepIndex;
    this.workflowState.completedSteps = this.workflowState.completedSteps.slice(0, stepIndex);
    this.workflowState.failedSteps = [];
    
    // Clear retry counts for steps after checkpoint
    const retryCounts = this.workflowState.retryCounts;
    Object.keys(retryCounts).forEach(stepId => {
      const stepIdx = this.getStepIndex(stepId);
      if (stepIdx > stepIndex) {
        delete retryCounts[stepId];
      }
    });

    console.log(`Rolled back to step index ${stepIndex}`);
  }

  /**
   * Save checkpoint for current state
   */
  private async saveCheckpoint(step: WorkflowStep): Promise<void> {
    if (!this.workflowState) return;

    const checkpoint: Checkpoint = {
      stepIndex: this.getStepIndex(step.id),
      timestamp: Date.now(),
      data: {
        url: await this.stagehand.page.url(),
        completedSteps: [...this.workflowState.completedSteps],
        retryCounts: { ...this.workflowState.retryCounts },
      },
    };

    this.workflowState.checkpoints.push(checkpoint);
  }

  /**
   * Get workflow state
   */
  getState(): WorkflowState | null {
    return this.workflowState;
  }

  /**
   * Get step by ID
   */
  private getStepById(stepId: string): WorkflowStep | null {
    return this.workflowSteps.find(step => step.id === stepId) || null;
  }

  /**
   * Get step index by ID
   */
  private getStepIndex(stepId: string): number {
    return this.workflowSteps.findIndex(step => step.id === stepId);
  }

  /**
   * Close the workflow engine
   */
  async close() {
    if (this.executor) {
      await this.executor.close();
    }
    await this.stagehand.close();
  }
}
