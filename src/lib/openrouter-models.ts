/**
 * OpenRouter Model Discovery and Management
 * Automatically fetches and caches all available free models
 */

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  architecture?: {
    modality?: string;
    tokenizer?: string;
    instruct_type?: string;
  };
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
  };
  per_request_limits?: any;
}

export interface ModelCapabilities {
  supportsVision: boolean;
  supportsCode: boolean;
  supportsMath: boolean;
  contextLength: number;
  isFree: boolean;
  isReasoning: boolean;
}

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const CACHE_KEY = "ryuk-openrouter-models-cache";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface ModelCache {
  models: OpenRouterModel[];
  timestamp: number;
}

/**
 * Fetch all models from OpenRouter API
 */
export async function fetchOpenRouterModels(apiKey?: string): Promise<OpenRouterModel[]> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(OPENROUTER_MODELS_URL, { headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching OpenRouter models:", error);
    return [];
  }
}

/**
 * Get cached models or fetch if cache is stale
 */
export async function getOpenRouterModels(apiKey?: string): Promise<OpenRouterModel[]> {
  // Try to get from cache first
  try {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { models, timestamp }: ModelCache = JSON.parse(cached);
        const now = Date.now();

        if (now - timestamp < CACHE_DURATION) {
          return models;
        }
      }
    }
  } catch (error) {
    console.error("Error reading model cache:", error);
  }

  // Fetch fresh data
  const models = await fetchOpenRouterModels(apiKey);

  // Cache the results
  try {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      const cache: ModelCache = {
        models,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }
  } catch (error) {
    console.error("Error caching models:", error);
  }

  return models;
}

/**
 * Filter only free models
 */
export function getFreeModels(models: OpenRouterModel[]): OpenRouterModel[] {
  return models.filter(model => {
    const promptPrice = parseFloat(model.pricing?.prompt || "1");
    const completionPrice = parseFloat(model.pricing?.completion || "1");
    return promptPrice === 0 && completionPrice === 0;
  });
}

/**
 * Analyze model capabilities
 */
export function analyzeModelCapabilities(model: OpenRouterModel): ModelCapabilities {
  const modelId = model.id.toLowerCase();
  const modelName = model.name?.toLowerCase() || "";
  const description = model.description?.toLowerCase() || "";

  return {
    supportsVision:
      modelId.includes("vision") ||
      modelId.includes("vl") ||
      modelId.includes("pixtral") ||
      modelName.includes("vision") ||
      model.architecture?.modality === "multimodal",

    supportsCode:
      modelId.includes("code") ||
      modelId.includes("coder") ||
      modelName.includes("code") ||
      description.includes("code"),

    supportsMath:
      modelId.includes("math") ||
      modelId.includes("r1") ||
      modelId.includes("reasoning") ||
      description.includes("math"),

    contextLength: model.context_length || 4096,

    isFree: parseFloat(model.pricing?.prompt || "1") === 0,

    isReasoning:
      modelId.includes("r1") ||
      modelId.includes("o1") ||
      modelId.includes("o3") ||
      modelId.includes("reasoning")
  };
}

/**
 * Categorize models by task type
 */
export interface CategorizedModels {
  code: OpenRouterModel[];
  math: OpenRouterModel[];
  vision: OpenRouterModel[];
  general: OpenRouterModel[];
  reasoning: OpenRouterModel[];
  all: OpenRouterModel[];
}

export function categorizeModels(models: OpenRouterModel[]): CategorizedModels {
  const freeModels = getFreeModels(models);

  const categorized: CategorizedModels = {
    code: [],
    math: [],
    vision: [],
    general: [],
    reasoning: [],
    all: freeModels
  };

  for (const model of freeModels) {
    const caps = analyzeModelCapabilities(model);

    if (caps.isReasoning) {
      categorized.reasoning.push(model);
    }
    if (caps.supportsCode) {
      categorized.code.push(model);
    }
    if (caps.supportsMath) {
      categorized.math.push(model);
    }
    if (caps.supportsVision) {
      categorized.vision.push(model);
    }

    categorized.general.push(model);
  }

  return categorized;
}

/**
 * Sort models by quality heuristics
 */
export function sortModelsByQuality(models: OpenRouterModel[]): OpenRouterModel[] {
  return [...models].sort((a, b) => {
    // Priority factors
    const aScore = calculateModelScore(a);
    const bScore = calculateModelScore(b);
    return bScore - aScore;
  });
}

function calculateModelScore(model: OpenRouterModel): number {
  let score = 0;
  const modelId = model.id.toLowerCase();

  // High-quality model families
  if (modelId.includes("deepseek")) score += 100;
  if (modelId.includes("qwen")) score += 90;
  if (modelId.includes("llama-3.3") || modelId.includes("llama-3.2")) score += 85;
  if (modelId.includes("gemma-4")) score += 80;
  if (modelId.includes("mistral")) score += 75;
  if (modelId.includes("phi")) score += 70;

  // Context length bonus
  score += Math.min(model.context_length / 1000, 50);

  // Recent models (higher version numbers)
  if (modelId.includes("3.3") || modelId.includes("4.")) score += 20;
  if (modelId.includes("2.5") || modelId.includes("3.2")) score += 15;

  // Specialized capabilities
  if (modelId.includes("instruct")) score += 10;
  if (modelId.includes("chat")) score += 10;

  return score;
}

/**
 * Get best models for a specific task
 */
export function getBestModelsForTask(
  models: OpenRouterModel[],
  task: "code" | "math" | "vision" | "general" | "reasoning",
  limit: number = 10
): OpenRouterModel[] {
  const categorized = categorizeModels(models);
  const taskModels = categorized[task] || categorized.general;
  const sorted = sortModelsByQuality(taskModels);
  return sorted.slice(0, limit);
}

/**
 * Clear model cache
 */
export function clearModelCache(): void {
  try {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.removeItem(CACHE_KEY);
    }
  } catch (error) {
    console.error("Error clearing model cache:", error);
  }
}

export default {
  getOpenRouterModels,
  getFreeModels,
  analyzeModelCapabilities,
  categorizeModels,
  sortModelsByQuality,
  getBestModelsForTask,
  clearModelCache
};
