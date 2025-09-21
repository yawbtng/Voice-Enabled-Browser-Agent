"use client";

import { useState, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import MicButton from "@/components/mic/MicButton";
import StatusPanel from "@/components/status/StatusPanel";
import ConfirmAction from "@/components/modals/ConfirmAction";
import { type BrowserAction, type Intent } from "@/lib/schema";

export default function Home() {
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [actions, setActions] = useState<BrowserAction[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmationIntent, setConfirmationIntent] = useState<Intent | null>(null);
  const [confirmationPrompt, setConfirmationPrompt] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null);
  
  const { toast } = useToast();

  const handleTranscript = useCallback(async (transcript: string, isFinal: boolean) => {
    setCurrentTranscript(transcript);
    
    if (isFinal && transcript.trim()) {
      setIsProcessing(true);
      
      try {
        // Parse intent
        const intentResponse = await fetch('/api/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript, sessionId }),
        });
        
        const intentResult = await intentResponse.json();
        
        if (!intentResult.success) {
          throw new Error(intentResult.error || 'Intent parsing failed');
        }
        
        const intent = intentResult.data;
        
        // Execute action
        const actionResponse = await fetch('/api/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intent, sessionId }),
        });
        
        const actionResult = await actionResponse.json();
        
        if (!actionResult.success) {
          throw new Error(actionResult.error || 'Action execution failed');
        }
        
        // Handle confirmation if required
        if (actionResult.data.requiresConfirmation) {
          setConfirmationIntent(intent);
          setConfirmationPrompt(actionResult.data.confirmationPrompt);
          setShowConfirmation(true);
        } else {
          // Add action to list
          setActions(prev => [actionResult.data.action, ...prev]);
          
          toast({
            title: "Action Completed",
            description: actionResult.data.summary,
          });
        }
        
      } catch (error) {
        console.error('Voice command processing error:', error);
        toast({
          title: "Processing Error",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
        setCurrentTranscript("");
      }
    }
  }, [sessionId, toast]);

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
            <Badge variant="secondary">Session: {sessionId.slice(-8)}</Badge>
            <Badge variant="outline">{actions.length} actions</Badge>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="control" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="control">Voice Control</TabsTrigger>
            <TabsTrigger value="status">Action Status</TabsTrigger>
            <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
          </TabsList>

          <TabsContent value="control" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Microphone Control */}
              <MicButton
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
          </TabsContent>

          <TabsContent value="status">
            <StatusPanel
              actions={actions}
              onScreenshotClick={handleScreenshotClick}
            />
          </TabsContent>

          <TabsContent value="screenshots">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Screenshots</h3>
              {actions.filter(action => action.screenshot).length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p>No screenshots available yet</p>
                  <p className="text-sm mt-1">Screenshots will appear here after actions are executed</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {actions
                    .filter(action => action.screenshot)
                    .map(action => (
                      <div key={action.id} className="space-y-2">
                        <img
                          src={action.screenshot}
                          alt={`Screenshot for ${action.intent.action}`}
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        <p className="text-xs text-muted-foreground">
                          {action.intent.action} - {new Date(action.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    ))
                  }
                </div>
              )}
            </Card>
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
