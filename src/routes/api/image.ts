import { createFileRoute } from "@tanstack/react-router";

type ImageRequestBody = {
  prompt?: string;
  model?: string;
};

function getOpenRouterKeys(): string[] {
  const keysStr = process.env["OPENROUTER_API_KEYS"] || process.env["OPENROUTER_API_KEY"] || "";
  return keysStr
    .split(",")
    .map((k) => k.trim())
    .filter((k) => Boolean(k) && k.startsWith("sk-or-"));
}

// 1. AI Prompt Intelligence: Expand short user prompts into rich multi-subject cinematic prompts
async function enhancePromptWithAI(rawPrompt: string): Promise<string> {
  const keys = getOpenRouterKeys();
  if (keys.length === 0 || rawPrompt.length > 250) return rawPrompt;

  for (const apiKey of keys) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://ryuk.ai",
          "X-Title": "rYuk.ai Image Expander",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a master AI image prompt engineer for FLUX. Transform the user's prompt into an ultra-detailed, photorealistic, cinematic image prompt. Crucial rule: Explicitly describe EVERY person, animal, object, action, camera angle, lighting, and texture mentioned in the prompt so NO subjects are missed. Output ONLY the raw prompt under 45 words without quotes or commentary.",
            },
            {
              role: "user",
              content: rawPrompt,
            },
          ],
        }),
      });

      const data = await res.json().catch(() => null);
      const enhanced = data?.choices?.[0]?.message?.content?.trim();
      if (enhanced && enhanced.length > rawPrompt.length / 2) {
        return enhanced;
      }
    } catch {
      // Continue to next key or return raw prompt
    } finally {
      clearTimeout(timer);
    }
  }

  return rawPrompt;
}

// 2. High-speed FLUX Photorealistic & Multi-Subject Generation Engine
async function generateViaFlux(prompt: string, requestedModel?: string): Promise<{ b64: string; mediaType: string }> {
  const promptLower = prompt.toLowerCase();
  
  let targetModel = "flux-realism";
  if (requestedModel && requestedModel.includes("flux")) {
    targetModel = requestedModel;
  } else if (promptLower.includes("anime") || promptLower.includes("manga") || promptLower.includes("illustration")) {
    targetModel = "flux-anime";
  } else if (promptLower.includes("3d") || promptLower.includes("pixar") || promptLower.includes("clay")) {
    targetModel = "flux-3d";
  } else if (promptLower.includes("logo") || promptLower.includes("vector") || promptLower.includes("icon")) {
    targetModel = "flux";
  }

  const encPrompt = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encPrompt}?width=1024&height=1024&nologo=true&enhance=true&model=${targetModel}`;

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

        const rawPrompt = body.prompt.trim();

        // Step 1: AI Prompt Enhancement to ensure all subjects (e.g. Dog + Man + 4k details) are fully fleshed out
        const detailedPrompt = await enhancePromptWithAI(rawPrompt);

        // Step 2: Primary FLUX Realism / Pro Generation
        try {
          const result = await generateViaFlux(detailedPrompt, body.model);
          if (result.b64 && result.b64.length > 500) {
            return Response.json(result);
          }
        } catch (err) {
          console.warn("Primary FLUX image error, trying standard flux fallback:", err);
        }

        // Step 3: Standard FLUX fallback
        try {
          const fallbackResult = await generateViaFlux(rawPrompt, "flux");
          if (fallbackResult.b64 && fallbackResult.b64.length > 500) {
            return Response.json(fallbackResult);
          }
        } catch (err) {
          console.error("Secondary FLUX error:", err);
        }

        return Response.json(
          { error: "Image generation service is temporarily unavailable. Please try again in a moment." },
          { status: 502 },
        );
      },
    },
  },
});
