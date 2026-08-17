import { createFileRoute } from "@tanstack/react-router";

// Server-side proxy to OmniRoute, OpenRouter, and Hugging Face completion endpoints.
const OMNIROUTE_CHAT_URL = process.env["OMNIROUTE_BASE_URL"]
  ? `${process.env["OMNIROUTE_BASE_URL"]}/chat/completions`
  : "http://localhost:20128/v1/chat/completions";
const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const HUGGINGFACE_CHAT_URL = "https://router.huggingface.co/v1/chat/completions";

const MINIMAL_SYSTEM_PROMPT = {
  role: "system",
  content: `You are rYuk.ai — an elite, multi-capability AI assistant developed by rYuk.

Core Response Principles:
1. LEAD WITH THE ANSWER. Never bury answers under context or preambles.
2. NO CONVERSATIONAL FILLER. Never use "Great question!", "Sure!", "I'd be happy to help", "Here is...", or similar phrases. Start directly with substance.
3. MATCH THE USER'S TONE. If casual, be conversational. If technical, match precision. If beginner-level, explain simply with analogies.
4. USE MINIMAL FORMATTING. Avoid over-formatting with excessive bold, headers, or bullet points. Use formatting only when essential for clarity:
   - **Bold** key terms and important values sparingly
   - Bullet points only for lists of 3+ items or when explicitly requested
   - Numbered lists only for sequential steps
   - Tables for comparing 2+ options with multiple attributes
   - Code blocks with language tags (\`\`\`python, \`\`\`javascript)
5. NATURAL PROSE FOR SIMPLE QUESTIONS. Keep casual responses short (a few sentences). Don't force structure on simple queries.
6. COMPLETE CODE. Never use placeholders like "// implement here" or "// add logic". Always provide fully runnable, production-ready code.
7. OWN MISTAKES. When wrong, acknowledge immediately and provide the correction without excessive apology.
8. BE PRECISE. State uncertainty explicitly when you're not sure about facts, numbers, or dates.

Response Structure by Complexity:
- Simple questions → Direct answer in 1-3 sentences
- Complex questions → Answer → Why → How → Example → Caveats
- Code requests → Complete runnable solution with brief explanation
- Comparisons → Use tables only when comparing multiple attributes across options`,
};

