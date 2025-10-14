"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Zap,
  Target,
  TrendingUp
} from "lucide-react";
import { WorkflowSummary as WorkflowSummaryType, SUMMARY_STATUS_COLORS } from "@/lib/workflow-log";
import { useToast } from "@/hooks/use-toast";

interface WorkflowSummaryProps {
  summary: WorkflowSummaryType | null;
  onRegenerate?: () => void;
  className?: string;
}

export default function WorkflowSummary({ 
  summary, 
  onRegenerate, 
  className 
}: WorkflowSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { toast } = useToast();

  if (!summary) {
    return null;
  }

  const getStatusIcon = () => {
    switch (summary.status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'partial':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = () => {
    switch (summary.status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Success</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Partial</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Failed</Badge>;
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Processing</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleCopySummary = () => {
    const text = `${summary.title}\n\n${summary.summary}\n\nKey Points:\n${summary.keyPoints.map(point => `• ${point}`).join('\n')}\n\nRecommendations:\n${summary.recommendations.map(rec => `• ${rec}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    toast({
      title: "Summary Copied",
      description: "Workflow summary has been copied to clipboard.",
    });
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <Card className={`${className} ${SUMMARY_STATUS_COLORS[summary.status]}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-lg font-semibold">{summary.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge()}
              <span className="text-sm text-muted-foreground">
                {formatDuration(summary.metrics.duration)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopySummary}
          >
            <Copy className="h-4 w-4" />
          </Button>
          {onRegenerate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRegenerate}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Summary */}
          <div>
            <p className="text-sm text-muted-foreground">{summary.summary}</p>
          </div>

          {/* Key Points */}
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Target className="h-4 w-4" />
              What Happened
            </h4>
            <ul className="space-y-1">
              {summary.keyPoints.map((point, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Error Analysis */}
          {summary.errorAnalysis && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Why It Didn't Work
              </h4>
              <p className="text-sm text-muted-foreground">{summary.errorAnalysis}</p>
            </div>
          )}

          {/* Recommendations */}
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Recommendations
            </h4>
            <ul className="space-y-1">
              {summary.recommendations.map((rec, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Metrics */}
          <div className="pt-2 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium">{formatDuration(summary.metrics.duration)}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Steps:</span>
                <span className="font-medium">{summary.metrics.stepsCompleted}/{summary.metrics.totalSteps}</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Success Rate:</span>
                <span className="font-medium">{(summary.metrics.successRate * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Completed:</span>
                <span className="font-medium">{new Date(summary.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
