import { useMemo } from "react";

interface FloatingPetalsProps {
  count?: number;
  className?: string;
}

const PETAL_COLORS = [
  "hsl(var(--blush))",
  "hsl(var(--rose))",
  "hsl(var(--peach))",
  "hsl(var(--lavender))",
];

export const FloatingPetals = ({ count = 14, className = "" }: FloatingPetalsProps) => {
  const petals = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 12,
        duration: 14 + Math.random() * 14,
        size: 8 + Math.random() * 14,
        color: PETAL_COLORS[i % PETAL_COLORS.length],
        rotate: Math.random() * 360,
      })),
    [count]
  );

  return (
    <div className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${className}`} aria-hidden>
      {petals.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 animate-petal-fall"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        >
          <span
            className="block rounded-full opacity-70"
            style={{
              width: p.size,
              height: p.size * 1.4,
              background: `radial-gradient(circle at 30% 30%, ${p.color}, transparent 70%)`,
              transform: `rotate(${p.rotate}deg)`,
              filter: "blur(0.3px)",
            }}
          />
        </span>
      ))}
    </div>
  );
};
