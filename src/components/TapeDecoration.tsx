interface TapeDecorationProps {
  variant?: "yellow" | "pink" | "mint" | "blue" | "lavender";
  rotate?: number;
  className?: string;
  width?: number;
}

const variantStyles: Record<string, string> = {
  yellow: "hsl(var(--washi-yellow) / 0.75)",
  pink: "hsl(var(--blush) / 0.8)",
  mint: "hsl(var(--washi-mint) / 0.75)",
  blue: "hsl(var(--dusty-blue) / 0.65)",
  lavender: "hsl(var(--lavender) / 0.7)",
};

export const TapeDecoration = ({ variant = "yellow", rotate = -4, className = "", width = 90 }: TapeDecorationProps) => (
  <span
    className={`absolute pointer-events-none ${className}`}
    style={{
      width,
      height: 22,
      background: variantStyles[variant],
      transform: `rotate(${rotate}deg)`,
      boxShadow: "0 1px 2px hsl(20 30% 25% / 0.1)",
      backgroundImage: `repeating-linear-gradient(90deg, transparent 0 6px, hsl(20 30% 25% / 0.04) 6px 7px)`,
    }}
    aria-hidden
  />
);
