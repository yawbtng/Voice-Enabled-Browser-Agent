import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { env } from "./env";
import { STTResultSchema, type STTResult } from "./schema";

export class DeepgramClient {
  private client;
  private connection: any = null;

  constructor() {
    this.client = createClient(env.DEEPGRAM_API_KEY);
  }

  async startStreaming(
    onTranscript: (result: STTResult) => void,
    onError?: (error: Error) => void
  ) {
    try {
      this.connection = this.client.listen.live({
        model: "nova-2",
        language: "en",
        smart_format: true,
        interim_results: true,
        endpointing: 300,
        vad_events: true,
      });

      this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        const confidence = data.channel?.alternatives?.[0]?.confidence || 0;
        const isFinal = data.is_final || false;

        if (transcript) {
          const result: STTResult = {
            transcript,
            confidence,
            isFinal,
            timestamp: Date.now(),
          };

          // Validate the result
          const validatedResult = STTResultSchema.parse(result);
          onTranscript(validatedResult);
        }
      });

      this.connection.on(LiveTranscriptionEvents.Error, (error: any) => {
        console.error("Deepgram error:", error);
        onError?.(new Error(error.message || "Deepgram streaming error"));
      });

      this.connection.on(LiveTranscriptionEvents.Metadata, (data: any) => {
        console.log("Deepgram metadata:", data);
      });

      return this.connection;
    } catch (error) {
      console.error("Failed to start Deepgram streaming:", error);
      throw error;
    }
  }

  async sendAudio(audioData: ArrayBuffer) {
    if (!this.connection) {
      throw new Error("No active connection. Call startStreaming first.");
    }

    try {
      this.connection.send(audioData);
    } catch (error) {
      console.error("Failed to send audio to Deepgram:", error);
      throw error;
    }
  }

  async stopStreaming() {
    if (this.connection) {
      try {
        this.connection.finish();
        this.connection = null;
      } catch (error) {
        console.error("Failed to stop Deepgram streaming:", error);
        throw error;
      }
    }
  }

  async transcribeFile(audioFile: Buffer): Promise<STTResult> {
    try {
      const response = await this.client.listen.prerecorded.transcribeFile(
        audioFile,
        {
          model: "nova-2",
          language: "en",
          smart_format: true,
        }
      );

      const transcript = response.result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
      const confidence = response.result?.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;

      const result: STTResult = {
        transcript,
        confidence,
        isFinal: true,
        timestamp: Date.now(),
      };

      return STTResultSchema.parse(result);
    } catch (error) {
      console.error("Failed to transcribe file:", error);
      throw error;
    }
  }
}

export const deepgramClient = new DeepgramClient();
