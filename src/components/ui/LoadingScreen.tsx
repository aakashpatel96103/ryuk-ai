import { Logo } from "@/components/ui/Logo";

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingScreen({ message = "Connecting to workspace...", fullScreen = true }: LoadingScreenProps) {
  if (!fullScreen) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center w-full gpu-accelerated">
        <div className="relative mb-3">
          <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-primary via-orange-500 to-amber-400 opacity-50 blur-lg animate-pulse" />
          <Logo size={48} glow className="relative size-12 drop-shadow-xl animate-pulse" />
        </div>
        <span className="font-display text-sm font-bold tracking-tight text-white mb-1">rYuk.ai</span>
        <p className="text-xs text-muted-foreground font-medium animate-pulse">
          {message}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#111110] text-[#ecece9] flex flex-col items-center justify-center font-sans selection:bg-primary/30 gpu-accelerated">
      <div className="flex flex-col items-center justify-center text-center p-6 animate-fade-in-up">
        <div className="relative mb-4">
          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-primary via-orange-500 to-amber-400 opacity-50 blur-xl animate-pulse" />
          <Logo size={64} glow className="relative size-16 drop-shadow-2xl animate-pulse" />
        </div>
        <span className="font-display text-lg font-bold tracking-tight text-white mb-1">rYuk.ai</span>
        <p className="text-xs text-[#9b9b94] font-medium animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
}
