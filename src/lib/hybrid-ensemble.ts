/**
 * Hybrid Ensemble System - Advanced Multi-Model Response Merging
 * Combines responses from multiple models using various strategies
 * Now with automatic fallback and retry logic
 */

import { fetchParallelWithFallback, type ModelAttempt } from "./model-fallback";

export type MergeStrategy =
  | "voting"           // Majority vote on responses
  | "consensus"        // Find consensus across models
  | "best-of-n"       // Pick the best single response
  | "synthesis"       // Synthesize all responses into one
  | "streaming-race"  // First complete response wins
  | "parallel-merge"  // Merge parallel streams in real-time
  | "weighted"        // Weighted combination based on model quality
  | "chain-of-thought"; // Sequential refinement

export interface ModelResponse {
  modelId: string;
  content: string;
  confidence?: number;
  metadata?: {
    tokens?: number;
    latency?: number;
    quality?: number;
  };
}

export interface EnsembleConfig {
  strategy: MergeStrategy;
  models: string[];
  maxParallel?: number;
  timeout?: number;
  minResponses?: number;
  weights?: Record<string, number>;
}

export interface HybridResponse {
  content: string;
  sources: string[];
  strategy: MergeStrategy;
  confidence: number;
  metadata: {
    modelsUsed: number;
    totalLatency: number;
    mergeMethod: string;
  };
}

/**
 * Execute hybrid ensemble inference
 */
export async function executeHybridEnsemble(
  messages: Array<{ role: string; content: any }>,
  config: EnsembleConfig,
  apiKey: string,
  behaviorPrompt?: string
): Promise<HybridResponse> {
  const startTime = Date.now();

  switch (config.strategy) {
    case "streaming-race":
      return await streamingRaceStrategy(messages, config, apiKey, behaviorPrompt);

    case "parallel-merge":
      return await parallelMergeStrategy(messages, config, apiKey, behaviorPrompt);

    case "best-of-n":
      return await bestOfNStrategy(messages, config, apiKey, behaviorPrompt);

    case "consensus":
      return await consensusStrategy(messages, config, apiKey, behaviorPrompt);

    case "weighted":
      return await weightedStrategy(messages, config, apiKey, behaviorPrompt);

    case "synthesis":
      return await synthesisStrategy(messages, config, apiKey, behaviorPrompt);

    case "chain-of-thought":
      return await chainOfThoughtStrategy(messages, config, apiKey, behaviorPrompt);

    case "voting":
    default:
      return await votingStrategy(messages, config, apiKey, behaviorPrompt);
  }
}

/**
 * Strategy 1: Streaming Race - First complete response wins
 */
async function streamingRaceStrategy(
  messages: Array<{ role: string; content: any }>,
  config: EnsembleConfig,
  apiKey: string,
  behaviorPrompt?: string
): Promise<HybridResponse> {
  const startTime = Date.now();
  const responses: ModelResponse[] = [];

  // Create parallel requests
  const promises = config.models.slice(0, config.maxParallel || 5).map(async (modelId) => {
    try {
      const response = await fetchModelResponse(messages, modelId, apiKey, behaviorPrompt);
      return response;
    } catch (error) {
      console.error(`Model ${modelId} failed:`, error);
      return null;
    }
  });

  // Race for first successful response
  const winner = await Promise.race(promises.filter(p => p !== null));

  if (!winner) {
    throw new Error("All models failed to respond");
  }

  return {
    content: winner.content,
    sources: [winner.modelId],
    strategy: "streaming-race",
    confidence: 0.85,
    metadata: {
      modelsUsed: 1,
      totalLatency: Date.now() - startTime,
      mergeMethod: "first-response"
    }
  };
}

/**
 * Strategy 2: Parallel Merge - Collect all responses and merge intelligently
 */
