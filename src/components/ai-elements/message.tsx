import { Button } from "@/components/ui/button";
import {
  ButtonGroup,
  ButtonGroupText,
} from "@/components/ui/button-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import type { UIMessage } from "ai";
import { ChevronLeftIcon, ChevronRightIcon, Play, Code, RotateCw, Monitor, Tablet, Smartphone, ExternalLink, Terminal } from "lucide-react";
import type { ComponentProps, HTMLAttributes, ReactElement } from "react";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Streamdown, CodeBlock, CodeBlockCopyButton, CodeBlockDownloadButton } from "streamdown";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      "group flex w-full max-w-[95%] flex-col gap-2",
      from === "user" ? "is-user ml-auto justify-end" : "is-assistant",
      className
    )}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({
  children,
  className,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(
      "flex w-fit min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm",
      "group-[.is-user]:ml-auto group-[.is-user]:rounded-2xl group-[.is-user]:bg-primary/20 group-[.is-user]:border group-[.is-user]:border-primary/40 group-[.is-user]:px-4 group-[.is-user]:py-2.5 group-[.is-user]:text-slate-100 group-[.is-user]:font-medium group-[.is-user]:shadow-sm",
      "group-[.is-assistant]:text-foreground",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export type MessageActionsProps = ComponentProps<"div">;

export const MessageActions = ({
  className,
  children,
  ...props
}: MessageActionsProps) => (
  <div className={cn("flex items-center gap-1", className)} {...props}>
    {children}
  </div>
);

export type MessageActionProps = ComponentProps<typeof Button> & {
  tooltip?: string;
  label?: string;
};

export const MessageAction = ({
  tooltip,
  children,
  label,
  variant = "ghost",
  size = "icon-sm",
  ...props
}: MessageActionProps) => {
  const button = (
    <Button size={size} type="button" variant={variant} {...props}>
      {children}
      <span className="sr-only">{label || tooltip}</span>
    </Button>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
};

interface MessageBranchContextType {
  currentBranch: number;
  totalBranches: number;
  goToPrevious: () => void;
  goToNext: () => void;
  branches: ReactElement[];
  setBranches: (branches: ReactElement[]) => void;
}

const MessageBranchContext = createContext<MessageBranchContextType | null>(
  null
);

const useMessageBranch = () => {
  const context = useContext(MessageBranchContext);

  if (!context) {
    throw new Error(
      "MessageBranch components must be used within MessageBranch"
    );
  }

  return context;
};

export type MessageBranchProps = HTMLAttributes<HTMLDivElement> & {
  defaultBranch?: number;
  onBranchChange?: (branchIndex: number) => void;
};

export const MessageBranch = ({
  defaultBranch = 0,
  onBranchChange,
  className,
  ...props
}: MessageBranchProps) => {
  const [currentBranch, setCurrentBranch] = useState(defaultBranch);
  const [branches, setBranches] = useState<ReactElement[]>([]);

  const handleBranchChange = useCallback(
    (newBranch: number) => {
      setCurrentBranch(newBranch);
      onBranchChange?.(newBranch);
    },
    [onBranchChange]
  );

  const goToPrevious = useCallback(() => {
    const newBranch =
      currentBranch > 0 ? currentBranch - 1 : branches.length - 1;
    handleBranchChange(newBranch);
  }, [currentBranch, branches.length, handleBranchChange]);

  const goToNext = useCallback(() => {
    const newBranch =
      currentBranch < branches.length - 1 ? currentBranch + 1 : 0;
    handleBranchChange(newBranch);
  }, [currentBranch, branches.length, handleBranchChange]);

  const contextValue = useMemo<MessageBranchContextType>(
    () => ({
      branches,
      currentBranch,
      goToNext,
      goToPrevious,
      setBranches,
      totalBranches: branches.length,
    }),
    [branches, currentBranch, goToNext, goToPrevious]
  );

  return (
    <MessageBranchContext.Provider value={contextValue}>
      <div
        className={cn("grid w-full gap-2 [&>div]:pb-0", className)}
        {...props}
      />
    </MessageBranchContext.Provider>
  );
};

export type MessageBranchContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageBranchContent = ({
  children,
  ...props
}: MessageBranchContentProps) => {
  const { currentBranch, setBranches, branches } = useMessageBranch();
  const childrenArray = useMemo(
    () => (Array.isArray(children) ? children : [children]),
    [children]
  );

  // Use useEffect to update branches when they change
  useEffect(() => {
    if (branches.length !== childrenArray.length) {
      setBranches(childrenArray);
    }
  }, [childrenArray, branches, setBranches]);

  return childrenArray.map((branch, index) => (
    <div
      className={cn(
        "grid gap-2 overflow-hidden [&>div]:pb-0",
        index === currentBranch ? "block" : "hidden"
      )}
      key={branch.key}
      {...props}
    >
      {branch}
    </div>
  ));
};

export type MessageBranchSelectorProps = ComponentProps<typeof ButtonGroup>;

export const MessageBranchSelector = ({
  className,
  ...props
}: MessageBranchSelectorProps) => {
  const { totalBranches } = useMessageBranch();

  // Don't render if there's only one branch
  if (totalBranches <= 1) {
    return null;
  }

  return (
    <ButtonGroup
      className={cn(
        "[&>*:not(:first-child)]:rounded-l-md [&>*:not(:last-child)]:rounded-r-md",
        className
      )}
      orientation="horizontal"
      {...props}
    />
  );
};

export type MessageBranchPreviousProps = ComponentProps<typeof Button>;

export const MessageBranchPrevious = ({
  children,
  ...props
}: MessageBranchPreviousProps) => {
  const { goToPrevious, totalBranches } = useMessageBranch();

  return (
    <Button
      aria-label="Previous branch"
      disabled={totalBranches <= 1}
      onClick={goToPrevious}
      size="icon-sm"
      type="button"
      variant="ghost"
      {...props}
    >
      {children ?? <ChevronLeftIcon size={14} />}
    </Button>
  );
};

export type MessageBranchNextProps = ComponentProps<typeof Button>;

export const MessageBranchNext = ({
  children,
  ...props
}: MessageBranchNextProps) => {
  const { goToNext, totalBranches } = useMessageBranch();

  return (
    <Button
      aria-label="Next branch"
      disabled={totalBranches <= 1}
      onClick={goToNext}
      size="icon-sm"
      type="button"
      variant="ghost"
      {...props}
    >
      {children ?? <ChevronRightIcon size={14} />}
    </Button>
  );
};

export type MessageBranchPageProps = HTMLAttributes<HTMLSpanElement>;

export const MessageBranchPage = ({
  className,
  ...props
}: MessageBranchPageProps) => {
  const { currentBranch, totalBranches } = useMessageBranch();

  return (
    <ButtonGroupText
      className={cn(
        "border-none bg-transparent text-muted-foreground shadow-none",
        className
      )}
      {...props}
    >
      {currentBranch + 1} of {totalBranches}
    </ButtonGroupText>
  );
};

const CustomSandboxRunner = ({ htmlCode }: { htmlCode: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [showConsole, setShowConsole] = useState(false);
  const [logs, setLogs] = useState<Array<{ level: "log" | "warn" | "error"; text: string; time: string }>>([]);

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLogs([]);
    setIframeKey((prev) => prev + 1);
  };

  const handleOpenNewWindow = (e: React.MouseEvent) => {
    e.stopPropagation();
    const blob = new Blob([htmlCode], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const finalHtml = useMemo(() => {
    const consoleInterceptor = `
      <script>
        (function() {
          const _log = console.log;
          const _warn = console.warn;
          const _error = console.error;
          
          window.addEventListener('error', function(e) {
            window.parent.postMessage({ type: 'CONSOLE_LOG', level: 'error', text: e.message }, '*');
          });

          console.log = function(...args) {
            _log.apply(console, args);
            window.parent.postMessage({ type: 'CONSOLE_LOG', level: 'log', text: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }, '*');
          };
          console.warn = function(...args) {
            _warn.apply(console, args);
            window.parent.postMessage({ type: 'CONSOLE_LOG', level: 'warn', text: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }, '*');
          };
          console.error = function(...args) {
            _error.apply(console, args);
            window.parent.postMessage({ type: 'CONSOLE_LOG', level: 'error', text: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }, '*');
          };
        })();
      </script>
    `;
    return htmlCode.includes("<head>") 
      ? htmlCode.replace("<head>", `<head>${consoleInterceptor}`)
      : `${consoleInterceptor}${htmlCode}`;
  }, [htmlCode]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "CONSOLE_LOG") {
        setLogs((prev) => [...prev.slice(-99), { 
          level: event.data.level, 
          text: event.data.text, 
          time: new Date().toLocaleTimeString() 
        }]);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div className="my-2 flex flex-col rounded-xl border border-border bg-sidebar overflow-hidden shadow-lg transition-all duration-300">
      <div className="flex flex-wrap items-center justify-between border-b border-border bg-muted/30 px-4 py-2 gap-2">
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Live Preview Sandbox
          </span>
          {isPlaying && (
            <div className="flex items-center gap-1 bg-background/50 rounded-lg p-0.5 border border-border">
              <button
                onClick={() => setViewport("desktop")}
                className={cn("p-1 rounded transition-all", viewport === "desktop" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}
                title="Desktop View"
              >
                <Monitor className="size-3.5" />
              </button>
              <button
                onClick={() => setViewport("tablet")}
                className={cn("p-1 rounded transition-all", viewport === "tablet" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}
                title="Tablet View"
              >
                <Tablet className="size-3.5" />
              </button>
              <button
                onClick={() => setViewport("mobile")}
                className={cn("p-1 rounded transition-all", viewport === "mobile" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}
                title="Mobile View"
              >
                <Smartphone className="size-3.5" />
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {!isPlaying ? (
            <button
              onClick={() => setIsPlaying(true)}
              className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold transition-all duration-200"
            >
              <Play className="size-3.5" />
              Launch Preview
            </button>
          ) : (
            <>
              <button
                onClick={handleOpenNewWindow}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Open in New Tab"
              >
                <ExternalLink className="size-3.5" />
              </button>
              <button
                onClick={() => setShowConsole(!showConsole)}
                className={cn("p-1 rounded transition-all flex items-center gap-1", showConsole ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
                title="Console Logs"
              >
                <Terminal className="size-3.5" />
                {logs.length > 0 && <span className="text-[10px] bg-amber-500 text-black px-1 rounded-full font-bold">{logs.length}</span>}
              </button>
              <button
                onClick={handleRefresh}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Reload App"
              >
                <RotateCw className="size-3.5" />
              </button>
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setLogs([]);
                }}
                className="flex items-center gap-1 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-2 py-1 text-xs font-semibold transition-all"
              >
                Stop
              </button>
            </>
          )}
        </div>
      </div>

      {isPlaying ? (
        <div className="flex flex-col w-full bg-slate-950 p-4 items-center justify-center transition-all duration-300">
          <div 
            className={cn(
              "w-full bg-white h-[450px] min-h-[300px] shadow-2xl rounded-lg overflow-hidden transition-all duration-300 relative border border-white/5",
              viewport === "tablet" && "max-w-[768px]",
              viewport === "mobile" && "max-w-[375px]"
            )}
          >
            <iframe
              key={iframeKey}
              srcDoc={finalHtml}
              title="App Sandbox Preview"
              sandbox="allow-scripts allow-modals"
              className="size-full border-none bg-white"
            />
          </div>

          {showConsole && (
            <div className="w-full mt-4 bg-slate-900 border border-white/10 rounded-lg p-3 font-mono text-[11px] h-36 overflow-y-auto flex flex-col gap-1 transition-all duration-300">
              <div className="text-[10px] uppercase font-bold text-amber-400 border-b border-white/10 pb-1 mb-1 flex items-center justify-between">
                <span>Console Messages</span>
                <button onClick={() => setLogs([])} className="text-muted-foreground hover:text-white transition-colors">Clear</button>
              </div>
              {logs.length === 0 ? (
                <div className="text-muted-foreground text-center py-6 italic">No console logs output yet.</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="flex gap-2 leading-relaxed">
                    <span className="text-muted-foreground">[{log.time}]</span>
                    <span className={cn(
                      log.level === "error" && "text-rose-400",
                      log.level === "warn" && "text-amber-300",
                      log.level === "log" && "text-slate-300"
                    )}>
                      {log.level.toUpperCase()}: {log.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 bg-muted/10 text-center gap-2">
          <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-400 border border-emerald-500/20">
            <Play className="size-6" />
          </div>
          <div className="text-sm font-semibold text-slate-200">Interactive Game Sandbox</div>
          <div className="text-xs text-muted-foreground max-w-sm">
            Click launch to load and run this HTML/JS code inside a safe local sandbox preview.
          </div>
        </div>
      )}
    </div>
  );
};

export const CustomCodeRenderer = (props: any) => {
  const isInline = !("data-block" in props);

  if (isInline) {
    return <code {...props} />;
  }

  let rawCode = typeof props.children === "string" 
    ? props.children 
    : (Array.isArray(props.children) ? props.children.join("") : "");

  // Clean leading and trailing newlines/newlines-with-whitespace:
  rawCode = rawCode.replace(/^[\r\n]+|[\r\n]+$/g, "");

  const className = props.className || "";
  const language = className.replace("language-", "").trim().toLowerCase();

  const isHtml = language === "html" || language === "svg" || rawCode.includes("<!DOCTYPE html>") || rawCode.includes("<html>") || rawCode.includes("<body>");

  const codeBlockProps = {
    code: rawCode,
    language: language,
    className: props.className,
    isIncomplete: props.isIncomplete || false,
    startLine: props.startLine,
    lineNumbers: props.lineNumbers !== false,
    children: (
      <div className="flex items-center gap-2">
        <CodeBlockDownloadButton code={rawCode} language={language} />
        <CodeBlockCopyButton code={rawCode} />
      </div>
    )
  };

  if (!isHtml) {
    return <CodeBlock {...codeBlockProps} />;
  }

  return (
    <div className="flex flex-col gap-2 my-4">
      <CodeBlock {...codeBlockProps} />
      <CustomSandboxRunner htmlCode={rawCode} />
    </div>
  );
};

function preprocessMathContent(content: any): any {
  if (typeof content !== "string") return content;

  return content
    // Normalize LaTeX display blocks \[ ... \] -> $$ ... $$
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, eq) => `\n$$\n${eq.trim()}\n$$\n`)
    // Normalize LaTeX inline blocks \( ... \) -> $ ... $
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, eq) => `$${eq.trim()}$`)
    // Normalize bracketed expressions containing LaTeX commands: [ ... \frac ... ]
    .replace(/\[\s*([^\]]*?\\[a-zA-Z]+[^\]]*?)\s*\]/g, (_, eq) => `$$${eq.trim()}$$`)
    // Normalize isolated bracketed boxed: ( \boxed{...} ) or [ \boxed{...} ]
    .replace(/\(\s*(\\boxed\{[^}]+\})\s*\)/g, (_, boxed) => `$${boxed}$`)
    .replace(/\[\s*(\\boxed\{[^}]+\})\s*\]/g, (_, boxed) => `$$${boxed}$$`);
}

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

const streamdownPlugins = { cjk, code, math, mermaid };

export const MessageResponse = memo(
  ({ className, controls = true, children, ...props }: MessageResponseProps) => {
    const processedChildren = useMemo(() => {
      if (typeof children === "string") {
        return preprocessMathContent(children);
      }
      return children;
    }, [children]);

    return (
      <Streamdown
        className={cn(
          "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
          className
        )}
        controls={controls}
        plugins={streamdownPlugins}
        components={{
          code: CustomCodeRenderer,
        }}
        {...props}
      >
        {processedChildren}
      </Streamdown>
    );
  },
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    nextProps.isAnimating === prevProps.isAnimating
);

MessageResponse.displayName = "MessageResponse";

export type MessageToolbarProps = ComponentProps<"div">;

export const MessageToolbar = ({
  className,
  children,
  ...props
}: MessageToolbarProps) => (
  <div
    className={cn(
      "mt-4 flex w-full items-center justify-between gap-4",
      className
    )}
    {...props}
  >
    {children}
  </div>
);
