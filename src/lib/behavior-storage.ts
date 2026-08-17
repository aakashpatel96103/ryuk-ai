import type { AIProvider, ChatGPTPersonality } from "../config/ai-behaviors";

const STORAGE_KEY = "ryuk-ai-behavior-settings";

export interface BehaviorSettings {
  provider: AIProvider;
  personality?: ChatGPTPersonality;
}

/**
 * Get stored behavior settings from localStorage
 */
export function getBehaviorSettings(): BehaviorSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load behavior settings:", error);
  }

  // Default settings
  return {
    provider: "ryuk-default",
    personality: undefined
  };
}

/**
 * Save behavior settings to localStorage
 */
export function saveBehaviorSettings(settings: BehaviorSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save behavior settings:", error);
  }
}

/**
 * Reset behavior settings to default
 */
export function resetBehaviorSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to reset behavior settings:", error);
  }
}
