import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { CANVAS_H, CANVAS_W, type ChapterElement, type PaperVariant } from "@/lib/chapters";

export type LetterCoverStyle = "yellow" | "pink" | "mint" | "blue" | "lavender";
export type LetterPageStyle = "lined" | "vintage" | "grid";

export interface LetterPageData {
  pageStyle: LetterPageStyle;
  paperVariant: PaperVariant;
  body: string;
  elements: ChapterElement[];
}

export interface LetterRow {
  id: string;
  title: string;
  subtitle: string | null;
  preview_text: string | null;
  cover_style: LetterCoverStyle;
  page_data_json: LetterPageData;
  created_at: string;
  updated_at: string;
}

export interface LetterInput {
  title: string;
  subtitle: string;
  preview_text: string;
  cover_style: LetterCoverStyle;
  page_data_json: LetterPageData;
}

export const DEFAULT_LETTER_PAGE: LetterPageData = {
  pageStyle: "lined",
  paperVariant: "blush",
  body: "",
  elements: [],
};

export const DEFAULT_LETTER: LetterInput = {
  title: "Untitled letter",
  subtitle: "for later",
  preview_text: "A page waiting for you.",
  cover_style: "pink",
  page_data_json: DEFAULT_LETTER_PAGE,
};

export const letterPaperColorMap: Record<PaperVariant, string> = {
  blush: "hsl(350 70% 94%)",
  lavender: "hsl(265 55% 93%)",
  peach: "hsl(25 80% 92%)",
  sage: "hsl(120 22% 88%)",
  blue: "hsl(210 45% 92%)",
};

export interface LetterPreviewViewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

const LETTER_BOUNDS = { width: CANVAS_W, height: CANVAS_H };
const LETTER_BODY_BOX = {
  x: 48,
  y: 64,
  width: CANVAS_W - 96,
};
const PREVIEW_PADDING_LEFT = 16;
const PREVIEW_PADDING_RIGHT = 18;
const PREVIEW_PADDING_TOP = 10;
const PREVIEW_PADDING_BOTTOM = 8;
const PREVIEW_MIN_WIDTH = 560;
const PREVIEW_MIN_HEIGHT = 150;
const LETTER_BODY_FONT_SIZE = 24.8;
const LETTER_BODY_LINE_HEIGHT = 1.625;

const isPaperVariant = (value: unknown): value is PaperVariant =>
  value === "blush" || value === "lavender" || value === "peach" || value === "sage" || value === "blue";

const isPageStyle = (value: unknown): value is LetterPageStyle =>
  value === "lined" || value === "vintage" || value === "grid";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const estimateTextWidth = (text: string, fontSize: number) => {
  if (typeof document === "undefined") {
    return text.length * fontSize * 0.46;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return text.length * fontSize * 0.46;

  context.font = `${fontSize}px Caveat`;
  return context.measureText(text).width;
};

const estimateWrappedTextMetrics = (text: string, maxWidth: number, fontSize: number, lineHeight: number) => {
  const clean = text.trim();
  if (!clean) return { width: 0, height: 0 };

  const lineHeightPx = fontSize * lineHeight;
  const paragraphs = clean.split("\n");
  let lines = 0;
  let maxLineWidth = 0;

  for (const paragraph of paragraphs) {
    const chunk = paragraph.trim();
    if (!chunk) {
      lines += 1;
      continue;
    }

    const words = chunk.split(/\s+/);
    let current = "";

    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (estimateTextWidth(next, fontSize) <= maxWidth || !current) {
        current = next;
      } else {
        maxLineWidth = Math.max(maxLineWidth, estimateTextWidth(current, fontSize));
        lines += 1;
        current = word;
      }
    }

    if (current) {
      maxLineWidth = Math.max(maxLineWidth, estimateTextWidth(current, fontSize));
      lines += 1;
    }
  }

  return {
    width: Math.min(maxWidth, Math.max(maxLineWidth, fontSize * 7)),
    height: Math.max(lineHeightPx, lines * lineHeightPx),
  };
};

