import { ImageIcon, Globe, Code2, FileText, MessageSquare, type LucideIcon } from "lucide-react";

export type PluginId = "chat" | "image" | "web" | "code" | "doc";

export type Plugin = {
  id: PluginId;
  /** The @-command typed in the composer */
  command: string;
  label: string;
  hint: string;
  icon: LucideIcon;
};

export const PLUGINS: Plugin[] = [
  {
    id: "chat",
    command: "@chat",
    label: "Default chat",
    hint: "General conversation & reasoning with top AI models",
    icon: MessageSquare,
  },
  {
    id: "image",
    command: "@create image",
    label: "Create image",
    hint: "Generate visuals & creative AI artwork",
    icon: ImageIcon,
  },
  {
    id: "web",
    command: "@web",
    label: "Web search",
    hint: "Search and synthesize live web information",
    icon: Globe,
  },
  {
    id: "code",
    command: "@code",
    label: "Code mode",
    hint: "Write, explain, and refactor code",
    icon: Code2,
  },
  {
    id: "doc",
    command: "@doc",
    label: "Read document",
    hint: "Summarize and analyze documents",
    icon: FileText,
  },
];

export const getPlugin = (id: PluginId) => PLUGINS.find((p) => p.id === id) ?? PLUGINS[0]!;

export type ModelOption = {
  id: string;
  name: string;
  tagline: string;
  badge?: string;
  /** The actual OpenRouter/HuggingFace model string used by /api/chat on the server. */
  openrouterId: string;
};

export const MODELS: ModelOption[] = [
  {
    id: "ryuk-ai-ensemble",
    name: "rYuk.ai Ensemble",
    tagline: "Dynamic routing ensemble combining all reasoning, coding, and free models",
    badge: "Recommended",
    openrouterId: "ryuk/hybrid-ensemble",
  },
  {
    id: "ryuk-v1-high",
    name: "rYuk AI v1 · High",
    tagline: "Maximum reasoning, deep logic, coding & full accuracy",
    badge: "High Level",
    openrouterId: "ryuk/v1-high",
  },
  {
    id: "ryuk-v1-medium",
    name: "rYuk AI v1 · Medium",
    tagline: "Balanced intelligence, fast streaming & everyday general tasks",
    badge: "Medium Level",
    openrouterId: "ryuk/v1-medium",
  },
  {
    id: "ryuk-v1-low",
    name: "rYuk AI v1 · Low",
    tagline: "Ultra-fast response time, lightweight queries & quick answers",
    badge: "Low Level",
    openrouterId: "ryuk/v1-low",
  },
];

