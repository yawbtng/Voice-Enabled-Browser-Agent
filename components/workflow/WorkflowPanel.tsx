"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2, 
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Square
} from "lucide-react";
import { type WorkflowState, type Workflow } from "@/lib/schema";
import WorkflowStepCard from "./WorkflowStepCard";

interface WorkflowPanelProps {
  workflow?: Workflow;
  state?: WorkflowState;
  onRetryStep?: (stepId: string) => void;
  onRollbackToStep?: (stepIndex: number) => void;
  onCancelWorkflow?: () => void;
  className?: string;
}

export default function WorkflowPanel({ 
  workflow, 
  state, 
  onRetryStep, 
  onRollbackToStep, 
  onCancelWorkflow,
  className 
}: WorkflowPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getStatusIcon = (status: WorkflowState["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "cancelled":
        return <Square className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: WorkflowState["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "running":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "cancelled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getProgressPercentage = () => {
    if (!workflow || !state) return 0;
    return Math.round((state.completedSteps.length / workflow.steps.length) * 100);
  };

  const getCurrentStep = () => {
    if (!workflow || !state) return null;
    return workflow.steps[state.currentStepIndex] || null;
  };

  const getStepStatus = (stepId: string) => {
    if (!state) return "pending";
    
    if (state.completedSteps.includes(stepId)) return "completed";
    if (state.failedSteps.includes(stepId)) return "failed";
    if (state.currentStepIndex >= 0 && workflow?.steps[state.currentStepIndex]?.id === stepId) return "running";
    return "pending";
  };

  if (!workflow || !state) {
    return (
      <Card className={`${className} ${isCollapsed ? 'h-auto' : 'h-96'}`}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Workflow Status</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
        
        {!isCollapsed && (
          <div className="p-8 text-center text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No active workflow</p>
            <p className="text-sm">Start a multi-step command to see workflow progress</p>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className={`${className} ${isCollapsed ? 'h-auto' : 'h-96'}`}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">{workflow.name}</h3>
          <div className="flex items-center gap-2">
            {getStatusIcon(state.status)}
            <Badge 
              variant="secondary" 
              className={`text-xs ${getStatusColor(state.status)}`}
            >
              {state.status}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {state.completedSteps.length}/{workflow.steps.length} steps
          </Badge>
          <Badge variant="outline">
            {getProgressPercentage()}% complete
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="p-4">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{getProgressPercentage()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>

          {/* Workflow Info */}
          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">
              {workflow.description}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Started: {formatTimestamp(state.startedAt)}</span>
              {state.error && (
                <span className="text-red-600 dark:text-red-400">
                  Error: {state.error}
                </span>
              )}
            </div>
          </div>

          {/* Steps */}
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {workflow.steps.map((step, index) => (
                <WorkflowStepCard
                  key={step.id}
                  step={step}
                  stepIndex={index}
                  status={getStepStatus(step.id)}
                  retryCount={state.retryCounts[step.id] || 0}
                  onRetry={() => onRetryStep?.(step.id)}
                  onRollback={() => onRollbackToStep?.(index)}
                />
              ))}
            </div>
          </ScrollArea>

          {/* Action Buttons */}
          {state.status === "failed" && (
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const failedStep = workflow.steps.find(step => 
                    state.failedSteps.includes(step.id)
                  );
                  if (failedStep) {
                    onRetryStep?.(failedStep.id);
                  }
                }}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Retry Failed Step
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const lastCompletedIndex = Math.max(0, state.completedSteps.length - 1);
                  onRollbackToStep?.(lastCompletedIndex);
                }}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Rollback
              </Button>
            </div>
          )}

          {state.status === "running" && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onCancelWorkflow}
              >
                <Square className="h-4 w-4 mr-1" />
                Cancel Workflow
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