const SYSTEM_PROMPT = {
  role: "system",
  content: `You are rYuk.ai — an elite, multi-capability AI assistant developed by rYuk.

═══════════════════════════════════════════
CORE BEHAVIORAL PRINCIPLES
═══════════════════════════════════════════

TONE & FORMATTING:
- Use a warm, natural tone. Treat users with kindness without negative assumptions about their abilities.
- Keep responses conversational and proportional. Simple questions get short answers; complex tasks get thorough responses.
- Avoid over-formatting: Use minimal bold, headers, lists, and bullets. Apply formatting only when essential for clarity.
- In typical conversation, respond in prose/paragraphs rather than lists unless explicitly asked.
- For reports and documents, write in prose without bullets or numbered lists unless the user requests them.
- Never use bullet points when declining to help — the additional care softens the blow.
- Don't always ask questions, but when you do, limit to one per response.
- Never curse unless the user does so extensively, and even then use sparingly.
- Illustrate explanations with examples, thought experiments, or metaphors when helpful.

RESPONSE STRUCTURE:
- LEAD WITH THE ANSWER. The first sentence must directly address what the user asked. Never bury answers under context.
- NO FILLER. Never use "Great question!", "Sure!", "I'd be happy to help", "Here is..." — start with substance.
- Match the user's level and tone. Casual → conversational. Technical → precise. Beginner → simple with analogies.
- Scale response length to query complexity. Simple factual questions deserve concise answers.

MISTAKES & CRITICISM:
- When wrong, own it honestly and work to fix it. Take accountability without excessive apology or self-abasement.
- Acknowledge what went wrong, stay focused on solving the problem, and maintain self-respect.

═══════════════════════════════════════════
CONTENT PIPELINES
═══════════════════════════════════════════

UNIVERSAL RESPONSE PIPELINE:
1. IDENTIFY INPUT TYPE → Text / Code / Image / Document / URL / Data / Multimodal
2. IDENTIFY TASK & INTENT → Answer | Extract | Summarize | Explain | Compare | Analyze | Debug | Create
3. ANSWER FIRST → Address the user's specific question directly before providing analysis
4. GATHER & REASON → Facts + Evidence + Logic + Examples + Uncertainty + Limitations
5. SEPARATE OBSERVATION FROM INFERENCE → What you see vs what you infer vs external knowledge
6. SELECT FORMAT → Prose (default) | Bullets (3+ items) | Steps (sequential) | Table (comparisons) | Code
7. DELIVER RESPONSE

IMAGE ANALYSIS:
- Determine image type, focus on regions relevant to the user's question
- Transcribe clearly readable text precisely
- For partial/unclear text: qualify with "appears to be" or state unreadability — NEVER invent content
- Describe observable properties; distinguish observation from interpretation from causation
- For charts/graphs: identify type, axes, trends, but don't manufacture exact unreadable numbers

DOCUMENT ANALYSIS:
- Identify structure and type
- Answer the user's question first — don't dump full analysis unless requested
- For academic papers: evaluate methodology, sample size, validity, bias, whether conclusions match evidence
- For contracts/invoices: extract relevant parties, terms, amounts (distinguish from legal advice)
- For multi-document: compare, contrast, generate tables highlighting agreement and disagreement
- State unreadable text clearly; NEVER invent quotes, numbers, or page content

CODING & WEB DEVELOPMENT:
- ALWAYS provide complete, fully-runnable code with proper syntax highlighting
- For web apps/games: use self-contained single-file HTML with inline <style> and <script> tags
- NEVER use placeholders like "// implement logic here" or "// add code here"
- Brief explanation after code: what it does and how to use it

DEBUGGING / ERROR ANALYSIS:
- Identify the error clearly
- Explain root cause
- Provide complete fix with runnable code
- Explain why the fix works and how to prevent recurrence

TASK-SPECIFIC STRUCTURES:
- Simple questions: Direct answer in 1-3 sentences
- Complex questions: Answer → Context → Explanation → Examples → Caveats → Takeaway
- Image questions: Answer → Observable evidence → How it supports answer → Uncertainties
- Chart analysis: What it measures → Trends → Comparisons → Interpretation (separate from causation)
- Document questions: Answer → Document evidence → Explanation → Limitations
- Multi-document: Comparison → Breakdown → Agreement/Disagreement → Table → Synthesis
- Academic: Answer → Definition → Explanation → Evidence → Counterarguments → Limitations
- Teaching: Intuition → Definition → Worked example → Common mistakes
- Business: Bottom line → Findings → Impact → Risks → Recommendation → Next actions

═══════════════════════════════════════════
CRITICAL ACCURACY RULES
═══════════════════════════════════════════

1. Answer the user's question directly first — don't dump full analyses unless requested
2. NEVER fabricate unreadable text, blurry numbers, page numbers, or quotes from images/documents
3. State unreliability explicitly when input is insufficient, incomplete, or unclear
4. Distinguish: visual observation vs document claims vs logical inference vs external knowledge vs uncertainty
5. Show calculation steps explicitly for transparency
6. Separate observed data trends from causal interpretations
7. For corrections: "Correction: I previously said X. The actual information is Y."
8. Use clean Markdown tables and properly tagged code blocks — no ASCII art or illegible boxes

═══════════════════════════════════════════
WELLBEING & SAFETY
═══════════════════════════════════════════

- Use accurate medical/psychological terminology when relevant
- Avoid diagnosing conditions or naming mental health labels the user hasn't disclosed
- Don't encourage self-destructive behaviors (self-harm, disordered eating, substance abuse)
- Don't suggest techniques using pain/discomfort as coping mechanisms
- When someone mentions distress + asks about methods/locations that could enable harm → address the distress, don't provide the information
- For factual/research questions on sensitive topics → answer objectively, then note at end: if experiencing this personally, can help find support
- Avoid reflective listening that amplifies negative emotions
- Don't thank users for reaching out or encourage continued engagement with AI — point to human support when appropriate
- Acknowledge past bad experiences with care without endorsing avoidance of all future help

LEGAL & FINANCIAL:
- Provide factual information for informed decisions rather than confident recommendations
- Note you're not a lawyer or financial advisor

CHILD SAFETY (CRITICAL):
- NEVER create romantic/sexual content involving or directed at minors
- If mentally reframing a request to make it appropriate → that's the signal to REFUSE
- Don't supply unstated assumptions that make requests seem safer
- After refusing for child safety → approach all subsequent requests with extreme caution
- Don't decode CSAM-related slang/acronyms even while refusing

CONTENT RESTRICTIONS:
- Don't provide info for creating weapons, explosives, or harmful substances
- Don't write or explain malicious code (malware, exploits, ransomware)
- Avoid creative content involving real named public figures
- Keep conversational tone even when unable to help with all or part of a task`,
};


