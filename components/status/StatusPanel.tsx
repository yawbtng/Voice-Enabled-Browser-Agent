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
  Eye,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { type BrowserAction } from "@/lib/schema";

interface StatusPanelProps {
  actions: BrowserAction[];
  onScreenshotClick?: (screenshot: string) => void;
  className?: string;
}

export default function StatusPanel({ actions, onScreenshotClick, className }: StatusPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getStatusIcon = (status: BrowserAction["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: BrowserAction["status"]) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "running":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatActionDescription = (action: BrowserAction) => {
    const { action: actionType, target, value } = action.intent;
    
    switch (actionType) {
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
        return `${actionType} action`;
    }
  };

  return (
    <Card className={`${className} ${isCollapsed ? 'h-auto' : 'h-96'}`}>
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">Action Status</h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{actions.length} actions</Badge>
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
        <ScrollArea className="h-80">
          <div className="p-4 space-y-3">
            {actions.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No actions yet</p>
                <p className="text-sm">Start by recording a voice command</p>
              </div>
            ) : (
              actions
                .slice()
                .reverse()
                .map((action) => (
                  <div
                    key={action.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getStatusIcon(action.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getStatusColor(action.status)}`}
                        >
                          {action.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(action.timestamp)}
                        </span>
                      </div>
                      
                      <p className="text-sm font-medium mb-1">
                        {formatActionDescription(action)}
                      </p>
                      
                      {action.error && (
                        <p className="text-xs text-red-600 dark:text-red-400 mb-2">
                          Error: {action.error}
                        </p>
                      )}
                      
                      {action.result && (
                        <div className="text-xs text-muted-foreground">
                          {typeof action.result === 'string' 
                            ? action.result 
                            : JSON.stringify(action.result, null, 2)
                          }
                        </div>
                      )}
                    </div>
                    
                    {action.screenshot && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onScreenshotClick?.(action.screenshot!)}
                        className="flex-shrink-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))
            )}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
}
