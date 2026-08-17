/**
 * AI Configuration Panel
 * Enterprise-grade settings interface for AI model behavior and ensemble compute
 */

import { useState } from "react";
import { useIntelligenceSettings } from "../hooks/use-intelligence-settings";
import { IntelligenceProfileSelector } from "./IntelligenceProfileSelector";
import { ModelNetworkStatus } from "./ModelNetworkStatus";
import { EnsembleComputeConfiguration } from "./EnsembleComputeConfiguration";
import { Button } from "./ui/button";
import { Settings2, Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { getAdaptiveEnsembleConfig } from "../lib/adaptive-ensemble";

export interface EnsembleConfiguration {
  enabled: boolean;
  strategy: MergeStrategy;
  maxModels: number;
}

/**
 * Professional AI Configuration Panel
 * Provides unified access to intelligence profiles, active model network, and ensemble compute settings
 */
export function AIConfigurationPanel() {
  const { provider, personality, updateIntelligence } = useIntelligenceSettings();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // ALWAYS ENABLED: Optimized ensemble configuration for fast, high-quality responses
  const [ensembleConfig, setEnsembleConfig] = useState<EnsembleConfiguration>(() => {
    return {
      enabled: true, // Always enabled
      strategy: "parallel-merge" as MergeStrategy, // Fast + high quality
      maxModels: 10 // Optimized for speed
    };
  });

  const handleIntelligenceChange = (newProvider: any, newPersonality?: any) => {
    updateIntelligence(newProvider, newPersonality);
  };

  const handleEnsembleConfigChange = (newConfig: EnsembleConfiguration) => {
    setEnsembleConfig(newConfig);
    try {
      localStorage.setItem("ryuk-ensemble-configuration", JSON.stringify(newConfig));
    } catch (error) {
      console.error("Failed to persist ensemble configuration:", error);
    }
  };

  return (
    <Sheet open={isPanelOpen} onOpenChange={setIsPanelOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
          title="AI Configuration"
        >
          <Settings2 className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-[600px] md:max-w-[640px] p-6 overflow-y-auto bg-[#141412] border-l border-border/50 text-foreground">
        <SheetHeader className="pb-2 border-b border-border/30">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <SheetTitle className="text-lg font-bold">AI Configuration</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Configure behavioral intelligence profiles & monitor live AI model network
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          <IntelligenceProfileSelector
            currentProvider={provider}
            currentPersonality={personality}
            onIntelligenceChange={handleIntelligenceChange}
          />

          {/* Model Availability Network with Active (Green) & Disabled (Red) Flags */}
          <ModelNetworkStatus />

          {/* Ensemble Compute Status - Always Active */}
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                <Sparkles className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  Adaptive Intelligence Active
                </h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                  Ensemble compute automatically optimizes models and strategy for each prompt
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Export ensemble configuration hook - ADAPTIVE BASED ON PROMPT
export function useEnsembleConfiguration() {
  // ALWAYS ENABLED: Adaptive ensemble configuration based on prompt complexity
  // Configuration is determined automatically by analyzing each message
  const ensembleConfig: EnsembleConfiguration = {
    enabled: true, // Always enabled
    strategy: "parallel-merge" as MergeStrategy, // Default, will adapt per message
    maxModels: 10 // Default, will adapt per message
  };

  const updateEnsembleConfig = (newConfig: EnsembleConfiguration) => {
    // No-op: Configuration adapts automatically based on prompt
    console.info("Ensemble compute adapts automatically based on prompt complexity");
  };

  return { ensembleConfig, updateEnsembleConfig };
}
