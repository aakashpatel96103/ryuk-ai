/**
 * Intelligence Profile Selector
 * Professional interface for selecting AI behavioral profiles
 */

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Brain, Zap, MessageSquare, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AIProvider, ChatGPTPersonality } from "../config/ai-behaviors";

interface IntelligenceProfileSelectorProps {
  currentProvider: AIProvider;
  currentPersonality?: ChatGPTPersonality;
  onIntelligenceChange: (provider: AIProvider, personality?: ChatGPTPersonality) => void;
}

const PROVIDER_METADATA: Record<AIProvider, { name: string; description: string; icon: any }> = {
  "ryuk-default": {
    name: "rYuk Professional",
    description: "Optimized for technical accuracy, efficiency, and direct communication",
    icon: Zap
  },
  "chatgpt": {
    name: "GPT Intelligence",
    description: "OpenAI conversational intelligence with customizable communication styles",
    icon: MessageSquare
  },
  "claude": {
    name: "Claude Intelligence",
    description: "Anthropic's thoughtful, contextual, and nuanced response framework",
    icon: Brain
  }
};

const PERSONALITY_METADATA: Record<ChatGPTPersonality, { name: string; description: string; tag: string }> = {
  professional: {
    name: "Professional",
    description: "Formal, comprehensive, and business-focused communication",
    tag: "Enterprise"
  },
  friendly: {
    name: "Friendly",
    description: "Warm, empathetic, and conversational with casual language",
    tag: "Casual"
  },
  candid: {
    name: "Candid",
    description: "Direct, constructive coaching with honest feedback",
    tag: "Advisory"
  },
  quirky: {
    name: "Quirky",
    description: "Playful, imaginative, and creative with metaphors",
    tag: "Creative"
  },
  efficient: {
    name: "Efficient",
    description: "Concise, direct, and zero conversational filler",
    tag: "Speed"
  },
  cynical: {
    name: "Cynical",
    description: "Witty and sarcastic while remaining helpful",
    tag: "Humor"
  }
};

export function IntelligenceProfileSelector({
  currentProvider,
  currentPersonality,
  onIntelligenceChange,
}: IntelligenceProfileSelectorProps) {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(currentProvider);
  const [selectedPersonality, setSelectedPersonality] = useState<ChatGPTPersonality | undefined>(currentPersonality);
  const [justApplied, setJustApplied] = useState(false);

  // Sync state if props change externally
  useEffect(() => {
    setSelectedProvider(currentProvider);
    setSelectedPersonality(currentPersonality);
  }, [currentProvider, currentPersonality]);

  const handleProviderChange = (provider: AIProvider) => {
    setSelectedProvider(provider);
    if (provider === "chatgpt" && !selectedPersonality) {
      setSelectedPersonality("professional");
    }
  };

  const handleApply = () => {
    onIntelligenceChange(selectedProvider, selectedPersonality);
    setJustApplied(true);
    const profileName =
      selectedProvider === "ryuk-default"
        ? "rYuk Professional"
        : selectedProvider === "claude"
        ? "Claude Intelligence"
        : `GPT Intelligence (${selectedPersonality || "Professional"})`;

    toast.success(`AI Configuration Applied!`, {
      description: `Active framework: ${profileName}`,
    });

    setTimeout(() => {
      setJustApplied(false);
    }, 2000);
  };

  const CurrentIcon = PROVIDER_METADATA[selectedProvider]?.icon || Zap;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CurrentIcon className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">Intelligence Profile</CardTitle>
            <CardDescription className="text-xs">
              Select the AI behavioral framework for optimal response generation
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Framework Selector */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Intelligence Framework</Label>
          <Select value={selectedProvider} onValueChange={(val) => handleProviderChange(val as AIProvider)}>
            <SelectTrigger className="h-auto py-2.5 px-3 w-full bg-secondary/50 border-border/60 hover:bg-secondary transition-colors">
              <div className="flex items-center gap-2.5 text-left min-w-0 pr-2">
                <CurrentIcon className="h-4 w-4 text-primary shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-sm text-foreground leading-tight">
                    {PROVIDER_METADATA[selectedProvider]?.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
                    {PROVIDER_METADATA[selectedProvider]?.description}
                  </span>
                </div>
              </div>
            </SelectTrigger>
            <SelectContent className="bg-[#181816] border-border/60 text-foreground z-50">
              {Object.entries(PROVIDER_METADATA).map(([key, meta]) => {
                const Icon = meta.icon;
                return (
                  <SelectItem key={key} value={key} className="py-2.5 cursor-pointer">
                    <div className="flex items-start gap-2.5">
                      <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{meta.name}</span>
                        <span className="text-xs text-muted-foreground mt-0.5 leading-snug">
                          {meta.description}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Personality Selector (ChatGPT Only) */}
        {selectedProvider === "chatgpt" && (
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Communication Style</Label>
            <Select
              value={selectedPersonality || "professional"}
              onValueChange={(val) => setSelectedPersonality(val as ChatGPTPersonality)}
            >
              <SelectTrigger className="h-auto py-2.5 px-3 w-full bg-secondary/50 border-border/60 hover:bg-secondary transition-colors">
                <div className="flex items-center gap-2 text-left min-w-0 pr-2">
                  <span className="font-semibold text-sm text-foreground">
                    {PERSONALITY_METADATA[selectedPersonality || "professional"]?.name}
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                    {PERSONALITY_METADATA[selectedPersonality || "professional"]?.tag}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground truncate ml-1">
                    · {PERSONALITY_METADATA[selectedPersonality || "professional"]?.description}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="bg-[#181816] border-border/60 text-foreground z-50">
                {Object.entries(PERSONALITY_METADATA).map(([key, meta]) => (
                  <SelectItem key={key} value={key} className="py-2 cursor-pointer">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{meta.name}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {meta.tag}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground mt-0.5 leading-tight">
                        {meta.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button
          onClick={handleApply}
          className={cn(
            "w-full h-10 font-semibold text-sm transition-all shadow-md active:scale-[0.99] cursor-pointer",
            justApplied
              ? "bg-emerald-600 hover:bg-emerald-600 text-white"
              : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0"
          )}
        >
          {justApplied ? (
            <span className="flex items-center justify-center gap-2">
              <Check className="h-4 w-4" /> Configuration Applied!
            </span>
          ) : (
            "Apply Configuration"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
