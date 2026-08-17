/**
 * Professional Chat Interface Component
 * Enterprise-grade AI workspace with advanced configuration
 */

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  Copy,
  Download,
  File,
  FileDown,
  FileText,
  ImageIcon,
  Layers,
  LogOut,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Volume2,
  VolumeX,
  Wand2,
  X,
  Zap,
  Brain,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { ChatSettings, useHybridModeConfig } from "@/components/ChatSettings";
import { useBehaviorSettings } from "@/hooks/use-behavior-settings";

import logo from "@/assets/ember-logo.png";
import heroLanding from "@/assets/hero-landing.jpg";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { CollapsedSidebarStrip } from "@/components/chat/CollapsedSidebarStrip";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  useStickToBottomContext,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";

import { Shimmer } from "@/components/ai-elements/shimmer";
import { ChatSidebar, type Thread } from "@/components/chat/ChatSidebar";
import { PluginPicker } from "@/components/chat/PluginPicker";
import { MODELS, PLUGINS, getPlugin, type PluginId } from "@/components/chat/plugins";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { auth, signInWithGoogle, signUpWithEmail, signInWithEmail, logOut, onAuthStateChanged, saveUserChatSession, loadUserChatSessions, deleteUserChatSession, type User } from "@/lib/firebase";

function ScrollDetector({ onToggleHide }: { onToggleHide: (hide: boolean) => void }) {
  const { isAtBottom, scrollRef } = useStickToBottomContext();
  const lastScrollTopRef = useRef(0);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isAtBottom) {
      onToggleHide(false);
    }
  }, [isAtBottom, onToggleHide]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const st = el.scrollTop;
      const max = el.scrollHeight - el.clientHeight;
      const delta = st - lastScrollTopRef.current;

      if (st > 100 && delta > 18) {
        onToggleHide(true);
      } else if (delta < -12 || max - st < 60 || st < 50) {
        onToggleHide(false);
      }
      lastScrollTopRef.current = st;

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        onToggleHide(false);
      }, 1600);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [scrollRef, onToggleHide]);

  return null;
}


