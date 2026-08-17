import { createFileRoute } from "@tanstack/react-router";

type ImageRequestBody = {
  prompt?: string;
  model?: string;
};

// 1. High-speed Pollinations FLUX Engine (High quality, zero rate limits, FLUX.1 architecture)
async function generateViaPollinations(prompt: string, model = "flux"): Promise<{ b64: string; mediaType: string }> {
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
      throw new Error(`Pollinations HTTP ${res.status}`);
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await res.arrayBuffer();
    const b64 = Buffer.from(arrayBuffer).toString("base64");
    return { b64, mediaType: contentType };
  } finally {
    clearTimeout(timeoutId);
  }
}

// 2. Hugging Face Together FLUX Engine
async function generateViaHuggingFace(prompt: string, apiKey: string, requestedModel?: string) {
  const HUGGINGFACE_IMAGES_URL = "https://router.huggingface.co/together/v1/images/generations";
  const modelsToTry = Array.from(
    new Set([
      requestedModel,
      "black-forest-labs/FLUX.1-schnell",
      "black-forest-labs/FLUX.1-dev",
    ].filter((m): m is string => Boolean(m)))
  );

  let lastError = "Failed to generate image on Hugging Face.";

  for (const modelName of modelsToTry) {
    try {
      const upstream = await fetch(HUGGINGFACE_IMAGES_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          prompt,
        }),
      });

      const data = await upstream.json().catch(() => null);
      if (!upstream.ok || !data) {
        const msg = data?.error?.message || data?.error || `HTTP ${upstream.status}`;
        lastError = `Hugging Face error (${upstream.status}): ${msg}`;
        continue;
      }

      const imgObj = data.data?.[0];
      if (imgObj?.b64_json) {
        return { b64: imgObj.b64_json as string, mediaType: "image/png" };
      }

      if (imgObj?.url) {
        const imgRes = await fetch(imgObj.url);
        if (!imgRes.ok) continue;
        const buffer = await imgRes.arrayBuffer();
        const b64 = Buffer.from(buffer).toString("base64");
        const contentType = imgRes.headers.get("content-type") || "image/jpeg";
        return { b64, mediaType: contentType };
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  throw new Error(lastError);
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
        const hfKey = process.env["HUGGINGFACE_API_KEY"];

        // Strategy 1: Pollinations FLUX Engine (Fast, High Quality, No Quotas)
        try {
          const result = await generateViaPollinations(prompt, "flux");
          if (result.b64 && result.b64.length > 500) {
            return Response.json(result);
          }
        } catch (err) {
          console.warn("Pollinations FLUX image error, trying fallback:", err);
        }

        // Strategy 2: Hugging Face Together FLUX (if key configured)
        if (hfKey) {
          try {
            const result = await generateViaHuggingFace(prompt, hfKey, body.model);
            if (result.b64) {
              return Response.json(result);
            }
          } catch (err) {
            console.warn("Hugging Face image error, trying secondary Pollinations turbo:", err);
          }
        }

        // Strategy 3: Pollinations Turbo fallback
        try {
          const result = await generateViaPollinations(prompt, "turbo");
          if (result.b64) {
            return Response.json(result);
          }
        } catch (err) {
          console.error("Secondary Pollinations error:", err);
        }

        return Response.json(
          { error: "Image generation service is temporarily unavailable. Please try again in a moment." },
          { status: 502 },
        );
      },
    },
  },
});
