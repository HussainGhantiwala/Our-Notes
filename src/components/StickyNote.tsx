import { motion } from "framer-motion";
import { ReactNode } from "react";

interface StickyNoteProps {
  color?: "yellow" | "pink" | "mint" | "blue" | "lavender" | "peach";
  rotate?: number;
  accessory?: "none" | "pin" | "tape";
  sticker?: string | null;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

const colorMap: Record<string, string> = {
  yellow: "hsl(var(--washi-yellow))",
  pink: "hsl(var(--blush))",
  mint: "hsl(var(--washi-mint))",
  blue: "hsl(var(--dusty-blue))",
  lavender: "hsl(var(--lavender))",
  peach: "hsl(var(--peach))",
};

export const StickyNote = ({
  color = "yellow",
  rotate = -2,
  accessory = "tape",
  sticker,
  children,
  className = "",
  onClick,
}: StickyNoteProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9, rotate: rotate - 4 }}
    whileInView={{ opacity: 1, scale: 1, rotate }}
    whileHover={{ rotate: rotate + 2, y: -4, scale: 1.04 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    onClick={onClick}
    style={{ background: colorMap[color] }}
    className={`sticky-note relative p-5 w-full min-h-[140px] cursor-pointer font-hand text-ink text-xl leading-snug ${className}`}
  >
    {accessory === "tape" && (
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-12 h-3 bg-ink/10 rounded-b-sm" />
    )}
    {accessory === "pin" && (
      <div className="absolute top-3 left-1/2 -translate-x-1/2">
        <div className="w-4 h-4 rounded-full bg-rose shadow-sm border border-white/60" />
        <div className="w-px h-5 bg-ink/25 mx-auto -mt-1" />
      </div>
    )}
    {sticker && sticker !== "none" && (
      <div className="absolute top-4 right-4 text-2xl leading-none drop-shadow-sm" aria-hidden>
        {sticker}
      </div>
    )}
    {children}
  </motion.div>
);
