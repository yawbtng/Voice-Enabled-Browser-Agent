# Project Structure

This project uses Next.js 14 (App Router) with Tailwind and shadcn/ui on the frontend, and Next.js API routes with Vercel AI SDK on the backend. Browser automation uses Browserbase + Playwright + Stagehand. Memory via Mem0.

## Root Directory
```
Voice_Browser_Agent/
├── app/
│   ├── api/
│   │   └── stagehand/
│   │       ├── main.ts
│   │       └── run.ts
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── stagehand/
│       └── debuggerIframe.tsx
├── Docs/
│   ├── Implementation.md
│   ├── project_structure.md
│   └── UI_UX_doc.md
├── public/
│   └── ... assets ...
├── stagehand.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
└── README.md
```

## Detailed Structure

### app/
- **app/layout.tsx**: Root layout, providers (theme, toasts), and global shells.
- **app/page.tsx**: Main UI (microphone control, live transcript, status panel, screenshots).
- **app/api/**: Next.js API routes.
  - **app/api/stagehand/main.ts**: Stagehand initialization and shared utilities.
  - **app/api/stagehand/run.ts**: Entry to execute structured commands against browser sessions.

### components/
- **components/stagehand/debuggerIframe.tsx**: Embeds Stagehand debugger/preview iframe.
- Future UI modules: inputs, status logs, screenshot gallery, confirmation modals.

### Docs/
- Central documentation: implementation plan, structure, and UI/UX specs.

### public/
- Static assets (logos, icons, images) used by the UI.

### Config
- **stagehand.config.ts**: Stagehand configuration (timeouts, model hints, observation settings).
- **tailwind.config.ts**: Tailwind theme and shadcn/ui integration.
- **next.config.ts**: Next.js configuration and experimental flags if any.
- **tsconfig.json**: TypeScript configuration.

### Server/AI Integration
- **Vercel AI SDK** used in API routes (LLM providers, streaming).
- **Deepgram** WebSocket/HTTP client used from server and/or edge for realtime STT.
- **Mem0** client for conversation/session memory.

## Proposed Additions

To support upcoming features, add the following directories/files:
```
app/
├── (agent)/
│   ├── actions.ts            # Command schema, validation, routing to executor
│   ├── executor.ts           # Stagehand-playwright executor with retries/guardrails
│   ├── memory.ts             # Mem0 helpers and context stitching
│   └── tts.ts                # Optional TTS responses
├── api/
│   ├── stt/route.ts          # Deepgram streaming proxy endpoint
│   ├── intent/route.ts       # Intent parsing endpoint (Claude via Vercel AI SDK)
│   └── extract/route.ts      # Data extraction API using Stagehand extract
components/
├── mic/
│   └── MicButton.tsx         # Record/stop, VU meter, permission prompts
├── status/
│   ├── StatusPanel.tsx       # Live logs/events
│   └── ScreenshotFeed.tsx    # Action-by-action screenshots
├── modals/
│   └── ConfirmAction.tsx     # Guardrail confirmation dialog
lib/
├── schema.ts                 # Zod schemas for intents, params, extraction
├── deepgram.ts               # Deepgram client helpers
├── mem0.ts                   # Mem0 client and utilities
└── ai.ts                     # Vercel AI SDK helpers
```

## Configuration & Environments
- Environment variables via `.env.local` with typed accessors in `lib/`.
- Separate keys for development/production (Deepgram, Anthropic, Browserbase, Mem0, Vercel).

## Build & Deployment
- Deployed on Vercel. CI runs lint, typecheck, and (later) Playwright tests.
- Edge/runtime selection per route based on latency requirements (STT/intent parsing may use edge).

## Testing
- Unit tests for schemas and utilities.
- Integration tests for API routes.
- E2E tests with Playwright for core workflows.


