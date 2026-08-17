import { createFileRoute } from "@tanstack/react-router";

type ImageRequestBody = {
  prompt?: string;
  model?: string;
};

// Best OpenRouter native image generation models
const OPENROUTER_IMAGE_MODELS = [
  "google/gemini-2.5-flash-image",
  "google/gemini-3.1-flash-image",
  "openai/gpt-5-image-mini",
  "google/gemini-3-pro-image",
];

function getOpenRouterKeys(): string[] {
  const keysStr = process.env["OPENROUTER_API_KEYS"] || process.env["OPENROUTER_API_KEY"] || "";
  return keysStr
    .split(",")
    .map((k) => k.trim())
    .filter((k) => Boolean(k) && k.startsWith("sk-or-"));
}

// 1. Generate via OpenRouter Native Image Models
async function generateViaOpenRouter(prompt: string, specificModel?: string): Promise<{ b64: string; mediaType: string } | null> {
  const keys = getOpenRouterKeys();
  if (keys.length === 0) return null;

  const modelsToTry = specificModel && specificModel.includes("/")
    ? [specificModel, ...OPENROUTER_IMAGE_MODELS]
    : OPENROUTER_IMAGE_MODELS;

  for (const apiKey of keys) {
    for (const model of modelsToTry) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://ryuk.ai",
            "X-Title": "rYuk.ai Image Workspace",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok || !data) {
          console.warn(`[OpenRouter Image] ${model} failed (${res.status}):`, data?.error?.message || "unknown");
          continue;
        }

        // Check for native multimodal image output array: message.images[0].image_url.url
        const imgUrl: string | undefined = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (imgUrl) {
          const match = imgUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
          if (match) {
            return { mediaType: match[1], b64: match[2] };
          }
        }

        // Check for direct b64_json or choice text data
        const b64Direct = data.b64_json ?? data.data?.[0]?.b64_json;
        if (b64Direct) {
          return { mediaType: data.media_type || "image/png", b64: b64Direct };
        }
      } catch (err) {
        console.warn(`[OpenRouter Image] Error with ${model}:`, err instanceof Error ? err.message : String(err));
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }

  return null;
}

// 2. High-speed FLUX Fallback Engine (1024x1024 photorealistic output)
async function generateViaFluxFallback(prompt: string, model = "flux"): Promise<{ b64: string; mediaType: string }> {
  const encPrompt = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encPrompt}?width=1024&height=1024&nologo=true&model=${encodeURIComponent(model)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "rYuk.ai/1.0",
        Accept: "image/jpeg,image/png,image/*",
      },
    });

    if (!res.ok) {
      throw new Error(`Image API HTTP ${res.status}`);
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await res.arrayBuffer();
    const b64 = Buffer.from(arrayBuffer).toString("base64");
    return { b64, mediaType: contentType };
  } finally {
    clearTimeout(timeoutId);
  }
}

export const Route = createFileRoute("/api/image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: ImageRequestBody;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body." }, { status: 400 });
        }

        if (!body.prompt || !body.prompt.trim()) {
          return Response.json({ error: "`prompt` is required." }, { status: 400 });
        }

        const prompt = body.prompt.trim();

        // Strategy 1: Best OpenRouter Models (google/gemini-2.5-flash-image, etc.)
        try {
          const openRouterResult = await generateViaOpenRouter(prompt, body.model);
          if (openRouterResult && openRouterResult.b64 && openRouterResult.b64.length > 500) {
            return Response.json(openRouterResult);
          }
        } catch (err) {
          console.warn("OpenRouter image generation fallback to FLUX:", err);
        }

        // Strategy 2: High-speed FLUX.1 Engine Fallback
        try {
          const fluxResult = await generateViaFluxFallback(prompt, "flux");
          if (fluxResult.b64 && fluxResult.b64.length > 500) {
            return Response.json(fluxResult);
          }
        } catch (err) {
          console.warn("Primary FLUX image generation warning:", err);
        }

        // Strategy 3: Turbo fallback
        try {
          const turboResult = await generateViaFluxFallback(prompt, "turbo");
          if (turboResult.b64 && turboResult.b64.length > 500) {
            return Response.json(turboResult);
          }
        } catch (err) {
          console.error("Secondary Turbo image generation error:", err);
        }

        return Response.json(
          { error: "Image generation service is temporarily unavailable. Please try again in a moment." },
          { status: 502 },
        );
      },
    },
  },
});
