# Voice Browser Agent — Product Requirements Document (PRD)

## 1. Overview
Build a voice-enabled browser automation agent that converts natural speech into structured browser commands and executes them in real browser sessions. The system provides conversational AI-powered web automation with context awareness, multi-step workflows, and comprehensive feedback.

## 2. Problem Statement
Navigating the web to perform multi-step tasks (search, form-filling, data collection) is time-consuming and error-prone. Users need a hands-free, conversational interface that reliably understands intent and executes actions across diverse websites while providing transparency and safety.

## 3. Goals
- Understand spoken commands and translate them to structured, executable browser actions.
- Automate multi-step workflows across arbitrary websites with reliability and recovery.
- Maintain conversational context and session state to support references and continuity.
- Provide real-time visual, textual, and audio feedback for transparency and trust.
- Enforce safety and privacy guardrails for sensitive operations.

## 4. Non-Goals
- Building a general-purpose AI assistant beyond web automation.
- Replacing website-specific APIs with bespoke integrations (agent should operate in-browser).
- Handling payments or storing sensitive credentials directly (only via secure, confirmed flows).

## 5. Users & Use Cases
- E-commerce: "Search for wireless headphones on Amazon", "Sort by price and show me the top 5", "Add the second to cart and checkout".
- Research & Data Collection: "Find contact info for tech companies in San Francisco", "Get the latest AI news", "Extract all job postings from this page".
- Forms & Productivity: "Fill out this contact form", "Apply for this job using my resume", "Book an appointment next Tuesday at 2 PM".

## 3. Personas & Use Cases
### Personas
- Researcher: collects info, extracts data tables, compiles summaries.
- Shopper: searches, filters, compares, adds to cart, checks out with explicit confirmations.
- Job seeker: fills forms, uploads resume, navigates career sites.

### Example Use Cases
- "Search for wireless headphones on Amazon, sort by price, show top 5, add the second to cart."
- "Find contact information for tech companies in San Francisco and export to CSV."
- "Fill out this contact form with my info and submit after review."

## 4. System Overview & Architecture
Components:
- Frontend (Next.js 14): Mic capture, live transcript, status panel, screenshot feed, confirmation modals.
- STT Service (Deepgram): Low-latency streaming transcription with VAD and confidence.
- Intent Parser (Claude via Vercel AI SDK): Converts transcript + history to structured command JSON.
- Automation Engine (Browserbase + Playwright + Stagehand): Executes actions, takes screenshots, extracts data.
- Memory (Mem0): Conversation and session memory for reference resolution.
- Feedback: Real-time logs, screenshots, optional TTS.

Data Flow (happy path):
1) User speaks → Mic captures PCM/Opus → STT streaming → partial/final transcripts.
2) Transcript + memory → Intent parser → structured command JSON (+ confidence).
3) If low confidence or sensitive → confirmation modal.
4) Executor (Stagehand) runs actions; screenshots/status streamed back to UI.
5) Results stored in memory; UI displays structured results and screenshots.

## 5. Detailed Functional Requirements
### 5.1 Speech-to-Text (STT)
- Real-time capture via Web Audio API; resume/pause; permission prompts.
- Deepgram streaming: <200ms latency target for partials; final stability within 1s.
- Confidence scoring; if below threshold (configurable), request clarification.
- Noise handling and VAD; configurable language (default: en).

### 5.2 Intent Parsing
- Input: latest transcript window, conversation context, memory, and page state summary when available.
- Output: structured JSON command with intent, action, parameters, confidence, context.
- Supports categories: navigation, search, interaction (click/type/scroll), extraction, workflow.
- Clarification prompting for ambiguous references.

### 5.3 Browser Automation
- Persistent sessions via Browserbase; ability to resume prior sessions.
- Playwright-first selectors; fall back to Stagehand `act` in catch blocks for semantic actions.
- Multi-step sequences with retry and backoff; backtrack support for previous step.
- Screenshot capture after each significant action; optional page snapshot.

### 5.4 Data Extraction
- Stagehand `extract` with Zod schemas; support table/list extraction and custom schemas.
- Optional `observe` to map semantic elements for debugging and resilience.
- Export options: JSON/CSV; copy-to-clipboard.

