import { useState } from "react";
import { FileText, Download, Check, Printer } from "lucide-react";
import { toast } from "sonner";

interface PdfDocumentCardProps {
  title: string;
  content: string;
  date?: number;
}

export function PdfDocumentCard({ title, content, date = Date.now() }: PdfDocumentCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const cleanTitle = title.replace(/^#+\s*/, "").trim() || "Executive Document";
  const safeFilename = `${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.pdf`;

  const handleDownload = async () => {
    setDownloading(true);
    const toastId = toast.loading("Formatting professional PDF...");

    try {
      // 1. Build an executive PDF HTML template
      const formattedHtml = generateExecutiveHtml(cleanTitle, content, date);

      // 2. Try HTML2PDF client export
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "-9999px";
      container.style.width = "800px";
      container.innerHTML = formattedHtml;
      document.body.appendChild(container);

      const opt = {
        margin: [12, 12, 12, 12] as [number, number, number, number],
        filename: safeFilename,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      };

      try {
        await html2pdf().set(opt).from(container).save();
        setDownloaded(true);
        toast.dismiss(toastId);
        toast.success(`PDF downloaded: ${safeFilename}`);
        setTimeout(() => setDownloaded(false), 3500);
      } finally {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }
    } catch (err) {
      console.warn("Direct PDF render fallback:", err);
      toast.dismiss(toastId);
      openPrintWindow(cleanTitle, content, date);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    openPrintWindow(cleanTitle, content, date);
  };

  return (
    <div className="my-3.5 rounded-2xl border border-primary/30 bg-gradient-to-br from-[#1b1a17]/95 via-[#161513]/90 to-[#121110] p-3.5 sm:p-4 shadow-xl backdrop-blur-md transition-all hover:border-primary/50">
      <div className="flex items-center justify-between gap-3">
        {/* Left icon & doc info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 border border-primary/30 text-primary shadow-xs">
            <FileText className="size-5 sm:size-5.5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold text-foreground truncate max-w-[220px] sm:max-w-sm">
                {cleanTitle}
              </span>
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary shrink-0">
                PDF
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              Professional document ready for download · {new Date(date || Date.now()).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            title="Print document"
            className="flex size-8 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {downloaded ? (
              <>
                <Check className="size-3.5" />
                <span>Downloaded</span>
              </>
            ) : (
              <>
                <Download className="size-3.5" />
                <span>{downloading ? "Generating..." : "Download PDF"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function openPrintWindow(title: string, content: string, date: number) {
  if (typeof window === "undefined") return;
  const win = window.open("", "_blank");
  if (!win) {
    toast.error("Please allow popups to export PDF");
    return;
  }
  const html = generateExecutiveHtml(title, content, date || Date.now());
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title></head><body>${html}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => {
    try {
      win.print();
    } catch {
      // Ignore print cancel
    }
  }, 400);
}

function generateExecutiveHtml(title: string, rawContent: string, date: number): string {
  // Convert Markdown into structured HTML
  let body = rawContent
    .replace(/^#\s+(.+)$/gm, '<h1 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 1.2em 0 0.4em; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">$1</h1>')
    .replace(/^##\s+(.+)$/gm, '<h2 style="color: #ea580c; font-size: 16px; font-weight: 700; margin: 1.2em 0 0.4em; border-left: 3px solid #ea580c; padding-left: 8px;">$1</h2>')
    .replace(/^###\s+(.+)$/gm, '<h3 style="color: #1e293b; font-size: 14px; font-weight: 600; margin: 1em 0 0.3em;">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0f172a;">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^\s*-\s+(.+)$/gm, '<li style="margin-bottom: 4px; color: #334155;">$1</li>')
    .replace(/^\s*\d+\.\s+(.+)$/gm, '<li style="margin-bottom: 4px; color: #334155;">$1</li>')
    .replace(/`([^`]+)`/g, '<code style="background: #f1f5f9; color: #ea580c; padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 12px;">$1</code>')
    .replace(/\n\n+/g, '<p style="margin: 0 0 1em; color: #334155; line-height: 1.6; font-size: 13px;">')
    .replace(/\n/g, "<br/>");

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 32px; background: #ffffff; color: #0f172a; max-width: 800px; margin: auto; box-sizing: border-box;">
      <style>
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-break { page-break-before: always; }
        }
        table { width: 100%; border-collapse: collapse; margin: 1.2em 0; font-size: 12px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
        th { background: #f8fafc; font-weight: 600; color: #0f172a; }
        pre { background: #0f172a; color: #f8fafc; padding: 14px; border-radius: 6px; font-family: monospace; font-size: 11.5px; page-break-inside: avoid; }
      </style>
      
      <!-- Executive Header Banner -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ea580c; padding-bottom: 12px; margin-bottom: 24px;">
        <div>
          <div style="font-size: 20px; font-weight: 800; color: #ea580c; letter-spacing: -0.5px;">rYuk Intelligence</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Professional AI Generated Document</div>
        </div>
        <div style="text-align: right; font-size: 11px; color: #64748b;">
          <div><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</div>
          <div><strong>Status:</strong> Verified Final</div>
        </div>
      </div>

      <!-- Document Title -->
      <div style="margin-bottom: 20px;">
        <h1 style="font-size: 22px; color: #0f172a; font-weight: 800; margin: 0 0 6px 0;">${title}</h1>
      </div>

      <!-- Content Body -->
      <div style="line-height: 1.65; font-size: 13.5px; color: #334155;">
        ${body}
      </div>

      <!-- Executive Footer -->
      <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8;">
        <div>Generated by rYuk.ai · High Intelligence Core</div>
        <div>Confidential & Proprietary</div>
      </div>
    </div>
  `;
}
