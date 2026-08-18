import { createFileRoute } from "@tanstack/react-router";

type ImageRequestBody = {
  prompt?: string;
  model?: string;
};

function getOpenAIKey(): string {
  if (typeof process !== "undefined" && process.env && process.env["OPENAI_API_KEY"]) {
    return process.env["OPENAI_API_KEY"].trim();
  }
  return "";
}

function getOpenRouterKeys(): string[] {
  const keysStr = process.env["OPENROUTER_API_KEYS"] || process.env["OPENROUTER_API_KEY"] || "";
  return keysStr
    .split(",")
    .map((k) => k.trim())
    .filter((k) => Boolean(k) && k.startsWith("sk-or-"));
}

// 1. AI Prompt Intelligence: Expand short user prompts into rich multi-subject cinematic prompts
async function enhancePromptWithAI(rawPrompt: string): Promise<string> {
  if (rawPrompt.length > 250) return rawPrompt;

  const openaiKey = getOpenAIKey();
  if (openaiKey) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a master AI image and diagram prompt engineer. Transform the user's request into a highly descriptive, detailed prompt suitable for high-resolution AI visual generation. Explicitly include style, lighting, key elements, composition, and details. Output ONLY the refined prompt text under 60 words without quotes.",
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
      // Fall through to OpenRouter keys
    } finally {
      clearTimeout(timer);
    }
  }

  const keys = getOpenRouterKeys();
  if (keys.length === 0) return rawPrompt;

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
          model: "openai/gpt-oss-20b:free",
          messages: [
            {
              role: "system",
              content:
                "You are a master AI image prompt engineer. Transform the user's prompt into an ultra-detailed, photorealistic, cinematic image prompt. Output ONLY the raw prompt under 50 words without quotes.",
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

// 2. OpenAI DALL-E 3 Image & Visual Diagram Generation Engine
async function generateViaOpenAI(prompt: string, requestedModel?: string): Promise<{ b64: string; mediaType: string; revisedPrompt?: string }> {
  const openaiKey = getOpenAIKey();
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const targetModel = requestedModel === "dall-e-2" ? "dall-e-2" : "dall-e-3";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: targetModel,
        prompt: prompt.slice(0, 1000),
        n: 1,
        size: targetModel === "dall-e-2" ? "512x512" : "1024x1024",
        quality: "standard",
        response_format: "b64_json",
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.error?.message || `OpenAI DALL-E API error HTTP ${res.status}`);
    }

    const data = await res.json();
    const item = data?.data?.[0];
    
    if (item?.b64_json) {
      return {
        b64: item.b64_json,
        mediaType: "image/png",
        revisedPrompt: item.revised_prompt,
      };
    }

    if (item?.url) {
      const imgFetch = await fetch(item.url);
      const arrBuf = await imgFetch.arrayBuffer();
      return {
        b64: Buffer.from(arrBuf).toString("base64"),
        mediaType: imgFetch.headers.get("content-type") || "image/png",
        revisedPrompt: item.revised_prompt,
      };
    }

    throw new Error("No image data payload in OpenAI response");
  } finally {
    clearTimeout(timeoutId);
  }
}

// 3. FLUX Photorealistic & Diagram Generation Engine (Fallback & Fast Mode)
async function generateViaFlux(prompt: string, requestedModel?: string): Promise<{ b64: string; mediaType: string }> {
  const promptLower = prompt.toLowerCase();
  
  let targetModel = "flux-realism";
  if (requestedModel && requestedModel.includes("flux")) {
    targetModel = requestedModel;
  } else if (promptLower.includes("anime") || promptLower.includes("manga") || promptLower.includes("illustration")) {
    targetModel = "flux-anime";
  } else if (promptLower.includes("3d") || promptLower.includes("pixar") || promptLower.includes("clay")) {
    targetModel = "flux-3d";
  } else if (promptLower.includes("logo") || promptLower.includes("vector") || promptLower.includes("icon") || promptLower.includes("diagram")) {
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
        const openaiKey = getOpenAIKey();

        // Step 1: Try OpenAI DALL-E 3 as the Primary Generator if OPENAI_API_KEY is present
        if (openaiKey) {
          try {
            const openaiResult = await generateViaOpenAI(rawPrompt, body.model);
            if (openaiResult.b64 && openaiResult.b64.length > 500) {
              return Response.json(openaiResult);
            }
          } catch (err: any) {
            console.warn("[OpenAI DALL-E 3] Notice, falling back to FLUX engine:", err?.message || err);
          }
        }

        // Step 2: AI Prompt Enhancement for FLUX
        const detailedPrompt = await enhancePromptWithAI(rawPrompt);

        // Step 3: FLUX High-Definition Generation
        try {
          const result = await generateViaFlux(detailedPrompt, body.model);
          if (result.b64 && result.b64.length > 500) {
            return Response.json(result);
          }
        } catch (err) {
          console.warn("[FLUX Engine] Primary attempt failed, trying fallback:", err);
        }

        // Step 4: Final Fallback
        try {
          const fallbackResult = await generateViaFlux(rawPrompt, "flux");
          if (fallbackResult.b64 && fallbackResult.b64.length > 500) {
            return Response.json(fallbackResult);
          }
        } catch (err) {
          console.error("[FLUX Engine] Final fallback error:", err);
        }

        return Response.json(
          { error: "Visual generation service is temporarily unavailable. Please try again in a moment." },
          { status: 502 },
        );
      },
    },
  },
});
