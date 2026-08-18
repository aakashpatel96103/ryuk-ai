import { createFileRoute } from "@tanstack/react-router";
import { getKeysPool, promoteWorkingKey, demoteFailingKey } from "../../lib/model-fallback";

export interface ModelStatusResponse {
  models: Array<{
    id: string;
    name: string;
    family: string;
    provider: string;
    status: "active" | "disabled";
    statusText: string;
    latency?: string;
    contextLength: string;
    type: string;
    isFree: boolean;
  }>;
  activeCount: number;
  lastUpdated: number;
}

let cachedModels: ModelStatusResponse | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export { recordStoppedModel, recordActiveModel, isModelStopped } from "../../lib/model-status-tracker";
import { recordStoppedModel, recordActiveModel } from "../../lib/model-status-tracker";

export async function fetchLiveOpenRouterModels(forceProbe: boolean = false): Promise<ModelStatusResponse> {
  const now = Date.now();
  if (!forceProbe && cachedModels && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedModels;
  }

  const openrouterKeys = getKeysPool();
  const openrouterKey = openrouterKeys[0];

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (openrouterKey) {
    headers["Authorization"] = `Bearer ${openrouterKey}`;
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", { headers });
    if (!res.ok) {
      throw new Error(`OpenRouter models API returned ${res.status}`);
    }

    const data = await res.json();
    const rawList: Array<any> = data.data || [];

    // Verified 100% Free High-Performance Models
    const activeVerifiedIds = new Set([
      "nvidia/nemotron-3-ultra-550b-a55b:free",
      "nvidia/nemotron-3.5-lightning:free",
      "nvidia/nemotron-3-super-120b-a12b:free",
      "nvidia/nemotron-nano-12b-v2-vl:free",
      "nvidia/nemotron-nano-9b-v2:free",
      "nvidia/nemotron-3-nano-30b-a3b:free",
      "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
      "nvidia/nemotron-3.5-content-safety:free",
      "cohere/north-mini-code:free",
      "poolside/laguna-s-2.1:free",
      "poolside/laguna-xs-2.1:free",
      "openrouter/free",
      "google/gemma-4-31b-it:free",
      "google/gemma-4-26b-a4b-it:free",
      "google/lyria-3-pro-preview",
      "google/lyria-3-clip-preview",
      "openai/gpt-oss-20b:free",
      "dots-studio/dots-3-note-preview:free",
    ]);

    // Live probe check on demand across available key pool
    if (forceProbe && openrouterKeys.length > 0) {
      await Promise.all(
        Array.from(activeVerifiedIds).map(async (mId) => {
          let lastErr = "Timeout (>3.5s)";
          for (const keyToTry of openrouterKeys) {
            const ctrl = new AbortController();
            const tId = setTimeout(() => ctrl.abort(), 3500);
            try {
              const probeRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${keyToTry}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: mId,
                  messages: [{ role: "user", content: "ping" }],
                  max_tokens: 2,
                }),
                signal: ctrl.signal,
              });
              clearTimeout(tId);
              if (probeRes.ok) {
                promoteWorkingKey(keyToTry);
                recordActiveModel(mId);
                return;
              } else {
                const errData = await probeRes.json().catch(() => null);
                lastErr = errData?.error?.message || `HTTP ${probeRes.status}`;
                if (probeRes.status === 429 || probeRes.status === 401) {
                  demoteFailingKey(keyToTry);
                  continue; // Try next key in pool
                }
              }
            } catch (e: any) {
              clearTimeout(tId);
              lastErr = e?.name === "AbortError" ? "Timeout (>3.5s)" : String(e?.message || e);
            }
          }
          recordStoppedModel(mId, lastErr);
        })
      );
    }

    const formattedList: ModelStatusResponse["models"] = [];

    for (const raw of rawList) {
      const id = raw.id;
      const isFree = id.endsWith(":free") || (raw.pricing?.prompt === "0" && raw.pricing?.completion === "0");
      const isVerified = activeVerifiedIds.has(id);

      if (!isFree && !isVerified) continue;

      const family = id.split("/")[0] || "AI";
      const prettyFamily =
        family === "meta-llama" ? "Meta AI" :
        family === "google" ? "Google DeepMind" :
        family === "openai" ? "OpenAI" :
        family === "qwen" ? "Alibaba Cloud" :
        family === "deepseek" ? "DeepSeek" :
        family === "nvidia" ? "NVIDIA" :
        family === "mistralai" ? "Mistral AI" :
        family === "cohere" ? "Cohere" :
        family === "poolside" ? "Poolside" :
        family === "dots-studio" ? "Dots Studio" :
        family.toUpperCase();

      const contextK = raw.context_length ? `${Math.round(raw.context_length / 1000)}k` : "32k";

      // If model failed at runtime on OpenRouter, automatically shift to disabled
      const stoppedRecord = runtimeStoppedModels.get(id);
      const isStopped = isModelStopped(id);
      const status: "active" | "disabled" = isStopped ? "disabled" : "active";
      const statusText = isStopped && stoppedRecord
        ? stoppedRecord.reason
        : "Free · Active";

      formattedList.push({
        id,
        name: raw.name || id.split("/")[1] || id,
        family: prettyFamily,
        provider: "OpenRouter Free Model",
        status,
        statusText,
        latency: status === "active" ? "~0.5s" : undefined,
        contextLength: contextK,
        type: "100% Free Endpoint",
        isFree: true,
      });
    }

    // Sort: Active models first, then disabled models
    formattedList.sort((a, b) => (a.status === "active" ? -1 : 1));

    const responseData: ModelStatusResponse = {
      models: formattedList,
      activeCount: formattedList.filter((m) => m.status === "active").length,
      lastUpdated: now,
    };

    cachedModels = responseData;
    lastFetchTime = now;
    return responseData;
  } catch (err) {
    console.error("Failed to fetch live OpenRouter models:", err);
    if (cachedModels) return cachedModels;

    return {
      models: [],
      activeCount: 0,
      lastUpdated: now,
    };
  }
}

export const Route = createFileRoute("/api/models")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const forceProbe = url.searchParams.get("probe") === "true";
        const data = await fetchLiveOpenRouterModels(forceProbe);
        return new Response(JSON.stringify(data), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=15",
          },
        });
      },
    },
  },
});
