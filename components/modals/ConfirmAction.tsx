"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { type Intent } from "@/lib/schema";

interface ConfirmActionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intent: Intent | null;
  confirmationPrompt: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmAction({
  open,
  onOpenChange,
  intent,
  confirmationPrompt,
  onConfirm,
  onCancel,
}: ConfirmActionProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
    } finally {
      setIsProcessing(false);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  if (!intent) return null;

  const getActionIcon = (action: string) => {
    switch (action) {
      case "navigate":
        return "🌐";
      case "click":
        return "👆";
      case "type":
        return "⌨️";
      case "scroll":
        return "📜";
      case "search":
        return "🔍";
      case "extract":
        return "📊";
      case "observe":
        return "👁️";
      case "wait":
        return "⏳";
      case "screenshot":
        return "📸";
      default:
        return "❓";
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "navigate":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "click":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "type":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "scroll":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "search":
        return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200";
      case "extract":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200";
      case "observe":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
      case "wait":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "screenshot":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Confirm Action
          </DialogTitle>
          <DialogDescription>
            This action requires confirmation before execution.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Action Details */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
            <div className="text-2xl">{getActionIcon(intent.action)}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={getActionColor(intent.action)}>
                  {intent.action}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Confidence: {Math.round(intent.confidence * 100)}%
                </span>
              </div>
              
              {intent.target && (
                <p className="text-sm font-medium">
                  Target: <code className="bg-muted px-1 rounded">{intent.target}</code>
                </p>
              )}
              
              {intent.value && (
                <p className="text-sm font-medium">
                  Value: <code className="bg-muted px-1 rounded">"{intent.value}"</code>
                </p>
              )}
            </div>
          </div>

          {/* Confirmation Prompt */}
          <div className="p-3 rounded-lg border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {confirmationPrompt}
            </p>
          </div>

          {/* Risk Warning */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700 dark:text-red-300">
              <p className="font-medium mb-1">Sensitive Action Detected</p>
              <p>This action may involve:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Accessing personal information</li>
                <li>Making purchases or payments</li>
                <li>Submitting forms with sensitive data</li>
                <li>Logging into accounts</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isProcessing}
            className="flex items-center gap-2"
          >
            <XCircle className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
          >
            {isProcessing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Confirm & Execute
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
