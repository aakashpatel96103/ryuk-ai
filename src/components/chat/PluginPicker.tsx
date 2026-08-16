import { Check, ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PLUGINS, type PluginId, getPlugin } from "@/components/chat/plugins";
import { cn } from "@/lib/utils";

type Props = {
  value: PluginId;
  onChange: (id: PluginId) => void;
};

export function PluginPicker({ value, onChange }: Props) {
  const active = getPlugin(value);
  const ActiveIcon = active.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-1 sm:gap-1.5 rounded-full border border-border px-2 sm:px-2.5 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium transition-colors hover:bg-accent shrink-0 cursor-pointer",
          value !== "chat" && "border-primary/40 bg-primary/12 text-primary hover:bg-primary/18",
        )}
      >
        <ActiveIcon className="size-3.5 shrink-0" />
        <span className="truncate max-w-[60px] xs:max-w-[85px] sm:max-w-none">
          {value === "chat" ? "Chat" : active.label.replace(/^@/, "")}
        </span>
        <ChevronDown className="size-3 sm:size-3.5 opacity-60 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Plugins
        </DropdownMenuLabel>
        {PLUGINS.map((p) => {
          const Icon = p.icon;
          return (
            <DropdownMenuItem
              key={p.id}
              onSelect={() => onChange(p.id)}
              className="items-start gap-2.5 py-2"
            >
              <Icon className="mt-0.5 size-4 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {p.label}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {p.command}
                  </code>
                </span>
                <span className="block text-xs text-muted-foreground">{p.hint}</span>
              </span>
              {p.id === value && <Check className="mt-0.5 size-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
