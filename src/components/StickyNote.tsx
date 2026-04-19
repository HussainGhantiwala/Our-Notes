import { motion } from "framer-motion";
import { ReactNode } from "react";

interface StickyNoteProps {
  color?: "yellow" | "pink" | "mint" | "blue" | "lavender" | "peach";
  rotate?: number;
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
    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-12 h-3 bg-ink/10 rounded-b-sm" />
    {children}
  </motion.div>
);
