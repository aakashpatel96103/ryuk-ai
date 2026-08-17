import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  Download,
  File,
  FileCode,
  FileDown,
  FileText,
  ImageIcon,
  Layers,
  LogOut,
  PanelLeftOpen,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Volume2,
  VolumeX,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AIConfigurationPanel, useEnsembleConfiguration } from "@/components/AIConfigurationPanel";
import { useIntelligenceSettings } from "@/hooks/use-intelligence-settings";

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

function ComposerScrollDetector({ onToggleHide }: { onToggleHide: (hide: boolean) => void }) {
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

      // Only hide if scrolled past 100px and scrolling down with significant delta
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


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "rYuk.ai — Professional AI Intelligence Workspace" },
      {
        name: "description",
        content:
          "Enterprise-grade AI workspace with ensemble compute, multi-model intelligence, and specialized capabilities for code, research, and content generation.",
      },
      { property: "og:title", content: "rYuk.ai — Professional AI Intelligence Workspace" },
      {
        property: "og:description",
        content:
          "Professional AI workspace featuring ensemble compute technology, multi-framework intelligence, and enterprise-grade performance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatPage,
});

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  plugin?: PluginId;
  image?: string;
  attachedFile?: {
    name: string;
    size: number;
    type: string;
  };
  createdAt?: number;
  feedback?: "like" | "dislike";
};

const PROFESSIONAL_PROMPTS = [
  {
    plugin: "code" as PluginId,
    iconLabel: "Software Engineering",
    category: "Development",
    cardClass: "card-code-gradient",
    badgeBg: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30",
    text: "Architect a production-grade React application with TypeScript and state management",
  },
  {
    plugin: "chat" as PluginId,
    iconLabel: "Advanced Analytics",
    category: "Problem Solving",
    cardClass: "card-reasoning-gradient",
    badgeBg: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
    text: "Optimize algorithm performance and analyze distributed system architecture",
  },
  {
    plugin: "doc" as PluginId,
    iconLabel: "Technical Documentation",
    category: "Documentation",
    cardClass: "card-pdf-gradient",
    badgeBg: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    text: "Generate comprehensive technical specification with architecture diagrams",
  },
  {
    plugin: "image" as PluginId,
    iconLabel: "Visual Content",
    category: "Creative Studio",
    cardClass: "card-visuals-gradient",
    badgeBg: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    text: "Create professional presentation graphics and technical illustrations",
  },
  {
    plugin: "web" as PluginId,
    iconLabel: "Market Intelligence",
    category: "Research",
    cardClass: "card-research-gradient",
    badgeBg: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
    text: "Conduct comprehensive market analysis with competitive intelligence insights",
  },
  {
    plugin: "chat" as PluginId,
    iconLabel: "Strategic Planning",
    category: "Business Strategy",
    cardClass: "card-write-gradient",
    badgeBg: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
    text: "Develop executive roadmap with risk assessment and success metrics",
  },
];

function extractPiece(json: any): string | undefined {
  const choice = json.choices?.[0];
  if (!choice) {
    if (typeof json.content === "string" && json.content) return json.content;
    if (typeof json.text === "string" && json.text) return json.text;
    return undefined;
  }
  const delta = choice.delta;
  if (delta) {
    // Skip reasoning/thinking tokens — these are internal chain-of-thought, not user-facing output
    if (delta.reasoning || delta.reasoning_content || delta.thinking) {
      // Only return if there's ALSO regular content alongside reasoning
      if (typeof delta.content === "string" && delta.content) return delta.content;
      return undefined; // suppress thinking tokens from showing in chat
    }
    if (typeof delta.content === "string" && delta.content) return delta.content;
    if (typeof delta.text === "string" && delta.text) return delta.text;
  }
  if (choice.message?.content && typeof choice.message.content === "string") return choice.message.content;
  if (typeof choice.text === "string" && choice.text) return choice.text;
  return undefined;
}

