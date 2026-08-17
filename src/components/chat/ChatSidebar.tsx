import { useState } from "react";
import { Code, FolderGit2, History, Layers, LogOut, MessageSquare, PanelLeftClose, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import logo from "@/assets/ember-logo.png";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signInWithGoogle, logOut, type User } from "@/lib/firebase";

export type Thread = {
  id: string;
  title: string;
  group: string;
  plugin?: string | undefined;
};

type Props = {
  threads: Thread[];
  activeId: string;
  onSelect: (id: string) => void;
  onDeleteThread?: (id: string) => void;
  onNew: () => void;
  onClose: () => void;
  className?: string;
  user: User | null;
};

export function ChatSidebar({ threads, activeId, onSelect, onDeleteThread, onNew, onClose, className, user }: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"chats" | "projects" | "artifacts" | "code">("chats");

  const handleGoogleSignIn = async () => {
    try {
      const u = await signInWithGoogle();
      if (u) {
        toast.success(`Signed in as ${u.displayName || u.email}`);
      }
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      if (firebaseError?.code === "auth/configuration-not-found") {
        toast.error("Firebase Google Auth setup needed", {
          description: "Please enable Google Sign-In in Firebase Console -> Authentication -> Sign-in method.",
          duration: 8000,
        });
      } else {
        toast.error("Google Sign-In failed", { description: firebaseError?.message || String(err) });
      }
    }
  };

  const handleLogOut = async () => {
    await logOut();
    toast.info("Signed out successfully.");
  };

  const filteredThreads = searchQuery.trim()
    ? (threads || []).filter((t) => t && t.title && typeof t.title === "string" && t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : (threads || []).filter(Boolean);

  const [imgError, setImgError] = useState(false);

  return (
    <aside
      className={cn(
        "flex h-full w-[280px] max-w-[85vw] md:w-72 shrink-0 flex-col border-r border-sidebar-border bg-[#141412] text-sidebar-foreground select-none",
        className,
      )}
    >
      {/* Top Brand Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="rYuk.ai logo" width={26} height={26} className="size-6.5 drop-shadow-md" />
          <span className="font-serif text-xl font-bold tracking-tight text-foreground">rYuk.ai</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sidebar"
          className="flex size-8 items-center justify-center rounded-full bg-sidebar-accent/50 text-muted-foreground hover:text-foreground active:scale-95 cursor-pointer"
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>

      {/* Claude Style Navigation Items */}
      <div className="px-3 py-2 space-y-1">
        <button
          type="button"
          onClick={() => setActiveTab("chats")}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
            activeTab === "chats" ? "bg-sidebar-accent text-foreground font-semibold" : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
          )}
        >
          <MessageSquare className="size-4 text-primary" />
          <span>Chats</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("projects");
            toast.info("Projects workspace active");
          }}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
            activeTab === "projects" ? "bg-sidebar-accent text-foreground font-semibold" : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
          )}
        >
          <FolderGit2 className="size-4 text-amber-400" />
          <span>Projects</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("artifacts");
            toast.info("Artifacts & visualizations studio");
          }}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
            activeTab === "artifacts" ? "bg-sidebar-accent text-foreground font-semibold" : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
          )}
        >
          <Sparkles className="size-4 text-emerald-400" />
          <span>Artifacts</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("code");
            toast.info("Code generation sandbox");
          }}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
            activeTab === "code" ? "bg-sidebar-accent text-foreground font-semibold" : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
          )}
        >
          <Code className="size-4 text-cyan-400" />
          <span>Code</span>
        </button>
      </div>

      {/* Recents Divider & Search */}
      <div className="px-5 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
          Recents
        </span>
        {searchOpen ? (
          <button
            type="button"
            onClick={() => {
              setSearchOpen(false);
              setSearchQuery("");
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Search className="size-3.5" />
          </button>
        )}
      </div>

      {searchOpen && (
        <div className="px-3 pb-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recent chats..."
            className="w-full h-8 px-2.5 text-xs bg-sidebar-accent/60 rounded-lg outline-none text-foreground border border-sidebar-border focus:border-primary/50"
            autoFocus
          />
        </div>
      )}

      {/* Scrollable Recents List (Claude Style Pill items) */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
        {filteredThreads.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            {searchQuery ? "No matching chats found" : "No recent conversations"}
          </p>
        ) : (
          filteredThreads.map((t) => {
            const isSelected = t.id === activeId;
            return (
              <div key={t.id} className="group relative flex items-center">
                <button
                  type="button"
                  onClick={() => onSelect(t.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-left text-sm transition-all cursor-pointer pr-8 select-none truncate",
                    isSelected
                      ? "bg-secondary text-foreground font-medium shadow-xs"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                  )}
                >
                  <span className="truncate flex-1 text-xs sm:text-sm">{t.title}</span>
                </button>
                {onDeleteThread && (
                  <button
                    type="button"
                    title="Delete chat"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onDeleteThread(t.id);
                    }}
                    className="absolute right-2 z-10 text-muted-foreground hover:text-destructive hover:bg-destructive/15 p-1.5 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </nav>

      {/* Bottom Floating Bar with Avatar + Dark "+ New chat" pill (Claude Style) */}
      <div className="border-t border-sidebar-border/60 p-3 flex items-center justify-between gap-2">
        {user ? (
          <div className="flex items-center gap-2 min-w-0">
            {user.photoURL && !imgError ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="size-8 rounded-full border border-primary/40 object-cover shrink-0"
              />
            ) : (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/25 text-primary font-bold text-xs border border-primary/40">
                {user.displayName ? user.displayName.slice(0, 1).toUpperCase() : "R"}
              </span>
            )}
            <span className="truncate text-xs font-semibold text-foreground max-w-[80px]">
              {user.displayName?.split(" ")[0] || "rYuk"}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-xs border border-primary/40"
          >
            R
          </button>
        )}

        {/* Claude "+ New chat" Pill Button */}
        <button
          type="button"
          onClick={user ? onNew : handleGoogleSignIn}
          className="flex items-center gap-1.5 rounded-full bg-foreground text-background px-4 py-2 text-xs font-bold shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer ml-auto"
        >
          <Plus className="size-3.5 stroke-[3]" />
          <span>New chat</span>
        </button>
      </div>
    </aside>
  );
}
