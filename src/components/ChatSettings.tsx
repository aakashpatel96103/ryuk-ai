import { useState } from "react";
import { useBehaviorSettings } from "../hooks/use-behavior-settings";
import { BehaviorSelector } from "../components/BehaviorSelector";
import { HybridModeSettings } from "../components/HybridModeSettings";
import { Button } from "../components/ui/button";
import { Settings } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import type { MergeStrategy } from "../lib/hybrid-ensemble";

export interface HybridModeConfig {
  enabled: boolean;
  strategy: MergeStrategy;
  maxModels: number;
}

/**
 * Example integration: Settings panel with behavior selector and hybrid mode
 * Add this component to your chat interface
 */
export function ChatSettings() {
  const { provider, personality, updateBehavior } = useBehaviorSettings();
  const [isOpen, setIsOpen] = useState(false);

  // Load hybrid mode config from localStorage
  const [hybridConfig, setHybridConfig] = useState<HybridModeConfig>(() => {
    try {
      const stored = localStorage.getItem("ryuk-hybrid-mode-config");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load hybrid config:", error);
    }
    return {
      enabled: false,
      strategy: "parallel-merge" as MergeStrategy,
      maxModels: 10
    };
  });

  const handleBehaviorChange = (newProvider: any, newPersonality?: any) => {
    updateBehavior(newProvider, newPersonality);
  };

  const handleHybridConfigChange = (newConfig: HybridModeConfig) => {
    setHybridConfig(newConfig);
    try {
      localStorage.setItem("ryuk-hybrid-mode-config", JSON.stringify(newConfig));
    } catch (error) {
      console.error("Failed to save hybrid config:", error);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" title="AI Settings">
          <Settings className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>AI Settings</SheetTitle>
          <SheetDescription>
            Customize AI behavior and enable hybrid ensemble mode
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="behavior" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="behavior">Behavior</TabsTrigger>
            <TabsTrigger value="hybrid">
              Hybrid Mode
              {hybridConfig.enabled && (
                <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-green-500" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="behavior" className="space-y-4">
            <BehaviorSelector
              currentProvider={provider}
              currentPersonality={personality}
              onBehaviorChange={handleBehaviorChange}
            />
          </TabsContent>

          <TabsContent value="hybrid" className="space-y-4">
            <HybridModeSettings
              config={hybridConfig}
              onChange={handleHybridConfigChange}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// Export hybrid config hook for use in chat components
export function useHybridModeConfig() {
  const [hybridConfig, setHybridConfig] = useState<HybridModeConfig>(() => {
    try {
      const stored = localStorage.getItem("ryuk-hybrid-mode-config");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load hybrid config:", error);
    }
    return {
      enabled: false,
      strategy: "parallel-merge" as MergeStrategy,
      maxModels: 10
    };
  });

  const updateHybridConfig = (newConfig: HybridModeConfig) => {
    setHybridConfig(newConfig);
    try {
      localStorage.setItem("ryuk-hybrid-mode-config", JSON.stringify(newConfig));
    } catch (error) {
      console.error("Failed to save hybrid config:", error);
    }
  };

  return { hybridConfig, updateHybridConfig };
}

/**
 * Example: How to use hybrid mode in your chat API call
 *
 * Usage in your chat component:
 *
 * import { useBehaviorSettings } from "../hooks/use-behavior-settings";
 * import { useHybridModeConfig } from "../components/ChatSettings";
 *
 * function ChatComponent() {
 *   const { provider, personality } = useBehaviorSettings();
 *   const { hybridConfig } = useHybridModeConfig();
 *
 *   const sendMessage = async (message: string) => {
 *     const response = await fetch('/api/chat', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({
 *         messages: [...conversationHistory, { role: 'user', content: message }],
 *         model: selectedModel,
 *         behavior: {
 *           provider: provider,
 *           personality: personality
 *         },
 *         hybridMode: hybridConfig  // Add this for hybrid ensemble
 *       })
 *     });
 *     // Handle response...
 *   };
 *
 *   return (
 *     <div>
 *       <ChatSettings />
 *       // ... rest of chat UI
 *     </div>
 *   );
 * }
 */