### 5.5 Context & Memory
- Mem0 stores: prior commands, results, important selections (e.g., chosen product), preferences.
- Reference resolution: pronouns, ordinals ("second result"), last entity ("it").
- Session continuity: optional persistence across sessions (user-controlled).

### 5.6 Feedback & Monitoring
- Status panel: streaming step logs with state (queued → running → success/failure).
- Screenshot feed with captions; click to zoom.
- Optional TTS summaries and confirmations.
- Error reporting with suggested actions (retry, refine selector, backtrack, ask to clarify).

### 5.7 Safety & Guardrails
- Explicit confirmation before risky actions: login, checkout, payment, sensitive data entry, download.
- Domain allow/deny lists (configurable).
- Rate limiting per session; timeouts; sandboxed execution where applicable.

## 6. APIs & Contracts (Initial Set)
All routes live in Next.js under `app/api/*`. Example schemas are illustrative; exact types live in `lib/schema.ts`.

### 6.1 STT Streaming
- Route: `POST /api/stt` (upgrades WebSocket) or Edge streaming proxy.
- Input: audio chunks (PCM/Opus) with metadata `{ sampleRate, encoding }`.
- Output events:
  - `transcript.partial`: `{ text, confidence, timestamp }`
  - `transcript.final`: `{ text, confidence, timestamp }`
  - `error`: `{ code, message }`

### 6.2 Intent Parsing
- Route: `POST /api/intent`
- Request:
```json
{
  "transcript": "open amazon and search for iphone 15",
  "context": { "memory": { "lastSite": "amazon.com" } }
}
```
- Response:
```json
{
  "intent": "search",
  "action": "navigate_and_search",
  "parameters": { "query": "iphone 15", "site": "amazon.com" },
  "confidence": 0.92,
  "context": "previous_search_results"
}
```

### 6.3 Command Execution
- Route: `POST /api/stagehand/run`
- Request (Command Schema v1):
```json
{
  "intent": "interaction",
  "action": "click",
  "parameters": { "selector": "text=Add to Cart", "nth": 2 },
  "workflowId": "wf_123",
  "sessionId": "sess_abc",
  "options": { "screenshot": true, "retries": 2 }
}
```
- Response:
```json
{
  "status": "success",
  "step": 3,
  "totalSteps": 6,
  "screenshotUrl": "/api/session/screenshot?id=...",
  "details": { "clicked": true }
}
```

### 6.4 Data Extraction
- Route: `POST /api/extract`
- Request:
```json
{
  "instruction": "extract the product titles and prices",
  "schema": {
    "type": "object",
    "properties": { "items": { "type": "array", "items": { "type": "object", "properties": { "title": {"type":"string"}, "price": {"type":"string"} }, "required": ["title","price"] } } },
    "required": ["items"]
  }
}
```
- Response:
```json
{ "items": [ { "title": "Headphones X", "price": "$199" } ] }
```

### 6.5 Memory Operations (optional)
- Route: `POST /api/memory`
- Methods: `remember`, `recall`, `clear` with scoped keys (session/user).

### 6.6 Error Model
```json
{ "error": { "code": "LOW_CONFIDENCE", "message": "Please confirm the site.", "retryable": true } }
```

## 7. Command Schema (Authoritative)
```json
{
  "intent": "navigation | search | interaction | extract | workflow",
  "action": "navigate | navigate_and_search | click | type | scroll | back | forward | extract_schema | run_workflow",
  "parameters": {},
  "confidence": 0.0,
  "context": "string",
  "workflowId": "string",
  "sessionId": "string",
  "options": { "screenshot": true, "retries": 0, "timeoutMs": 15000 }
}
```
Notes:
- Parameters vary by action. Examples:
  - `navigate`: `{ url: string }`
  - `navigate_and_search`: `{ site: string, query: string, filters?: string[] }`
  - `click`: `{ selector?: string, nth?: number, text?: string }`
  - `type`: `{ selector?: string, text: string, submit?: boolean }`
  - `scroll`: `{ direction: 'up'|'down', amount?: number }`
  - `extract_schema`: `{ instruction: string, schema: JSONSchema }`

