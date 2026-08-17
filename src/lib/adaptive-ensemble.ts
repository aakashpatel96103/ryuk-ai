/**
 * Adaptive Ensemble Configuration
 * Automatically adjusts models and strategy based on prompt complexity
 */

import type { MergeStrategy } from "../lib/hybrid-ensemble";

export interface AdaptiveEnsembleConfig {
  enabled: boolean;
  strategy: MergeStrategy;
  maxModels: number;
  reasoning?: string;
}

/**
 * Analyzes prompt complexity and determines optimal ensemble configuration
 */
export function getAdaptiveEnsembleConfig(messages: Array<{ role: string; content: any }>): AdaptiveEnsembleConfig {
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");

  if (!lastUserMessage) {
    return {
      enabled: true,
      strategy: "parallel-merge",
      maxModels: 10,
      reasoning: "Default configuration"
    };
  }

  let content = "";
  let hasImage = false;
  let hasDocument = false;

  if (typeof lastUserMessage.content === "string") {
    content = lastUserMessage.content;
    hasImage = content.includes("[attached image:") || content.includes("data:image/");
    hasDocument = content.includes("[attached file:") || content.includes("[attached document:");
  } else if (Array.isArray(lastUserMessage.content)) {
    const textBlock = lastUserMessage.content.find((c: any) => c.type === "text");
    content = textBlock?.text || "";
    hasImage = lastUserMessage.content.some((c: any) => c.type === "image_url") ||
               content.includes("[attached image:") ||
               content.includes("data:image/");
    hasDocument = content.includes("[attached file:") || content.includes("[attached document:");
  }

  const lower = content.toLowerCase();
  const wordCount = content.split(/\s+/).length;
  const hasCodeBlock = content.includes("```");
  const hasMultipleQuestions = (content.match(/\?/g) || []).length > 1;

  // PRIORITY 1: IMAGE ANALYSIS (12-15 models, consensus or synthesis)
  if (
    hasImage ||
    lower.includes("analyze this image") ||
    lower.includes("what's in this image") ||
    lower.includes("describe this image") ||
    lower.includes("image shows") ||
    lower.includes("picture shows") ||
    lower.includes("photo shows")
  ) {
    return {
      enabled: true,
      strategy: "synthesis",
      maxModels: 15,
      reasoning: "Image analysis - vision models with comprehensive synthesis"
    };
  }

  // PRIORITY 2: DOCUMENT ANALYSIS (15-18 models, synthesis or consensus)
  if (
    hasDocument ||
    lower.includes("analyze this document") ||
    lower.includes("summarize this pdf") ||
    lower.includes("extract from") ||
    lower.includes("read this file") ||
    lower.includes("document contains") ||
    lower.includes("parse this") ||
    lower.includes("from the attached")
  ) {
    return {
      enabled: true,
      strategy: "synthesis",
      maxModels: 18,
      reasoning: "Document analysis - multiple models for comprehensive extraction"
    };
  }

  // 1. SIMPLE & QUICK (3-5 models, streaming-race or parallel-merge)
  if (
    wordCount < 15 &&
    !hasCodeBlock &&
    !hasMultipleQuestions &&
    (
      lower.includes("what is") ||
      lower.includes("define") ||
      lower.includes("explain briefly") ||
      lower.includes("quick") ||
      lower.includes("simple") ||
      lower.includes("hi") ||
      lower.includes("hello") ||
      lower.includes("thanks") ||
      lower.includes("yes") ||
      lower.includes("no") ||
      lower.includes("ok")
    )
  ) {
    return {
      enabled: true,
      strategy: "streaming-race",
      maxModels: 3,
      reasoning: "Simple question - fastest response"
    };
  }

  // 2. COMPLEX CODE (15-20 models, best-of-n or synthesis)
  if (
    hasCodeBlock ||
    lower.includes("refactor") ||
    lower.includes("optimize") ||
    lower.includes("debug") ||
    lower.includes("architecture") ||
    lower.includes("design pattern") ||
    lower.includes("full-stack") ||
    lower.includes("production") ||
    (lower.includes("build") && (lower.includes("app") || lower.includes("system"))) ||
    (lower.includes("code") && wordCount > 30)
  ) {
    return {
      enabled: true,
      strategy: "best-of-n",
      maxModels: 15,
      reasoning: "Complex code task - multiple specialized models"
    };
  }

  // 3. MATHEMATICAL/LOGICAL REASONING (20 models, chain-of-thought)
  if (
    lower.includes("proof") ||
    lower.includes("theorem") ||
    lower.includes("derive") ||
    lower.includes("solve") && (lower.includes("equation") || lower.includes("problem")) ||
    lower.includes("calculate") && wordCount > 20 ||
    lower.includes("algorithm complexity") ||
    lower.includes("optimize") && lower.includes("performance")
  ) {
    return {
      enabled: true,
      strategy: "chain-of-thought",
      maxModels: 20,
      reasoning: "Complex reasoning - maximum models with sequential refinement"
    };
  }

  // 4. RESEARCH & ANALYSIS (15-18 models, synthesis or consensus)
  if (
    lower.includes("analyze") ||
    lower.includes("compare") ||
    lower.includes("research") ||
    lower.includes("pros and cons") ||
    lower.includes("advantages") && lower.includes("disadvantages") ||
    lower.includes("evaluate") ||
    lower.includes("assess") ||
    hasMultipleQuestions ||
    wordCount > 50
  ) {
    return {
      enabled: true,
      strategy: "synthesis",
      maxModels: 15,
      reasoning: "Analysis/research - comprehensive synthesis needed"
    };
  }

  // 5. CREATIVE WRITING (12 models, weighted or synthesis)
  if (
    lower.includes("write a story") ||
    lower.includes("poem") ||
    lower.includes("creative") ||
    lower.includes("script") ||
    lower.includes("dialogue") ||
    lower.includes("narrative") ||
    lower.includes("blog post")
  ) {
    return {
      enabled: true,
      strategy: "weighted",
      maxModels: 12,
      reasoning: "Creative content - diverse perspectives with quality weighting"
    };
  }

  // 6. FACTUAL/TECHNICAL (10 models, consensus)
  if (
    lower.includes("how does") ||
    lower.includes("explain how") ||
    lower.includes("what are the steps") ||
    lower.includes("tutorial") ||
    lower.includes("guide") ||
    lower.includes("documentation")
  ) {
    return {
      enabled: true,
      strategy: "consensus",
      maxModels: 10,
      reasoning: "Technical explanation - consensus for accuracy"
    };
  }

  // 7. CRITICAL DECISION (18-20 models, voting or consensus)
  if (
    lower.includes("should i") ||
    lower.includes("recommend") ||
    lower.includes("decision") ||
    lower.includes("choose") ||
    lower.includes("best approach") ||
    lower.includes("which is better")
  ) {
    return {
      enabled: true,
      strategy: "voting",
      maxModels: 18,
      reasoning: "Critical decision - voting consensus for reliability"
    };
  }

  // 8. LONG-FORM CONTENT (12-15 models, synthesis)
  if (wordCount > 100 || hasMultipleQuestions) {
    return {
      enabled: true,
      strategy: "synthesis",
      maxModels: 15,
      reasoning: "Long/complex prompt - comprehensive synthesis"
    };
  }

  // 9. DEFAULT - BALANCED (10 models, parallel-merge)
  return {
    enabled: true,
    strategy: "parallel-merge",
    maxModels: 10,
    reasoning: "General query - balanced speed and quality"
  };
}

/**
 * Returns a human-readable explanation of the current ensemble configuration
 */
export function getConfigurationExplanation(config: AdaptiveEnsembleConfig): string {
  const timeEstimate =
    config.maxModels <= 5 ? "1-3 sec" :
    config.maxModels <= 10 ? "3-5 sec" :
    config.maxModels <= 15 ? "5-10 sec" :
    "10-30 sec";

  const qualityLevel =
    config.maxModels <= 5 ? "⭐⭐⭐ Standard" :
    config.maxModels <= 10 ? "⭐⭐⭐⭐ Premium" :
    config.maxModels <= 15 ? "⭐⭐⭐⭐⭐ Enterprise" :
    "⭐⭐⭐⭐⭐ Enterprise+";

  return `${config.maxModels} models • ${config.strategy} • ${timeEstimate} • ${qualityLevel}`;
}
