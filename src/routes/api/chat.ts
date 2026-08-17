import { createFileRoute } from "@tanstack/react-router";
import { generateSystemPrompt, type AIProvider, type ChatGPTPersonality } from "../../config/ai-behaviors";
import { executeHybridEnsemble, type MergeStrategy } from "../../lib/hybrid-ensemble";
import { getOpenRouterModels, getBestModelsForTask, getFreeModels } from "../../lib/openrouter-models";
import { getAdaptiveEnsembleConfig } from "../../lib/adaptive-ensemble";
import { fetchParallelWithFallback, getFallbackModels } from "../../lib/model-fallback";
import { fetchLiveOpenRouterModels, recordStoppedModel, isModelStopped } from "./models";

// Server-side proxy to OmniRoute, OpenRouter, and Hugging Face completion endpoints.
const OMNIROUTE_CHAT_URL = process.env["OMNIROUTE_BASE_URL"]
  ? `${process.env["OMNIROUTE_BASE_URL"]}/chat/completions`
  : "http://localhost:20128/v1/chat/completions";
const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const HUGGINGFACE_CHAT_URL = "https://router.huggingface.co/v1/chat/completions";

// Generate system prompts dynamically based on behavior configuration
function getSystemPrompt(provider: AIProvider = "ryuk-default", personality?: ChatGPTPersonality, isReasoningModel: boolean = false) {
  const content = generateSystemPrompt(provider, personality);

  // Minimal prompt for reasoning models (R1, O1, O3)
  if (isReasoningModel) {
    const minimalContent = content.split('\n').slice(0, 10).join('\n');
    return { role: "system", content: minimalContent };
  }

  return { role: "system", content };
}

// Merge multiple response contents based on strategy
function mergeResponsesByStrategy(contents: string[], strategy: MergeStrategy): string {
  if (contents.length === 0) {
    throw new Error("No responses to merge");
  }

  if (contents.length === 1) {
    return contents[0];
  }

  switch (strategy) {
    case "streaming-race":
      // Return the first response
      return contents[0];

    case "parallel-merge":
    case "synthesis":
      // Return the longest and most detailed response
      return contents.reduce((longest, current) =>
        current.length > longest.length ? current : longest
      );

    case "best-of-n":
      // Return the longest response (proxy for quality)
      return contents.reduce((best, current) =>
        current.length > best.length ? current : best
      );

    case "consensus":
    case "voting":
      // Return the most common response by similarity
      // For simplicity, return the longest
      return contents.reduce((longest, current) =>
        current.length > longest.length ? current : longest
      );

    case "weighted":
      // Weight by length and return longest
      return contents.reduce((weighted, current) =>
        current.length > weighted.length ? current : weighted
      );

    case "chain-of-thought":
      // Concatenate responses with reasoning steps
      return contents.join("\n\n---\n\n");

    default:
      // Default: return longest response
      return contents.reduce((longest, current) =>
        current.length > longest.length ? current : longest
      );
  }
}


type ChatRequestBody = {
  messages?: Array<{ role: string; content: any }>;
  model?: string;
  plugin?: string;
  behavior?: {
    provider?: AIProvider;
    personality?: ChatGPTPersonality;
  };
  hybridMode?: {
    enabled: boolean;
    strategy?: MergeStrategy;
    maxModels?: number;
  };
};

