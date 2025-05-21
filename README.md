# AI Chatbot with Next.js

This is a modern chatbot application built with Next.js that supports both Google's Gemini and OpenAI's ChatGPT models. The application features a clean, responsive UI and allows users to switch between different AI models.

## Features

- Support for both Gemini and ChatGPT models
- Real-time chat interface
- Responsive design
- TypeScript support
- Tailwind CSS styling

## Prerequisites

- Node.js 18+ and Yarn
- Google API key for Gemini

## Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd chatbot-ai
```

2. Install dependencies:

```bash
yarn install
```

3. Create a `.env.local` file in the root directory and add your API keys:

```
GOOGLE_API_KEY=your_google_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

4. Start the development server:

```bash
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Select your preferred AI model (Gemini or ChatGPT) from the dropdown menu
2. Type your message in the input field
3. Press Enter or click the Send button to send your message
4. The AI will respond in real-time

## Technologies Used

- Next.js 15
- TypeScript
- Tailwind CSS
- Google Generative AI SDK
- Vercel AI SDK

## License

MIT
