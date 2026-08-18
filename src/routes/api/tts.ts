import { createFileRoute } from "@tanstack/react-router";

function getOpenRouterKeys(): string[] {
  const keysStr = process.env["OPENROUTER_API_KEYS"] || process.env["OPENROUTER_API_KEY"] || "";
  return keysStr
    .split(",")
    .map((k) => k.trim())
    .filter((k) => Boolean(k) && k.startsWith("sk-or-"));
}

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { text?: string; voice?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
        }

        const rawText = body.text?.trim();
        if (!rawText) {
          return Response.json({ error: "Text is required for TTS." }, { status: 400 });
        }

        const keys = getOpenRouterKeys();
        for (const apiKey of keys) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);

            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              signal: controller.signal,
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                "HTTP-Referer": "https://ryuk.ai",
                "X-Title": "rYuk.ai TTS",
              },
              body: JSON.stringify({
                model: "deepgram/flux-tts:free",
                messages: [{ role: "user", content: rawText }],
              }),
            });

            clearTimeout(timeoutId);

            if (res.ok) {
              const data = await res.json();
              const audioBase64 = data?.choices?.[0]?.message?.audio?.data || data?.audio;
              if (audioBase64) {
                return Response.json({ audio: audioBase64, format: "mp3", source: "deepgram/flux-tts:free" });
              }
            }
          } catch {
            // Cascade to next key or fallback
          }
        }

        // Fallback indicator so client uses native high-performance Web Speech API
        return Response.json({ fallback: true, source: "browser-speech" });
      },
    },
  },
});