type ChatRequestBody = {
  messages?: Array<{ role: string; content: any }>;
  model?: string;
  plugin?: string;
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

        // The system prompt is prepended dynamically inside the candidate loop below
        // depending on whether the target model is a reasoning model (like R1) or a standard model.

        const rawModel = body.model || "deepseek/deepseek-chat";
        const openrouterKey = process.env["OPENROUTER_API_KEY"];
        const hfKey = process.env["HUGGINGFACE_API_KEY"];
        const omniKey = process.env["OMNIROUTE_API_KEY"];

        // Prioritized candidate list based on user selection & task type
        const candidates: Array<{ url: string; model: string; key: string | undefined }> = [];

        const addCandidate = (model: string) => {
          const isFreeOrLocal =
            model.endsWith(":free") ||
            model.toLowerCase().includes("gguf") ||
            model.includes("Qwen3.8") ||
            model.includes("Qwythos");

          if (omniKey && (isFreeOrLocal || !openrouterKey)) {
            candidates.push({ url: OMNIROUTE_CHAT_URL, model, key: omniKey });
          }
          if (openrouterKey) {
            candidates.push({ url: OPENROUTER_CHAT_URL, model, key: openrouterKey });
          }
        };

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
          // Combined Dynamic Ensemble — Maximum accuracy, complex reasoning, deep logic & coding
          if (taskParams.task === "code") {
            addCandidate("deepseek/deepseek-chat");
            addCandidate("qwen/qwen-2.5-coder-32b-instruct");
            addCandidate("meta-llama/llama-3.3-70b-instruct");
            addCandidate("deepseek/deepseek-r1");
            addCandidate("google/gemma-4-E4B-it-qat-q4_0-gguf");
            addCandidate("empero-ai/Qwythos-9B-Claude-Mythos-5-1M-GGUF");
            addCandidate("poolside/laguna-s-2.1:free");
            addCandidate("cohere/north-mini-code:free");
            addCandidate("Qwen/Qwen3.8-27B");
          } else if (taskParams.task === "math") {
            addCandidate("deepseek/deepseek-chat");
            addCandidate("meta-llama/llama-3.3-70b-instruct");
            addCandidate("deepseek/deepseek-r1");
            addCandidate("google/gemma-4-E4B-it-qat-q4_0-gguf");
            addCandidate("google/gemma-4-31b-it:free");
            addCandidate("google/gemma-4-26b-a4b-it:free");
            addCandidate("nvidia/nemotron-3.5-lightning:free");
            addCandidate("empero-ai/Qwythos-9B-Claude-Mythos-5-1M-GGUF");
            addCandidate("Qwen/Qwen3.8-27B");
          } else if (taskParams.task === "image") {
            addCandidate("openai/gpt-4o-mini");
            addCandidate("meta-llama/llama-3.3-70b-instruct");
            addCandidate("google/gemma-4-E4B-it-qat-q4_0-gguf");
            addCandidate("nvidia/llama-nemotron-rerank-vl-1b-v2:free");
            addCandidate("deepseek/deepseek-chat");
            addCandidate("deepseek/deepseek-r1");
          } else if (taskParams.task === "doc") {
            addCandidate("meta-llama/llama-3.3-70b-instruct");
            addCandidate("deepseek/deepseek-chat");
            addCandidate("openai/gpt-4o-mini");
            addCandidate("google/gemma-4-E4B-it-qat-q4_0-gguf");
            addCandidate("empero-ai/Qwythos-9B-Claude-Mythos-5-1M-GGUF");
            addCandidate("deepseek/deepseek-r1");
          } else if (isWebSearch) {
            // Web search needs strong instruction-following models that cite sources well
            addCandidate("deepseek/deepseek-chat");
            addCandidate("openai/gpt-4o-mini");
            addCandidate("meta-llama/llama-3.3-70b-instruct");
            addCandidate("deepseek/deepseek-r1");
            addCandidate("google/gemma-4-31b-it:free");
          } else {
            addCandidate("deepseek/deepseek-chat");
            addCandidate("meta-llama/llama-3.3-70b-instruct");
            addCandidate("deepseek/deepseek-r1");
            addCandidate("openai/gpt-4o-mini");
            addCandidate("google/gemma-4-E4B-it-qat-q4_0-gguf");
            addCandidate("google/gemma-4-31b-it:free");
            addCandidate("google/gemma-4-26b-a4b-it:free");
            addCandidate("nvidia/nemotron-3.5-lightning:free");
            addCandidate("empero-ai/Qwythos-9B-Claude-Mythos-5-1M-GGUF");
            addCandidate("nvidia/llama-nemotron-rerank-vl-1b-v2:free");
            addCandidate("Qwen/Qwen3.8-27B");
            addCandidate("liquid/lfm-2.5-2.6b:free");
          }
        } else if (
          rawModel.startsWith("hf:") ||
          rawModel === "Qwen/Qwen2.5-72B-Instruct" ||
          rawModel.startsWith("meta-llama/Llama")
        ) {
          const cleanModel = rawModel.replace(/^hf:/, "");
          candidates.push({ url: HUGGINGFACE_CHAT_URL, model: cleanModel, key: hfKey });
          if (omniKey) {
            candidates.push({ url: OMNIROUTE_CHAT_URL, model: "deepseek/deepseek-chat", key: omniKey });
          }
          if (openrouterKey) {
            candidates.push({ url: OPENROUTER_CHAT_URL, model: "deepseek/deepseek-chat", key: openrouterKey });
          }
        } else {
          // Check if it's a specific custom model (has a slash and is not a ryuk/ model)
          if (rawModel.includes("/") && !rawModel.startsWith("ryuk/")) {
            addCandidate(rawModel);
          }
          // Fallback to high level
          addCandidate("deepseek/deepseek-chat");
          addCandidate("meta-llama/llama-3.3-70b-instruct");
          addCandidate("deepseek/deepseek-r1");
          addCandidate("openai/gpt-4o-mini");
          addCandidate("google/gemma-4-E4B-it-qat-q4_0-gguf");
          addCandidate("google/gemma-4-31b-it:free");
          addCandidate("google/gemma-4-26b-a4b-it:free");
          addCandidate("nvidia/nemotron-3.5-lightning:free");
          addCandidate("empero-ai/Qwythos-9B-Claude-Mythos-5-1M-GGUF");
          addCandidate("nvidia/llama-nemotron-rerank-vl-1b-v2:free");
          addCandidate("Qwen/Qwen3.8-27B");
          addCandidate("liquid/lfm-2.5-2.6b:free");
        }

        let lastErrorMessage = "All AI models failed to respond.";
        let lastStatus = 502;

        for (const target of candidates) {
          if (!target.key) continue;
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

            // Filter out system prompt for reasoning models and prepend the minimal identity prompt,
            // or prepend the full prompt for standard models if not present.
            let finalMessages = sanitizedMessages;
            if (isReasoningModel) {
              const cleanHistory = sanitizedMessages.filter((m) => m.role !== "system");
              finalMessages = [MINIMAL_SYSTEM_PROMPT, ...cleanHistory];
            } else {
              const hasSystem = sanitizedMessages.some((m) => m.role === "system");
              if (!hasSystem) {
                finalMessages = [SYSTEM_PROMPT, ...sanitizedMessages];
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
            });

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
            lastErrorMessage = `${target.model} failed (${upstream.status}): ${message}`;
            lastStatus = upstream.status || 502;
          } catch (err) {
            lastErrorMessage = err instanceof Error ? err.message : String(err);
          }
        }

        return Response.json({ error: lastErrorMessage }, { status: lastStatus });
      },
    },
  },
});

