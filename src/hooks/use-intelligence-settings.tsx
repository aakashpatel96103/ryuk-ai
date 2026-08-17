/**
 * Intelligence Settings Hook
 * Manages persistent, synchronized AI behavioral configuration state across all components
 */

import { useState, useEffect, useCallback } from "react";
import type { AIProvider, ChatGPTPersonality } from "../config/ai-behaviors";
import {
  getIntelligenceSettings,
  saveIntelligenceSettings,
  type IntelligenceSettings,
} from "../lib/intelligence-storage";

const INTELLIGENCE_CHANGE_EVENT = "ryuk-intelligence-changed";

export function useIntelligenceSettings() {
  const [settings, setSettings] = useState<IntelligenceSettings>(() => getIntelligenceSettings());

  useEffect(() => {
    const handleUpdate = () => {
      setSettings(getIntelligenceSettings());
    };

    if (typeof window !== "undefined") {
      window.addEventListener(INTELLIGENCE_CHANGE_EVENT, handleUpdate);
      window.addEventListener("storage", handleUpdate);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(INTELLIGENCE_CHANGE_EVENT, handleUpdate);
        window.removeEventListener("storage", handleUpdate);
      }
    };
  }, []);

  const updateIntelligence = useCallback((provider: AIProvider, personality?: ChatGPTPersonality) => {
    const newSettings: IntelligenceSettings = { provider, personality };
    saveIntelligenceSettings(newSettings);
    setSettings(newSettings);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(INTELLIGENCE_CHANGE_EVENT, { detail: newSettings }));
    }
  }, []);

  const resetToDefault = useCallback(() => {
    const defaultSettings: IntelligenceSettings = {
      provider: "ryuk-default",
      personality: undefined,
    };
    saveIntelligenceSettings(defaultSettings);
    setSettings(defaultSettings);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(INTELLIGENCE_CHANGE_EVENT, { detail: defaultSettings }));
    }
  }, []);

  return {
    provider: settings.provider,
    personality: settings.personality,
    updateIntelligence,
    resetToDefault,
  };
}
