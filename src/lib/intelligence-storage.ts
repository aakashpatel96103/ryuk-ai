/**
 * Intelligence Storage
 * Persistent storage for AI behavioral configuration
 */

import type { AIProvider, ChatGPTPersonality } from "../config/ai-behaviors";

const STORAGE_KEY = "ryuk-intelligence-settings";

export interface IntelligenceSettings {
  provider: AIProvider;
  personality?: ChatGPTPersonality;
}

const DEFAULT_SETTINGS: IntelligenceSettings = {
  provider: "ryuk-default",
  personality: undefined,
};

export function getIntelligenceSettings(): IntelligenceSettings {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return DEFAULT_SETTINGS;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load intelligence settings:", error);
  }
  return DEFAULT_SETTINGS;
}

// Export adaptive ensemble configuration
export { getAdaptiveEnsembleConfig, getConfigurationExplanation } from "./adaptive-ensemble";

export function saveIntelligenceSettings(settings: IntelligenceSettings): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save intelligence settings:", error);
  }
}

export function resetIntelligenceSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to reset intelligence settings:", error);
  }
}
