import { createFileRoute } from "@tanstack/react-router";

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

// Live runtime map of stopped/failing models on OpenRouter (with 3-minute cooldown)
const runtimeStoppedModels = new Map<string, { until: number; reason: string }>();

export function recordStoppedModel(modelId: string, reason: string = "Stopped / Rate Limited (429)") {
  runtimeStoppedModels.set(modelId, {
    until: Date.now() + 3 * 60 * 1000,
    reason,
  });
}

export function isModelStopped(modelId: string): boolean {
  const record = runtimeStoppedModels.get(modelId);
  if (!record) return false;
  if (Date.now() > record.until) {
    runtimeStoppedModels.delete(modelId);
    return false;
  }
  return true;
}

export async function fetchLiveOpenRouterModels(forceProbe: boolean = false): Promise<ModelStatusResponse> {
  const now = Date.now();
  if (!forceProbe && cachedModels && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedModels;
  }

  const rawKeysStr = (process.env["OPENROUTER_API_KEYS"] || process.env["OPENROUTER_API_KEY"] || "");
  const openrouterKeys = rawKeysStr
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
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

    // Verified high-performance models
    const activeVerifiedIds = new Set([
      "meta-llama/llama-3.3-70b-instruct",
      "qwen/qwen-2.5-72b-instruct",
      "openai/gpt-4o-mini",
      "deepseek/deepseek-chat"
    ]);

    // Quick health probe against OpenRouter free tier
    let isFreeTierLimited = false;
    if (openrouterKey) {
      try {
        const probeRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 5,
          }),
        });
        if (probeRes.status === 429) {
          isFreeTierLimited = true;
        }
      } catch {
        // Ignore network errors
      }
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
        family === "liquid" ? "Liquid AI" :
        family.toUpperCase();

      const contextK = raw.context_length ? `${Math.round(raw.context_length / 1000)}k` : "32k";

      // If model failed at runtime on OpenRouter or free tier is rate limited, automatically shift to disabled
      const stoppedRecord = runtimeStoppedModels.get(id);
      const isStopped = isModelStopped(id);
      const isDisabled = isStopped || (isFree && isFreeTierLimited);
      const status: "active" | "disabled" = isDisabled ? "disabled" : "active";
      const statusText = isStopped && stoppedRecord
        ? stoppedRecord.reason
        : isDisabled
        ? "Rate Limited (429)"
        : isFree
        ? "Free · Active"
        : "Operational";

      formattedList.push({
        id,
        name: raw.name || id.split("/")[1] || id,
        family: prettyFamily,
        provider: isFree ? "OpenRouter Free Model" : "OpenRouter High Performance",
        status,
        statusText,
        latency: status === "active" ? (isFree ? "~0.8s" : "~1.2s") : undefined,
        contextLength: contextK,
        type: isFree ? "100% Free Endpoint" : "Standard Intelligence",
        isFree,
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
  loader: async ({ request }) => {
    const url = new URL(request.url);
    const forceProbe = url.searchParams.get("probe") === "true";
    const data = await fetchLiveOpenRouterModels(forceProbe);
    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=30",
      },
    });
  },
});