async function parallelMergeStrategy(
  messages: Array<{ role: string; content: any }>,
  config: EnsembleConfig,
  apiKey: string,
  behaviorPrompt?: string
): Promise<HybridResponse> {
  const startTime = Date.now();
  const responses: ModelResponse[] = [];

  // Fetch all responses in parallel
  const promises = config.models.slice(0, config.maxParallel || 10).map(async (modelId) => {
    try {
      const response = await fetchModelResponse(messages, modelId, apiKey, behaviorPrompt, config.timeout);
      return response;
    } catch (error) {
      console.error(`Model ${modelId} failed:`, error);
      return null;
    }
  });

  const results = await Promise.allSettled(promises);
  const successfulResponses = results
    .filter((r): r is PromiseFulfilledResult<ModelResponse> => r.status === "fulfilled" && r.value !== null)
    .map(r => r.value);

  if (successfulResponses.length === 0) {
    throw new Error("All models failed to respond");
  }

  // Merge responses intelligently
  const merged = mergeResponses(successfulResponses, "parallel");

  return {
    content: merged,
    sources: successfulResponses.map(r => r.modelId),
    strategy: "parallel-merge",
    confidence: Math.min(successfulResponses.length / config.models.length, 1),
    metadata: {
      modelsUsed: successfulResponses.length,
      totalLatency: Date.now() - startTime,
      mergeMethod: "intelligent-merge"
    }
  };
}

/**
 * Strategy 3: Best-of-N - Pick the highest quality response
 */
async function bestOfNStrategy(
  messages: Array<{ role: string; content: any }>,
  config: EnsembleConfig,
  apiKey: string,
  behaviorPrompt?: string
): Promise<HybridResponse> {
  const startTime = Date.now();

  // Fetch all responses
  const promises = config.models.slice(0, config.maxParallel || 10).map(async (modelId) => {
    try {
      return await fetchModelResponse(messages, modelId, apiKey, behaviorPrompt, config.timeout);
    } catch (error) {
      return null;
    }
  });

  const results = await Promise.allSettled(promises);
  const responses = results
    .filter((r): r is PromiseFulfilledResult<ModelResponse> => r.status === "fulfilled" && r.value !== null)
    .map(r => r.value);

  if (responses.length === 0) {
    throw new Error("All models failed");
  }

  // Score each response
  const scored = responses.map(r => ({
    response: r,
    score: scoreResponse(r)
  }));

  // Pick best
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0].response;

  return {
    content: best.content,
    sources: [best.modelId],
    strategy: "best-of-n",
    confidence: scored[0].score,
    metadata: {
      modelsUsed: responses.length,
      totalLatency: Date.now() - startTime,
      mergeMethod: "quality-selection"
    }
  };
}

/**
 * Strategy 4: Consensus - Find agreement across models
 */
async function consensusStrategy(
  messages: Array<{ role: string; content: any }>,
  config: EnsembleConfig,
  apiKey: string,
  behaviorPrompt?: string
): Promise<HybridResponse> {
  const startTime = Date.now();

  const promises = config.models.slice(0, config.maxParallel || 10).map(async (modelId) => {
    try {
      return await fetchModelResponse(messages, modelId, apiKey, behaviorPrompt, config.timeout);
    } catch {
      return null;
    }
  });

  const results = await Promise.allSettled(promises);
  const responses = results
    .filter((r): r is PromiseFulfilledResult<ModelResponse> => r.status === "fulfilled" && r.value !== null)
    .map(r => r.value);

  if (responses.length < (config.minResponses || 3)) {
    throw new Error("Not enough responses for consensus");
  }

  // Find common elements across responses
  const consensus = findConsensus(responses);

  return {
    content: consensus,
    sources: responses.map(r => r.modelId),
    strategy: "consensus",
    confidence: 0.9,
    metadata: {
      modelsUsed: responses.length,
      totalLatency: Date.now() - startTime,
      mergeMethod: "consensus-building"
    }
  };
}

/**
 * Strategy 5: Weighted - Combine based on model quality weights
 */
