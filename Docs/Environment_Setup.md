# Environment Setup Guide

This guide will help you set up the required environment variables and API keys for the Voice Browser Agent.

## Required API Keys

### 1. Deepgram API Key (Required)
- Sign up at [Deepgram](https://deepgram.com/)
- Get your API key from the dashboard
- Add to `.env.local`: `DEEPGRAM_API_KEY=your_deepgram_api_key_here`

### 2. Anthropic API Key (Required)
- Sign up at [Anthropic](https://www.anthropic.com/)
- Get your API key from the console
- Add to `.env.local`: `ANTHROPIC_API_KEY=your_anthropic_api_key_here`

### 3. Browserbase API Key (Optional but Recommended)
- Sign up at [Browserbase](https://www.browserbase.com/)
- Get your API key and project ID from the dashboard
- Add to `.env.local`:
  ```
  BROWSERBASE_API_KEY=your_browserbase_api_key_here
  BROWSERBASE_PROJECT_ID=your_browserbase_project_id_here
  ```

### 4. Mem0 API Key (Optional)
- Sign up at [Mem0](https://mem0.ai/)
- Get your API key from the dashboard
- Add to `.env.local`: `MEM0_API_KEY=your_mem0_api_key_here`

## Environment File Setup

1. Create a `.env.local` file in the project root:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your API keys in `.env.local`

3. Restart your development server:
   ```bash
   pnpm dev
   ```

## Testing the Setup

1. Start the development server: `pnpm dev`
2. Open http://localhost:3000
3. Click the microphone button and try a voice command like:
   - "Navigate to google.com"
   - "Click the search button"
   - "Type hello world"
   - "Take a screenshot"

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

## Next Steps

Once the environment is set up, you can:
1. Test basic voice commands
2. Explore the action status panel
3. View screenshots of executed actions
4. Try more complex multi-step workflows
