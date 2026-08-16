import { createFileRoute } from "@tanstack/react-router";

// Server-side proxy to OmniRoute, OpenRouter, and Together AI/HuggingFace Image APIs.
const OMNIROUTE_IMAGES_URL = process.env["OMNIROUTE_BASE_URL"]
  ? `${process.env["OMNIROUTE_BASE_URL"]}/images/generations`
  : "http://localhost:20128/v1/images/generations";
const OPENROUTER_IMAGES_URL = "https://openrouter.ai/api/v1/images";
const HUGGINGFACE_IMAGES_URL = "https://router.huggingface.co/together/v1/images/generations";
const DEFAULT_IMAGE_MODEL = "google/gemini-2.5-flash-image";

type ImageRequestBody = {
  prompt?: string;
  model?: string;
};

async function generateViaHuggingFace(prompt: string, apiKey: string, requestedModel?: string) {
  const modelsToTry = Array.from(
    new Set([
      requestedModel,
      "black-forest-labs/FLUX.1-schnell",
      "mmaluchnick/sabrina-carpenter-flux-model",
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
        continue; // Fallback to next model if rate limit / limit exceeded
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

        const omniKey = process.env["OMNIROUTE_API_KEY"];
        const hfKey = process.env["HUGGINGFACE_API_KEY"];
        const openrouterKey = process.env["OPENROUTER_API_KEY"];

        // Try local OmniRoute image generation first if configured
        if (omniKey) {
          try {
            const upstream = await fetch(OMNIROUTE_IMAGES_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${omniKey}`,
              },
              body: JSON.stringify({
                model: body.model || DEFAULT_IMAGE_MODEL,
                prompt: body.prompt,
              }),
            });

            const data = await upstream.json().catch(() => null);
            if (upstream.ok && data) {
              let b64: string | undefined = data.b64_json ?? data.data?.[0]?.b64_json;
              let mediaType: string = data.media_type ?? "image/png";
              
              const urlVal = data.data?.[0]?.url;
              if (!b64 && urlVal) {
                const imgRes = await fetch(urlVal);
                if (imgRes.ok) {
                  const buffer = await imgRes.arrayBuffer();
                  b64 = Buffer.from(buffer).toString("base64");
                  mediaType = imgRes.headers.get("content-type") || "image/png";
                }
              }

              if (b64) {
                return Response.json({ b64, mediaType });
              }
            }
          } catch (err) {
            console.error("OmniRoute image proxy error:", err);
          }
        }

        const isHFModel =
          body.model?.includes("Omnico/") ||
          body.model?.includes("mmaluchnick/") ||
          body.model?.includes("FLUX") ||
          body.model?.startsWith("hf:");

        // If explicitly requesting HF or if HF key is available and OpenRouter is unconfigured/out of credits
        if (hfKey && (isHFModel || !openrouterKey)) {
          try {
            const result = await generateViaHuggingFace(body.prompt.trim(), hfKey, body.model);
            return Response.json(result);
          } catch (err) {
            return Response.json(
              { error: err instanceof Error ? err.message : String(err) },
              { status: 502 },
            );
          }
        }

        // Try OpenRouter first if key exists, but fall back to HF if OpenRouter returns 402/error
        if (openrouterKey) {
          try {
            const upstream = await fetch(OPENROUTER_IMAGES_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${openrouterKey}`,
              },
              body: JSON.stringify({
                model: body.model || DEFAULT_IMAGE_MODEL,
                prompt: body.prompt,
              }),
            });

            const data = await upstream.json().catch(() => null);

            if (upstream.ok && data) {
              const b64: string | undefined = data.b64_json ?? data.data?.[0]?.b64_json;
              const mediaType: string = data.media_type ?? "image/png";
              if (b64) return Response.json({ b64, mediaType });
            }

            // OpenRouter failed (e.g. 402 Insufficient credits) — fall back to HF if HF key is present
            if (hfKey) {
              const result = await generateViaHuggingFace(body.prompt.trim(), hfKey, body.model);
              return Response.json(result);
            }

            const message = data?.error?.message || `HTTP ${upstream.status}`;
            return Response.json(
              { error: `OpenRouter error: ${message}` },
              { status: upstream.status || 502 },
            );
          } catch {
            if (hfKey) {
              try {
                const result = await generateViaHuggingFace(body.prompt.trim(), hfKey, body.model);
                return Response.json(result);
              } catch (err) {
                return Response.json(
                  { error: err instanceof Error ? err.message : String(err) },
                  { status: 502 },
                );
              }
            }
            return Response.json(
              { error: "Could not reach OpenRouter or Hugging Face from server." },
              { status: 502 },
            );
          }
        }

        return Response.json(
          { error: "Neither OPENROUTER_API_KEY nor HUGGINGFACE_API_KEY is configured." },
          { status: 500 },
        );
      },
    },
  },
});