export const Route = createFileRoute("/index-professional")({
  head: () => ({
    meta: [
      { title: "rYuk.ai — Professional AI Workspace" },
      {
        name: "description",
        content:
          "Enterprise-grade AI workspace with advanced reasoning, code generation, and hybrid ensemble intelligence.",
      },
      { property: "og:title", content: "rYuk.ai — Professional AI Workspace" },
      {
        property: "og:description",
        content:
          "Professional AI workspace with hybrid ensemble technology for superior responses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfessionalChatInterface,
});

type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  pluginUsed?: PluginId;
  attachedImage?: string;
  attachedDocument?: {
    name: string;
    size: number;
    type: string;
  };
  timestamp?: number;
  userFeedback?: "positive" | "negative";
  metadata?: {
    hybrid?: boolean;
    modelsUsed?: number;
    strategy?: string;
  };
};

const PROFESSIONAL_PROMPTS = [
  {
    plugin: "code" as PluginId,
    category: "Software Development",
    icon: "💻",
    title: "Full-Stack Development",
    description: "Build production-ready React + TypeScript applications with best practices",
    gradient: "from-cyan-500/20 to-blue-500/20",
    border: "border-cyan-500/30",
  },
  {
    plugin: "chat" as PluginId,
    category: "Advanced Reasoning",
    icon: "🧠",
    title: "Complex Problem Solving",
    description: "Analyze algorithms, optimize performance, and solve technical challenges",
    gradient: "from-purple-500/20 to-pink-500/20",
    border: "border-purple-500/30",
  },
  {
    plugin: "doc" as PluginId,
    category: "Document Analysis",
    icon: "📄",
    title: "Technical Documentation",
    description: "Generate comprehensive technical specifications and architecture documents",
    gradient: "from-emerald-500/20 to-green-500/20",
    border: "border-emerald-500/30",
  },
  {
    plugin: "image" as PluginId,
    category: "Visual Content",
    icon: "🎨",
    title: "Professional Graphics",
    description: "Create high-quality visuals, diagrams, and presentation materials",
    gradient: "from-amber-500/20 to-orange-500/20",
    border: "border-amber-500/30",
  },
  {
    plugin: "web" as PluginId,
    category: "Research & Intelligence",
    icon: "🔍",
    title: "Market Research",
    description: "Conduct comprehensive research with real-time data and analysis",
    gradient: "from-sky-500/20 to-blue-500/20",
    border: "border-sky-500/30",
  },
  {
    plugin: "chat" as PluginId,
    category: "Business Strategy",
    icon: "📊",
    title: "Strategic Planning",
    description: "Develop roadmaps, analyze risks, and create executive summaries",
    gradient: "from-orange-500/20 to-red-500/20",
    border: "border-orange-500/30",
  },
];

function extractStreamContent(json: any): string | undefined {
  const choice = json.choices?.[0];
  if (!choice) return undefined;
  const delta = choice.delta;
  if (delta) {
    if (delta.reasoning || delta.reasoning_content || delta.thinking) {
      if (typeof delta.content === "string" && delta.content) return delta.content;
      return undefined;
    }
    if (typeof delta.content === "string" && delta.content) return delta.content;
    if (typeof delta.text === "string" && delta.text) return delta.text;
  }
  if (typeof choice.text === "string" && choice.text) return choice.text;
  return undefined;
}

function formatTimestamp(timestamp?: number): string {
  if (!timestamp) return "Just now";
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour === 1) return "1 hour ago";
  if (diffHour < 24) return `${diffHour} hours ago`;
  if (diffDay === 1) return "1 day ago";
  return `${diffDay} days ago`;
}

type MessageActionsProps = {
  content: string;
  timestamp?: number | undefined;
  onRegenerate: () => void;
  isPending?: boolean | undefined;
  metadata?: {
    hybrid?: boolean;
    modelsUsed?: number;
    strategy?: string;
  };
};

function AssistantMessageActions({ content, timestamp, onRegenerate, isPending, metadata }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(null);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Response copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTextToSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Text-to-speech not supported");
      return;
    }

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  const handlePositiveFeedback = () => {
    if (feedback === "positive") {
      setFeedback(null);
    } else {
      setFeedback("positive");
      toast.success("Thank you for your feedback!");
    }
  };

  const handleNegativeFeedback = () => {
    if (feedback === "negative") {
      setFeedback(null);
    } else {
      setFeedback("negative");
      toast.info("Feedback recorded");
    }
  };

  return (
    <div className="flex items-center gap-2 pt-2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
      <MessageAction
        label={copied ? "Copied" : "Copy"}
        tooltip={copied ? "Copied!" : "Copy response"}
        onClick={handleCopy}
      >
        {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
      </MessageAction>

      <MessageAction
        label={speaking ? "Stop" : "Read aloud"}
        tooltip={speaking ? "Stop reading" : "Read response aloud"}
        onClick={handleTextToSpeech}
        className={cn(speaking && "text-primary animate-pulse")}
      >
        {speaking ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
      </MessageAction>

      <MessageAction
        label="Helpful"
        tooltip="Mark as helpful"
        onClick={handlePositiveFeedback}
        className={cn(feedback === "positive" && "text-primary")}
      >
        <ThumbsUp className={cn("size-3.5", feedback === "positive" && "fill-primary")} />
      </MessageAction>

      <MessageAction
        label="Not helpful"
        tooltip="Mark as not helpful"
        onClick={handleNegativeFeedback}
        className={cn(feedback === "negative" && "text-destructive")}
      >
        <ThumbsDown className={cn("size-3.5", feedback === "negative" && "fill-destructive")} />
      </MessageAction>

      <MessageAction
        label="Regenerate"
        tooltip="Regenerate response"
        onClick={onRegenerate}
        disabled={isPending}
      >
        <RefreshCw className={cn("size-3.5", isPending && "animate-spin")} />
      </MessageAction>

      <MessageAction
        label="Export PDF"
        tooltip="Export as PDF document"
        onClick={() => exportToPdf("rYuk.ai Document", content)}
      >
        <FileDown className="size-3.5" />
      </MessageAction>

      {metadata?.hybrid && (
        <div className="ml-2 flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/30 px-2 py-0.5">
          <Zap className="size-3 text-primary" />
          <span className="text-[10px] font-medium text-primary">
            {metadata.modelsUsed} models
          </span>
        </div>
      )}

      <span className="ml-auto text-[11px] text-muted-foreground/70 font-mono">
        {formatTimestamp(timestamp)}
      </span>
    </div>
  );
}

type UserMessageActionsProps = {
  content: string;
  timestamp?: number | undefined;
  onEdit: () => void;
  onResend: () => void;
  isPending?: boolean | undefined;
};

function UserMessageActions({ content, timestamp, onEdit, onResend, isPending }: UserMessageActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Message copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-end gap-2 pt-2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
      <span className="mr-1 text-[11px] text-muted-foreground/70 font-mono">
        {formatTimestamp(timestamp)}
      </span>

      <MessageAction
        label="Resend"
        tooltip="Resend message"
        onClick={onResend}
        disabled={isPending}
      >
        <RotateCcw className={cn("size-3.5", isPending && "animate-spin")} />
      </MessageAction>

      <MessageAction
        label="Edit"
        tooltip="Edit message"
        onClick={onEdit}
        disabled={isPending}
      >
        <Pencil className="size-3.5" />
      </MessageAction>

      <MessageAction
        label={copied ? "Copied" : "Copy"}
        tooltip={copied ? "Copied!" : "Copy message"}
        onClick={handleCopy}
      >
        {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
      </MessageAction>
    </div>
  );
}

export type AttachedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
  content?: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatInlineMarkdown(str: string): string {
  return str
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  let html = "";
  let inList = false;
  let inCode = false;
  let codeBuf = "";

  const closeList = () => {
    if (inList) {
      html += "</ul>\n";
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCode) {
        html += `<pre><code>${escapeHtml(codeBuf.trim())}</code></pre>\n`;
        inCode = false;
        codeBuf = "";
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeBuf += line + "\n";
      continue;
    }

    if (trimmed.startsWith("# ")) {
      closeList();
      html += `<h1>${formatInlineMarkdown(trimmed.slice(2))}</h1>\n`;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      closeList();
      html += `<h2>${formatInlineMarkdown(trimmed.slice(3))}</h2>\n`;
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) {
        inList = true;
        html += "<ul>\n";
      }
      html += `<li>${formatInlineMarkdown(trimmed.slice(2))}</li>\n`;
      continue;
    } else {
      closeList();
    }

    if (trimmed) {
      html += `<p>${formatInlineMarkdown(trimmed)}</p>\n`;
    }
  }

  closeList();
  return html;
}

async function exportToPdf(title: string, textContent: string) {
  const toastId = toast.loading("Generating PDF document...");

  try {
    const html2pdfModule = await import("html2pdf.js");
    const html2pdf = html2pdfModule.default || html2pdfModule;

    const formattedBody = markdownToHtml(textContent);
    const innerContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #0f172a; line-height: 1.6;">
        <style>
          h1, h2, h3 { color: #0f172a; font-weight: 700; margin-top: 1.4em; margin-bottom: 0.5em; }
          h1 { font-size: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
          h2 { font-size: 16px; }
          p { margin-bottom: 1em; font-size: 13px; }
          code { background: #f1f5f9; color: #ea580c; padding: 2px 5px; border-radius: 4px; }
          pre { background: #0f172a; color: #f8fafc; padding: 14px; border-radius: 6px; }
        </style>
        <div>${formattedBody}</div>
      </div>
    `;

    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.width = "794px";
    container.innerHTML = innerContent;
    document.body.appendChild(container);

    const safeFilename = `${title.replace(/[^a-z0-9]/gi, "_")}.pdf`;

    await html2pdf()
      .set({
        margin: [8, 8, 8, 8],
        filename: safeFilename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(container)
      .save();

    document.body.removeChild(container);
    toast.dismiss(toastId);
    toast.success(`PDF exported: ${safeFilename}`);
  } catch (err) {
    console.error("PDF export error:", err);
    toast.dismiss(toastId);
    toast.error("PDF export failed");
  }
}

function ProfessionalChatInterface() {
  // Core state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<Thread[]>(() => {
    try {
      const saved = localStorage.getItem("ryuk_conversations");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [activeConversationId, setActiveConversationId] = useState(() => {
    try {
      return localStorage.getItem("ryuk_active_conversation") || "";
    } catch { return ""; }
  });

  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, ConversationMessage[]>>(() => {
    try {
      const saved = localStorage.getItem("ryuk_messages");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [activePlugin, setActivePlugin] = useState<PluginId>("chat");
  const [selectedModel, setSelectedModel] = useState(MODELS[0]!.id);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // AI Configuration hooks
  const { provider, personality } = useBehaviorSettings();
  const { hybridConfig } = useHybridModeConfig();

  // ... (rest of the component implementation continues)
  // This is a template showing the professional structure
  // The full implementation would continue with all the handlers and rendering

  return <div>Professional Chat Interface Implementation...</div>;
}
