import type { ElementType } from "@/lib/chapters";

export interface ElementSpec {
  type: ElementType;
  label: string;
  category: "sticky" | "tape" | "sticker" | "frame" | "text" | "music";
  defaultWidth: number;
  defaultHeight: number;
  defaultRotation: number;
  defaultContent?: string;
  defaultStyle?: Record<string, any>;
  glyph?: string; // unicode preview shown in palette
}

export const ELEMENT_LIBRARY: ElementSpec[] = [
  { type: "sticky-yellow",   label: "yellow note",   category: "sticky", defaultWidth: 170, defaultHeight: 160, defaultRotation: -3, defaultContent: "write me…", glyph: "🟨" },
  { type: "sticky-pink",     label: "pink note",     category: "sticky", defaultWidth: 170, defaultHeight: 160, defaultRotation: 2,  defaultContent: "write me…", glyph: "🌸" },
  { type: "sticky-blue",     label: "blue note",     category: "sticky", defaultWidth: 170, defaultHeight: 160, defaultRotation: -2, defaultContent: "write me…", glyph: "🟦" },
  { type: "sticky-mint",     label: "mint note",     category: "sticky", defaultWidth: 170, defaultHeight: 160, defaultRotation: 1,  defaultContent: "write me…", glyph: "🌿" },
  { type: "sticky-lavender", label: "lavender note", category: "sticky", defaultWidth: 170, defaultHeight: 160, defaultRotation: 3,  defaultContent: "write me…", glyph: "💜" },

  { type: "tape-pink",     label: "pink tape",     category: "tape", defaultWidth: 140, defaultHeight: 28, defaultRotation: -6, glyph: "🎀" },
  { type: "tape-yellow",   label: "yellow tape",   category: "tape", defaultWidth: 140, defaultHeight: 28, defaultRotation: 4,  glyph: "🟡" },
  { type: "tape-mint",     label: "mint tape",     category: "tape", defaultWidth: 140, defaultHeight: 28, defaultRotation: -3, glyph: "🟢" },
  { type: "tape-lavender", label: "lavender tape", category: "tape", defaultWidth: 140, defaultHeight: 28, defaultRotation: 5,  glyph: "🟣" },

  { type: "heart",    label: "heart",    category: "sticker", defaultWidth: 70,  defaultHeight: 70,  defaultRotation: -8, glyph: "❤️" },
  { type: "flower",   label: "flower",   category: "sticker", defaultWidth: 80,  defaultHeight: 80,  defaultRotation: 6,  glyph: "🌷" },
  { type: "sparkle",  label: "sparkle",  category: "sticker", defaultWidth: 60,  defaultHeight: 60,  defaultRotation: 0,  glyph: "✨" },
  { type: "leaf",     label: "leaf",     category: "sticker", defaultWidth: 90,  defaultHeight: 90,  defaultRotation: 12, glyph: "🍃" },
  { type: "stamp",    label: "stamp",    category: "sticker", defaultWidth: 90,  defaultHeight: 90,  defaultRotation: -4, glyph: "📮" },
  { type: "envelope", label: "envelope", category: "sticker", defaultWidth: 90,  defaultHeight: 70,  defaultRotation: -6, glyph: "💌" },
  { type: "arrow",    label: "doodle arrow", category: "sticker", defaultWidth: 110, defaultHeight: 50, defaultRotation: -10, glyph: "➶" },

  { type: "highlight", label: "highlight strip", category: "frame", defaultWidth: 200, defaultHeight: 32, defaultRotation: 0, defaultContent: "remember this", glyph: "🖍️" },
  { type: "polaroid",  label: "polaroid frame",  category: "frame", defaultWidth: 180, defaultHeight: 210, defaultRotation: -3, defaultContent: "caption…", glyph: "📷" },
  { type: "text",      label: "handwritten quote", category: "text", defaultWidth: 220, defaultHeight: 90, defaultRotation: -2, defaultContent: "you are my favorite hello…", glyph: "✍️" },

  { type: "music",     label: "music card",        category: "music", defaultWidth: 260, defaultHeight: 300, defaultRotation: -2, glyph: "🎵" },
];

export const isSticky = (t: ElementType) => t.startsWith("sticky-");
export const isTape   = (t: ElementType) => t.startsWith("tape-");
export const isMusic  = (t: ElementType) => t === "music";
