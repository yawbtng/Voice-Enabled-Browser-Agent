"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Square, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MicButtonProps {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
}

export default function MicButton({ onTranscript, onError, disabled = false }: MicButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        } 
      });
      
      streamRef.current = stream;
      setPermissionDenied(false);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');

          const response = await fetch('/api/stt', {
            method: 'POST',
            body: formData,
          });

          const result = await response.json();
          
          if (result.success) {
            onTranscript(result.data.transcript, true);
            toast({
              title: "Transcription Complete",
              description: `"${result.data.transcript}"`,
            });
          } else {
            throw new Error(result.error || 'Transcription failed');
          }
        } catch (error) {
          console.error('Transcription error:', error);
          onError?.(error as Error);
          toast({
            title: "Transcription Error",
            description: error instanceof Error ? error.message : "Unknown error",
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);

      // Start audio level monitoring
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      source.connect(analyser);
      analyser.fftSize = 256;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setAudioLevel(average / 255);
        
        if (isRecording) {
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();

    } catch (error) {
      console.error('Failed to start recording:', error);
      setPermissionDenied(true);
      onError?.(error as Error);
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to use voice commands.",
        variant: "destructive",
      });
    }
  }, [onTranscript, onError, toast, isRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevel(0);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [isRecording]);

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.code === 'Space' && !disabled) {
      event.preventDefault();
      handleToggleRecording();
    }
  };

  if (permissionDenied) {
    return (
      <Card className="p-6 text-center">
        <MicOff className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Microphone Access Required</h3>
        <p className="text-muted-foreground mb-4">
          Please allow microphone access to use voice commands.
        </p>
        <Button onClick={startRecording} variant="outline">
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6 text-center">
      <div className="relative mb-4">
        <Button
          size="lg"
          className={`h-16 w-16 rounded-full ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-primary hover:bg-primary/90'
          } ${isProcessing ? 'opacity-50' : ''}`}
          onClick={handleToggleRecording}
          disabled={disabled || isProcessing}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {isProcessing ? (
            <Square className="h-6 w-6 animate-pulse" />
          ) : isRecording ? (
            <Square className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>
        
        {/* Audio Level Indicator */}
        {isRecording && (
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
            <div 
              className="h-1 bg-green-500 rounded-full transition-all duration-100"
              style={{ 
                width: `${Math.max(4, audioLevel * 40)}px`,
                opacity: audioLevel > 0.1 ? 1 : 0.3 
              }}
            />
          </div>
        )}
      </div>
      
      <h3 className="text-lg font-semibold mb-2">
        {isProcessing ? "Processing..." : isRecording ? "Recording..." : "Voice Command"}
      </h3>
      
      <p className="text-sm text-muted-foreground mb-4">
        {isProcessing 
          ? "Transcribing your speech..." 
          : isRecording 
            ? "Click the button or press Space to stop recording" 
            : "Click the button or press Space to start recording"
        }
      </p>
      
      {!isRecording && !isProcessing && (
        <div className="text-xs text-muted-foreground">
          Press <kbd className="px-1 py-0.5 bg-muted rounded">Space</kbd> to toggle recording
        </div>
      )}
    </Card>
  );
}
