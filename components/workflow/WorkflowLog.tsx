"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Trash2, 
  Download, 
  Filter,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2
} from "lucide-react";
import { 
  WorkflowLogEntry, 
  LOG_LEVEL_COLORS, 
  LOG_TYPE_ICONS,
  WorkflowLogType,
  WorkflowLogLevel
} from "@/lib/workflow-log";

interface WorkflowLogProps {
  logs: WorkflowLogEntry[];
  onClear?: () => void;
  onExport?: () => void;
  className?: string;
}

export default function WorkflowLog({ 
  logs, 
  onClear, 
  onExport, 
  className 
}: WorkflowLogProps) {
  const [filter, setFilter] = useState<WorkflowLogType | 'all'>('all');
  const [levelFilter, setLevelFilter] = useState<WorkflowLogLevel | 'all'>('all');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastLogCountRef = useRef(logs.length);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (autoScroll && logs.length > lastLogCountRef.current) {
      setTimeout(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
      }, 100);
    }
    lastLogCountRef.current = logs.length;
  }, [logs.length, autoScroll]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
    setAutoScroll(isAtBottom);
  };

  const toggleEntryExpansion = (entryId: string) => {
    setExpandedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const filteredLogs = logs.filter(log => {
    const typeMatch = filter === 'all' || log.type === filter;
    const levelMatch = levelFilter === 'all' || log.level === levelFilter;
    return typeMatch && levelMatch;
  });

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return null;
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(1)}s`;
  };

  const exportLogs = () => {
    const logText = filteredLogs.map(log => {
      const timestamp = formatTimestamp(log.timestamp);
      const duration = formatDuration(log.duration);
      const metadata = log.metadata ? `\nMetadata: ${JSON.stringify(log.metadata, null, 2)}` : '';
      return `[${timestamp}] ${LOG_TYPE_ICONS[log.type]} ${log.type.toUpperCase()} | ${log.message}${duration ? ` (${duration})` : ''}${metadata}`;
    }).join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workflow-logs-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    
    onExport?.();
  };

  const logTypeOptions: { value: WorkflowLogType | 'all'; label: string }[] = [
    { value: 'all', label: 'All Types' },
    { value: 'stt', label: 'Speech-to-Text' },
    { value: 'intent', label: 'Intent Parsing' },
    { value: 'action', label: 'Action Generation' },
    { value: 'execution', label: 'Browser Execution' },
    { value: 'error', label: 'Errors' },
    { value: 'info', label: 'Info' },
    { value: 'debug', label: 'Debug' },
  ];

  const logLevelOptions: { value: WorkflowLogLevel | 'all'; label: string }[] = [
    { value: 'all', label: 'All Levels' },
    { value: 'debug', label: 'Debug' },
    { value: 'info', label: 'Info' },
    { value: 'success', label: 'Success' },
    { value: 'warning', label: 'Warning' },
    { value: 'error', label: 'Error' },
  ];

  if (logs.length === 0) {
    return (
      <Card className={className}>
        <div className="p-6">
          <div className="text-center text-muted-foreground py-8">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Workflow Logs</h3>
            <p className="text-sm">
              Submit a voice command to see real-time workflow progress
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Workflow Log</h3>
          <Badge variant="secondary">{filteredLogs.length} entries</Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* Type Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as WorkflowLogType | 'all')}
            className="text-sm border rounded px-2 py-1"
          >
            {logTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Level Filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as WorkflowLogLevel | 'all')}
            className="text-sm border rounded px-2 py-1"
          >
            {logLevelOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <Button
            variant="ghost"
            size="sm"
            onClick={exportLogs}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Log Entries */}
      <ScrollArea 
        className="h-80" 
        ref={scrollAreaRef}
        onScrollCapture={handleScroll}
      >
        <div className="p-4 space-y-2">
          {filteredLogs.map((log) => {
            const isExpanded = expandedEntries.has(log.id);
            const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;
            
            return (
              <div
                key={log.id}
                className="border rounded-lg p-3 bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <span className="text-lg">{LOG_TYPE_ICONS[log.type]}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${LOG_LEVEL_COLORS[log.level]}`}
                      >
                        {log.level}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      {log.duration && (
                        <span className="text-xs text-muted-foreground">
                          ({formatDuration(log.duration)})
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm font-medium mb-1">
                      {log.message}
                    </p>
                    
                    {hasMetadata && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleEntryExpansion(log.id)}
                        className="h-6 px-2 text-xs"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3 mr-1" />
                        ) : (
                          <ChevronRight className="h-3 w-3 mr-1" />
                        )}
                        {isExpanded ? 'Hide' : 'Show'} Details
                      </Button>
                    )}
                    
                    {isExpanded && hasMetadata && (
                      <div className="mt-2 p-2 bg-muted rounded text-xs">
                        <pre className="whitespace-pre-wrap overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}
