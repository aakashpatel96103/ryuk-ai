import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Cpu, Sparkles, X, Zap } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MODELS } from "@/components/chat/plugins";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (id: string) => void;
};

export function ModelPicker({ value, onChange }: Props) {
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const active = MODELS.find((m) => m.id === value) ?? MODELS[0]!;

  return (
    <>
      {/* Mobile Trigger Button */}
      <button
        type="button"
        onClick={() => setMobileSheetOpen(true)}
        className="sm:hidden inline-flex items-center gap-1 rounded-full bg-secondary/80 hover:bg-secondary border border-border/60 px-2 py-1 text-[11px] font-medium text-foreground transition-all active:scale-95 cursor-pointer shadow-xs shrink-0 max-w-[110px]"
      >
        <Cpu className="size-3 text-primary shrink-0" />
        <span className="truncate font-semibold text-[11px]">{active.name.split(" ")[0]}</span>
        <span className="text-[9px] text-primary/80 font-bold bg-primary/10 px-1 py-0.2 rounded-full">{active.badge || "Auto"}</span>
      </button>

      {/* Mobile Bottom Sheet Modal (Claude Style) */}
      {mobileSheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:hidden animate-fade-in">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => setMobileSheetOpen(false)}
          />

          {/* Drawer Sheet */}
          <div className="relative z-10 w-full max-h-[85vh] overflow-y-auto rounded-t-[32px] border-t border-[#2a2a26] bg-[#161614] p-5 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-300 text-foreground">
            {/* Drag Handle */}
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted/60" />

            {/* Header */}
            <div className="relative flex items-center justify-center pb-4 border-b border-border/40">
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                className="absolute left-0 flex size-9 items-center justify-center rounded-full bg-muted/40 text-muted-foreground hover:text-foreground active:scale-95"
              >
                <X className="size-4" />
              </button>
              <h2 className="font-display text-base font-bold text-foreground">Select model</h2>
            </div>

            {/* Grouped Model List Card */}
            <div className="mt-4 overflow-hidden rounded-2xl border border-border/50 bg-[#1e1e1b] divide-y divide-border/40">
              {MODELS.map((m) => {
                const isSelected = m.id === value;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onChange(m.id);
                      setMobileSheetOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-start justify-between p-4 text-left transition-colors active:bg-primary/10",
                      isSelected && "bg-primary/5",
                    )}
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{m.name}</span>
                        {m.badge && (
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold",
                            m.badge.toLowerCase().includes("pro") || m.badge.toLowerCase().includes("high")
                              ? "bg-primary/20 text-primary border border-primary/30"
                              : "bg-secondary text-muted-foreground"
                          )}>
                            {m.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                        {m.tagline}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground mt-0.5">
                        <Check className="size-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom Config Rows (Claude Style) */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-[#1e1e1b] px-4 py-3 text-xs">
                <span className="font-medium text-foreground flex items-center gap-2">
                  <Zap className="size-3.5 text-amber-400" />
                  Reasoning Effort
                </span>
                <span className="text-muted-foreground font-semibold flex items-center gap-1">
                  High <ChevronRight className="size-3.5 opacity-60" />
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-[#1e1e1b] px-4 py-3 text-xs">
                <span className="font-medium text-foreground flex items-center gap-2">
                  <Sparkles className="size-3.5 text-primary" />
                  Web Search & Grounding
                </span>
                <span className="text-primary font-semibold flex items-center gap-1">
                  Active <ChevronRight className="size-3.5 opacity-60" />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Dropdown Menu */}
      <div className="hidden sm:block">
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-full bg-secondary/70 hover:bg-secondary border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer">
            <Cpu className="size-3.5 shrink-0 text-primary" />
            <span className="truncate font-semibold">{active.name}</span>
            <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.2 rounded-full font-bold">{active.badge || "Auto"}</span>
            <ChevronDown className="size-3.5 shrink-0 opacity-60 ml-0.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 bg-[#161614] border border-[#2a2a26] text-foreground p-1.5 shadow-2xl rounded-xl z-50">
            <DropdownMenuLabel className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground px-3 py-1.5 font-bold">
              AI Models
            </DropdownMenuLabel>
            {MODELS.map((m) => (
              <DropdownMenuItem
                key={m.id}
                onSelect={() => onChange(m.id)}
                className="items-start gap-2.5 p-2.5 rounded-lg cursor-pointer hover:bg-muted/40 focus:bg-muted/40"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {m.name}
                    {m.badge && (
                      <span className="rounded-full bg-primary/15 border border-primary/30 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                        {m.badge}
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{m.tagline}</span>
                </span>
                {m.id === value && <Check className="mt-1 size-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
