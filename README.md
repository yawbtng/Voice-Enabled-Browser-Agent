# 🎤 Voice Browser Agent

An AI-powered voice-controlled browser automation system that converts speech to structured commands and executes them using browser automation.

## Features

- **Speech-to-Text**: Real-time voice transcription using Deepgram
- **Intent Parsing**: AI-powered command understanding with Claude
- **Browser Automation**: Execute actions using Stagehand + Playwright
- **Context Memory**: Session persistence with Mem0
- **Security Guardrails**: Confirmation prompts for sensitive actions
- **Real-time Feedback**: Live status updates and screenshots

## Tech Stack

- **Frontend**: Next.js 14, Tailwind CSS, shadcn/ui
- **Speech Processing**: Deepgram Streaming API
- **AI Integration**: Anthropic Claude via Vercel AI SDK
- **Browser Automation**: Browserbase + Playwright + Stagehand
- **Memory**: Mem0 for conversation context
- **Deployment**: Vercel

## Quick Start

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd Voice_Browser_Agent
   pnpm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   # Add your API keys to .env.local (see Environment Setup below)
   ```

3. **Start the development server**:
   ```bash
   pnpm dev
   ```

4. **Open your browser** and navigate to `http://localhost:3000`

## Environment Setup

### Required API Keys

#### 1. Deepgram API Key (Required)
- Sign up at [Deepgram](https://deepgram.com/)
- Get your API key from the dashboard
- Add to `.env.local`: `DEEPGRAM_API_KEY=your_deepgram_api_key_here`

#### 2. Anthropic API Key (Required)
- Sign up at [Anthropic](https://www.anthropic.com/)
- Get your API key from the console
- Add to `.env.local`: `ANTHROPIC_API_KEY=your_anthropic_api_key_here`

#### 3. Browserbase API Key (Optional but Recommended)
- Sign up at [Browserbase](https://www.browserbase.com/)
- Get your API key and project ID from the dashboard
- Add to `.env.local`:
  ```
  BROWSERBASE_API_KEY=your_browserbase_api_key_here
  BROWSERBASE_PROJECT_ID=your_browserbase_project_id_here
  ```

#### 4. Mem0 API Key (Optional)
- Sign up at [Mem0](https://mem0.ai/)
- Get your API key from the dashboard
- Add to `.env.local`: `MEM0_API_KEY=your_mem0_api_key_here`

### Environment File Setup

1. Create a `.env.local` file in the project root:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your API keys in `.env.local`

3. Restart your development server:
   ```bash
   pnpm dev
   ```

## Usage

### Voice Commands

Try these voice commands to get started:

- **Navigation**: "Navigate to google.com"
- **Clicking**: "Click the search button"
- **Typing**: "Type hello world"
- **Scrolling**: "Scroll down"
- **Searching**: "Search for artificial intelligence"
- **Screenshots**: "Take a screenshot"
- **Data Extraction**: "Extract all the links from this page"

### UI Features

- **Voice Control Tab**: Record voice commands and see real-time transcription
- **Action Status Tab**: Monitor executed actions with timestamps and results
- **Screenshots Tab**: View screenshots captured during actions
- **Confirmation Modal**: Review sensitive actions before execution

## Project Structure

```
Voice_Browser_Agent/
├── app/
│   ├── api/                    # API routes
│   │   ├── stt/               # Speech-to-text endpoint
│   │   ├── intent/            # Intent parsing endpoint
│   │   └── actions/           # Browser action execution
│   ├── (agent)/               # Agent logic
│   │   ├── actions.ts         # Action handlers
│   │   └── executor.ts        # Browser executor
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main UI
├── components/
│   ├── mic/                   # Microphone components
│   ├── status/                # Status panel components
│   ├── modals/                # Confirmation modals
│   └── ui/                    # shadcn/ui components
├── lib/                       # Utilities and clients
│   ├── schema.ts              # Zod schemas
│   ├── env.ts                 # Environment validation
│   ├── deepgram.ts            # Deepgram client
│   ├── ai.ts                  # AI client
│   └── mem0.ts                # Memory client
└── Docs/                      # Documentation
    ├── Implementation.md      # Implementation plan
    ├── project_structure.md  # Project structure guide
    └── UI_UX_doc.md          # UI/UX specifications
```

## Development

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

### Architecture

The application follows a modular architecture:

1. **Speech-to-Text**: Captures audio and sends to Deepgram for transcription
2. **Intent Parsing**: Uses Claude to convert speech into structured commands
3. **Action Execution**: Executes browser actions using Stagehand with Playwright fallback
4. **Memory Management**: Stores conversation context and action history
5. **Security**: Implements guardrails for sensitive operations

## Troubleshooting

### Microphone Permission Issues
- Make sure your browser has microphone access
- Try refreshing the page and allowing permissions again

### API Key Issues
- Verify your API keys are correct
- Check that you have sufficient credits/quota
- Ensure the keys are properly set in `.env.local`

### Browserbase Issues
- If you don't have Browserbase credentials, the app will run locally
- For cloud execution, Browserbase credentials are required

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Stagehand](https://github.com/browserbase/stagehand) for browser automation
- [Deepgram](https://deepgram.com/) for speech-to-text
- [Anthropic](https://www.anthropic.com/) for AI capabilities
- [shadcn/ui](https://ui.shadcn.com/) for UI components
