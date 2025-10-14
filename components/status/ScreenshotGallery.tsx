"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Eye, 
  Download, 
  Calendar,
  MousePointer,
  Image as ImageIcon,
  X
} from "lucide-react";
import { type BrowserAction } from "@/lib/schema";

interface ScreenshotGalleryProps {
  actions: BrowserAction[];
  className?: string;
}

export default function ScreenshotGallery({ actions, className }: ScreenshotGalleryProps) {
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<BrowserAction | null>(null);

  const screenshots = actions.filter(action => action.screenshot);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
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

  const handleScreenshotClick = (screenshot: string, action: BrowserAction) => {
    setSelectedScreenshot(screenshot);
    setSelectedAction(action);
  };

  const handleDownload = (screenshot: string, action: BrowserAction) => {
    const link = document.createElement('a');
    link.href = screenshot;
    link.download = `screenshot-${action.id}.png`;
    link.click();
  };

  if (screenshots.length === 0) {
    return (
      <Card className={className}>
        <div className="p-6">
          <div className="text-center text-muted-foreground py-8">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Screenshots Yet</h3>
            <p className="text-sm">
              Screenshots will appear here after actions are executed
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Screenshots</h3>
            <Badge variant="secondary">{screenshots.length} screenshots</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {screenshots.map((action) => (
              <div key={action.id} className="group relative">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden border">
                  <img
                    src={action.screenshot}
                    alt={`Screenshot for ${action.intent.action}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleScreenshotClick(action.screenshot!, action)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownload(action.screenshot!, action)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Metadata */}
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-medium truncate">
                    {formatActionDescription(action)}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatTimestamp(action.timestamp)}</span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        action.status === 'success' 
                          ? 'text-green-600 border-green-200' 
                          : action.status === 'failed'
                          ? 'text-red-600 border-red-200'
                          : 'text-blue-600 border-blue-200'
                      }`}
                    >
                      {action.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Lightbox Modal */}
      <Dialog open={!!selectedScreenshot} onOpenChange={() => setSelectedScreenshot(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <MousePointer className="h-5 w-5" />
                {selectedAction && formatActionDescription(selectedAction)}
              </DialogTitle>
              <div className="flex items-center gap-2">
                {selectedAction && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(selectedScreenshot!, selectedAction)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedScreenshot(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {selectedAction && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatTimestamp(selectedAction.timestamp)}</span>
                </div>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    selectedAction.status === 'success' 
                      ? 'text-green-600 border-green-200' 
                      : selectedAction.status === 'failed'
                      ? 'text-red-600 border-red-200'
                      : 'text-blue-600 border-blue-200'
                  }`}
                >
                  {selectedAction.status}
                </Badge>
              </div>
            )}
          </DialogHeader>
          
          <div className="p-6 pt-0">
            <div className="relative">
              <img
                src={selectedScreenshot || ''}
                alt="Screenshot preview"
                className="w-full h-auto max-h-[60vh] object-contain rounded-lg border"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
