# UI/UX Specifications

## Design System
- Tokens: spacing (4px base), radii (md 8px), shadows (sm/md), duration (150/300ms)
- Colors: Tailwind slate/neutral palette; support light/dark themes
- Typography: System font stack; responsive sizes via Tailwind presets
- Components (shadcn/ui): Button, Dialog, Card, Tabs, Input, Toast, Tooltip

## Core Components & Guidelines
- Mic Button: Primary CTA; states — idle, recording, error. Show VU meter and permission prompts
- Keyboard: Space to toggle; Esc to cancel
- Feedback: Live transcription chip next to the button

- Status Panel: Real-time list of actions with timestamps and statuses (running/success/fail)
- Item interaction: Click to preview associated screenshot
- Layout: Sticky on desktop; collapsible drawer on mobile

- Screenshot Feed: Vertical feed or carousel of screenshots with captions
- Behavior: Lazy-load images; zoom on click; copy link

- Confirmation Modal: Guardrails for sensitive actions (login/checkout/payment/data entry)
- Content: Summarize action, site, parameters; require explicit confirm/cancel

- Transcript & Intent Summary: Show top hypothesis and alternatives when confidence is low
- UX: Provide one-tap clarification options

## User Flows
1) Record → Transcribe (stream) → Parse Intent → Confirm (if sensitive/low-confidence) → Execute → Show results (status + screenshots) → Optional TTS summary
2) Data Extraction → Show structured JSON preview → Export (copy/JSON/CSV)

## Responsiveness
- Mobile-first: mic button anchored bottom-center; status panel as bottom sheet; screenshots as swipeable cards
- Desktop: split layout with left control column and right content/screenshot pane

## Accessibility
- All interactive elements keyboard-focusable with visible focus rings
- ARIA labels for mic, status items, and confirmation dialog
- High-contrast theme and prefers-reduced-motion respected
- Provide captions/transcript for TTS outputs

## Error States
- Microphone permission denied: Show guidance and retry control
- STT low confidence: Present alternatives and request clarification
- Automation failure: Summarize error and offer retry/backtrack

## Component Library Organization
```
components/
├── mic/MicButton.tsx
├── status/StatusPanel.tsx
├── status/ScreenshotFeed.tsx
└── modals/ConfirmAction.tsx
```

## Visual References
- Use shadcn/ui examples for dialogs, toasts, tabs
- Tailwind for layout primitives and responsive utilities