const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `letter-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeElement = (value: unknown, index: number): ChapterElement | null => {
  const raw = asRecord(value);
  const type = typeof raw.type === "string" ? raw.type : null;
  if (!type) return null;

  const width = typeof raw.width === "number" ? raw.width : 180;
  const height = typeof raw.height === "number" ? raw.height : 180;

  return {
    id: typeof raw.id === "string" ? raw.id : makeId(),
    chapter_id: typeof raw.chapter_id === "string" ? raw.chapter_id : "letter-page",
    page_id: typeof raw.page_id === "string" ? raw.page_id : null,
    side: "left",
    type: type as ChapterElement["type"],
    content: typeof raw.content === "string" ? raw.content : null,
    image_url: typeof raw.image_url === "string" ? raw.image_url : null,
    storage_path: typeof raw.storage_path === "string" ? raw.storage_path : null,
    x: clamp(typeof raw.x === "number" ? raw.x : 40 + index * 12, -20, LETTER_BOUNDS.width - 20),
    y: clamp(typeof raw.y === "number" ? raw.y : 60 + index * 12, -20, LETTER_BOUNDS.height - 20),
    width: clamp(width, 40, 640),
    height: clamp(height, 24, 800),
    rotation: typeof raw.rotation === "number" ? raw.rotation : 0,
    z_index: typeof raw.z_index === "number" ? raw.z_index : index + 1,
    style: asRecord(raw.style),
  };
};

export const normalizeLetterPageData = (value: unknown): LetterPageData => {
  const raw = asRecord(value);
  const elementsRaw = Array.isArray(raw.elements) ? raw.elements : [];

  return {
    pageStyle: isPageStyle(raw.pageStyle) ? raw.pageStyle : DEFAULT_LETTER_PAGE.pageStyle,
    paperVariant: isPaperVariant(raw.paperVariant) ? raw.paperVariant : DEFAULT_LETTER_PAGE.paperVariant,
    body: typeof raw.body === "string" ? raw.body : DEFAULT_LETTER_PAGE.body,
    elements: elementsRaw
      .map((item, index) => normalizeElement(item, index))
      .filter((item): item is ChapterElement => item !== null)
      .sort((a, b) => a.z_index - b.z_index),
  };
};

const rowFromDb = (row: Tables<"letters">): LetterRow => ({
  ...row,
  cover_style: row.cover_style as LetterCoverStyle,
  page_data_json: normalizeLetterPageData(row.page_data_json),
});

export async function listLetters() {
  const { data, error } = await supabase
    .from("letters")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(rowFromDb);
}

export async function createLetter(input: LetterInput) {
  const { data, error } = await supabase
    .from("letters")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return rowFromDb(data);
}

export async function updateLetter(id: string, input: Partial<LetterInput>) {
  const { data, error } = await supabase
    .from("letters")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return rowFromDb(data);
}

export async function deleteLetter(id: string) {
  const { error } = await supabase.from("letters").delete().eq("id", id);
  if (error) throw error;
}

export const getLetterPreviewViewport = (pageData: LetterPageData): LetterPreviewViewport => {
  const bounds: Array<{ left: number; top: number; right: number; bottom: number }> = [];

  if (pageData.body.trim()) {
    const bodyMetrics = estimateWrappedTextMetrics(
      pageData.body,
      LETTER_BODY_BOX.width,
      LETTER_BODY_FONT_SIZE,
      LETTER_BODY_LINE_HEIGHT,
    );
    bounds.push({
      left: LETTER_BODY_BOX.x,
      top: LETTER_BODY_BOX.y,
      right: LETTER_BODY_BOX.x + bodyMetrics.width,
      bottom: LETTER_BODY_BOX.y + bodyMetrics.height,
    });
  }

  for (const element of pageData.elements) {
    bounds.push({
      left: element.x,
      top: element.y,
      right: element.x + element.width,
      bottom: element.y + element.height,
    });
  }

  if (bounds.length === 0) {
    bounds.push({
      left: LETTER_BODY_BOX.x,
      top: LETTER_BODY_BOX.y,
      right: LETTER_BODY_BOX.x + LETTER_BODY_BOX.width,
      bottom: LETTER_BODY_BOX.y + 180,
    });
  }

  const minLeft = Math.min(...bounds.map((item) => item.left));
  const minTop = Math.min(...bounds.map((item) => item.top));
  const maxRight = Math.max(...bounds.map((item) => item.right));
  const maxBottom = Math.max(...bounds.map((item) => item.bottom));

  const x = clamp(minLeft - PREVIEW_PADDING_LEFT, 0, CANVAS_W - 1);
  const y = clamp(minTop - PREVIEW_PADDING_TOP, 0, CANVAS_H - 1);
  const unclampedWidth = Math.max(
    PREVIEW_MIN_WIDTH,
    maxRight - minLeft + PREVIEW_PADDING_LEFT + PREVIEW_PADDING_RIGHT,
  );
  const unclampedHeight = Math.max(
    PREVIEW_MIN_HEIGHT,
    maxBottom - minTop + PREVIEW_PADDING_TOP + PREVIEW_PADDING_BOTTOM,
  );
  const width = clamp(unclampedWidth, 1, CANVAS_W - x);
  const height = clamp(unclampedHeight, 1, CANVAS_H - y);

  return { x, y, width, height };
};

export const letterPageClass = (pageStyle: LetterPageStyle) => {
  if (pageStyle === "vintage") return "paper";
  if (pageStyle === "grid") return "paper-grid";
  return "paper-lined";
};
