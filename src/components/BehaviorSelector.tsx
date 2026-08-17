import { useState } from "react";
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
import type { AIProvider, ChatGPTPersonality } from "../config/ai-behaviors";

interface BehaviorSelectorProps {
  currentProvider: AIProvider;
  currentPersonality?: ChatGPTPersonality;
  onBehaviorChange: (provider: AIProvider, personality?: ChatGPTPersonality) => void;
}

const PROVIDER_DESCRIPTIONS: Record<AIProvider, string> = {
  "ryuk-default": "rYuk's custom balanced behavior - direct, minimal formatting, complete solutions",
  "chatgpt": "OpenAI ChatGPT-style interactions with customizable personalities",
  "claude": "Anthropic Claude-style thoughtful, helpful, and harmless responses"
};

const PERSONALITY_DESCRIPTIONS: Record<ChatGPTPersonality, string> = {
  professional: "Formal, comprehensive, business-focused communication",
  friendly: "Warm, casual, empathetic conversational style",
  candid: "Direct, plainspoken coaching with honest feedback",
  quirky: "Playful, creative, imaginative with literary flair",
  efficient: "Concise, direct, minimal conversational language",
  cynical: "Sarcastic wit with hidden warmth and loyalty"
};

export function BehaviorSelector({
  currentProvider,
  currentPersonality,
  onBehaviorChange
}: BehaviorSelectorProps) {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(currentProvider);
  const [selectedPersonality, setSelectedPersonality] = useState<ChatGPTPersonality | undefined>(currentPersonality);

  const handleProviderChange = (value: AIProvider) => {
    setSelectedProvider(value);

    // Reset personality when switching away from ChatGPT
    if (value !== "chatgpt") {
      setSelectedPersonality(undefined);
      onBehaviorChange(value, undefined);
    } else {
      // Default to friendly for ChatGPT
      const defaultPersonality = "friendly";
      setSelectedPersonality(defaultPersonality);
      onBehaviorChange(value, defaultPersonality);
    }
  };

  const handlePersonalityChange = (value: ChatGPTPersonality) => {
    setSelectedPersonality(value);
    onBehaviorChange(selectedProvider, value);
  };

  const handleApply = () => {
    onBehaviorChange(selectedProvider, selectedPersonality);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>AI Behavior Settings</CardTitle>
        <CardDescription>
          Choose how the AI responds to your messages - switch between ChatGPT, Claude, or rYuk's custom behaviors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Provider Selection */}
        <div className="space-y-2">
          <Label htmlFor="provider-select">AI Behavior Style</Label>
          <Select value={selectedProvider} onValueChange={handleProviderChange}>
            <SelectTrigger id="provider-select">
              <SelectValue placeholder="Select behavior style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ryuk-default">
                <div className="flex flex-col items-start">
                  <span className="font-medium">rYuk Default</span>
                  <span className="text-xs text-muted-foreground">
                    {PROVIDER_DESCRIPTIONS["ryuk-default"]}
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="chatgpt">
                <div className="flex flex-col items-start">
                  <span className="font-medium">ChatGPT Style</span>
                  <span className="text-xs text-muted-foreground">
                    {PROVIDER_DESCRIPTIONS.chatgpt}
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="claude">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Claude Style</span>
                  <span className="text-xs text-muted-foreground">
                    {PROVIDER_DESCRIPTIONS.claude}
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Personality Selection (only for ChatGPT) */}
        {selectedProvider === "chatgpt" && (
          <div className="space-y-2 animate-in fade-in-50 duration-200">
            <Label htmlFor="personality-select">ChatGPT Personality</Label>
            <Select
              value={selectedPersonality}
              onValueChange={handlePersonalityChange}
            >
              <SelectTrigger id="personality-select">
                <SelectValue placeholder="Select personality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Professional</span>
                    <span className="text-xs text-muted-foreground">
                      {PERSONALITY_DESCRIPTIONS.professional}
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="friendly">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Friendly</span>
                    <span className="text-xs text-muted-foreground">
                      {PERSONALITY_DESCRIPTIONS.friendly}
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="candid">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Candid</span>
                    <span className="text-xs text-muted-foreground">
                      {PERSONALITY_DESCRIPTIONS.candid}
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="quirky">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Quirky</span>
                    <span className="text-xs text-muted-foreground">
                      {PERSONALITY_DESCRIPTIONS.quirky}
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="efficient">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Efficient</span>
                    <span className="text-xs text-muted-foreground">
                      {PERSONALITY_DESCRIPTIONS.efficient}
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="cynical">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Cynical</span>
                    <span className="text-xs text-muted-foreground">
                      {PERSONALITY_DESCRIPTIONS.cynical}
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Current Selection Info */}
        <div className="rounded-lg bg-muted p-4 text-sm">
          <p className="font-medium mb-1">Current Configuration:</p>
          <p className="text-muted-foreground">
            {selectedProvider === "ryuk-default" && "rYuk Default Behavior"}
            {selectedProvider === "claude" && "Claude-style: Thoughtful & balanced"}
            {selectedProvider === "chatgpt" && selectedPersonality &&
              `ChatGPT ${selectedPersonality.charAt(0).toUpperCase() + selectedPersonality.slice(1)} Personality`}
          </p>
        </div>

        <Button onClick={handleApply} className="w-full">
          Apply Behavior Settings
        </Button>
      </CardContent>
    </Card>
  );
}
