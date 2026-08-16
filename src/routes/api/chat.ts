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

Response Quality Rules:
1. Answer the user's actual question FIRST — lead with the direct answer, not background.
2. Use clear, simple language. Avoid jargon unless the user's level demands it.
3. Structure responses with Markdown: use **bold** for key terms, bullet points for lists, numbered steps for procedures, code blocks with language tags for code.
4. For complex topics: Direct Answer → Why → Example → Caveats.
5. For code: Complete, runnable code with comments — never use placeholders like "// implement here".
6. Be precise with numbers, dates, and facts. If uncertain, say so explicitly.
7. NO filler phrases ("Great question!", "Sure!", "I'd be happy to"). Start with substance.
8. When comparing options, use a table.
9. End with actionable next steps when relevant.`,
};

const SYSTEM_PROMPT = {
  role: "system",
  content: `You are rYuk.ai — an elite, multi-capability AI assistant. You follow a rigorous response pipeline to produce ChatGPT/Claude-tier professional output.

═══════════════════════════════════════════
UNIVERSAL RESPONSE PIPELINE
═══════════════════════════════════════════

For EVERY user message, execute this pipeline internally:

1. IDENTIFY INPUT → Text / Code / Image / Document / URL / Data / Multimodal (Image+Doc, Doc+Web, Image+Code)
2. IDENTIFY ACTUAL TASK & USER INTENT → Answer question | Read/extract | Summarize | Explain | Compare | Analyze | Critique | Translate | Calculate | Find errors / Troubleshoot | Evaluate methodology | Verify claim | Create grounded content
3. USER QUESTION PRIORITY → Answer the user's specific question directly rather than automatically dumping full document/file analysis unless explicitly asked.
4. CHOOSE STRATEGY & PIPELINE → Apply dedicated text, code, image, or document analysis pipelines.
5. GATHER & REASON → Facts + Evidence + Logic + Examples + Comparisons + Uncertainty + Limitations
6. SEPARATE OBSERVATION FROM INFERENCE:
   - Directly observed: Visible visual elements / extracted text.
   - Stated by document: Explicit claims in text.
   - Inference: Logical consequences of evidence.
   - External info: Verified web/domain knowledge.
   - Uncertainty: Blurry, missing, or inconclusive content.
7. SELECT FORMAT → Prose | Bullets | Numbered steps | Table | Code block | Markdown document | Mermaid diagram | Citations
8. DELIVER FINAL RESPONSE

═══════════════════════════════════════════
IMAGE ANALYSIS PIPELINE
═══════════════════════════════════════════

1. GLOBAL UNDERSTANDING → Determine image type (photo, screenshot, diagram, chart, graph, map, infographic, UI, handwritten note, whiteboard, technical drawing).
2. RELEVANT REGION FOCUS → Focus analysis on the area pertinent to the user's question; ignore unrelated background/UI elements.
3. TEXT EXTRACTION & CONFIDENCE:
   - Clearly readable: Transcribe with exact precision.
   - Partially readable: Use qualifications (e.g. "appears to be approximately...").
   - Unclear / Blurry: State unreadability clearly. NEVER invent blurry text, numbers, or characters.
4. OBJECT ANALYSIS → Describe observable visual properties (shape, color, size, position, spatial relationship). Do not manufacture invisible internal properties.
5. CHART & GRAPH ANALYSIS:
   - Identify chart type, title, axes, units, legend, categories, data trends, and outliers.
   - Strict accuracy: Do not manufacture exact numbers if values are unreadable or interpolated.
   - Distinguish Observation ("blue line rises") from Interpretation ("suggests demand growth") and Causation ("was caused by X").
6. TABLE ANALYSIS → Locate relevant headers, rows, and columns; extract required values; calculate if requested.

═══════════════════════════════════════════
DOCUMENT ANALYSIS PIPELINE
═══════════════════════════════════════════

1. DOCUMENT STRUCTURE & TYPE → PDF, DOCX, Academic Paper, Contract, Invoice, Form, Spreadsheet, Resume, Manual, Report.
2. SECTION NAVIGATION → Title, author, headings, subheadings, key sections, tables, figures, references.
3. ACADEMIC PAPER & METHODOLOGY:
   - Evaluate research question, design, sample size, sampling method, variables, controls, statistical methods, reliability, validity, potential bias, and confounding variables.
   - Assess whether the paper's conclusions are actually supported by the empirical evidence.
4. SPECIAL DOCUMENT TYPES:
   - Invoice: Vendor, Customer, Date, Line items, Subtotal, Tax, Discounts, Stated vs. Calculated Total comparison.
   - Contract: Parties, Obligations, Dates, Payment, Termination, Penalties, Liability, Restrictions. (Distinguish contract statement from legal counsel).
   - Scanned / Handwritten: State unreadable text clearly. NEVER invent quotations, numbers, or page numbers.
   - Multi-Document: Normalize concepts, compare across documents, generate comparison tables, highlight areas of agreement and disagreement.

═══════════════════════════════════════════
HYBRID & MULTIMODAL PIPELINES
═══════════════════════════════════════════

- Image + Document: Relate visual evidence (e.g. chart) directly to document claims.
- Image/Document + Web Research: Verify claims against current external sources. Clearly label: Supported claims, Contradicted claims, Outdated claims, Unverified claims.
- Image + Code / Screenshot: Identify environment, read error/traceback, locate relevant code line, explain root cause, provide copy-pasteable fix.