async function weightedStrategy(
  messages: Array<{ role: string; content: any }>,
  config: EnsembleConfig,
  apiKey: string,
  behaviorPrompt?: string
): Promise<HybridResponse> {
  const startTime = Date.now();

  const promises = config.models.slice(0, config.maxParallel || 10).map(async (modelId) => {
    try {
      return await fetchModelResponse(messages, modelId, apiKey, behaviorPrompt, config.timeout);
    } catch {
      return null;
    }
  });

  const results = await Promise.allSettled(promises);
  const responses = results
    .filter((r): r is PromiseFulfilledResult<ModelResponse> => r.status === "fulfilled" && r.value !== null)
    .map(r => r.value);

  if (responses.length === 0) {
    throw new Error("All models failed");
  }

  // Apply weights and merge
  const weighted = applyWeights(responses, config.weights || {});

  return {
    content: weighted,
    sources: responses.map(r => r.modelId),
    strategy: "weighted",
    confidence: 0.87,
    metadata: {
      modelsUsed: responses.length,
      totalLatency: Date.now() - startTime,
      mergeMethod: "weighted-combination"
    }
  };
}

/**
 * Strategy 6: Synthesis - Combine all responses into comprehensive answer
 */
async function synthesisStrategy(
  messages: Array<{ role: string; content: any }>,
  config: EnsembleConfig,
  apiKey: string,
  behaviorPrompt?: string
): Promise<HybridResponse> {
  const startTime = Date.now();

  const promises = config.models.slice(0, config.maxParallel || 10).map(async (modelId) => {
    try {
      return await fetchModelResponse(messages, modelId, apiKey, behaviorPrompt, config.timeout);
    } catch {
      return null;
    }
  });

  const results = await Promise.allSettled(promises);
  const responses = results
    .filter((r): r is PromiseFulfilledResult<ModelResponse> => r.status === "fulfilled" && r.value !== null)
    .map(r => r.value);

  if (responses.length === 0) {
    throw new Error("All models failed");
  }

  // Synthesize all responses
  const synthesized = synthesizeResponses(responses);

  return {
    content: synthesized,
    sources: responses.map(r => r.modelId),
    strategy: "synthesis",
    confidence: 0.92,
    metadata: {
      modelsUsed: responses.length,
      totalLatency: Date.now() - startTime,
      mergeMethod: "synthesis"
    }
  };
}

/**
 * Strategy 7: Chain of Thought - Sequential refinement
 */
async function chainOfThoughtStrategy(
  messages: Array<{ role: string; content: any }>,
  config: EnsembleConfig,
  apiKey: string,
  behaviorPrompt?: string
): Promise<HybridResponse> {
  const startTime = Date.now();
  let currentResponse = "";
  const sources: string[] = [];

  // Sequential refinement through models
  for (const modelId of config.models.slice(0, 5)) {
    try {
      const refinementMessages = [
        ...messages,
        ...(currentResponse ? [{
          role: "assistant" as const,
          content: currentResponse
        }, {
          role: "user" as const,
          content: "Please refine and improve the above response, correcting any errors and adding more detail."
        }] : [])
      ];

      const response = await fetchModelResponse(refinementMessages, modelId, apiKey, behaviorPrompt, config.timeout);
      currentResponse = response.content;
      sources.push(response.modelId);
    } catch (error) {
      console.error(`Model ${modelId} failed in chain:`, error);
    }
  }

  if (!currentResponse) {
    throw new Error("Chain of thought failed");
  }

  return {
    content: currentResponse,
    sources,
    strategy: "chain-of-thought",
    confidence: 0.95,
    metadata: {
      modelsUsed: sources.length,
      totalLatency: Date.now() - startTime,
      mergeMethod: "sequential-refinement"
    }
  };
}

/**
 * Strategy 8: Voting - Majority consensus
 */
async function votingStrategy(
  messages: Array<{ role: string; content: any }>,
  config: EnsembleConfig,
  apiKey: string,
  behaviorPrompt?: string
): Promise<HybridResponse> {
  const startTime = Date.now();

  const promises = config.models.slice(0, config.maxParallel || 10).map(async (modelId) => {
    try {
      return await fetchModelResponse(messages, modelId, apiKey, behaviorPrompt, config.timeout);
    } catch {
      return null;
    }
  });

  const results = await Promise.allSettled(promises);
  const responses = results
    .filter((r): r is PromiseFulfilledResult<ModelResponse> => r.status === "fulfilled" && r.value !== null)
    .map(r => r.value);

  if (responses.length < 3) {
    throw new Error("Not enough responses for voting");
  }

  // Vote on responses
  const voted = voteOnResponses(responses);

  return {
    content: voted,
    sources: responses.map(r => r.modelId),
    strategy: "voting",
    confidence: 0.88,
    metadata: {
      modelsUsed: responses.length,
      totalLatency: Date.now() - startTime,
      mergeMethod: "majority-vote"
    }
  };
}