function formatRelativeTime(timestamp?: number): string {
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

type ChatMessageActionsProps = {
  text: string;
  createdAt?: number | undefined;
  onRegenerate: () => void;
  isPending?: boolean | undefined;
};

function ChatMessageActions({ text, createdAt, onRegenerate, isPending }: ChatMessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [feedback, setFeedback] = useState<"like" | "dislike" | null>(null);

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Audio synthesis unavailable");
      return;
    }

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      toast.info("Playback stopped");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
    toast.info("Reading response");
  };

  const handleLike = () => {
    if (feedback === "like") {
      setFeedback(null);
    } else {
      setFeedback("like");
      toast.success("Feedback received");
    }
  };

  const handleDislike = () => {
    if (feedback === "dislike") {
      setFeedback(null);
    } else {
      setFeedback("dislike");
      toast.info("Feedback noted");
    }
  };

  return (
    <div className="flex items-center gap-1.5 pt-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
      <MessageAction
        label={copied ? "Copied" : "Copy"}
        tooltip={copied ? "Copied!" : "Copy"}
        onClick={handleCopy}
      >
        {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
      </MessageAction>

      <MessageAction
        label={speaking ? "Stop reading" : "Read aloud"}
        tooltip={speaking ? "Stop reading" : "Read aloud"}
        onClick={handleSpeak}
        className={cn(speaking && "text-primary animate-pulse")}
      >
        {speaking ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
      </MessageAction>

      <MessageAction
        label="Helpful"
        tooltip="Mark as helpful"
        onClick={handleLike}
        className={cn(feedback === "like" && "text-primary")}
      >
        <ThumbsUp className={cn("size-3.5", feedback === "like" && "fill-primary text-primary")} />
      </MessageAction>

      <MessageAction
        label="Not helpful"
        tooltip="Mark as not helpful"
        onClick={handleDislike}
        className={cn(feedback === "dislike" && "text-destructive")}
      >
        <ThumbsDown className={cn("size-3.5", feedback === "dislike" && "fill-destructive text-destructive")} />
      </MessageAction>

      <MessageAction
        label="Regenerate"
        tooltip="Regenerate"
        onClick={onRegenerate}
        disabled={isPending}
      >
        <RefreshCw className={cn("size-3.5", isPending && "animate-spin")} />
      </MessageAction>

      <MessageAction
        label="Make & Download PDF"
        tooltip="Make & Download PDF"
        onClick={() => exportToPdf("rYuk.ai PDF Document", text)}
      >
        <FileDown className="size-3.5" />
      </MessageAction>

      <span className="ml-2 text-[11px] text-muted-foreground/70 select-none font-mono">
        {formatRelativeTime(createdAt)}
      </span>
    </div>
  );
}

type UserMessageActionsProps = {
  text: string;
  createdAt?: number | undefined;
  onEdit: () => void;
  onResend: () => void;
  isPending?: boolean | undefined;
};

function UserMessageActions({ text, createdAt, onEdit, onResend, isPending }: UserMessageActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Message copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-end gap-1.5 pt-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
      <span className="mr-1 text-[11px] text-muted-foreground/70 select-none font-mono">
        {formatRelativeTime(createdAt)}
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

function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "txt";
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
  let inTable = false;

  const closeList = () => {
    if (inList) {
      html += "</ul>\n";
      inList = false;
    }
  };

  const closeTable = () => {
    if (inTable) {
      html += "</tbody></table></div>\n";
      inTable = false;
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
        closeTable();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeBuf += line + "\n";
      continue;
    }

    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      closeList();
      closeTable();
      html += "<hr/>\n";
      continue;
    }

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      closeList();
      const cells = trimmed
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());

      if (cells.every((c) => /^:?-+:?$/.test(c))) {
        continue;
      }

      if (!inTable) {
        inTable = true;
        html += '<div class="table-container"><table><thead><tr>';
        cells.forEach((c) => (html += `<th>${formatInlineMarkdown(c)}</th>`));
        html += "</tr></thead><tbody>\n";
      } else {
        html += "<tr>";
        cells.forEach((c) => (html += `<td>${formatInlineMarkdown(c)}</td>`));
        html += "</tr>\n";
      }
      continue;
    } else {
      closeTable();
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
    if (trimmed.startsWith("### ")) {
      closeList();
      html += `<h3>${formatInlineMarkdown(trimmed.slice(4))}</h3>\n`;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      closeList();
      html += `<blockquote>${formatInlineMarkdown(trimmed.slice(2))}</blockquote>\n`;
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
  closeTable();
  return html;
}

async function exportToPdf(title: string, textContent: string) {
  const toastId = toast.loading("Generating direct PDF file...");

  try {
    const html2pdfModule = await import("html2pdf.js");
    const html2pdf = html2pdfModule.default || html2pdfModule;

    const htmlBlockMatch = textContent.match(/```html\s*([\s\S]*?)\s*```/i);
    let innerContent = "";

    if (htmlBlockMatch || textContent.includes("<!DOCTYPE html>")) {
      innerContent = htmlBlockMatch ? htmlBlockMatch[1]! : textContent;
    } else {
      const formattedBody = markdownToHtml(textContent);
      innerContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #0f172a; background: #ffffff; line-height: 1.6;">
          <style>
            h1, h2, h3, h4 { color: #0f172a; font-weight: 700; margin-top: 1.4em; margin-bottom: 0.5em; }
            h1 { font-size: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
            h2 { font-size: 16px; border-left: 4px solid #ea580c; padding-left: 8px; }
            h3 { font-size: 14px; }
            p { margin-bottom: 1em; font-size: 13px; color: #334155; }
            ul, ol { margin-bottom: 1em; padding-left: 18px; font-size: 13px; color: #334155; }
            li { margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin: 1.2em 0; font-size: 12px; page-break-inside: avoid; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
            th { background-color: #f8fafc; font-weight: 600; color: #0f172a; }
            tr:nth-child(even) { background-color: #f8fafc; }
            blockquote { border-left: 4px solid #ea580c; padding: 8px 14px; margin: 1em 0; background: #fff7ed; color: #9a3412; font-style: italic; page-break-inside: avoid; }
            pre { background: #0f172a; color: #f8fafc; padding: 14px; border-radius: 6px; font-family: monospace; font-size: 11.5px; page-break-inside: avoid; }
            code { background: #f1f5f9; color: #ea580c; padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 11.5px; }
          </style>
          <div>${formattedBody}</div>
        </div>
      `;
    }

    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "-9999px";
    container.style.width = "794px";
    container.innerHTML = innerContent;
    document.body.appendChild(container);

    const h1Match = textContent.match(/^#\s+(.+)$/m);
    const docTitle = h1Match ? h1Match[1]!.trim() : (title || "Executive Document");
    const safeFilename = `${docTitle.replace(/[^a-z0-9]/gi, "_")}.pdf`;

    const opt = {
      margin: [8, 8, 8, 8] as [number, number, number, number],
      filename: safeFilename,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
    };

    await html2pdf().set(opt).from(container).save();
    document.body.removeChild(container);

    toast.dismiss(toastId);
    toast.success(`Direct PDF downloaded: ${safeFilename}`);
  } catch (err) {
    console.error("Direct PDF download error, launching print fallback:", err);
    toast.dismiss(toastId);
    openPrintFallback(title, textContent);
  }
}

function openPrintFallback(title: string, textContent: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Please allow popups to download PDF");
    return;
  }
  const htmlBlockMatch = textContent.match(/```html\s*([\s\S]*?)\s*```/i);
  let rawHtml = htmlBlockMatch ? htmlBlockMatch[1]! : textContent;
  if (!rawHtml.includes("<!DOCTYPE html>")) {
    const formattedHtml = markdownToHtml(textContent);
    rawHtml = `<!DOCTYPE html><html><head><title>${title}</title></head><body>${formattedHtml}</body></html>`;
  }
  printWindow.document.write(rawHtml);
  printWindow.document.close();
}

function getFileNameForLanguage(lang: string): string {
  const l = lang.toLowerCase().trim();
  if (l.includes("python") || l === "py") return "script.py";
  if (l.includes("javascript") || l === "js") return "script.js";
  if (l.includes("typescript") || l === "ts" || l === "tsx" || l === "jsx") return "component.tsx";
  if (l.includes("html")) return "index.html";
  if (l.includes("css")) return "style.css";
  if (l.includes("java")) return "Main.java";
  if (l.includes("c++") || l === "cpp") return "main.cpp";
  if (l === "c") return "main.c";
  if (l.includes("csharp") || l === "cs") return "Program.cs";
  if (l.includes("php")) return "index.php";
  if (l.includes("sql")) return "query.sql";
  if (l.includes("json")) return "data.json";
  if (l.includes("xml")) return "document.xml";
  if (l.includes("yaml") || l === "yml") return "config.yaml";
  if (l.includes("bash") || l === "sh" || l === "zsh") return "script.sh";
  if (l.includes("rust") || l === "rs") return "main.rs";
  if (l.includes("go") || l === "golang") return "main.go";
  if (l.includes("ruby") || l === "rb") return "app.rb";
  if (l.includes("markdown") || l === "md") return "notes.md";
  return "file.txt";
}

function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [threads, setThreads] = useState<Thread[]>(() => {
    try {
      const saved = localStorage.getItem("sidank_threads");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [activeThread, setActiveThread] = useState(() => {
    try {
      return localStorage.getItem("sidank_active_thread") || "";
    } catch { return ""; }
  });
  const [messagesByThread, setMessagesByThread] = useState<Record<string, ChatMessage[]>>(() => {
    try {
      const saved = localStorage.getItem("sidank_messages");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [plugin, setPlugin] = useState<PluginId>("chat");
  const [model, setModel] = useState(MODELS[0]!.id);
  const [pending, setPending] = useState(false);
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // AI Intelligence and Ensemble Configuration
  const { provider, personality } = useIntelligenceSettings();
  const { ensembleConfig } = useEnsembleConfiguration();

  const handleGoogleSignIn = useCallback(async () => {
    try {
      const u = await signInWithGoogle();
      if (u) {
        toast.success(`Welcome ${u.displayName || u.email}!`);
      }
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      if (firebaseError?.code === "auth/configuration-not-found") {
        toast.error("Firebase Google Auth setup needed", {
          description: "Please enable Google Sign-In in Firebase Console -> Authentication -> Sign-in method.",
          duration: 8000,
        });
      } else {
        toast.error("Sign in failed", { description: firebaseError?.message || String(err) });
      }
    }
  }, []);

  // Top Right Transparency Mode State
  const [transparencyMode, setTransparencyMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("sidank_transparency_mode") === "true";
      } catch {
        return false;
      }
    }
    return false;
  });

  useEffect(() => {
    try {
      if (transparencyMode) {
        localStorage.setItem("sidank_transparency_mode", "true");
      } else {
        localStorage.setItem("sidank_transparency_mode", "false");
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [transparencyMode]);

  // Delete chat thread helper
  const handleDeleteThread = useCallback(
    async (threadId: string) => {
      if (!threadId) return;

      const confirmDelete = window.confirm("Are you sure you want to delete this chat session? This action cannot be undone.");
      if (!confirmDelete) return;

      // 1. Instantly update UI state
      setThreads((prev) => prev.filter((t) => t?.id !== threadId));
      setMessagesByThread((prev) => {
        const next = { ...prev };
        delete next[threadId];
        return next;
      });
      if (activeThread === threadId) {
        setActiveThread("");
        try {
          localStorage.removeItem("sidank_active_thread");
        } catch {
          // Ignore
        }
      }
      toast.success("Chat thread deleted");

      // 2. Delete from Firestore in background
      if (user) {
        try {
          await deleteUserChatSession(user.uid, threadId);
        } catch (err) {
          console.error("Error deleting session from Firestore:", err);
        }
      }
    },
    [user, activeThread],
  );

  // Save activeThread to localStorage whenever it changes
  useEffect(() => {
    try {
      if (activeThread) {
        localStorage.setItem("sidank_active_thread", activeThread);
      } else {
        localStorage.removeItem("sidank_active_thread");
      }
    } catch {
      // Ignore
    }
  }, [activeThread]);

  // Persist threads & messages to localStorage on changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem("sidank_threads", JSON.stringify(threads));
        localStorage.setItem("sidank_messages", JSON.stringify(messagesByThread));
      } catch { /* quota exceeded or private mode — ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [threads, messagesByThread]);

  // Auto-heal activeThread if it points to a non-existent or deleted thread
  // Guard with authLoading so we don't clear before Firestore has a chance to load
  useEffect(() => {
    if (authLoading) return; // Don't heal during auth load — Firestore may not have synced yet
    if (activeThread && !messagesByThread[activeThread] && !threads.some((t) => t?.id === activeThread)) {
      setActiveThread("");
      try {
        localStorage.removeItem("sidank_active_thread");
      } catch {
        // Ignore
      }
    }
  }, [activeThread, messagesByThread, threads, authLoading]);

  // Auth listener: load chats from Firestore on login, restore active thread on refresh
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Logged in — load chat history from Firestore into memory
          const cloudThreads = await loadUserChatSessions(currentUser.uid);
          if (cloudThreads && cloudThreads.length > 0) {
            const loadedThreads: Thread[] = [];
            const loadedMessages: Record<string, ChatMessage[]> = {};
            cloudThreads.forEach((t: any) => {
              if (t && t.id) {
                loadedThreads.push({ id: t.id, title: t.title || "Chat", group: "Cloud Saved", plugin: t.plugin });
                loadedMessages[t.id] = Array.isArray(t.messages) ? t.messages : [];
              }
            });
            setThreads(loadedThreads);
            setMessagesByThread(loadedMessages);

            // Restore active thread on page refresh
            try {
              const savedThreadId = localStorage.getItem("sidank_active_thread");
              if (savedThreadId && loadedMessages[savedThreadId]) {
                setActiveThread(savedThreadId);
              }
            } catch {
              // Ignore
            }
          }
        } catch (err) {
          console.error("Failed to load user chat sessions:", err);
        }
      } else {
        // Logged out — clear all chat state
        setThreads([]);
        setMessagesByThread({});
        setActiveThread("");
        try {
          localStorage.removeItem("sidank_active_thread");
        } catch {
          // Ignore
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const messages = useMemo(
    () => (activeThread ? messagesByThread[activeThread] ?? [] : []),
    [activeThread, messagesByThread],
  );
  const hasMessages = messages.length > 0;

  const detectedPlugin = useMemo<PluginId>(() => {
    const trimmed = text.trim().toLowerCase();
    const match = PLUGINS.find(
      (p) => p.id !== "chat" && trimmed.startsWith(p.command),
    );
    if (match) return match.id;

    // Intelligent image intent detection
    const imagePatterns = [
      "generate image", "create image", "make image",
      "draw a", "draw an", "draw me", "draw the",
      "generate a picture", "create a picture", "make a picture",
      "generate photo", "create photo", "make photo",
      "create artwork", "generate artwork",
      "reference image", "academic image", "academic generation",
      "generate a logo", "create a logo", "design a logo",
      "create a poster", "generate a poster",
      "create an illustration", "generate an illustration",
      "visualize", "make a diagram image",
    ];
    if (imagePatterns.some((p) => trimmed.includes(p))) {
      return "image";
    }

    return plugin;
  }, [text, plugin]);

  const handleFilesAdded = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const reader = new FileReader();

      reader.onload = (e) => {
        const result = e.target?.result;
        const newAttachedFile: AttachedFile = {
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          ...(isImage && typeof result === "string" ? { dataUrl: result } : {}),
          ...(!isImage && typeof result === "string" ? { content: result } : {}),
        };

        setAttachedFiles((prev) => [...prev, newAttachedFile]);
      };

      if (isImage) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });

    const hasImage = Array.from(files).some((f) => f.type.startsWith("image/"));
    if (hasImage) {
      setPlugin("chat");
    } else {
      setPlugin("doc");
    }
    toast.success(`Attached ${files.length} file(s) for AI reading`);
  }, []);



  const generateImage = useCallback(async (prompt: string, usePlugin: PluginId, targetThreadId: string, threadTitle: string) => {
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);

      setMessagesByThread((prev) => {
        const updated = [
          ...(prev[targetThreadId] ?? []),
          {
            id: crypto.randomUUID(),
            role: "assistant" as const,
            plugin: usePlugin,
            text: "Here's what I generated from your prompt.",
            image: `data:${data.mediaType};base64,${data.b64}`,
            createdAt: Date.now(),
          },
        ];
        // Save the complete conversation (including AI response) to Firestore
        if (user) {
          void saveUserChatSession(user.uid, targetThreadId, threadTitle, usePlugin, updated);
        }
        return { ...prev, [targetThreadId]: updated };
      });
    } catch (err) {
      setMessagesByThread((prev) => ({
        ...prev,
        [targetThreadId]: [
          ...(prev[targetThreadId] ?? []),
          {
            id: crypto.randomUUID(),
            role: "assistant",
            plugin: usePlugin,
            text: `Image generation failed: ${err instanceof Error ? err.message : String(err)}`,
            createdAt: Date.now(),
          },
        ],
      }));
    } finally {
      setPending(false);
    }
  }, [user]);

  const streamChat = useCallback(
    async (
      usePlugin: PluginId,
      priorMessages: ChatMessage[],
      openrouterId: string | undefined,
      targetThreadId: string,
      threadTitle: string,
    ) => {
      // Cancel any in-flight stream to prevent ghost updates
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const assistantId = crypto.randomUUID();
      const apiMessages = priorMessages
        .filter((m) => m.text || m.image) // skip empty placeholder messages
        .map((m) => {
          if (m.image) {
            return {
              role: m.role,
              content: [
                { type: "text", text: m.text },
                { type: "image_url", image_url: { url: m.image } },
              ],
            };
          }
          return { role: m.role, content: m.text };
        });

      setMessagesByThread((prev) => ({
        ...prev,
        [targetThreadId]: [
          ...(prev[targetThreadId] ?? []),
          { id: assistantId, role: "assistant", ...(usePlugin === "chat" ? {} : { plugin: usePlugin }), text: "", createdAt: Date.now() },
        ],
      }));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            model: openrouterId,
            plugin: usePlugin,
            behavior: {
              provider: provider,
              personality: personality
            },
            hybridMode: ensembleConfig
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || `Request failed (${res.status})`);
        }

        let full = "";
        const contentType = res.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          const json = await res.json().catch(() => null);
          if (json?.error) {
            throw new Error(typeof json.error === "string" ? json.error : json.error.message || "Request failed");
          }
          const textContent = extractPiece(json) || json?.choices?.[0]?.message?.content || json?.choices?.[0]?.text || json?.content || "";
          full = textContent;
          setMessagesByThread((prev) => ({
            ...prev,
            [targetThreadId]: (prev[targetThreadId] ?? []).map((m) =>
              m.id === assistantId ? { ...m, text: full } : m,
            ),
          }));
        } else {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          let pendingUpdate = false;
          let rafId: number | null = null;

          const flushUpdate = () => {
            if (!pendingUpdate) return;
            pendingUpdate = false;
            const snapshot = full;
            setMessagesByThread((prev) => ({
              ...prev,
              [targetThreadId]: (prev[targetThreadId] ?? []).map((m) =>
                m.id === assistantId ? { ...m, text: snapshot } : m,
              ),
            }));
          };

          const scheduleUpdate = () => {
            pendingUpdate = true;
            if (rafId === null) {
              rafId = requestAnimationFrame(() => {
                rafId = null;
                flushUpdate();
              });
            }
          };

          while (!controller.signal.aborted) {
            const { done, value: chunk } = await reader.read();
            if (done) break;
            buf += decoder.decode(chunk, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const payload = trimmed.slice(5).trim();
              if (payload === "[DONE]") continue;
              try {
                const json = JSON.parse(payload);
                if (json.error) {
                  throw new Error(typeof json.error === "string" ? json.error : json.error.message || "Stream error");
                }
                const piece = extractPiece(json);
                if (piece) {
                  full += piece;
                  scheduleUpdate();
                }
              } catch (e) {
                if (e instanceof Error && (e.message.includes("credit") || e.message.includes("rate") || e.message.includes("Stream error"))) {
                  throw e;
                }
                /* partial chunk, wait for more data */
              }
            }
          }
          // Flush any remaining data in the SSE buffer
          if (buf.trim()) {
            const trimmed = buf.trim();
            if (trimmed.startsWith("data:")) {
              const payload = trimmed.slice(5).trim();
              if (payload !== "[DONE]") {
                try {
                  const json = JSON.parse(payload);
                  const piece = extractPiece(json);
                  if (piece) {
                    full += piece;
                  }
                } catch { /* incomplete */ }
              }
            }
          }

          if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
          flushUpdate();
        }

        // Save the complete conversation (including AI response) to Firestore
        if (user) {
          setMessagesByThread((prev) => {
            const finalMessages = prev[targetThreadId] ?? [];
            void saveUserChatSession(user.uid, targetThreadId, threadTitle, usePlugin !== "chat" ? usePlugin : undefined, finalMessages);
            return prev;
          });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return; // Stream was cancelled intentionally, don't show error
        }
        setMessagesByThread((prev) => {
          let errMsg = err instanceof Error ? err.message : String(err);
          let message = `Sorry, that request failed: ${errMsg}`;
          const errLower = errMsg.toLowerCase();
          if (
            errLower.includes("rate limit") ||
            errLower.includes("free-models-per-day") ||
            errLower.includes("429") ||
            errLower.includes("failed to respond") ||
            errLower.includes("insufficient credits") ||
            errLower.includes("402")
          ) {
            message = "⚠️ **Daily Free Quota Limit Reached**: The upstream free tier allowance has been temporarily reached for today. It will automatically reset in 24 hours.";
          } else if (errLower.includes("fetch") || errLower.includes("network")) {
            message = "Sorry, network request failed. Please verify your connection or reload the page.";
          }
          const list = prev[targetThreadId] ?? [];
          const existing = list.find((m) => m.id === assistantId);
          if (existing) {
            return {
              ...prev,
              [targetThreadId]: list.map((m) => (m.id === assistantId ? { ...m, text: message } : m)),
            };
          }
          return {
            ...prev,
            [targetThreadId]: [
              ...list,
              { id: assistantId, role: "assistant", ...(usePlugin === "chat" ? {} : { plugin: usePlugin }), text: message },
            ],
          };
        });
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        setPending(false);
      }
    },
    [user],
  );

  const send = useCallback(
    (raw: string, usePlugin: PluginId) => {
      if (!user) {
        toast.error("Please sign in to use rYuk.ai", { description: "Login required to chat with AI models." });
        return;
      }
      const value = raw.trim();
      if (!value && attachedFiles.length === 0) return;

      const firstImg = attachedFiles.find((f) => f.dataUrl);
      const firstDoc = attachedFiles.find((f) => f.content || !f.dataUrl);

      // Clean, human-readable text for UI rendering (no 3MB raw base64 string in DOM!)
      let uiText = value;
      if (!uiText && attachedFiles.length > 0) {
        uiText = `Please analyze ${attachedFiles.map((f) => f.name).join(", ")}`;
      }

      // Fast, lightweight payload for API (truncate giant files > 20KB)
      const apiFileBlocks = attachedFiles.map((f) => {
        if (f.dataUrl) {
          return `[ATTACHED IMAGE: ${f.name} (${formatFileSize(f.size)})]\n(Image attached for vision analysis)`;
        }
        const ext = getFileExtension(f.name);
        const safeContent = f.content ? (f.content.length > 20000 ? `${f.content.slice(0, 20000)}\n...[Truncated for performance]` : f.content) : "Binary file payload";
        return `[ATTACHED FILE: ${f.name} (${formatFileSize(f.size)})]\n\`\`\`${ext}\n${safeContent}\n\`\`\``;
      });

      const promptPayload = apiFileBlocks.length > 0
        ? `${apiFileBlocks.join("\n\n")}\n\n${value || "Please read and analyze the attached file(s)."}`
        : value;

      let currentThreadId = activeThread;
      let displayTitle = "";
      if (!currentThreadId) {
        currentThreadId = crypto.randomUUID();
        displayTitle = value ? (value.length > 32 ? value.slice(0, 32) + "..." : value) : (attachedFiles[0]?.name ?? "File Analysis");
        const newThread: Thread = {
          id: currentThreadId,
          title: displayTitle,
          group: "Today",
          plugin: usePlugin !== "chat" ? usePlugin : undefined,
        };
        setThreads((prev) => [newThread, ...prev]);
        setActiveThread(currentThreadId);
      } else {
        displayTitle = threads.find((t) => t?.id === currentThreadId)?.title || "Chat";
      }

      const userId = crypto.randomUUID();
      const priorMessages = messagesByThread[currentThreadId] ?? [];
      const updatedMessages: ChatMessage[] = [
        ...priorMessages,
        {
          id: userId,
          role: "user" as const,
          text: uiText,
          createdAt: Date.now(),
          ...(usePlugin === "chat" ? {} : { plugin: usePlugin }),
          ...(firstImg ? { image: firstImg.dataUrl } : {}),
          ...(firstDoc && !firstImg ? { attachedFile: { name: firstDoc.name, size: firstDoc.size, type: firstDoc.type } } : {}),
        },
      ];

      setMessagesByThread((prev) => ({
        ...prev,
        [currentThreadId]: updatedMessages,
      }));
      setText("");
      setAttachedFiles([]);
      setPending(true);

      if (user && currentThreadId) {
        void saveUserChatSession(user.uid, currentThreadId, displayTitle, usePlugin !== "chat" ? usePlugin : undefined, updatedMessages);
      }

      if (usePlugin === "image") {
        void generateImage(promptPayload, usePlugin, currentThreadId, displayTitle);
      } else {
        const openrouterId = MODELS.find((m) => m.id === model)?.openrouterId;
        void streamChat(usePlugin, updatedMessages, openrouterId, currentThreadId, displayTitle);
      }
    },
    [activeThread, attachedFiles, messagesByThread, model, user, generateImage, streamChat],
  );

  const handleRegenerate = useCallback(
    (msgId: string) => {
      if (!activeThread) return;
      const list = messagesByThread[activeThread] ?? [];
      const idx = list.findIndex((m) => m.id === msgId);
      if (idx === -1) return;

      let promptText = "";
      let usePlugin: PluginId = "chat";
      for (let i = idx - 1; i >= 0; i--) {
        const item = list[i];
        if (item && item.role === "user") {
          promptText = item.text;
          usePlugin = item.plugin ?? "chat";
          break;
        }
      }

      if (!promptText) return;

      const priorHistory = list.slice(0, idx);
      setMessagesByThread((prev) => ({
        ...prev,
        [activeThread]: priorHistory,
      }));
      setPending(true);
      toast.info("Regenerating response...");

      const threadTitle = threads.find((t) => t?.id === activeThread)?.title || "Chat";
      if (usePlugin === "image") {
        void generateImage(promptText, usePlugin, activeThread, threadTitle);
      } else {
        const openrouterId = MODELS.find((m) => m.id === model)?.openrouterId;
        void streamChat(usePlugin, priorHistory, openrouterId, activeThread, threadTitle);
      }
    },
    [activeThread, generateImage, messagesByThread, model, streamChat, threads],
  );

  const handleResendUserMsg = useCallback(
    (msgId: string) => {
      if (!activeThread) return;
      const list = messagesByThread[activeThread] ?? [];
      const idx = list.findIndex((m) => m.id === msgId);
      if (idx === -1) return;

      const userMsg = list[idx]!;
      const usePlugin = userMsg.plugin ?? "chat";

      const priorHistory = list.slice(0, idx + 1);
      setMessagesByThread((prev) => ({
        ...prev,
        [activeThread]: priorHistory,
      }));
      setPending(true);
      toast.info("Resending prompt...");

      const threadTitle = threads.find((t) => t?.id === activeThread)?.title || "Chat";
      if (usePlugin === "image") {
        void generateImage(userMsg.text, usePlugin, activeThread, threadTitle);
      } else {
        const openrouterId = MODELS.find((m) => m.id === model)?.openrouterId;
        void streamChat(usePlugin, priorHistory, openrouterId, activeThread, threadTitle);
      }
    },
    [activeThread, generateImage, messagesByThread, model, streamChat, threads],
  );

  const handleSaveEdit = useCallback(
    (msgId: string, newText: string) => {
      if (!activeThread || !newText.trim()) return;
      const list = messagesByThread[activeThread] ?? [];
      const idx = list.findIndex((m) => m.id === msgId);
      if (idx === -1) return;

      const usePlugin = list[idx]?.plugin ?? "chat";
      const updatedUserMsg: ChatMessage = {
        ...list[idx]!,
        text: newText.trim(),
        createdAt: Date.now(),
      };
      const priorHistory = [...list.slice(0, idx), updatedUserMsg];

      setMessagesByThread((prev) => ({
        ...prev,
        [activeThread]: priorHistory,
      }));
      setEditingId(null);
      setPending(true);
      toast.info("Prompt updated, re-generating...");

      const threadTitle = threads.find((t) => t?.id === activeThread)?.title || "Chat";
      if (usePlugin === "image") {
        void generateImage(newText.trim(), usePlugin, activeThread, threadTitle);
      } else {
        const openrouterId = MODELS.find((m) => m.id === model)?.openrouterId;
        void streamChat(usePlugin, priorHistory, openrouterId, activeThread, threadTitle);
      }
    },
    [activeThread, generateImage, messagesByThread, model, streamChat, threads],
  );

  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "register">("register");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isComposerHidden, setIsComposerHidden] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerHeight - e.clientY < 110) {
        setIsComposerHidden(false);
      }
    };
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch && window.innerHeight - touch.clientY < 140) {
        setIsComposerHidden(false);
      }
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchstart", handleTouchStart);
    };
  }, []);

  // Global Code Block & Table Smart File Downloader (.py, .js, .html, .css, .java, .txt)
  useEffect(() => {
    const handleGlobalDownloadClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const downloadBtn = target.closest(
        '[data-streamdown="code-block-download-button"], [data-streamdown="table-download-button"], button[aria-label*="download" i], button[title*="download" i]'
      );

      if (!downloadBtn) return;

      const codeBlock = downloadBtn.closest('figure, [data-streamdown="code-block"], [data-streamdown="code"], pre');
      if (!codeBlock) return;

      e.preventDefault();
      e.stopPropagation();

      const preEl = codeBlock.querySelector("pre, code");
      const codeText = preEl ? preEl.textContent || "" : codeBlock.textContent || "";
      if (!codeText.trim()) return;

      let fileName = "";
      
      const prevEl = codeBlock.previousElementSibling;
      if (prevEl && (prevEl.matches("p, code, span") || prevEl.querySelector("code"))) {
        const tagText = prevEl.textContent?.trim() || "";
        if (tagText.includes(".") && !tagText.includes(" ")) {
          fileName = tagText;
        }
      }

      if (!fileName) {
        const headerEl = codeBlock.querySelector("figcaption, header, [data-streamdown='code-block-header']");
        if (headerEl) {
          const headerText = headerEl.textContent?.replace(/download|copy/gi, "").trim() || "";
          if (headerText.includes(".") && !headerText.includes(" ")) {
            fileName = headerText;
          } else if (headerText) {
            fileName = getFileNameForLanguage(headerText);
          }
        }
      }

      if (!fileName) {
        fileName = "code.txt";
      }

      const blob = new Blob([codeText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${fileName}`);
    };

    document.addEventListener("click", handleGlobalDownloadClick, true);
    return () => document.removeEventListener("click", handleGlobalDownloadClick, true);
  }, []);

  // Automatically remove empty leading lines from code blocks
  useEffect(() => {
    const cleanCodeNodes = () => {
      const codeBlocks = document.querySelectorAll(".is-assistant pre code, [data-streamdown] pre code");
      codeBlocks.forEach((code) => {
        // 1. Remove empty leading text nodes or newlines
        while (code.firstChild && code.firstChild.nodeType === Node.TEXT_NODE && !code.firstChild.nodeValue?.trim()) {
          code.removeChild(code.firstChild);
        }
        if (code.firstChild && code.firstChild.nodeType === Node.TEXT_NODE && code.firstChild.nodeValue?.startsWith("\n")) {
          code.firstChild.nodeValue = code.firstChild.nodeValue.replace(/^\n+/, "");
        }
        // 2. Remove empty leading <span class="line"> elements generated by Shiki/Streamdown
        while (
          code.firstElementChild &&
          code.firstElementChild.tagName === "SPAN" &&
          (code.firstElementChild.classList.contains("line") || code.firstElementChild.getAttribute("data-line") !== null) &&
          !code.firstElementChild.textContent?.trim()
        ) {
          code.removeChild(code.firstElementChild);
        }
      });
    };

    cleanCodeNodes();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedClean = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(cleanCodeNodes, 80);
    };
    const observer = new MutationObserver(debouncedClean);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);

  if (authLoading) {
    return <LoadingScreen message="Connecting to workspace..." />;
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full bg-[#111110] text-[#ecece9] flex flex-col font-sans selection:bg-primary/30 gpu-accelerated">
        {/* Header */}
        <header className="flex items-center justify-between px-6 sm:px-10 py-6 max-w-7xl mx-auto w-full animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-2 rounded-full bg-primary/30 blur-md animate-pulse-glow-slow" />
              <img src={logo} alt="rYuk.ai logo" className="relative size-8 drop-shadow-md" />
            </div>
            <span className="font-display text-xl font-extrabold tracking-tight text-white">rYuk.ai</span>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-10 py-6 lg:py-12 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center w-full">
            {/* Left Column: Original rYuk Heading & Auth Card */}
            <div className="lg:col-span-6 space-y-6 sm:space-y-7 max-w-xl mx-auto lg:mx-0 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              <div className="space-y-2 sm:space-y-3">
                <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#f3f3f0] leading-[1.12]">
                  Professional AI Intelligence <span className="bg-gradient-to-r from-primary via-orange-400 to-amber-300 bg-clip-text text-transparent">Workspace</span>
                </h1>
                <p className="text-sm sm:text-base text-[#9b9b94] leading-relaxed">
                  Enterprise-grade AI platform with ensemble compute technology, multi-framework intelligence, and specialized capabilities for development, research, and strategic planning.
                </p>
              </div>

              {/* Auth Container Box */}
              <div className="rounded-2xl border border-primary/20 bg-[#1a1a18]/90 p-5 sm:p-6 md:p-7 space-y-4 sm:space-y-5 shadow-2xl backdrop-blur-md animate-border-glow">
                {/* Google Direct Auth Button */}
                <Button
                  size="lg"
                  onClick={handleGoogleSignIn}
                  className="w-full bg-gradient-to-r from-primary via-orange-500 to-amber-500 hover:opacity-95 text-primary-foreground font-bold h-11 sm:h-12 rounded-xl shadow-glow justify-center gap-2 sm:gap-3 transition-all text-sm cursor-pointer active:scale-[0.98]"
                >
                  <svg className="size-4.5" viewBox="0 0 24 24">
                    <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Continue with Google
                </Button>

                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-px flex-1 bg-[#282825]" />
                  <span className="text-[10px] sm:text-[11px] font-mono text-[#73736c] uppercase tracking-wider">OR USE EMAIL</span>
                  <div className="h-px flex-1 bg-[#282825]" />
                </div>

                {/* Tab Switcher: Register vs Sign In */}
                <div className="flex rounded-xl bg-[#222220] p-1 border border-[#333330]">
                  <button
                    type="button"
                    onClick={() => setAuthMode("register")}
                    className={cn(
                      "flex-1 rounded-lg py-2 text-xs sm:text-xs font-semibold transition-all cursor-pointer",
                      authMode === "register"
                        ? "bg-[#2a2a28] text-white shadow-sm border border-[#3a3a38]"
                        : "text-[#888880] hover:text-[#f0f0ed]",
                    )}
                  >
                    Register
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode("signin")}
                    className={cn(
                      "flex-1 rounded-lg py-2 text-xs sm:text-xs font-semibold transition-all cursor-pointer",
                      authMode === "signin"
                        ? "bg-[#2a2a28] text-white shadow-sm border border-[#3a3a38]"
                        : "text-[#888880] hover:text-[#f0f0ed]",
                    )}
                  >
                    Sign In
                  </button>
                </div>

                {/* Email Form */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!emailInput || !passwordInput) {
                      toast.error("Please fill in all required fields.");
                      return;
                    }
                    setIsAuthSubmitting(true);
                    try {
                      if (authMode === "register") {
                        const u = await signUpWithEmail(nameInput, emailInput, passwordInput);
                        toast.success(`Account created! Welcome ${u.displayName || u.email}!`);
                      } else {
                        const u = await signInWithEmail(emailInput, passwordInput);
                        toast.success(`Welcome back ${u.displayName || u.email}!`);
                      }
                    } catch (err: any) {
                      let msg = err?.message || String(err);
                      if (err?.code === "auth/email-already-in-use") {
                        msg = "This email is already registered. Please Sign In instead.";
                      } else if (err?.code === "auth/weak-password") {
                        msg = "Password should be at least 6 characters.";
                      } else if (err?.code === "auth/invalid-credential" || err?.code === "auth/user-not-found" || err?.code === "auth/wrong-password") {
                        msg = "Invalid email or password. Please check your details.";
                      }
                      toast.error("Authentication failed", { description: msg });
                    } finally {
                      setIsAuthSubmitting(false);
                    }
                  }}
                  className="space-y-3"
                >
                  {authMode === "register" && (
                    <div>
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="Full Name"
                        required
                        className="w-full h-11 sm:h-11 px-3 sm:px-4 rounded-xl bg-[#222220] border border-[#333330] text-[#f0f0ed] placeholder:text-[#666660] text-sm outline-none focus:border-primary/60 transition-all font-sans focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  )}

                  <div>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="Enter your email"
                      required
                      className="w-full h-11 sm:h-11 px-3 sm:px-4 rounded-xl bg-[#222220] border border-[#333330] text-[#f0f0ed] placeholder:text-[#666660] text-sm outline-none focus:border-primary/60 transition-all font-sans focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder={authMode === "register" ? "Password (min 6 chars)" : "Enter password"}
                      required
                      className="w-full h-11 sm:h-11 px-3 sm:px-4 rounded-xl bg-[#222220] border border-[#333330] text-[#f0f0ed] placeholder:text-[#666660] text-sm outline-none focus:border-primary/60 transition-all font-sans focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isAuthSubmitting}
                    className="w-full bg-[#2a2a28] hover:bg-[#333330] text-[#f0f0ed] font-semibold h-11 sm:h-11 rounded-xl border border-[#383835] text-sm transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
                  >
                    {isAuthSubmitting
                      ? "Processing..."
                      : authMode === "register"
                        ? "Create Account"
                        : "Sign In"}
                  </Button>
                </form>
              </div>
            </div>

            {/* Right Column: rYuk Hero Visual Artwork */}
            <div className="lg:col-span-6 relative flex justify-center lg:justify-end animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
              <div className="relative overflow-hidden rounded-[28px] border border-primary/30 bg-[#1a1a18] shadow-glow aspect-[3/4] max-h-[580px] w-full max-w-[440px] group animate-float-slow">
                <img
                  src={heroLanding}
                  alt="rYuk.ai creative workspace"
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111110]/30 via-transparent to-transparent" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={cn("flex h-screen overflow-hidden bg-background text-foreground transition-all duration-300", transparencyMode && "transparency-mode")}>
      {sidebarOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden animate-fade-in"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <ChatSidebar
            threads={threads}
            activeId={activeThread}
            onSelect={(id) => {
              setActiveThread(id);
              if (typeof window !== "undefined" && window.innerWidth < 768) {
                setSidebarOpen(false);
              }
            }}
            onDeleteThread={handleDeleteThread}
            onNew={() => {
              setActiveThread("");
              setText("");
              setAttachedFiles([]);
              if (typeof window !== "undefined" && window.innerWidth < 768) {
                setSidebarOpen(false);
              }
            }}
            onClose={() => setSidebarOpen(false)}
            user={user}
            className="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] md:static md:z-auto md:w-72 shadow-2xl animate-in slide-in-from-left duration-200"
          />
        </>
      ) : (
        <CollapsedSidebarStrip
          onExpand={() => setSidebarOpen(true)}
          onNew={() => {
            setActiveThread("");
            setText("");
            setAttachedFiles([]);
          }}
          onSelectPlugin={(p) => setPlugin(p as PluginId)}
          user={user}
          onGoogleSignIn={handleGoogleSignIn}
        />
      )}

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-border/40 px-3 sm:px-5 py-3 sm:py-3.5 select-none bg-background/80 backdrop-blur-md z-20 shrink-0">
          {/* Mobile Sidebar Toggle Button */}
          <button
            type="button"
            aria-label="Toggle sidebar"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="flex sm:hidden size-10 items-center justify-center rounded-full bg-secondary/80 hover:bg-secondary border border-border/60 text-foreground transition-all active:scale-95 cursor-pointer shadow-xs shrink-0"
          >
            <PanelLeftOpen className="size-4 sm:size-4.5" />
          </button>

          <div className="min-w-0 flex-1 flex flex-col items-center justify-center px-2 sm:px-3">
            <h1 className="truncate font-serif text-sm sm:text-base font-bold text-foreground max-w-[180px] xs:max-w-[240px] sm:max-w-md text-center leading-tight">
              {threads.find((t) => t?.id === activeThread)?.title ?? "rYuk.ai"}
            </h1>
            <p className="truncate text-[10px] sm:text-xs text-muted-foreground max-w-[200px] xs:max-w-[280px] sm:max-w-full">
              {getPlugin(plugin).label}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* AI Configuration Panel */}
            <AIConfigurationPanel />

            {/* Transparency Mode Toggle */}
            <button
              type="button"
              title={transparencyMode ? "Switch to OLED Dark Mode" : "Switch to Glass Transparency Mode"}
              onClick={() => setTransparencyMode((prev) => !prev)}
              className={cn(
                "hidden sm:flex items-center gap-1.5 text-xs font-medium rounded-full transition-all px-3 py-2 cursor-pointer",
                transparencyMode
                  ? "bg-primary/20 text-primary border border-primary/40 shadow-glow"
                  : "text-muted-foreground hover:text-foreground bg-secondary/60 border border-border/40",
              )}
            >
              <Layers className="size-3.5" />
              <span className="hidden lg:inline text-[11px]">{transparencyMode ? "Glass" : "Glass Off"}</span>
            </button>

            {/* Delete Active Chat Button */}
            {activeThread && (
              <button
                type="button"
                title="Delete active chat"
                onClick={() => handleDeleteThread(activeThread)}
                className="flex size-10 sm:size-9 items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/15 transition-all cursor-pointer shrink-0"
              >
                <Trash2 className="size-4" />
              </button>
            )}

            {authLoading ? (
              <div className="size-10 sm:size-9.5 rounded-full bg-muted/40 animate-pulse shrink-0" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex size-10 sm:size-9.5 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-foreground shadow-xs hover:bg-primary/20 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-95 shrink-0"
                    title={user.email || "Account Options"}
                  >
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="size-full rounded-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-primary">
                        {user.displayName ? user.displayName.slice(0, 1).toUpperCase() : "R"}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-[#161614] border border-[#2a2a26] text-foreground p-1.5 shadow-2xl rounded-xl z-50">
                  <DropdownMenuLabel className="px-2 py-2">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold leading-none text-foreground">
                        {user?.displayName || "User Account"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {user?.email || "Signed in"}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[#2a2a26] my-1" />
                  <DropdownMenuItem
                    onClick={async () => {
                      await logOut();
                      toast.info("Signed out successfully.");
                    }}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-lg px-2 py-2 text-sm font-semibold gap-2"
                  >
                    <LogOut className="size-4" />
                    <span>Log Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="flex size-10 sm:size-9.5 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-xs font-bold text-primary shadow-xs hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-95 transition-all cursor-pointer shrink-0"
                title="Sign in with Google"
              >
                R
              </button>
            )}
          </div>
        </header>

        <div className="relative flex-1 min-h-0 w-full overflow-hidden">
          <Conversation className="h-full w-full">
            <ComposerScrollDetector onToggleHide={setIsComposerHidden} />
            <ConversationContent className="mx-auto w-full max-w-3xl gap-4 sm:gap-6 px-3 sm:px-4 pt-4 sm:pt-6 pb-32 sm:pb-40">
            {!hasMessages ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center w-full my-auto px-4 animate-fade-in">
                {/* Claude-Style Warm Center Sunburst Spark Logo */}
                <div className="relative mb-5 sm:mb-6">
                  <div className="absolute -inset-3 rounded-full bg-primary/20 blur-xl animate-pulse" />
                  <img src={logo} alt="rYuk.ai logo" width={52} height={52} className="relative size-12 sm:size-13 drop-shadow-2xl animate-float-slow" />
                </div>

                {/* Clean, Modern AI Workspace Headline */}
                <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-normal tracking-tight text-foreground/95 px-4">
                  {user?.displayName
                    ? `What would you like to explore, ${user.displayName.split(" ")[0]}?`
                    : "What would you like to explore today?"}
                </h1>
              </div>
            ) : (
              messages.filter((m) => m && m.id).map((m, idx) => {
                const p = m.plugin ? getPlugin(m.plugin) : null;
                const PIcon = p?.icon;
                const isLastAssistant = m.role === "assistant" && idx === messages.length - 1;
                return (
                  <Message key={m.id} from={m.role}>
                    {m.role === "assistant" && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <img src={logo} alt="" width={18} height={18} className="size-4.5" />
                        <span className="font-medium text-foreground">rYuk.ai</span>
                        {p && PIcon && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-medium text-primary">
                            <PIcon className="size-3" />
                            {p.label}
                          </span>
                        )}
                      </div>
                    )}
                    <MessageContent>
                      {m.role === "assistant" ? (
                        m.text ? (
                          <MessageResponse>
                            {m.text}
                          </MessageResponse>
                        ) : (
                          <Shimmer className="text-sm">Thinking...</Shimmer>
                        )
                      ) : editingId === m.id ? (
                        <div className="flex flex-col gap-2 rounded-xl border border-primary/40 bg-secondary/90 p-3 text-foreground">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full resize-none bg-transparent text-base outline-none font-sans"
                            rows={Math.max(2, editText.split("\n").length)}
                            autoFocus
                          />
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(m.id, editText)}
                              disabled={!editText.trim() || pending}
                            >
                              Save & Submit
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {m.attachedFile && (
                            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/12 px-2.5 py-1 text-xs">
                              <FileText className="size-3.5 text-primary" />
                              <span className="font-medium">{m.attachedFile.name}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">({formatFileSize(m.attachedFile.size)})</span>
                            </div>
                          )}
                          {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                        </div>
                      )}
                      {m.image && (
                        <figure className="mt-1 overflow-hidden rounded-xl border border-border bg-elevated">
                          <img
                            src={m.image}
                            alt="Generated illustration"
                            loading="lazy"
                            width={1024}
                            height={768}
                            className="w-full max-w-lg object-cover"
                          />
                          <figcaption className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                            <ImageIcon className="size-3.5 text-primary" />
                            1024 × 768 · rYuk.ai Vision
                            <span className="ml-auto flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Download image"
                                onClick={() => {
                                  if (!m.image) return;
                                  const link = document.createElement("a");
                                  link.href = m.image;
                                  link.download = `ryuk-ai-image-${Date.now()}.png`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  toast.success("Downloading image...");
                                }}
                              >
                                <Download />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Regenerate image"
                                onClick={() => handleRegenerate(m.id)}
                              >
                                <Wand2 />
                              </Button>
                            </span>
                          </figcaption>
                        </figure>
                      )}
                    </MessageContent>
                    {m.role === "assistant" && (
                      <ChatMessageActions
                        text={m.text}
                        createdAt={m.createdAt}
                        isPending={pending}
                        onRegenerate={() => handleRegenerate(m.id)}
                      />
                    )}
                    {m.role === "user" && (
                      <UserMessageActions
                        text={m.text}
                        createdAt={m.createdAt}
                        isPending={pending}
                        onResend={() => handleResendUserMsg(m.id)}
                        onEdit={() => {
                          setEditingId(m.id);
                          setEditText(m.text);
                        }}
                      />
                    )}
                  </Message>
                );
              })
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-[#111110] via-[#111110]/95 to-transparent px-3 sm:px-4 pb-3 sm:pb-5 pt-4 sm:pt-6 transition-all duration-300 ease-out transform-gpu",
            isComposerHidden && "translate-y-full opacity-0 pointer-events-none",
          )}
        >
          <div className="mx-auto w-full max-w-2xl">
            {/* Claude-Style Top Upgrade Banner (if guest) */}
            {!user && (
              <div className="mb-2.5 rounded-2xl border border-border/50 bg-[#1e1e1b]/90 backdrop-blur-md px-3 sm:px-3.5 py-2 sm:py-2.5 flex items-center justify-between shadow-xs animate-fade-in">
                <span className="text-xs font-semibold text-foreground">Experience Premium Intelligence</span>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="rounded-full border border-border/60 bg-background px-3 sm:px-3.5 py-1 text-xs font-bold text-foreground shadow-xs hover:bg-muted active:scale-95 transition-all cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            )}

            {/* Claude-Style Card Composer */}
            <div className="rounded-2xl sm:rounded-[28px] border border-border/60 bg-[#1a1a17]/95 backdrop-blur-xl p-2.5 sm:p-3 shadow-2xl transition-all focus-within:border-primary/50 focus-within:shadow-glow">
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 px-2 pb-2">
                  {attachedFiles.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-foreground"
                    >
                      {f.dataUrl ? (
                        <img src={f.dataUrl} alt="" className="size-4 rounded-full object-cover" />
                      ) : f.type.includes("pdf") || f.type.includes("doc") ? (
                        <FileText className="size-3.5 text-primary" />
                      ) : (
                        <File className="size-3.5 text-primary" />
                      )}
                      <span className="max-w-[120px] truncate font-medium">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => setAttachedFiles((prev) => prev.filter((item) => item.id !== f.id))}
                        className="ml-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  detectedPlugin === "image"
                    ? "Describe the visual content you need..."
                    : attachedFiles.length > 0
                      ? "What would you like to know about these files..."
                      : "Message rYuk Intelligence"
                }
                className="w-full resize-none bg-transparent px-2 sm:px-2.5 text-base outline-none placeholder:text-muted-foreground/60 leading-relaxed font-sans max-h-36 min-h-[48px] py-1"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(text, detectedPlugin);
                  }
                }}
              />

              {/* Claude Bottom Tools Row */}
              <div className="flex items-center justify-between gap-2 pt-2 px-0.5">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-x-auto no-scrollbar">
                  {/* Round Plus Button for Attachments & Plugins */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach files / photos"
                    className="flex size-9 sm:size-9 items-center justify-center rounded-full bg-secondary/80 text-foreground hover:bg-secondary active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="size-4.5 stroke-[2.5]" />
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFilesAdded(e.target.files)}
                  />

                  {/* Plugin Selector Pill */}
                  <PluginPicker value={detectedPlugin} onChange={setPlugin} />
                </div>

                {/* Send Button */}
                <button
                  type="button"
                  disabled={!text.trim() && attachedFiles.length === 0 && !pending}
                  onClick={() => send(text, detectedPlugin)}
                  className={cn(
                    "flex size-9 sm:size-9 items-center justify-center rounded-full transition-all cursor-pointer active:scale-95 shrink-0 ml-1",
                    text.trim() || attachedFiles.length > 0 || pending
                      ? "bg-foreground text-background shadow-md hover:opacity-90"
                      : "bg-muted text-muted-foreground/40 cursor-not-allowed opacity-40"
                  )}
                  title="Send message"
                >
                  {pending ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <ArrowUp className="size-4 stroke-[2.5]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
