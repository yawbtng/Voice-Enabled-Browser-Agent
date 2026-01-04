import { z } from "zod";

const envSchema = z.object({
  // Deepgram API Key for Speech-to-Text
  DEEPGRAM_API_KEY: z.string().min(1, "Deepgram API key is required"),
  
  // Anthropic API Key for Claude (Intent Parsing)
  ANTHROPIC_API_KEY: z.string().min(1, "Anthropic API key is required"),
  
  // Browserbase Configuration
  BROWSERBASE_API_KEY: z.string().optional(),
  BROWSERBASE_PROJECT_ID: z.string().optional(),
  
  // Mem0 Configuration
  MEM0_API_KEY: z.string().optional(),
  
  // Optional: Vercel AI SDK Configuration
  VERCEL_AI_SDK_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
