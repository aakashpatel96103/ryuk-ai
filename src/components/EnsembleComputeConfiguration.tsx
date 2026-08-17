/**
 * Ensemble Compute Configuration
 * Professional interface for configuring multi-model ensemble processing
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { Badge } from "./ui/badge";
import { Info, Layers, Zap, Target, Clock } from "lucide-react";
import type { MergeStrategy } from "../lib/hybrid-ensemble";

interface EnsembleConfiguration {
  enabled: boolean;
  strategy: MergeStrategy;
  maxModels: number;
}

interface EnsembleComputeConfigurationProps {
  configuration: EnsembleConfiguration;
  onConfigurationChange: (config: EnsembleConfiguration) => void;
}

const STRATEGY_SPECIFICATIONS: Record<MergeStrategy, {
  name: string;
  description: string;
  performance: string;
  quality: string;
  useCase: string;
}> = {
  "streaming-race": {
    name: "Streaming Race",
    description: "Priority-based first-response selection for minimum latency",
    performance: "⚡ Maximum Speed",
    quality: "⭐⭐⭐ Standard",
    useCase: "Real-time interactions"
  },
  "parallel-merge": {
    name: "Parallel Merge",
    description: "Concurrent model execution with intelligent response synthesis",
    performance: "⚡⚡ High Speed",
    quality: "⭐⭐⭐⭐ Premium",
    useCase: "Balanced performance"
  },
  "best-of-n": {
    name: "Best of N Selection",
    description: "Quality-ranked selection from multiple candidate responses",
    performance: "⚡⚡ High Speed",
    quality: "⭐⭐⭐⭐ Premium",
    useCase: "Code generation"
  },
  "consensus": {
    name: "Consensus Algorithm",
    description: "Multi-model agreement analysis for factual accuracy",
    performance: "⚡⚡⚡ Moderate",
    quality: "⭐⭐⭐⭐⭐ Enterprise",
    useCase: "Technical validation"
  },
  "weighted": {
    name: "Weighted Synthesis",
    description: "Quality-weighted model response aggregation",
    performance: "⚡⚡⚡ Moderate",
    quality: "⭐⭐⭐⭐ Premium",
    useCase: "Complex analysis"
  },
  "synthesis": {
    name: "Comprehensive Synthesis",
    description: "Full-spectrum response integration for depth",
    performance: "⚡⚡⚡ Moderate",
    quality: "⭐⭐⭐⭐⭐ Enterprise",
    useCase: "Research & documentation"
  },
  "chain-of-thought": {
    name: "Chain of Thought",
    description: "Sequential model refinement for maximum accuracy",
    performance: "⚡⚡⚡⚡ Deliberate",
    quality: "⭐⭐⭐⭐⭐ Enterprise+",
    useCase: "Critical problem-solving"
  },
  "voting": {
    name: "Voting Consensus",
    description: "Democratic model response selection mechanism",
    performance: "⚡⚡⚡ Moderate",
    quality: "⭐⭐⭐⭐ Premium",
    useCase: "Decision validation"
  }
};

export function EnsembleComputeConfiguration({
  configuration,
  onConfigurationChange
}: EnsembleComputeConfigurationProps) {
  const [localConfig, setLocalConfig] = useState<EnsembleConfiguration>(configuration);

  const handleToggle = (enabled: boolean) => {
    const newConfig = { ...localConfig, enabled };
    setLocalConfig(newConfig);
    onConfigurationChange(newConfig);
  };

  const handleStrategyChange = (strategy: MergeStrategy) => {
    const newConfig = { ...localConfig, strategy };
    setLocalConfig(newConfig);
    onConfigurationChange(newConfig);
  };

  const handleModelCountChange = (value: number[]) => {
    const newConfig = { ...localConfig, maxModels: value[0]! };
    setLocalConfig(newConfig);
    onConfigurationChange(newConfig);
  };

  const selectedStrategy = STRATEGY_SPECIFICATIONS[localConfig.strategy];

  return (
    <Card className="w-full border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Ensemble Compute</CardTitle>
              <CardDescription className="mt-1">
                Multi-model parallel processing for enhanced output quality
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={localConfig.enabled}
            onCheckedChange={handleToggle}
          />
        </div>
      </CardHeader>

      {localConfig.enabled && (
        <CardContent className="space-y-5">
          {/* Information Banner */}
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 p-4">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Ensemble Processing Active
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                Responses are generated through parallel execution across {localConfig.maxModels} specialized AI models,
                delivering enterprise-grade quality comparable to premium commercial services.
              </p>
            </div>
          </div>

          {/* Synthesis Strategy */}
          <div className="space-y-2.5">
            <Label htmlFor="strategy-select" className="text-sm font-medium">
              Synthesis Strategy
            </Label>
            <Select value={localConfig.strategy} onValueChange={handleStrategyChange}>
              <SelectTrigger id="strategy-select" className="h-auto py-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(STRATEGY_SPECIFICATIONS) as [MergeStrategy, typeof STRATEGY_SPECIFICATIONS[MergeStrategy]][]).map(([key, spec]) => (
                  <SelectItem key={key} value={key} className="py-3">
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-sm">{spec.name}</span>
                      <span className="text-xs text-muted-foreground mt-0.5 leading-tight">
                        {spec.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Strategy Specifications */}
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3.5 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-xs font-medium">
                  <Clock className="h-3 w-3 mr-1" />
                  {selectedStrategy.performance}
                </Badge>
                <Badge variant="secondary" className="text-xs font-medium">
                  <Target className="h-3 w-3 mr-1" />
                  {selectedStrategy.quality}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground mb-1">Optimal Use Case</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {selectedStrategy.useCase}
                </p>
              </div>
            </div>
          </div>

          {/* Model Count Configuration */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="model-count-slider" className="text-sm font-medium">
                Compute Units
              </Label>
              <Badge variant="outline" className="text-sm font-mono">
                {localConfig.maxModels}
              </Badge>
            </div>
            <Slider
              id="model-count-slider"
              min={3}
              max={20}
              step={1}
              value={[localConfig.maxModels]}
              onValueChange={handleModelCountChange}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Higher compute allocation increases output quality with proportional processing time
            </p>
          </div>

          {/* Performance Metrics */}
          <div className="rounded-lg border border-border/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-medium">Expected Performance</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Processing Time</p>
                <p className="text-sm font-medium text-foreground">
                  {localConfig.strategy === "streaming-race" ? "1-3 seconds" :
                   localConfig.strategy === "chain-of-thought" ? "10-30 seconds" :
                   localConfig.strategy === "parallel-merge" || localConfig.strategy === "best-of-n" ? "3-5 seconds" :
                   "5-10 seconds"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Output Quality</p>
                <p className="text-sm font-medium text-foreground">
                  {localConfig.strategy === "chain-of-thought" ||
                   localConfig.strategy === "consensus" ||
                   localConfig.strategy === "synthesis"
                    ? "Enterprise Grade"
                    : "Premium Grade"}
                </p>
              </div>
            </div>
          </div>

          {/* Cost Information */}
          <div className="text-center p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30">
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
              Zero-Cost Operation · Enterprise Performance
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
              All compute units leverage cost-optimized infrastructure
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
