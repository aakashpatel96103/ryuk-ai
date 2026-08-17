import { useState, useEffect } from "react";
import type { AIProvider, ChatGPTPersonality } from "../config/ai-behaviors";
import { getBehaviorSettings, saveBehaviorSettings, type BehaviorSettings } from "../lib/behavior-storage";

export function useBehaviorSettings() {
  const [settings, setSettings] = useState<BehaviorSettings>(() => getBehaviorSettings());

  useEffect(() => {
    // Load settings on mount
    const stored = getBehaviorSettings();
    setSettings(stored);
  }, []);

  const updateBehavior = (provider: AIProvider, personality?: ChatGPTPersonality) => {
    const newSettings: BehaviorSettings = { provider, personality };
    setSettings(newSettings);
    saveBehaviorSettings(newSettings);
  };

  return {
    provider: settings.provider,
    personality: settings.personality,
    updateBehavior
  };
}
