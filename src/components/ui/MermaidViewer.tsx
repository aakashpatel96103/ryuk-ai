import React, { useEffect, useRef, useState, useId } from "react";
import mermaid from "mermaid";
import { ZoomIn, ZoomOut, RotateCcw, Copy, Check, Download, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Initialize mermaid with sleek dark theme matching rYuk.ai aesthetics
mermaid.initialize({
  startOnLoad: false,
  suppressErrorRendering: true,
  theme: "dark",
  securityLevel: "loose",
  fontFamily: "inherit",
  themeVariables: {
    darkMode: true,
    background: "#0d0e12",
    mainBkg: "#13161c",
    primaryColor: "#3b82f6",
    primaryTextColor: "#f1f5f9",
    primaryBorderColor: "#334155",
    lineColor: "#64748b",
    secondaryColor: "#1e293b",
    tertiaryColor: "#0f172a",
    nodeBorder: "#3b82f6",
    clusterBkg: "#11141a",
    clusterBorder: "#1e293b",
    titleColor: "#f8fafc",
    edgeLabelBackground: "#1e293b",
    actorBkg: "#1e293b",
    actorBorder: "#3b82f6",
    actorTextColor: "#f8fafc",
    actorLineColor: "#64748b",
    signalColor: "#94a3b8",
    signalTextColor: "#f8fafc",
    labelBoxBkgColor: "#1e293b",
    labelBoxBorderColor: "#334155",
    labelTextColor: "#f8fafc",
    loopTextColor: "#f8fafc",
    noteBorderColor: "#f59e0b",
    noteBkgColor: "#291b00",
    noteTextColor: "#fef3c7",
  },
});

interface MermaidViewerProps {
  chart: string;
  className?: string;
}

export const MermaidViewer: React.FC<MermaidViewerProps> = ({ chart, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgHtml, setSvgHtml] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [copied, setCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showCode, setShowCode] = useState<boolean>(false);
  const uniqueId = useId().replace(/:/g, "_");

  // Render Mermaid to SVG
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const renderChart = async () => {
      const renderId = `mermaid_${uniqueId}_${Math.random().toString(36).substring(2, 7)}`;
      try {
        const cleanChart = chart
          .replace(/^```(?:mermaid)?\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim();

        if (!cleanChart) {
          if (isMounted) setIsLoading(false);
          return;
        }

        const { svg } = await mermaid.render(renderId, cleanChart);
        if (isMounted) {
          setSvgHtml(svg);
          setIsLoading(false);
        }
      } catch (err: any) {
        // Clean up any rogue error elements created by Mermaid in document
        const errEl = document.getElementById(renderId) || document.getElementById(`d${renderId}`);
        if (errEl && errEl.parentNode) {
          errEl.parentNode.removeChild(errEl);
        }
        document.querySelectorAll('svg[id^="dmermaid"], [id^="mermaid-error"]').forEach((el) => el.remove());

        if (isMounted) {
          setError(err?.message || "Parsing diagram...");
          setIsLoading(false);
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart, uniqueId]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.4));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setStartPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - startPos.x,
      y: e.clientY - startPos.y,
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(chart);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownloadSVG = () => {
    if (!svgHtml) return;
    const blob = new Blob([svgHtml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `diagram-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (error && !showCode) {
    return (
      <div className="my-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-mono">
        <div className="flex items-center justify-between gap-2 text-destructive mb-2 font-semibold">
          <span>Failed to render diagram</span>
          <button
            onClick={() => setShowCode(true)}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            View Source Code
          </button>
        </div>
        <div className="text-muted-foreground">{error}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "my-3 flex flex-col rounded-xl border border-border/60 bg-[#090b10] overflow-hidden shadow-2xl transition-all duration-300",
        isFullscreen ? "fixed inset-4 z-50 rounded-2xl border-primary/40 bg-[#090b10]/95 backdrop-blur-xl" : "",
        className
      )}
    >
      {/* Top Header Controls Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-border/40 bg-muted/20 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs font-medium text-muted-foreground select-none overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap shrink-0">
            Diagram
          </span>
          <span className="hidden sm:inline text-[11px] text-muted-foreground/80 whitespace-nowrap">Interactive SVG</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Zoom controls */}
          <div className="flex items-center gap-0.5 bg-background/60 rounded-lg p-0.5 border border-border/40 shrink-0">
            <button
              onClick={handleZoomIn}
              className="p-1 rounded hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all shrink-0"
              title="Zoom In"
              type="button"
            >
              <ZoomIn className="size-3 sm:size-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1 rounded hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all shrink-0"
              title="Zoom Out"
              type="button"
            >
              <ZoomOut className="size-3 sm:size-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 rounded hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all text-[10px] px-1 font-mono whitespace-nowrap shrink-0 min-w-[36px] text-center"
              title="Reset View"
              type="button"
            >
              {Math.round(zoom * 100)}%
            </button>
          </div>

          <button
            onClick={() => setShowCode(!showCode)}
            type="button"
            className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all text-[11px] whitespace-nowrap shrink-0"
          >
            {showCode ? "Diagram" : "Code"}
          </button>

          <button
            onClick={handleDownloadSVG}
            type="button"
            className="p-1 sm:p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all shrink-0"
            title="Download SVG"
          >
            <Download className="size-3 sm:size-3.5" />
          </button>

          <button
            onClick={handleCopyCode}
            type="button"
            className="p-1 sm:p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all shrink-0"
            title="Copy Mermaid Code"
          >
            {copied ? <Check className="size-3 sm:size-3.5 text-emerald-400" /> : <Copy className="size-3 sm:size-3.5" />}
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            type="button"
            className="p-1 sm:p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all shrink-0"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="size-3 sm:size-3.5" /> : <Maximize2 className="size-3 sm:size-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {showCode ? (
        <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto bg-[#07080c] max-h-[500px]">
          {chart}
        </pre>
      ) : (
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={cn(
            "relative flex items-center justify-center p-6 min-h-[300px] overflow-hidden select-none bg-gradient-to-b from-[#090b10] to-[#040507]",
            isPanning ? "cursor-grabbing" : "cursor-grab",
            isFullscreen ? "h-[calc(100%-45px)]" : "max-h-[600px]"
          )}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <RotateCcw className="size-5 animate-spin text-blue-400" />
              <span className="text-xs">Rendering diagram...</span>
            </div>
          ) : (
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "center center",
                transition: isPanning ? "none" : "transform 0.15s ease-out",
              }}
              className="flex items-center justify-center w-full [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:drop-shadow-md"
              dangerouslySetInnerHTML={{ __html: svgHtml }}
            />
          )}
        </div>
      )}
    </div>
  );
};
