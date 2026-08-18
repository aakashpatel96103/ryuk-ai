import fs from "node:fs";
import path from "node:path";
import { recordStoppedModel, recordActiveModel } from "./model-status-tracker";

export interface FallbackConfig {
  maxRetries: number;
  retryDelay: number;
  fallbackModels: string[];
  enableAutoFallback: boolean;
}

export interface ModelAttempt {
  modelId: string;
  attempt: number;
  success: boolean;
  error?: string;
  latency?: number;
}

/**
 * Comprehensive fallback model lists by category (verified active endpoints only)
 */
const FALLBACK_MODELS = {
  code: [
    "cohere/north-mini-code:free",
    "nvidia/nemotron-3.5-lightning:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "openrouter/free",
  ],
  math: [
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "nvidia/nemotron-3.5-lightning:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "openrouter/free",
  ],
  vision: [
    "nvidia/nemotron-nano-12b-v2-vl:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "openrouter/free",
  ],
  general: [
    "nvidia/nemotron-3-super-120b-a12b:free",
    "nvidia/nemotron-3.5-lightning:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "nvidia/nemotron-3-nano-30b-a3b:free",
    "poolside/laguna-s-2.1:free",
    "openrouter/free",
  ],
  creative: [
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "nvidia/nemotron-3.5-lightning:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "openrouter/free",
  ],
  reasoning: [
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "nvidia/nemotron-3.5-lightning:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "openrouter/free",
  ]
};

/**
 * Fetch model response with automatic fallback
 */
