/**
 * Automatic Model Fallback System
 * Switches to alternative models when failures occur
 */

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
    "Qwen/Qwen2.5-72B-Instruct",
    "meta-llama/Llama-3.3-70B-Instruct",
    "deepseek/deepseek-chat",
    "meta-llama/llama-3.3-70b-instruct",
    "openai/gpt-4o-mini",
  ],
  math: [
    "Qwen/Qwen2.5-72B-Instruct",
    "meta-llama/Llama-3.3-70B-Instruct",
    "deepseek/deepseek-chat",
    "meta-llama/llama-3.3-70b-instruct",
  ],
  vision: [
    "openai/gpt-4o-mini",
    "meta-llama/llama-3.3-70b-instruct",
    "deepseek/deepseek-chat",
  ],
  general: [
    "Qwen/Qwen2.5-72B-Instruct",
    "meta-llama/Llama-3.3-70B-Instruct",
    "deepseek/deepseek-chat",
    "meta-llama/llama-3.3-70b-instruct",
    "openai/gpt-4o-mini",
  ],
  creative: [
    "Qwen/Qwen2.5-72B-Instruct",
    "meta-llama/Llama-3.3-70B-Instruct",
    "deepseek/deepseek-chat",
    "meta-llama/llama-3.3-70b-instruct",
  ],
  reasoning: [
    "Qwen/Qwen2.5-72B-Instruct",
    "deepseek/deepseek-chat",
    "meta-llama/Llama-3.3-70B-Instruct",
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
async function fetchModelResponseWithTimeout(
  messages: Array<{ role: string; content: any }>,
  modelId: string,
  apiKey: string,
  behaviorPrompt?: string,
  timeout: number = 8000
): Promise<{ content: string; modelId: string }> {

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const messagesWithPrompt = behaviorPrompt
      ? [{ role: "system", content: behaviorPrompt }, ...messages]
      : messages;

    const isHf = modelId.startsWith("Qwen/") || modelId.startsWith("meta-llama/Llama") || modelId.startsWith("mistralai/");
    const hfKey = process.env["HUGGINGFACE_API_KEY"];
    const targetUrl = isHf && hfKey
      ? "https://router.huggingface.co/v1/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions";
    const authKey = isHf && hfKey ? hfKey : apiKey;

    const headers: Record<string, string> = {
      "Authorization": `Bearer ${authKey}`,
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
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in response");
    }

    return { content, modelId };

  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
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
