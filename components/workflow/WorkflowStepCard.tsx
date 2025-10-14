"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2, 
  RotateCcw,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { type WorkflowStep } from "@/lib/schema";

interface WorkflowStepCardProps {
  step: WorkflowStep;
  stepIndex: number;
  status: "pending" | "running" | "completed" | "failed";
  retryCount: number;
  onRetry?: () => void;
  onRollback?: () => void;
}

export default function WorkflowStepCard({ 
  step, 
  stepIndex, 
  status, 
  retryCount, 
  onRetry, 
  onRollback 
}: WorkflowStepCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = (status: WorkflowStepCardProps["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: WorkflowStepCardProps["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "running":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const formatStepDescription = (step: WorkflowStep) => {
    const { action, target, value } = step;
    
    switch (action) {
      case "navigate":
        return `Navigate to ${value || target}`;
      case "click":
        return `Click on ${target}`;
      case "type":
        return `Type "${value}" into ${target}`;
      case "scroll":
        return `Scroll ${value || "down"}${target ? ` to ${target}` : ""}`;
      case "search":
        return `Search for "${value}"`;
      case "extract":
        return `Extract data: ${value || "page content"}`;
      case "observe":
        return `Observe: ${value || "current page"}`;
      case "wait":
        return `Wait ${value || "1000ms"}${target ? ` for ${target}` : ""}`;
      case "screenshot":
        return "Take screenshot";
      default:
        return `${action} action`;
    }
  };

  const getRetryPolicyInfo = (step: WorkflowStep) => {
    const { maxAttempts, backoffStrategy, baseDelay } = step.retryPolicy;
    return `${maxAttempts} attempts, ${backoffStrategy} backoff (${baseDelay}ms)`;
  };

  return (
    <div className="border rounded-lg bg-card hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 p-3">
        <div className="flex-shrink-0">
          {getStatusIcon(status)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              Step {stepIndex + 1}
            </Badge>
            <Badge 
              variant="secondary" 
              className={`text-xs ${getStatusColor(status)}`}
            >
              {status}
            </Badge>
            {retryCount > 0 && (
              <Badge variant="outline" className="text-xs text-orange-600">
                {retryCount} retries
              </Badge>
            )}
            {step.requiresConfirmation && (
              <Badge variant="outline" className="text-xs text-yellow-600">
                Confirmation required
              </Badge>
            )}
          </div>
          
          <p className="text-sm font-medium">
            {formatStepDescription(step)}
          </p>
          
          {step.dependencies.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Depends on: {step.dependencies.join(", ")}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {status === "failed" && onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="h-8 w-8 p-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-3 pb-3 border-t bg-muted/20">
          <div className="pt-3 space-y-2">
            <div className="text-xs text-muted-foreground">
              <p><strong>Action:</strong> {step.action}</p>
              {step.target && <p><strong>Target:</strong> {step.target}</p>}
              {step.value && <p><strong>Value:</strong> {step.value}</p>}
              <p><strong>Confidence:</strong> {Math.round(step.confidence * 100)}%</p>
              <p><strong>Retry Policy:</strong> {getRetryPolicyInfo(step)}</p>
              {step.rollbackHandler && (
                <p><strong>Rollback:</strong> {step.rollbackHandler}</p>
              )}
            </div>
            
            {step.parameters && Object.keys(step.parameters).length > 0 && (
              <div className="text-xs">
                <p className="text-muted-foreground mb-1"><strong>Parameters:</strong></p>
                <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                  {JSON.stringify(step.parameters, null, 2)}
                </pre>
              </div>
            )}
            
            {status === "failed" && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Retry Step
                </Button>
                {onRollback && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRollback}
                    className="text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Rollback to Here
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
