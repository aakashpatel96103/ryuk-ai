import { createFileRoute } from "@tanstack/react-router";

type ImageRequestBody = {
  prompt?: string;
  model?: string;
};

// High-speed FLUX Image Generation Engine (1024x1024 photorealistic output)
async function generateImageWithFlux(prompt: string, model = "flux"): Promise<{ b64: string; mediaType: string }> {
  const encPrompt = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encPrompt}?width=1024&height=1024&nologo=true&model=${encodeURIComponent(model)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

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

        // 1. Primary: FLUX.1 generation
        try {
          const result = await generateImageWithFlux(prompt, "flux");
          if (result.b64 && result.b64.length > 500) {
            return Response.json(result);
          }
        } catch (err) {
          console.warn("Primary FLUX image generation warning:", err);
        }

        // 2. Secondary: Turbo generation fallback
        try {
          const result = await generateImageWithFlux(prompt, "turbo");
          if (result.b64 && result.b64.length > 500) {
            return Response.json(result);
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