## 8. Workflow Engine & Error Recovery
### State Machine
States: `idle → queued → running → success | failure | awaiting_confirmation | awaiting_clarification`.

### Retry Strategy
- Default 2 retries with exponential backoff (1s, 2s, 4s caps at 5s).
- On selector failure: try Playwright locator variants; then Stagehand `act` with semantic instruction.
- On navigation timeout: reload, then fallback to direct URL.

### Backtracking
- If step N fails non-retryably, offer backtrack to N-1 and re-plan.

## 9. UI/UX Requirements (Key)
- Mic button: states (idle/recording/error), VU meter, keyboard shortcuts (Space toggle, Esc cancel).
- Status panel: live logs, link to screenshots per step.
- Confirmation modal: summary of action/site/params for sensitive operations.
- Low-confidence transcript: show top-3 intents and ask user to pick/clarify.
- Accessibility: focus rings, ARIA labels, high contrast, prefers-reduced-motion.

## 10. Security, Privacy, and Compliance
- Secrets via environment variables; least-privilege.
- Do not store PII or credentials in logs; redact known patterns.
- Guardrails: explicit confirmation before sensitive actions; domain allow/deny controls.
- Data retention: configurable; user-controlled memory clearing.

## 11. Performance & Reliability Targets
- STT partial latency: <200ms p95; final stabilization <1s p95.
- Intent parse time: <600ms p95.
- Speech-to-action visible response: <2s p95.
- Uptime: >99% for automation service.

## 12. Telemetry & Observability
- Metrics: latencies (STT, intent, execute), success/fail rates, retries, backtracks, confirmations.
- Logs: structured JSON; correlation IDs per session/workflow; screenshot references.
- Alerts: high error rate, low confidence spike, timeouts.

## 13. Testing Strategy
- Unit: schemas (Zod), parsers, selectors util.
- Integration: API routes (`/api/intent`, `/api/stagehand/run`, `/api/extract`).
- E2E: Playwright flows for Amazon search-and-add, form-fill, extraction pages.
- Resilience tests: DOM changes, network failures, timeouts.

## 14. Rollout Plan
Phase 1 (Foundation): mic + STT, basic navigate/click/type, screenshots.
Phase 2 (Core): intent parsing, context memory, guardrails, status panel.
Phase 3 (Advanced): extraction, workflows, retries/backtracking, TTS.
Phase 4 (Polish): performance, accessibility, analytics, docs.
Feature flags per capability; canary sessions before GA.

## 15. Risks & Mitigations
- STT in noisy envs → VAD, thresholds, push-to-talk, clarification prompts.
- Fragile DOM → Stagehand `act`, `observe`, semantic instructions, robust retries.
- Model ambiguity → memory context, constrained schemas, confirm when unsure.
- Vendor limits/outages → backoff, cached prompts, alternative providers where feasible.

## 16. Acceptance Criteria (Representative)
- "Open Amazon and search for iPhone 15" navigates, searches, and returns screenshot + status.
- Low confidence (<0.7) triggers clarification with top options.
- Failed click due to DOM change uses Stagehand `act` successfully.
- Extraction returns JSON matching provided schema and is exportable.
- Guardrail modal appears before checkout or credential entry.

## 17. Environment Variables (Initial)
- `DEEPGRAM_API_KEY`
- `ANTHROPIC_API_KEY`
- `BROWSERBASE_API_KEY`
- `MEM0_API_KEY`
- `NEXT_PUBLIC_APP_URL`
- `VERCEL_AI_SDK_LOG_LEVEL` (optional)

## 18. Open Questions
- Should we persist screenshots beyond session by default? Retention policy?
- Which locales beyond en-US are first-class? Any model-specific tuning?
- Scope of domain allow/deny defaults?

## 19. Glossary
- Stagehand: Playwright extension adding `act`, `extract`, `observe`.
- Mem0: Conversation/session memory system.
- Browserbase: Hosted, persistent browser platform.
- Vercel AI SDK: Toolkit for server/edge AI integration.



