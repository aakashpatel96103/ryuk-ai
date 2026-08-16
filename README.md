# Lovable AI Studio

make a Ai web like "Chatgpt" "claude" "gemini", ui/ux or ill do my backend just make it designs in that the plugins only, default chat or "@create image" only one models or extra,,,,

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6430ad5c-dfb9-4883-a480-5dcafab8c572).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Backend: OpenRouter

The chat and `@create image` plugin are wired to [OpenRouter](https://openrouter.ai) through two server
routes — `src/routes/api/chat.ts` (streaming chat) and `src/routes/api/image.ts` (image generation).
Your API key stays server-side; it's never sent to the browser.

1. Copy `.env.example` to `.env`.
2. Get a key from https://openrouter.ai/keys and set `OPENROUTER_API_KEY` in `.env`.
3. `npm run dev`.

**Chat** uses `nvidia/nemotron-3-ultra-550b-a55b:free` (free). **Image generation** uses
`google/gemini-2.5-flash-image` and is billed per image on your OpenRouter balance — chat is not.
Only the default chat model and the `@create image` plugin are connected to real responses; the
`@web`, `@code`, and `@doc` plugins currently route to the same chat model without special tool
access — extending them would mean adding real web-search / code-execution / file-reading tools
server-side.
