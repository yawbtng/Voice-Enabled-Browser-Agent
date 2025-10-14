"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import MicButton, { type MicButtonRef } from "@/components/mic/MicButton";
import StatusPanel from "@/components/status/StatusPanel";
import ConfirmAction from "@/components/modals/ConfirmAction";
import { ObservationMap } from "@/components/observation/ObservationMap";
import { ElementInspector } from "@/components/observation/ElementInspector";
import BrowserPreview from "@/components/stagehand/BrowserPreview";
import ScreenshotGallery from "@/components/status/ScreenshotGallery";
import WorkflowSummary from "@/components/workflow/WorkflowSummary";
import WorkflowLog from "@/components/workflow/WorkflowLog";
import { type BrowserAction, type Intent } from "@/lib/schema";
import { type Element } from "@/lib/observation-schemas";
import { WorkflowLogEntry, WorkflowSummary as WorkflowSummaryType, createLogEntry } from "@/lib/workflow-log";

export default function Home() {
  const [sessionId, setSessionId] = useState<string>("");
  const [actions, setActions] = useState<BrowserAction[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmationIntent, setConfirmationIntent] = useState<Intent | null>(null);
  const [confirmationPrompt, setConfirmationPrompt] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [debugUrl, setDebugUrl] = useState<string | null>(null);
  const [workflowLogs, setWorkflowLogs] = useState<WorkflowLogEntry[]>([]);
  const [workflowSummary, setWorkflowSummary] = useState<WorkflowSummaryType | null>(null);
  
  const micButtonRef = useRef<MicButtonRef>(null);
  const { toast } = useToast();

  // Workflow log helpers
  const addWorkflowLog = useCallback((entry: WorkflowLogEntry) => {
    setWorkflowLogs(prev => [...prev, entry]);
  }, []);

  const clearWorkflowLogs = useCallback(() => {
    setWorkflowLogs([]);
    setWorkflowSummary(null);
  }, []);

  const generateWorkflowSummary = useCallback(async (logs: WorkflowLogEntry[], result: any, transcript?: string) => {
    try {
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs, result, transcript }),
      });

      const summaryResult = await response.json();
      
      if (summaryResult.success) {
        setWorkflowSummary(summaryResult.data);
      } else {
        throw new Error(summaryResult.error || 'Summary generation failed');
      }
    } catch (error) {
      console.error('Failed to generate workflow summary:', error);
      toast({
        title: "Summary Generation Failed",
        description: "Unable to generate AI summary. Check logs for details.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Generate sessionId only on client side to avoid hydration mismatch
  useEffect(() => {
    if (!sessionId) {
      setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    }
  }, [sessionId]);

  // Global spacebar handler for recording toggle
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Only handle spacebar if not typing in an input field
      if (event.code === 'Space' && 
          !isProcessing && 
          !showConfirmation &&
          !['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName)) {
        event.preventDefault();
        micButtonRef.current?.toggleRecording();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isProcessing, showConfirmation]);

  const handleTranscript = useCallback(async (transcript: string, isFinal: boolean) => {
    setCurrentTranscript(transcript);
    
    if (isFinal && transcript.trim()) {
      setIsProcessing(true);
      
      try {
        // Clear previous logs and start new workflow
        clearWorkflowLogs();
        addWorkflowLog(createLogEntry('stt', 'success', `Transcription complete: "${transcript}"`));
        
        // Parse intent
        addWorkflowLog(createLogEntry('intent', 'info', 'Parsing user intent...'));
        const intentResponse = await fetch('/api/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript, sessionId }),
        });
        
        const intentResult = await intentResponse.json();
        
        if (!intentResult.success) {
          addWorkflowLog(createLogEntry('intent', 'error', `Intent parsing failed: ${intentResult.error}`));
          throw new Error(intentResult.error || 'Intent parsing failed');
        }
        
        const intent = intentResult.data;
        addWorkflowLog(createLogEntry('intent', 'success', `Intent identified: ${intent.action} - ${intent.target || intent.value}`, { confidence: intent.confidence }));
        
        // Execute action
        addWorkflowLog(createLogEntry('action', 'info', 'Executing browser action...'));
        const actionResponse = await fetch('/api/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intent, sessionId }),
        });
        
        const actionResult = await actionResponse.json();
        
        if (!actionResult.success) {
          addWorkflowLog(createLogEntry('action', 'error', `Action execution failed: ${actionResult.error}`));
          throw new Error(actionResult.error || 'Action execution failed');
        }
        
        // Handle confirmation if required
        if (actionResult.data.requiresConfirmation) {
          addWorkflowLog(createLogEntry('action', 'warning', 'Action requires user confirmation'));
          setConfirmationIntent(intent);
          setConfirmationPrompt(actionResult.data.confirmationPrompt);
          setShowConfirmation(true);
        } else {
          // Add action to list
          setActions(prev => [actionResult.data.action, ...prev]);
          
          // Update debug URL if available
          if (actionResult.data.debugUrl) {
            setDebugUrl(actionResult.data.debugUrl);
          }
          
          addWorkflowLog(createLogEntry('execution', 'success', `Action completed: ${actionResult.data.summary}`));
          
          // Generate workflow summary
          await generateWorkflowSummary(workflowLogs, actionResult.data, transcript);
          
          toast({
            title: "Action Completed",
            description: actionResult.data.summary,
          });
        }
        
      } catch (error) {
        console.error('Error processing transcript:', error);
        addWorkflowLog(createLogEntry('error', 'error', `Workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
        
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
        setCurrentTranscript("");
      }
    }
  }, [sessionId, toast, clearWorkflowLogs, addWorkflowLog, generateWorkflowSummary, workflowLogs]);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmationIntent) return;
    
    try {
      const response = await fetch('/api/actions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          intent: confirmationIntent, 
          sessionId, 
          confirmed: true 
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setActions(prev => [result.data.action, ...prev]);
        
        // Update debug URL if available
        if (result.data.debugUrl) {
          setDebugUrl(result.data.debugUrl);
        }
        
        toast({
          title: "Action Confirmed & Executed",
          description: result.data.summary,
        });
      } else {
        throw new Error(result.error || 'Action execution failed');
      }
    } catch (error) {
      console.error('Confirmed action error:', error);
      toast({
        title: "Execution Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [confirmationIntent, sessionId, toast]);

  const handleCancelAction = useCallback(() => {
    toast({
      title: "Action Cancelled",
      description: "The action was not executed.",
    });
  }, [toast]);

  const handleScreenshotClick = useCallback((screenshot: string) => {
    setCurrentScreenshot(screenshot);
  }, []);

  const handleError = useCallback((error: Error) => {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive",
    });
  }, [toast]);

  const handleElementSelect = useCallback((element: Element) => {
    setSelectedElement(element);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Voice Browser Agent</h1>
          <p className="text-muted-foreground mb-4">
            AI-powered voice-controlled browser automation
          </p>
          <div className="flex justify-center gap-2">
            <Badge variant="secondary">Session: {sessionId ? sessionId.slice(-8) : '...'}</Badge>
            <Badge variant="outline">{actions.length} actions</Badge>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="control" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="control">Control Center</TabsTrigger>
            <TabsTrigger value="analysis">Page Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="control" className="space-y-6">
            {/* Voice Control Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Microphone Control */}
              <MicButton
                ref={micButtonRef}
                onTranscript={handleTranscript}
                onError={handleError}
                disabled={isProcessing}
              />
              
              {/* Current Status */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Current Status</h3>
                <div className="space-y-3">
                  {currentTranscript && (
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-sm font-medium mb-1">Current Transcript:</p>
                      <p className="text-sm text-muted-foreground">"{currentTranscript}"</p>
                    </div>
                  )}
                  
                  {isProcessing && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Processing voice command...
                      </p>
                    </div>
                  )}
                  
                  {!currentTranscript && !isProcessing && (
                    <div className="text-center text-muted-foreground py-8">
                      <p>Ready to receive voice commands</p>
                      <p className="text-sm mt-1">Click the microphone button to start</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Browser Preview Section */}
            <BrowserPreview 
              debugUrl={debugUrl}
              env="BROWSERBASE"
              className="w-full"
              isLoading={isProcessing}
            />

            {/* Action Status Section */}
            <StatusPanel
              actions={actions}
              onScreenshotClick={handleScreenshotClick}
            />
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            {/* Page Observer Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Observation Map */}
              <ObservationMap
                sessionId={sessionId}
                onElementSelect={handleElementSelect}
              />
              
              {/* Element Inspector */}
              {selectedElement ? (
                <ElementInspector
                  element={selectedElement}
                  onClose={() => setSelectedElement(null)}
                />
              ) : (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Element Inspector</h3>
                  <p className="text-muted-foreground">
                    Select an element from the observation map to inspect its details.
                  </p>
                </Card>
              )}
            </div>

            {/* Screenshots Gallery Section */}
            <ScreenshotGallery actions={actions} />
          </TabsContent>
        </Tabs>

        {/* Confirmation Modal */}
        <ConfirmAction
          open={showConfirmation}
          onOpenChange={setShowConfirmation}
          intent={confirmationIntent}
          confirmationPrompt={confirmationPrompt}
          onConfirm={handleConfirmAction}
          onCancel={handleCancelAction}
        />
      </div>
    </div>
  );
}
