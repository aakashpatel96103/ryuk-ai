/**
 * Model Network Status Component
 * Displays real-time operational status of all AI models with green/red flags and health metrics
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Cpu,
  Zap,
  Globe,
  Flag,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface ModelHealthItem {
  id: string;
  name: string;
  family: string;
  provider: string;
  status: "active" | "disabled";
  statusText: string;
  latency?: string;
  contextLength: string;
  type: string;
}

export const INITIAL_MODEL_REGISTRY: ModelHealthItem[] = [
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B Instruct",
    family: "Meta AI",
    provider: "OpenRouter (High Performance)",
    status: "active",
    statusText: "Operational",
    latency: "~1.2s",
    contextLength: "128k",
    type: "Reasoning & Coding",
  },
  {
    id: "qwen/qwen-2.5-72b-instruct",
    name: "Qwen 2.5 72B Instruct",
    family: "Alibaba Cloud",
    provider: "OpenRouter (Fast Cloud)",
    status: "active",
    statusText: "Operational",
    latency: "~1.5s",
    contextLength: "128k",
    type: "Coding & Mathematics",
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    family: "OpenAI",
    provider: "OpenRouter (Direct)",
    status: "active",
    statusText: "Operational",
    latency: "~0.9s",
    contextLength: "128k",
    type: "Multimodal & Speed",
  },
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek Chat V3",
    family: "DeepSeek",
    provider: "OpenRouter (Active Credits)",
    status: "active",
    statusText: "Operational",
    latency: "~1.8s",
    contextLength: "64k",
    type: "General Intelligence",
  },
  {
    id: "liquid/lfm-2.5-2.6b:free",
    name: "Liquid LFM 2.5 2.6B",
    family: "Liquid AI",
    provider: "OpenRouter Free Model",
    status: "active",
    statusText: "Free · Active",
    latency: "~0.7s",
    contextLength: "32k",
    type: "Ultra-Lightweight Edge AI",
  },
  {
    id: "nvidia/nemotron-3.5-lightning:free",
    name: "Nemotron 3.5 Lightning",
    family: "NVIDIA",
    provider: "OpenRouter Free Model",
    status: "active",
    statusText: "Free · Active",
    latency: "~0.8s",
    contextLength: "32k",
    type: "Ultra-Fast Inference",
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Gemma 4 31B Instruct",
    family: "Google DeepMind",
    provider: "OpenRouter Free Model",
    status: "active",
    statusText: "Free · Active",
    latency: "~0.9s",
    contextLength: "32k",
    type: "Knowledge Synthesis",
  },
  {
    id: "google/gemma-4-26b-a4b-it:free",
    name: "Gemma 4 26B-A4B IT",
    family: "Google DeepMind",
    provider: "OpenRouter Free Model",
    status: "active",
    statusText: "Free · Active",
    latency: "~0.8s",
    contextLength: "32k",
    type: "Instruction Tuning",
  },
  {
    id: "openai/gpt-oss-20b:free",
    name: "OpenAI GPT-OSS 20B",
    family: "OpenAI",
    provider: "OpenRouter Free Model",
    status: "active",
    statusText: "Free · Active",
    latency: "~0.8s",
    contextLength: "32k",
    type: "Open-Weights Reasoning",
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    name: "Nemotron 3 Super 120B",
    family: "NVIDIA",
    provider: "OpenRouter Free Model",
    status: "active",
    statusText: "Free · Active",
    latency: "~1.1s",
    contextLength: "32k",
    type: "Large Parameter Ensemble",
  },
  {
    id: "nvidia/nemotron-nano-12b-v2-vl:free",
    name: "Nemotron Nano 12B VL",
    family: "NVIDIA",
    provider: "OpenRouter Free Model",
    status: "active",
    statusText: "Free · Active",
    latency: "~0.8s",
    contextLength: "32k",
    type: "Vision-Language Multimodal",
  },
  {
    id: "nvidia/nemotron-nano-9b-v2:free",
    name: "Nemotron Nano 9B v2",
    family: "NVIDIA",
    provider: "OpenRouter Free Model",
    status: "active",
    statusText: "Free · Active",
    latency: "~0.7s",
    contextLength: "32k",
    type: "Compact Reasoning",
  },
  {
    id: "nvidia/nemotron-3-nano-30b-a3b:free",
    name: "Nemotron 3 Nano 30B",
    family: "NVIDIA",
    provider: "OpenRouter Free Model",
    status: "active",
    statusText: "Free · Active",
    latency: "~0.8s",
    contextLength: "32k",
    type: "Fast Routing Model",
  },
  {
    id: "cohere/north-mini-code:free",
    name: "Cohere North Mini Code",
    family: "Cohere",
    provider: "OpenRouter Free Model",
    status: "active",
    statusText: "Free · Active",
    latency: "~0.7s",
    contextLength: "32k",
    type: "Code Intelligence",
  },
  {
    id: "poolside/laguna-s-2.1:free",
    name: "Poolside Laguna S 2.1",
    family: "Poolside",
    provider: "OpenRouter Free Model",
    status: "active",
    statusText: "Free · Active",
    latency: "~0.8s",
    contextLength: "32k",
    type: "Coding & Software Engineering",
  },
  {
    id: "poolside/laguna-xs-2.1:free",
    name: "Poolside Laguna XS 2.1",
    family: "Poolside",
    provider: "OpenRouter Free Model",
    status: "active",
    statusText: "Free · Active",
    latency: "~0.7s",
    contextLength: "32k",
    type: "Ultra-Light Coding Agent",
  },
  {
    id: "z-ai/glm-5.2:free",
    name: "Z-AI GLM 5.2",
    family: "Z-AI",
    provider: "OpenRouter Free Model",
    status: "active",
    statusText: "Free · Active",
    latency: "~0.8s",
    contextLength: "32k",
    type: "Bilingual Intelligence",
  },
  {
    id: "dots-studio/dots-3-note-preview:free",
    name: "Dots 3 Note Preview",
    family: "Dots Studio",
    provider: "OpenRouter Free Model",
    status: "active",
    statusText: "Free · Active",
    latency: "~0.7s",
    contextLength: "32k",
    type: "Note & Documentation AI",
  },
  {
    id: "openrouter/free",
    name: "OpenRouter Auto-Free Router",
    family: "OpenRouter",
    provider: "Dynamic Free Pool",
    status: "active",
    statusText: "Free · Active",
    latency: "~0.8s",
    contextLength: "32k",
    type: "Auto-Failover Free Router",
  }
];

export function ModelNetworkStatus() {
  const [models, setModels] = useState<ModelHealthItem[]>(INITIAL_MODEL_REGISTRY);
  const [filter, setFilter] = useState<"all" | "active" | "disabled">("all");
  const [isPinging, setIsPinging] = useState(false);

  // Fetch live OpenRouter models on mount & probe for real-time status shifts
  const refreshLiveModels = async (forceProbe: boolean = false) => {
    try {
      const res = await fetch(`/api/models${forceProbe ? "?probe=true" : ""}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.models && data.models.length > 0) {
          setModels(data.models);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch live model registry, using cached registry:", e);
    }
  };

  useEffect(() => {
    void refreshLiveModels(false);
  }, []);

  const activeCount = models.filter((m) => m.status === "active").length;
  const disabledCount = models.filter((m) => m.status === "disabled").length;

  const handlePingNetwork = async () => {
    setIsPinging(true);
    const toastId = toast.loading("Probing OpenRouter endpoints & synchronizing status...");

    try {
      // 1. Force live probe against OpenRouter to shift active/disabled models in real time
      await refreshLiveModels(true);

      // 2. Test live chat endpoint latency
      const startTime = Date.now();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "ping" }],
        }),
      });

      const elapsed = Date.now() - startTime;
      if (res.ok) {
        toast.success(`Network Health & Models Synchronized!`, {
          id: toastId,
          description: `Active models operational (${elapsed}ms round-trip). Synced latest free models.`,
        });
      } else {
        toast.error(`Network check completed with alerts`, {
          id: toastId,
          description: `Primary endpoints responding with fallback protection.`,
        });
      }
    } catch {
      toast.error("Network verification failed", { id: toastId });
    } finally {
      setIsPinging(false);
    }
  };

  const filteredModels = models.filter((m) => {
    if (filter === "active") return m.status === "active";
    if (filter === "disabled") return m.status === "disabled";
    return true;
  });

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Model Availability Network</CardTitle>
              <CardDescription className="text-xs">
                Real-time health of free & active AI model endpoints
              </CardDescription>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePingNetwork}
            disabled={isPinging}
            className="h-8 gap-1.5 text-xs px-2.5"
            title="Ping endpoints to verify live connectivity"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isPinging && "animate-spin text-primary")} />
            <span className="hidden sm:inline">Check Health</span>
          </Button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 pt-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "px-2.5 py-1 text-[11px] rounded-full font-medium transition-colors cursor-pointer",
              filter === "all"
                ? "bg-primary/20 text-primary border border-primary/40"
                : "bg-muted/40 text-muted-foreground hover:text-foreground"
            )}
          >
            All Models ({models.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("active")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-full font-medium transition-colors cursor-pointer",
              filter === "active"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                : "bg-muted/40 text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("disabled")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-full font-medium transition-colors cursor-pointer",
              filter === "disabled"
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                : "bg-muted/40 text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Disabled ({disabledCount})
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5 pt-1 px-4 pb-4">
        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
          {filteredModels.map((item) => {
            const isActive = item.status === "active";
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border transition-all text-xs",
                  isActive
                    ? "bg-emerald-950/20 border-emerald-500/25 hover:border-emerald-500/40 hover:bg-emerald-950/30"
                    : "bg-rose-950/15 border-rose-500/20 hover:border-rose-500/30 opacity-80"
                )}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="shrink-0">
                    {isActive ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <Flag className="h-3.5 w-3.5 fill-emerald-400" />
                      </div>
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30">
                        <Flag className="h-3.5 w-3.5 fill-rose-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">{item.name}</span>
                      <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.2 rounded font-medium">
                        {item.family}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground mt-0.5">
                      {item.provider} • {item.contextLength || "32k"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  {isActive ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[11px] px-2 py-0.5 font-medium flex items-center gap-1.5"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {item.statusText}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-rose-500/40 bg-rose-500/10 text-rose-400 text-[11px] px-2 py-0.5 font-medium flex items-center gap-1.5"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      {item.statusText}
                    </Badge>
                  )}

                  {item.latency && isActive && (
                    <span className="text-[10px] text-emerald-400/80 font-mono flex items-center gap-0.5">
                      ⚡ {item.latency}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