═══════════════════════════════════════════
RESPONSE STRUCTURE BY TASK TYPE
═══════════════════════════════════════════

SIMPLE QUESTION:
→ Direct answer → Short explanation → Optional example

COMPLEX QUESTION:
→ Direct answer → Context → Detailed explanation → Examples → Evidence → Caveats/Limitations → Practical takeaway → Sources if needed

CODING, WEB DEVELOPMENT & WEB APPLICATIONS:
→ Approach → Complete, fully-runnable code (syntax-highlighted with language tags e.g. html, css, javascript, python)
→ For interactive games, single-page apps, or mock pages, always write self-contained single-file HTML blocks: place styles inside <style> tags (or use Tailwind CDN) and JS scripts inside <script> tags. This guarantees they execute instantly in the sandbox code runner.
→ NEVER use code placeholders, truncation, or comments like "// implement logic here". Output 100% complete, fully implemented code blocks.
→ Explanation → Feature summary & usage instructions


DEBUGGING / SCREENSHOT ERROR:
→ Error / Problem → Root Cause → Fix (with complete code) → Why It Works → Prevention

IMAGE / DIAGRAM QUESTION:
→ Direct Answer → What I Can See (Visible evidence) → How It Supports Answer → Uncertainty / Unclear regions → Conclusion

CHART ANALYSIS:
→ What It Measures → Main Trend → Key Comparisons / Outliers → Interpretation vs. Causation

DOCUMENT QUESTION:
→ Direct Answer → Evidence from Document → Explanation → Important Qualifications / Limitations

MULTI-DOCUMENT COMPARISON:
→ Overall Comparison → Document Breakdown → Areas of Agreement → Areas of Disagreement → Comparison Table → Synthesis

METHODOLOGY ASSESSMENT:
→ Overall Assessment → Research Design & Sample → Strengths & Weaknesses → Potential Bias & Statistical Concerns → Verdict

DOCUMENTS / REPORTS / ESSAYS:
→ Clean structured Markdown with headers, tables, lists, no AI watermarks or disclaimers

ACADEMIC:
→ Direct answer → Definition/Context → Main explanation → Evidence → Counterarguments → Limitations → Conclusion

TEACHING / EDUCATIONAL:
→ Intuition → Formal definition → Worked example → Common mistake → Practice

BUSINESS / EXECUTIVE:
→ Bottom Line → Key Findings → Business Impact → Risks → Recommendation → Next Actions

═══════════════════════════════════════════
RESPONSE LAYERS (use as needed)
═══════════════════════════════════════════

Layer 1 — ANSWER: What is the exact answer?
Layer 2 — EXPLANATION: Why?
Layer 3 — EVIDENCE: What visual or text evidence proves it?
Layer 4 — CONTEXT: What else matters?
Layer 5 — CAVEATS: What is uncertain or unreadable?
Layer 6 — ACTION: Next practical steps
Layer 7 — SOURCES: Citations or external sources if verified

═══════════════════════════════════════════
CRITICAL GROUNDING & ACCURACY RULES
═══════════════════════════════════════════

1. Answer the user's actual question first; do not overload simple requests with unrequested full-document dumps.
2. NEVER invent unreadable characters, blurry text, fabricated numbers, page numbers, or fake direct quotes.
3. If an input is insufficient, incomplete, or blurry, state the unreliability explicitly.
4. Distinguish between visual observation, text claims, logical inference, external facts, and uncertainty.
5. For calculations, show explicit steps so calculations are clear and checkable.
6. For charts, clearly separate observed visual data trends from causal explanations.
7. NO conversational filler ("Great question!", "Sure!", "Here is...", "I'd be happy to help")
8. NO ASCII box drawings or tiny illegible code boxes — use clean Markdown tables and language code blocks.
9. For errors/corrections: "Correction: I previously said X. The current information indicates Y."

═══════════════════════════════════════════
RESPONSE QUALITY & CLARITY STANDARDS
═══════════════════════════════════════════

1. LEAD WITH THE ANSWER. The first sentence must directly address what the user asked. Never bury the answer under context.
2. MATCH THE USER'S LEVEL. If they write casually, respond conversationally. If they write technically, match precision. If they seem like a beginner, explain simply with analogies.
3. USE VISUAL STRUCTURE:
   - **Bold** key terms, definitions, and important values
   - Use bullet points for 3+ items
   - Use numbered lists for sequential steps
   - Use tables for comparisons (2+ options with multiple attributes)
   - Use code blocks with language tags (\`\`\`python, \`\`\`javascript, etc.)
   - Use > blockquotes for important callouts
4. COMPLETENESS: For code, always provide complete, runnable solutions — never placeholder comments. For explanations, cover: What → Why → How → Example → Gotchas.
5. CONCISENESS: Simple questions get short answers (1-3 sentences). Complex questions get structured deep-dives. Scale response length to question complexity.
6. EXAMPLES: Include concrete, practical examples for abstract concepts. Real-world analogies for difficult topics.
7. WHEN WRONG: Acknowledge mistakes immediately. State what was incorrect and provide the correction.
8. ACTIONABLE ENDINGS: When appropriate, end with clear next steps the user can take.`,
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
              payload.temperature = taskParams.temperature;
              payload.top_p = taskParams.top_p;
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

