# Project Structure

This project uses Next.js 14 (App Router) with Tailwind and shadcn/ui on the frontend, and Next.js API routes with Vercel AI SDK on the backend. Browser automation uses Browserbase + Playwright + Stagehand. Memory via Mem0.

## Root Directory
```
Voice_Browser_Agent/
├── app/
│   ├── (agent)/
│   │   ├── actions.ts
│   │   ├── executor.ts
│   │   ├── extractor.ts
│   │   ├── observer.ts
│   │   └── workflow.ts
│   ├── api/
│   │   ├── actions/route.ts
│   │   ├── debug/route.ts
│   │   ├── extract/route.ts
│   │   ├── intent/route.ts
│   │   ├── observe/route.ts
│   │   ├── stt/route.ts
│   │   ├── stagehand/
│   │   │   ├── main.ts
│   │   │   └── run.ts
│   │   └── workflow/route.ts
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── extraction/
│   │   ├── ExtractionPanel.tsx
│   │   └── SchemaBuilder.tsx
│   ├── mic/
│   │   └── MicButton.tsx
│   ├── modals/
│   │   └── ConfirmAction.tsx
│   ├── observation/
│   │   ├── ElementInspector.tsx
│   │   └── ObservationMap.tsx
│   ├── status/
│   │   └── StatusPanel.tsx
│   ├── stagehand/
│   │   └── debuggerIframe.tsx
│   └── workflow/
│       ├── WorkflowPanel.tsx
│       └── WorkflowStepCard.tsx
├── Docs/
│   ├── Bug_tracking.md
│   ├── Environment_Setup.md
│   ├── Implementation.md
│   ├── project_structure.md
│   └── UI_UX_doc.md
├── __tests__/
│   ├── extractor.test.ts
│   └── observer.test.ts
├── lib/
│   ├── ai.ts
│   ├── deepgram.ts
│   ├── env.ts
│   ├── extraction-schemas.ts
│   ├── mem0.ts
│   ├── observation-schemas.ts
│   ├── retry.ts
│   ├── schema-generator.ts
│   ├── schema.ts
│   └── utils.ts
├── public/
│   └── ... assets ...
├── stagehand.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── jest.config.js
└── README.md
```

## Detailed Structure

### app/
- **app/layout.tsx**: Root layout, providers (theme, toasts), and global shells.
- **app/page.tsx**: Main UI with voice control, status, observation, and screenshots tabs.
- **app/(agent)/**: Core agent functionality modules.
  - **app/(agent)/actions.ts**: Command schema, validation, routing to executor.
  - **app/(agent)/executor.ts**: Stagehand-playwright executor with retries/guardrails.
  - **app/(agent)/extractor.ts**: Data extraction executor with schema support.
  - **app/(agent)/observer.ts**: Semantic observation engine with element categorization.
  - **app/(agent)/workflow.ts**: Multi-step workflow orchestration engine.
- **app/api/**: Next.js API routes.
  - **app/api/actions/route.ts**: Browser action execution endpoint.
  - **app/api/extract/route.ts**: Data extraction API using Stagehand extract.
  - **app/api/intent/route.ts**: Intent parsing endpoint (Claude via Vercel AI SDK).
  - **app/api/observe/route.ts**: Observation API with CRUD operations.
  - **app/api/stt/route.ts**: Deepgram streaming proxy endpoint.
  - **app/api/workflow/route.ts**: Workflow lifecycle management API.
  - **app/api/stagehand/main.ts**: Stagehand initialization and shared utilities.
  - **app/api/stagehand/run.ts**: Entry to execute structured commands against browser sessions.

### components/
- **components/extraction/**: Data extraction UI components.
  - **components/extraction/ExtractionPanel.tsx**: Results display and schema management.
  - **components/extraction/SchemaBuilder.tsx**: Visual schema creation interface.
- **components/mic/**: Voice input components.
  - **components/mic/MicButton.tsx**: Record/stop, VU meter, permission prompts.
- **components/modals/**: Modal dialogs.
  - **components/modals/ConfirmAction.tsx**: Guardrail confirmation dialog.
- **components/observation/**: Semantic observation UI components.
  - **components/observation/ObservationMap.tsx**: Interactive element browser with search/filtering.
  - **components/observation/ElementInspector.tsx**: Detailed element analysis interface.
- **components/status/**: Status and feedback components.
  - **components/status/StatusPanel.tsx**: Live logs/events display.
- **components/workflow/**: Workflow management UI.
  - **components/workflow/WorkflowPanel.tsx**: Workflow creation and management interface.
  - **components/workflow/WorkflowStepCard.tsx**: Individual workflow step visualization.
- **components/stagehand/debuggerIframe.tsx**: Embeds Stagehand debugger/preview iframe.

### Docs/
- Central documentation: implementation plan, structure, and UI/UX specs.

### public/
- Static assets (logos, icons, images) used by the UI.

### Config
- **stagehand.config.ts**: Stagehand configuration (timeouts, model hints, observation settings).
- **tailwind.config.ts**: Tailwind theme and shadcn/ui integration.
- **next.config.ts**: Next.js configuration and experimental flags if any.
- **tsconfig.json**: TypeScript configuration.

### lib/
- **lib/ai.ts**: Vercel AI SDK helpers and LLM integration.
- **lib/deepgram.ts**: Deepgram client helpers for realtime STT.
- **lib/env.ts**: Environment variable validation and typed accessors.
- **lib/extraction-schemas.ts**: Zod schemas for data extraction patterns.
- **lib/mem0.ts**: Mem0 client and conversation/session memory utilities.
- **lib/observation-schemas.ts**: Zod schemas for element observation and categorization.
- **lib/retry.ts**: Retry logic utilities with exponential backoff.
- **lib/schema-generator.ts**: AI-powered schema generation from natural language.
- **lib/schema.ts**: Core Zod schemas for intents, params, and workflows.
- **lib/utils.ts**: General utility functions and helpers.

### Server/AI Integration
- **Vercel AI SDK** used in API routes (LLM providers, streaming).
- **Deepgram** WebSocket/HTTP client used from server and/or edge for realtime STT.
- **Mem0** client for conversation/session memory.

## Build & Deployment
- Deployed on Vercel. CI runs lint, typecheck, and (later) Playwright tests.
- Edge/runtime selection per route based on latency requirements (STT/intent parsing may use edge).

## Testing
- **__tests__/**: Jest test suites for core functionality.
  - **__tests__/extractor.test.ts**: Data extraction functionality tests.
  - **__tests__/observer.test.ts**: Observation engine tests with comprehensive coverage.
- **jest.config.js**: Jest configuration for testing environment.
- Unit tests for schemas and utilities.
- Integration tests for API routes.
- E2E tests with Playwright for core workflows.


