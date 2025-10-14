"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  RefreshCw, 
  Maximize2, 
  Minimize2, 
  Monitor,
  AlertCircle,
  Loader2
} from "lucide-react";

interface BrowserPreviewProps {
  debugUrl?: string | null;
  env: "BROWSERBASE" | "LOCAL";
  className?: string;
  isLoading?: boolean;
}

export default function BrowserPreview({ 
  debugUrl, 
  env, 
  className,
  isLoading = false
}: BrowserPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleRefresh = () => {
    setHasError(false);
    // Force iframe reload by changing key
    const iframe = document.querySelector('iframe[src*="browserbase"]') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = iframe.src;
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleIframeLoad = () => {
    setHasError(false);
  };

  const handleIframeError = () => {
    setHasError(true);
  };

  if (!debugUrl && env === "LOCAL") {
    return (
      <Card className={`${className} ${isFullscreen ? 'fixed inset-0 z-50 m-0 rounded-none' : ''}`}>
        <div className="w-full aspect-[16/10] bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden text-wrap border border-gray-200">
          <div className="text-center p-8 max-w-full whitespace-normal break-words">
            <Monitor className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Local Mode</h3>
            <p className="text-muted-foreground mb-4">
              Running in local mode. Set{" "}
              <code className="bg-black/[.05] dark:bg-white/[.06] px-1 py-0.5 rounded font-semibold">
                env: "BROWSERBASE"
              </code>
              {" "}in{" "}
              <code className="bg-black/[.05] dark:bg-white/[.06] px-1 py-0.5 rounded font-semibold">
                stagehand.config.ts
              </code>
              {" "}to see a live embedded browser.
            </p>
            <Badge variant="outline">Local Environment</Badge>
          </div>
        </div>
      </Card>
    );
  }

  if (!debugUrl && isLoading) {
    return (
      <Card className={`${className} ${isFullscreen ? 'fixed inset-0 z-50 m-0 rounded-none' : ''}`}>
        <div className="w-full aspect-[16/10] bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden text-wrap">
          <div className="text-center p-8 max-w-full whitespace-normal break-words">
            <Loader2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-spin" />
            <h3 className="text-lg font-semibold mb-2">Loading Browser Session</h3>
            <p className="text-muted-foreground">
              Initializing Browserbase session...
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!debugUrl) {
    return (
      <Card className={`${className} ${isFullscreen ? 'fixed inset-0 z-50 m-0 rounded-none' : ''}`}>
        <div className="w-full aspect-[16/10] bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden text-wrap border border-gray-200">
          <div className="text-center p-8 max-w-full whitespace-normal break-words">
            <Monitor className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Browser Session</h3>
            <p className="text-muted-foreground mb-4">
              Submit a voice command to start a browser session and see live automation.
            </p>
            <Badge variant="outline">Ready to Start</Badge>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`${className} ${isFullscreen ? 'fixed inset-0 z-50 m-0 rounded-none' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Live Browser View</h3>
          <Badge variant="secondary">Browserbase</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Browser Content */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
            <div className="text-center">
              <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading browser session...</p>
            </div>
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
              <p className="text-sm text-muted-foreground mb-2">Failed to load browser session</p>
              <Button size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        )}

        <iframe 
          src={debugUrl} 
          className={`w-full border-0 ${
            isFullscreen 
              ? 'h-[calc(100vh-80px)]' 
              : 'aspect-[16/10]'
          }`}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title="Browserbase Live View"
        />
      </div>
    </Card>
  );
}