export async function fetchWithFallback(
  messages: Array<{ role: string; content: any }>,
  primaryModel: string,
  apiKey: string,
  category: keyof typeof FALLBACK_MODELS = "general",
  behaviorPrompt?: string,
  timeout: number = 7000
): Promise<{ content: string; modelId: string; attempts: ModelAttempt[] }> {

  const attempts: ModelAttempt[] = [];
  const fallbackList = FALLBACK_MODELS[category];

  // Create attempt queue: primary + fallbacks
  const modelsToTry = [
    primaryModel,
    ...fallbackList.filter(m => m !== primaryModel)
  ];

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelId = modelsToTry[i]!;
    const attemptNumber = i + 1;
    const startTime = Date.now();

    try {
      console.info(`[Attempt ${attemptNumber}] Trying model: ${modelId}`);

      const response = await fetchModelResponseWithTimeout(
        messages,
        modelId,
        apiKey,
        behaviorPrompt,
        timeout
      );

      const latency = Date.now() - startTime;

      attempts.push({
        modelId,
        attempt: attemptNumber,
        success: true,
        latency
      });

      console.info(`[Success] ${modelId} responded in ${latency}ms`);

      return {
        content: response.content,
        modelId: response.modelId,
        attempts
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      attempts.push({
        modelId,
        attempt: attemptNumber,
        success: false,
        error: errorMsg,
        latency
      });

      console.warn(`[Failure ${attemptNumber}] ${modelId} failed: ${errorMsg}`);

      // If not last model, try next fallback
      if (i < modelsToTry.length - 1) {
        console.info(`[Fallback] Switching to next model...`);
        // Small delay before retry
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

      // All models failed
      throw new Error(
        `All ${modelsToTry.length} models failed. ` +
        `Attempts: ${attempts.map(a => `${a.modelId}(${a.success ? 'OK' : 'FAIL'})`).join(', ')}`
      );
    }
  }

  throw new Error("Unexpected fallback loop exit");
}

/**
 * Parallel fetch with automatic replacement of failed models
 */
export async function fetchParallelWithFallback(
  messages: Array<{ role: string; content: any }>,
  models: string[],
  apiKey: string,
  category: keyof typeof FALLBACK_MODELS = "general",
  behaviorPrompt?: string,
  targetCount: number = 10,
  timeout: number = 7000
): Promise<Array<{ content: string; modelId: string; attempts: ModelAttempt[] }>> {

  const fallbackList = FALLBACK_MODELS[category];
  const allAvailableModels = [...new Set([...models, ...fallbackList])];

  console.info(`[Parallel Fallback] Starting with ${models.length} models, ${allAvailableModels.length} fallbacks available`);

  const results: Array<{ content: string; modelId: string; attempts: ModelAttempt[] }> = [];
  const failures: string[] = [];
  const usedModels = new Set<string>();

  // First attempt: Try all primary models in parallel
  const primaryPromises = models.map(async (modelId) => {
    try {
      usedModels.add(modelId);
      const response = await fetchModelResponseWithTimeout(
        messages,
        modelId,
        apiKey,
        behaviorPrompt,
        timeout
      );
      return { content: response.content, modelId, success: true };
    } catch (error) {
      failures.push(modelId);
      return { content: "", modelId, success: false, error };
    }
  });

  const primaryResults = await Promise.allSettled(primaryPromises);

  // Collect successful responses
  for (const result of primaryResults) {
    if (result.status === "fulfilled" && result.value.success) {
      results.push({
        content: result.value.content,
        modelId: result.value.modelId,
        attempts: [{ modelId: result.value.modelId, attempt: 1, success: true }]
      });
    }
  }

  console.info(`[Primary Results] ${results.length} succeeded, ${failures.length} failed`);

  // If we have enough successful responses, return
  if (results.length >= targetCount) {
    return results.slice(0, targetCount);
  }

  // Need fallbacks: Try unused models to reach target count
  const needed = targetCount - results.length;
  const unusedModels = allAvailableModels.filter(m => !usedModels.has(m));

  console.info(`[Fallback] Need ${needed} more models, ${unusedModels.length} available`);

  if (unusedModels.length > 0) {
    const fallbackPromises = unusedModels.slice(0, needed * 2).map(async (modelId) => {
      try {
        usedModels.add(modelId);
        const response = await fetchModelResponseWithTimeout(
          messages,
          modelId,
          apiKey,
          behaviorPrompt,
          timeout
        );
        return { content: response.content, modelId, success: true };
      } catch (error) {
        return { content: "", modelId, success: false, error };
      }
    });

    const fallbackResults = await Promise.allSettled(fallbackPromises);

    for (const result of fallbackResults) {
      if (result.status === "fulfilled" && result.value.success) {
        results.push({
          content: result.value.content,
          modelId: result.value.modelId,
          attempts: [{ modelId: result.value.modelId, attempt: 1, success: true }]
        });

        if (results.length >= targetCount) {
          break;
        }
      }
    }
  }

  console.info(`[Final] Collected ${results.length} successful responses`);

  return results;
}

/**
 * Helper: Fetch with timeout
 */
let activeKeysPool: string[] = [];
const failingKeysMap = new Map<string, number>(); // key -> cooldown until timestamp

export function getKeysPool(customKey?: string, forceRefresh: boolean = true): string[] {
  const discoveredKeys: string[] = [];

  if (customKey && customKey.trim()) {
    discoveredKeys.push(customKey.trim());
  }

  try {
    if (typeof process !== "undefined") {
      for (const envFile of [".env.local", ".env"]) {
        try {
          const filePath = path.resolve(process.cwd(), envFile);
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, "utf-8");
            for (const line of content.split("\n")) {
              if (line.startsWith("OPENROUTER_API_KEY") || line.startsWith("OPENROUTER_API_KEYS")) {
                const val = line.split("=")[1]?.replace(/["'\r]/g, "").trim();
                if (val) {
                  for (const k of val.split(",")) {
                    const trimmed = k.trim();
                    if (trimmed && !discoveredKeys.includes(trimmed)) {
                      discoveredKeys.push(trimmed);
                    }
                  }
                }
              }
            }
          }
        } catch {
          // ignore fs errors
        }
      }
    }
  } catch {
    // ignore
  }

  const rawEnvKeys = (process.env["OPENROUTER_API_KEYS"] || process.env["OPENROUTER_API_KEY"] || "")
    .split(",")
    .map(k => k.trim())
    .filter(Boolean);

  for (const k of rawEnvKeys) {
    if (k && !discoveredKeys.includes(k)) discoveredKeys.push(k);
  }

  // Filter expired cooldowns
  const now = Date.now();
  for (const [key, until] of failingKeysMap.entries()) {
    if (now > until) {
      failingKeysMap.delete(key);
    }
  }

  // Sort keys: healthy keys first, failing/cooling-down keys at the back
  const healthyKeys = discoveredKeys.filter(k => !failingKeysMap.has(k));
  const coolingKeys = discoveredKeys.filter(k => failingKeysMap.has(k));

  activeKeysPool = [...healthyKeys, ...coolingKeys];
  return activeKeysPool.length > 0 ? activeKeysPool : rawEnvKeys;
}

export function promoteWorkingKey(workingKey: string) {
  if (!workingKey) return;
  failingKeysMap.delete(workingKey);
  const current = getKeysPool();
  if (current.length <= 1 || current[0] === workingKey) return;
  activeKeysPool = [workingKey, ...current.filter(k => k !== workingKey)];
}

export function demoteFailingKey(failingKey: string, cooldownMs: number = 3 * 60 * 1000) {
  if (!failingKey) return;
  failingKeysMap.set(failingKey, Date.now() + cooldownMs);
  const current = getKeysPool();
  if (current.length <= 1) return;
  activeKeysPool = [...current.filter(k => k !== failingKey), failingKey];
}

async function fetchModelResponseWithTimeout(
  messages: Array<{ role: string; content: any }>,
  modelId: string,
  apiKey: string | string[],
  behaviorPrompt?: string,
  timeout: number = 7000
): Promise<{ content: string; modelId: string }> {
  const isHf = modelId.startsWith("Qwen/") || modelId.startsWith("meta-llama/Llama") || modelId.startsWith("mistralai/");
  const hfKey = process.env["HUGGINGFACE_API_KEY"];
  const targetUrl = isHf && hfKey
    ? "https://router.huggingface.co/v1/chat/completions"
    : "https://openrouter.ai/api/v1/chat/completions";

  const pool = getKeysPool();
  const passedKeys = Array.isArray(apiKey) ? apiKey : [apiKey];
  const keysToTry = isHf && hfKey
    ? [hfKey]
    : Array.from(new Set([...pool, ...passedKeys.filter(Boolean)]));

  let lastError: Error | null = null;

  for (const currentKey of keysToTry) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const messagesWithPrompt = behaviorPrompt
        ? [{ role: "system", content: behaviorPrompt }, ...messages]
        : messages;

      const headers: Record<string, string> = {
        "Authorization": `Bearer ${currentKey}`,
        "Content-Type": "application/json",
      };
      if (!isHf) {
        headers["HTTP-Referer"] = "https://ryuk.ai";
        headers["X-Title"] = "rYuk.ai";
      }

      const response = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: modelId,
          messages: messagesWithPrompt,
          temperature: 0.7,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        lastError = new Error(`HTTP ${response.status}: ${errText.slice(0, 100) || response.statusText}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        lastError = new Error("No content in response");
        continue;
      }

      // Automatically remember this key as the primary working key and mark model active
      promoteWorkingKey(currentKey);
      recordActiveModel(modelId);
      return { content, modelId };

    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  recordStoppedModel(modelId, lastError?.message || "Failed / Rate Limited");
  throw lastError || new Error(`All API keys failed for model ${modelId}`);
}

/**
 * Get fallback models for a category
 */
export function getFallbackModels(category: keyof typeof FALLBACK_MODELS): string[] {
  return FALLBACK_MODELS[category] || FALLBACK_MODELS.general;
}

/**
 * Check if a model is available as fallback
 */
export function hasFallbackAvailable(category: keyof typeof FALLBACK_MODELS): boolean {
  return FALLBACK_MODELS[category].length > 0;
}
