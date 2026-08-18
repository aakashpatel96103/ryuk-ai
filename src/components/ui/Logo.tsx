import React from "react";
import logoPng from "@/assets/ember-logo.png";
import { cn } from "@/lib/utils";

interface LogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: number | string;
  className?: string;
  glow?: boolean;
}

export function Logo({ size = 32, className, glow = false, alt = "rYuk.ai logo", ...props }: LogoProps) {
  const pixelSize = typeof size === "number" ? `${size}px` : size;

  return (
    <img
      src={logoPng}
      alt={alt}
      width={typeof size === "number" ? size : undefined}
      height={typeof size === "number" ? size : undefined}
      style={{ width: pixelSize, height: pixelSize }}
      className={cn(
        "inline-block shrink-0 object-contain transition-transform duration-300 select-none",
        glow && "drop-shadow-[0_0_14px_rgba(255,109,0,0.4)]",
        className,
      )}
      {...props}
    />
  );
}

export default Logo;
