import { Code, FileText, History, MessageSquare, Palette, PanelLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { User } from "@/lib/firebase";

type Props = {
  onExpand: () => void;
  onNew: () => void;
  onSelectPlugin: (plugin: string) => void;
  user: User | null;
  onGoogleSignIn: () => void;
};

export function CollapsedSidebarStrip({
  onExpand,
  onNew,
  onSelectPlugin,
  user,
  onGoogleSignIn,
}: Props) {
  return (
    <aside className="hidden sm:flex h-full w-14 shrink-0 flex-col items-center justify-between border-r border-sidebar-border bg-sidebar py-3.5 text-sidebar-foreground z-30 select-none">
      {/* Top Section */}
      <div className="flex flex-col items-center gap-3.5">
        {/* Toggle Sidebar Button */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onExpand}
          title="Expand sidebar"
          className="text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-xl"
        >
          <PanelLeft className="size-4.5" />
        </Button>

        {/* New Chat Button */}
        <Button
          size="icon-sm"
          onClick={onNew}
          title="New chat"
          className="rounded-full bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 shadow-glow"
        >
          <Plus className="size-4" />
        </Button>

        {/* Recent Chats / History */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onExpand}
          title="Recent chats"
          className="text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-xl"
        >
          <History className="size-4.5" />
        </Button>

        <div className="h-px w-6 bg-sidebar-border/60 my-0.5" />

        {/* Plugin Shortcuts */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onSelectPlugin("chat")}
          title="Default Chat"
          className="text-muted-foreground hover:text-primary hover:bg-sidebar-accent rounded-xl"
        >
          <MessageSquare className="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onSelectPlugin("image")}
          title="@create image"
          className="text-muted-foreground hover:text-amber-400 hover:bg-sidebar-accent rounded-xl"
        >
          <Palette className="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onSelectPlugin("code")}
          title="@code generation"
          className="text-muted-foreground hover:text-cyan-400 hover:bg-sidebar-accent rounded-xl"
        >
          <Code className="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onSelectPlugin("doc")}
          title="@doc PDF studio"
          className="text-muted-foreground hover:text-emerald-400 hover:bg-sidebar-accent rounded-xl"
        >
          <FileText className="size-4" />
        </Button>
      </div>

      {/* Bottom Section: User Profile Avatar */}
      <div className="flex flex-col items-center gap-3">
        {user ? (
          <button
            type="button"
            onClick={onExpand}
            title={user.displayName || user.email || "Profile"}
            className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-xs border border-primary/40 shadow-glow hover:scale-105 transition-transform overflow-hidden"
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                referrerPolicy="no-referrer"
                className="size-8 rounded-full object-cover"
              />
            ) : user.displayName ? (
              user.displayName.slice(0, 1).toUpperCase()
            ) : (
              "U"
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onGoogleSignIn}
            title="Sign in with Google"
            className="flex size-8 items-center justify-center rounded-full bg-sidebar-accent border border-sidebar-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
          >
            <svg className="size-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
          </button>
        )}
      </div>
    </aside>
  );
}