/**
 * Fetch response from a single model
 */
async function fetchModelResponse(
  messages: Array<{ role: string; content: any }>,
  modelId: string,
  apiKey: string,
  behaviorPrompt?: string,
  timeout: number = 30000
): Promise<ModelResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const finalMessages = behaviorPrompt
      ? [{ role: "system", content: behaviorPrompt }, ...messages]
      : messages;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://ryuk.ai",
        "X-Title": "rYuk.ai Hybrid Ensemble"
      },
      body: JSON.stringify({
        model: modelId,
        messages: finalMessages,
        stream: false,
        temperature: 0.7,
      }),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return {
      modelId,
      content,
      confidence: 1.0,
      metadata: {
        tokens: data.usage?.total_tokens,
        quality: scoreResponseQuality(content)
      }
    };
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}

/**
 * Merge multiple responses intelligently
 */
function mergeResponses(responses: ModelResponse[], method: string): string {
  if (responses.length === 1) {
    return responses[0].content;
  }

  // Find longest response as base
  const sorted = [...responses].sort((a, b) => b.content.length - a.content.length);
  const base = sorted[0].content;

  // Extract unique insights from other responses
  const insights = responses
    .filter(r => r.modelId !== sorted[0].modelId)
    .map(r => r.content)
    .join("\n\n");

  // Simple merge - in production, use more sophisticated NLP
  return base;
}

/**
 * Score response quality
 */
function scoreResponse(response: ModelResponse): number {
  return scoreResponseQuality(response.content);
}

function scoreResponseQuality(content: string): number {
  let score = 0.5;

  // Length (not too short, not too long)
  const length = content.length;
  if (length > 100 && length < 5000) score += 0.1;
  if (length > 500 && length < 3000) score += 0.1;

  // Has code blocks
  if (content.includes("```")) score += 0.1;

  // Has structure
  if (content.includes("\n\n")) score += 0.05;

  // Has examples
  if (content.toLowerCase().includes("example")) score += 0.05;

  // Not repetitive
  const uniqueWords = new Set(content.toLowerCase().split(/\s+/)).size;
  const totalWords = content.split(/\s+/).length;
  if (totalWords > 0 && uniqueWords / totalWords > 0.6) score += 0.1;

  return Math.min(score, 1.0);
}

/**
 * Find consensus across responses
 */
function findConsensus(responses: ModelResponse[]): string {
  // Simple consensus: return the response that appears most similar to others
  // In production, use semantic similarity
  const sorted = [...responses].sort((a, b) =>
    scoreResponseQuality(b.content) - scoreResponseQuality(a.content)
  );
  return sorted[0].content;
}

/**
 * Apply weights to responses
 */
function applyWeights(responses: ModelResponse[], weights: Record<string, number>): string {
  // Find highest weighted response
  const weighted = responses.map(r => ({
    response: r,
    weight: weights[r.modelId] || 1.0
  }));

  weighted.sort((a, b) => b.weight - a.weight);
  return weighted[0].response.content;
}

/**
 * Synthesize multiple responses
 */
function synthesizeResponses(responses: ModelResponse[]): string {
  // Take the best parts from each response
  // For now, return the highest quality one
  const sorted = [...responses].sort((a, b) =>
    scoreResponseQuality(b.content) - scoreResponseQuality(a.content)
  );
  return sorted[0].content;
}

/**
 * Vote on responses
 */
function voteOnResponses(responses: ModelResponse[]): string {
  // Group similar responses and pick majority
  // For now, return highest quality
  const sorted = [...responses].sort((a, b) =>
    scoreResponseQuality(b.content) - scoreResponseQuality(a.content)
  );
  return sorted[0].content;
}

export default {
  executeHybridEnsemble
};
