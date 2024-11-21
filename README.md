Here’s the updated README with the revised list of environment variables:

---

# ProdaPic - AI Product Photo Enhancer

This is a web application that uses AI to enhance product photos by removing backgrounds and generating new professional backgrounds. Built with Next.js 15, Clerk Auth, and Together AI.

![alt text](<public/Screenshot 2024-11-12 234034.png>)

## Features

- 🖼️ **AI-powered background removal**: Automatically removes the background of uploaded images using `@imgly/background-removal`.
- 🎨 **Professional background generation**: Generate stunning product, lifestyle, or seasonal backgrounds using Together AI's inference API.
- 🔄 **Real-time image processing**: Provides instant feedback and results.
- 🎯 **Preset suggestions**: Offers curated background presets for various categories, including product, lifestyle, and seasonal themes.
- 👤 **User authentication**: Seamless authentication powered by Clerk.
- 📊 **API usage tracking**: Monitored with `@helicone_ai` for observability.
- 💳 **Bring your own API key support**: Users can optionally provide their own Together AI keys.
- 📉 **Rate limiting**: Enforced via Upstash Redis, allowing users up to 3 background generations per month.

## Tech Stack

- **Frontend Framework**: Next.js with TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn
- **Authentication**: @ClerkDev
- **Rate Limiting**: @Upstash Redis
- **AI Observability**: @Helicone_ai
- **Background Removal**: @imgly/background-removal
- **Background Generation**: Together AI API

## Getting Started

### Installation

First, clone the repository and install dependencies:

```bash
git clone https://github.com/CPJ-N/prodapic.git
cd prodapic
npm install
```

### Running the Development Server

Start the development server:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser to use the app locally.

### Environment Variables

Set up your environment variables by creating a `.env.local` file with the following content:

```bash
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
TOGETHER_API_KEY=your_together_api_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
HELICONE_API_KEY=your_helicone_api_key
```

### Deployment

To deploy the app, push your changes to your GitHub repository and link it to [Vercel](https://vercel.com). Vercel will handle automatic builds and deployments.

---

Let me know if you'd like to refine it further!