function detectTaskParameters(messages: Array<{ role: string; content: any }>): {
  task: "code" | "math" | "writing" | "general" | "image" | "doc";
  temperature: number;
  top_p: number;
} {
  let hasImage = false;
  let hasDoc = false;

  // Scan all messages in conversation history to maintain active multimodal/doc states
  for (const m of messages) {
    if (m.role === "user") {
      if (typeof m.content === "string") {
        const lower = m.content.toLowerCase();
        if (lower.includes("[attached image:") || lower.includes("data:image/")) {
          hasImage = true;
        }
        if (lower.includes("[attached file:")) {
          hasDoc = true;
        }
      } else if (Array.isArray(m.content)) {
        if (m.content.some((c: any) => c.type === "image_url")) {
          hasImage = true;
        }
        const textBlock = m.content.find((c: any) => c.type === "text");
        if (textBlock && typeof textBlock.text === "string") {
          const lower = textBlock.text.toLowerCase();
          if (lower.includes("[attached image:")) {
            hasImage = true;
          }
          if (lower.includes("[attached file:")) {
            hasDoc = true;
          }
        }
      }
    }
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  let lastUserMsg = "";
  if (lastUser) {
    if (typeof lastUser.content === "string") {
      lastUserMsg = lastUser.content.toLowerCase();
    } else if (Array.isArray(lastUser.content)) {
      const textBlock = lastUser.content.find((c: any) => c.type === "text");
      lastUserMsg = (textBlock?.text || "").toLowerCase();
    }
  }

  const isCode =
    lastUserMsg.includes("code") ||
    lastUserMsg.includes("python") ||
    lastUserMsg.includes("typescript") ||
    lastUserMsg.includes("javascript") ||
    lastUserMsg.includes("react") ||
    lastUserMsg.includes("debug") ||
    lastUserMsg.includes("function") ||
    lastUserMsg.includes("api") ||
    lastUserMsg.includes("sql") ||
    lastUserMsg.includes("error") ||
    lastUserMsg.includes("build") ||
    lastUserMsg.includes("html") ||
    lastUserMsg.includes("css") ||
    lastUserMsg.includes("class") ||
    lastUserMsg.includes("component") ||
    lastUserMsg.includes("@code") ||
    lastUserMsg.includes("```");

  const isMathOrLogic =
    lastUserMsg.includes("calculate") ||
    lastUserMsg.includes("solve") ||
    lastUserMsg.includes("proof") ||
    lastUserMsg.includes("math") ||
    lastUserMsg.includes("equation") ||
    lastUserMsg.includes("algorithm") ||
    lastUserMsg.includes("probability") ||
    lastUserMsg.includes("statistics") ||
    lastUserMsg.includes("derive");

  const isCreativeWriting =
    lastUserMsg.includes("story") ||
    lastUserMsg.includes("poem") ||
    lastUserMsg.includes("creative") ||
    lastUserMsg.includes("script") ||
    lastUserMsg.includes("lyrics") ||
    lastUserMsg.includes("dialogue");

  if (hasImage) {
    return { task: "image", temperature: 0.15, top_p: 0.9 };
  }
  if (hasDoc) {
    return { task: "doc", temperature: 0.15, top_p: 0.95 };
  }
  if (isCode) {
    return { task: "code", temperature: 0.1, top_p: 0.85 };
  }
  if (isMathOrLogic) {
    return { task: "math", temperature: 0.1, top_p: 0.85 };
  }
  if (isCreativeWriting) {
    return { task: "writing", temperature: 0.65, top_p: 0.95 };
  }
  return { task: "general", temperature: 0.25, top_p: 0.9 };
}

function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function getWebSearchContext(query: string): Promise<{ context: string; imageUrl: string | null }> {
  const sections: string[] = [];
  let imageUrl: string | null = null;

  // 1. DuckDuckGo Instant Answer API — fast, keyless, official
  try {
    const instantUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetchWithTimeout(instantUrl, {
      headers: { "User-Agent": "rYuk-Search-Agent/1.0" }
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data) {
        if (data.AbstractText) {
          sections.push(`## Instant Answer\n${data.AbstractText}\nSource: ${data.AbstractURL || "DuckDuckGo"}`);
        }
        if (data.Image) {
          imageUrl = data.Image.startsWith("http") ? data.Image : `https://duckduckgo.com${data.Image}`;
        }
        // Extract related topics for extra context
        if (Array.isArray(data.RelatedTopics) && data.RelatedTopics.length > 0) {
          const related = data.RelatedTopics
            .filter((r: any) => r.Text)
            .slice(0, 4)
            .map((r: any) => `- ${r.Text}`);
          if (related.length > 0) {
            sections.push(`## Related Topics\n${related.join("\n")}`);
          }
          // Try to get image from related topics if main image is missing
          if (!imageUrl) {
            const topicWithIcon = data.RelatedTopics.find((r: any) => r.Icon?.URL);
            if (topicWithIcon?.Icon?.URL) {
              imageUrl = topicWithIcon.Icon.URL.startsWith("http") ? topicWithIcon.Icon.URL : `https://duckduckgo.com${topicWithIcon.Icon.URL}`;
            }
          }
        }
      }
    }
  } catch { /* timeout or network error — continue */ }

  // 2. Wikipedia API — deeper knowledge for factual/academic queries
  try {
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/\s+/g, "_"))}`;
    const res = await fetchWithTimeout(wikiUrl, {
      headers: { "User-Agent": "rYuk-Search-Agent/1.0" }
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.extract && data.type !== "disambiguation") {
        sections.push(`## Wikipedia\n${data.extract}\nSource: ${data.content_urls?.desktop?.page || "Wikipedia"}`);
        if (!imageUrl && data.thumbnail?.source) {
          imageUrl = data.thumbnail.source;
        }
      }
    }
  } catch { /* timeout or network error — continue */ }

  // 3. DuckDuckGo HTML Lite — search result links & snippets
  try {
    const htmlUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetchWithTimeout(htmlUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
      }
    }, 6000);
    if (res.ok) {
      const html = await res.text();
      const results: string[] = [];

      // Parse result titles and URLs
      const titleMatches = [...html.matchAll(/<a rel="nofollow" class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
      const snippetMatches = [...html.matchAll(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)];

      const count = Math.min(titleMatches.length, 6);
      for (let i = 0; i < count; i++) {
        const url = titleMatches[i]?.[1] || "";
        const title = (titleMatches[i]?.[2] || "").replace(/<[^>]*>/g, "").trim();
        const snippet = (snippetMatches[i]?.[1] || "").replace(/<[^>]*>/g, "").trim();
        if (title && snippet) {
          results.push(`${i + 1}. **${title}**\n   URL: ${url}\n   ${snippet}`);
        }
      }
      if (results.length > 0) {
        sections.push(`## Web Search Results\n${results.join("\n\n")}`);
      }
    }
  } catch { /* timeout or network error — continue */ }

  return { context: sections.join("\n\n"), imageUrl };
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: ChatRequestBody;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body." }, { status: 400 });
        }

        if (!Array.isArray(body.messages) || body.messages.length === 0) {
          return Response.json(
            { error: "`messages` must be a non-empty array of { role, content }." },
            { status: 400 },
          );
        }

        // 1. Process live web search if plugin is @web
        const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
        let lastUserText = "";
        if (lastUser) {
          if (typeof lastUser.content === "string") {
            lastUserText = lastUser.content;
          } else if (Array.isArray(lastUser.content)) {
            const textBlock = lastUser.content.find((c: any) => c.type === "text");
            lastUserText = textBlock?.text || "";
          }
        }

        const isWebSearch = body.plugin === "web" || lastUserText.trim().toLowerCase().startsWith("@web");
        if (isWebSearch && lastUser) {
          const searchPrompt = lastUserText.replace(/^@web\s*/i, "").trim();
          const { context, imageUrl } = await getWebSearchContext(searchPrompt || "latest news");

          const parts: string[] = [];
          parts.push(`# Live Web Search: "${searchPrompt || "query"}"`);
          parts.push(`Search performed at: ${new Date().toISOString()}`);
          if (context) {
            parts.push(context);
          } else {
            parts.push("No live search results were found for this query.");
          }
          parts.push(`---\n**User's Original Question:** ${searchPrompt || lastUserText}`);
          parts.push(`\n**Instructions:** Synthesize the search results above to answer the user's question. Cite sources with URLs. If the search results don't contain enough information, say so and provide your best knowledge.`);
          if (imageUrl) {
            parts.push(`\n**Reference Image Found:** ${imageUrl}\nYou MUST include this image in your response using: ![Reference Image](${imageUrl})`);
          }

          const lastUserIndex = body.messages.lastIndexOf(lastUser);
          if (lastUserIndex !== -1) {
            body.messages[lastUserIndex] = { ...lastUser, content: parts.join("\n\n") };
          }
        }

        const taskParams = detectTaskParameters(body.messages);

        // Check if hybrid ensemble mode is enabled (bypass for image tasks to prioritize OpenAI GPT Vision directly)
        if (body.hybridMode?.enabled && taskParams.task !== "image") {
          const openrouterKey = process.env["OPENROUTER_API_KEY"];

          if (openrouterKey) {
            try {
              // ADAPTIVE: Get optimal configuration based on prompt complexity
              const adaptiveConfig = getAdaptiveEnsembleConfig(body.messages);

              console.info(`[Adaptive Ensemble] ${adaptiveConfig.reasoning}`);
              console.info(`[Configuration] ${adaptiveConfig.maxModels} models, ${adaptiveConfig.strategy} strategy`);

              // Fetch all available free models
              const allModels = await getOpenRouterModels(openrouterKey);
              const freeModels = getFreeModels(allModels);

              // Get best models for this task
              const taskType = taskParams.task === "doc" ? "general" : taskParams.task;
              const bestModels = getBestModelsForTask(
                freeModels,
                taskType as any,
                Math.min(adaptiveConfig.maxModels, 5)
              );

              // Get behavior prompt
              const provider = body.behavior?.provider || "ryuk-default";
              const personality = body.behavior?.personality;
              const behaviorPrompt = generateSystemPrompt(provider, personality);

              // AUTOMATIC FALLBACK: Fetch responses with automatic model replacement
              const modelIds = bestModels.length > 0
                ? bestModels.map(m => m.id)
                : ["openrouter/free", "deepseek/deepseek-chat", "google/gemma-4-31b-it:free"];

              console.info(`[Fallback System] Fetching from ${modelIds.length} models with automatic fallback`);

              const responses = await fetchParallelWithFallback(
                body.messages,
                modelIds,
                openrouterKey,
                taskType as any,
                behaviorPrompt,
                Math.min(adaptiveConfig.maxModels, 3),
                7000
              );

              console.info(`[Fallback System] Successfully collected ${responses.length} responses`);

              if (responses.length > 0) {
                // Merge responses based on strategy
                const mergedContent = mergeResponsesByStrategy(
                  responses.map(r => r.content),
                  adaptiveConfig.strategy
                );

                // Stream the merged response as Server-Sent Events for the client
                const encoder = new TextEncoder();
                const stream = new ReadableStream({
                  start(controller) {
                    const chunk = JSON.stringify({
                      id: `hybrid-${Date.now()}`,
                      object: "chat.completion.chunk",
                      created: Math.floor(Date.now() / 1000),
                      model: "ryuk/adaptive-ensemble",
                      choices: [{
                        index: 0,
                        delta: { content: mergedContent },
                        finish_reason: "stop"
                      }]
                    });
                    controller.enqueue(encoder.encode(`data: ${chunk}\n\ndata: [DONE]\n\n`));
                    controller.close();
                  }
                });

                return new Response(stream, {
                  status: 200,
                  headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                  },
                });
              }
            } catch (error) {
              console.warn("Hybrid ensemble failed, falling back to direct streaming:", error);
              // Gracefully fall through to candidate loop
            }
          }
        }

        const rawModel = body.model || "ryuk/hybrid-ensemble";
        const rawKeysStr = (process.env["OPENROUTER_API_KEYS"] || process.env["OPENROUTER_API_KEY"] || "");
        const openrouterKeys = rawKeysStr
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean);
        const hfKey = process.env["HUGGINGFACE_API_KEY"];

        // Prioritized candidate list based on user selection & task type
        const candidates: Array<{ url: string; model: string; key: string | undefined }> = [];

        const addCandidate = (model: string, customUrl?: string, customKey?: string) => {
          if (customUrl && customKey) {
            candidates.push({ url: customUrl, model, key: customKey });
            return;
          }
          for (const key of openrouterKeys) {
            candidates.push({ url: OPENROUTER_CHAT_URL, model, key });
          }
          if (hfKey && (model.startsWith("meta-llama/") || model.startsWith("Qwen/") || model.startsWith("mistralai/"))) {
            candidates.push({ url: HUGGINGFACE_CHAT_URL, model: model.replace(/^hf:/, ""), key: hfKey });
          }
        };

        // Dynamically fetch live OpenRouter models (includes any new free models automatically)
        let dynamicFreeModels: string[] = [];
        try {
          const liveData = await fetchLiveOpenRouterModels();
          if (liveData?.models?.length > 0) {
            dynamicFreeModels = liveData.models.filter((m) => m.isFree).map((m) => m.id);
          }
        } catch {
          // Fallback if live query is unreachable
        }

        // Tier 1: Best Primary Models (High Intelligence & Low Overhead)
        const PRIMARY_TIER_MODELS = [
          "openai/gpt-4o-mini",
          "meta-llama/llama-3.3-70b-instruct",
          "qwen/qwen-2.5-72b-instruct",
          "deepseek/deepseek-chat",
        ];

        // Tier 2: Free Fallback Models in prioritized order
        const FREE_TIER_PRIORITY = [
          "liquid/lfm-2.5-2.6b:free",
          "nvidia/nemotron-3.5-lightning:free",
          "google/gemma-4-31b-it:free",
          "google/gemma-4-26b-a4b-it:free",
          "cohere/north-mini-code:free",
          "poolside/laguna-s-2.1:free",
          "openai/gpt-oss-20b:free",
          "z-ai/glm-5.2:free",
          "openrouter/free",
        ];

        // Combine all discovered free models while maintaining strict priority
        const remainingFree = dynamicFreeModels.filter(
          (id) => !FREE_TIER_PRIORITY.includes(id) && !id.includes("dots-3-note-preview")
        );

        const ORDERED_FALLBACK_CHAIN = Array.from(
          new Set([...PRIMARY_TIER_MODELS, ...FREE_TIER_PRIORITY, ...remainingFree])
        );

        const VISION_PRIORITY_MODELS = [
          "openai/gpt-4o",
          "openai/gpt-4o-mini",
          "google/gemini-2.0-flash-001",
          "anthropic/claude-3.5-sonnet",
          "qwen/qwen-2.5-vl-72b-instruct",
          "mistralai/pixtral-12b",
        ];

        const isImageTask = taskParams.task === "image";
        const ACTIVE_CHAIN = isImageTask
          ? Array.from(new Set([...VISION_PRIORITY_MODELS, ...ORDERED_FALLBACK_CHAIN]))
          : ORDERED_FALLBACK_CHAIN;

        if (
          rawModel === "ryuk/v1-high" ||
          rawModel === "ryuk/v1-medium" ||
          rawModel === "ryuk/v1-low" ||
          rawModel === "ryuk/hybrid-ensemble" ||
          rawModel.includes("high") ||
          rawModel.includes("medium") ||
          rawModel.includes("low") ||
          rawModel.includes("hybrid")
        ) {
          for (const m of ACTIVE_CHAIN) {
            addCandidate(m);
          }
        } else {
          // If specific model was chosen by user, try it first, then cascade down the priority chain
          if (rawModel.includes("/") && !rawModel.startsWith("ryuk/")) {
            addCandidate(rawModel);
          }
          for (const m of ACTIVE_CHAIN) {
            addCandidate(m);
          }
        }

        let lastErrorMessage = "All AI models failed to respond.";
        let lastStatus = 502;

        const hasUnstopped = candidates.some((c) => c.key && !isModelStopped(c.model));
        const activeCandidates = hasUnstopped
          ? candidates.filter((c) => c.key && !isModelStopped(c.model))
          : candidates.filter((c) => Boolean(c.key));

        for (const target of activeCandidates) {
          if (!target.key) continue;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);
          try {
            const headers: Record<string, string> = {
              "Content-Type": "application/json",
              Authorization: `Bearer ${target.key}`,
            };
            if (target.url.includes("openrouter.ai")) {
              headers["HTTP-Referer"] = "https://ryuk.ai";
              headers["X-Title"] = "rYuk.ai Workspace";
            }

            // Check if model supports vision. If not, serialize array content back into strings.
            const modelLower = target.model.toLowerCase();
            const supportsVision =
              modelLower.includes("gpt-4o") ||
              modelLower.includes("vl") ||
              modelLower.includes("vision") ||
              modelLower.includes("claude-3") ||
              modelLower.includes("gemini") ||
              modelLower.includes("pixtral");

            const sanitizedMessages = body.messages.map((m) => {
              if (Array.isArray(m.content)) {
                if (supportsVision) {
                  return m;
                } else {
                  // Fallback for text-only models: extract the text content block only
                  const textBlock = m.content.find((c: any) => c.type === "text");
                  return { role: m.role, content: textBlock?.text || "Analyze attached image" };
                }
              }
              return m;
            });

            const isReasoningModel =
              modelLower.includes("r1") ||
              modelLower.includes("o1-") ||
              modelLower.includes("o3-");

            // Determine behavior configuration
            const provider = body.behavior?.provider || "ryuk-default";
            const personality = body.behavior?.personality;

            // Filter out system prompt for reasoning models and prepend the minimal identity prompt,
            // or prepend the full prompt for standard models if not present.
            let finalMessages = sanitizedMessages;
            const cleanHistory = sanitizedMessages.filter((m) => m.role !== "system");

            if (isReasoningModel) {
              const minimalPrompt = getSystemPrompt(provider, personality, true);
              finalMessages = [minimalPrompt, ...cleanHistory];
            } else {
              const hasSystem = sanitizedMessages.some((m) => m.role === "system");
              if (!hasSystem) {
                const systemPrompt = getSystemPrompt(provider, personality, false);
                finalMessages = [systemPrompt, ...sanitizedMessages];
              }
            }

            const payload: Record<string, any> = {
              model: target.model,
              messages: finalMessages,
              stream: true,
            };

            // Set temperature/top_p only if not a reasoning model
            if (!isReasoningModel) {
              payload["temperature"] = taskParams.temperature;
              payload["top_p"] = taskParams.top_p;
            }

            const upstream = await fetch(target.url, {
              method: "POST",
              headers,
              body: JSON.stringify(payload),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (upstream.ok && upstream.body) {
              return new Response(upstream.body, {
                status: 200,
                headers: {
                  "Content-Type": "text/event-stream",
                  "Cache-Control": "no-cache",
                  Connection: "keep-alive",
                },
              });
            }

            const text = await upstream.text().catch(() => "");
            let message = text.slice(0, 300) || `HTTP ${upstream.status}`;
            try {
              const parsed = JSON.parse(text) as { error?: { message?: string } | string };
              if (typeof parsed.error === "string") message = parsed.error;
              else if (parsed.error?.message) message = parsed.error.message;
            } catch {
              /* keep raw text */
            }
            console.warn(`Model candidate ${target.model} returned error (${upstream.status}): ${message}`);
            // Automatically shift failing/stopped model to disabled
            recordStoppedModel(target.model, message);
            lastErrorMessage = `${target.model} failed (${upstream.status}): ${message}`;
            lastStatus = upstream.status || 502;
          } catch (err) {
            clearTimeout(timeoutId);
            console.warn(`Model candidate ${target.model} threw exception:`, err);
            recordStoppedModel(target.model, err instanceof Error ? err.message : String(err));
            lastErrorMessage = err instanceof Error ? err.message : String(err);
          }
        }

        return Response.json({ error: lastErrorMessage }, { status: lastStatus });
      },
    },
  },
});

