This is an image generation web app (chat-style) built with Next.js. It supports pluggable providers and ships with OpenAI out of the box.

## Setup

1. Create a `.env.local` file in the project root:

```
PROVIDER=openai
OPENAI_API_KEY=your_openai_key
# Or for google in the future
# PROVIDER=google
# GOOGLE_API_KEY=your_google_key
```

2. Install dependencies and run the dev server.

## Scripts
```bash
npm install
npm run dev
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

### API

- POST `/api/generate` with JSON body `{ prompt: string, size?: "256x256"|"512x512"|"1024x1024"|"2048x2048", n?: number }`
- Responds `{ images: Array<{ url?: string, b64_json?: string }>, provider: string }`

### UI

- Navigate to `/` to use the chat-like UI. Press Cmd+Enter to submit.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
