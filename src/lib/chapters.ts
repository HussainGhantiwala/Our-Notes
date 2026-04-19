// DB <-> UI mapping for chapters.
import { supabase } from "@/integrations/supabase/client";
import type { Chapter as StaticChapter } from "@/data/journal";

export type PaperVariant = "blush" | "lavender" | "peach" | "sage" | "blue";
export type Side = "left" | "right";

// Fixed virtual coordinate space — the editor and public view both render
// elements inside this size, then scale the whole canvas with CSS transform.
// This guarantees pixel-identical placement on every device.
export const CANVAS_W = 720;
export const CANVAS_H = 920;

export interface ChapterRow {
  id: string;
  author_id: string;
  slug: string | null;
  number: number | null;
  title: string;
  subtitle: string | null;
  date_label: string | null;
  mood: string | null;
  tags: string[] | null;
  paper_variant: PaperVariant;
  preview: string | null;
  left_page: string;
  right_page: string;
  cover_image_url: string | null;
  cover_caption: string | null;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChapterPage {
  id: string;
  chapter_id: string;
  position: number;
  left_text: string;
  right_text: string;
  paper_variant: PaperVariant | null;
  page_style: "lined" | "vintage" | "grid";
  created_at: string;
  updated_at: string;
}

export interface ChapterImage {
  id: string;
  chapter_id: string;
  url: string;
  storage_path: string | null;
  caption: string | null;
  position: number;
  rotation: number;
}

export type ElementType =
  | "sticky-yellow" | "sticky-pink" | "sticky-blue" | "sticky-mint" | "sticky-lavender"
  | "tape-pink" | "tape-yellow" | "tape-mint" | "tape-lavender"
  | "heart" | "flower" | "sparkle" | "leaf" | "stamp" | "envelope"
  | "polaroid" | "highlight" | "arrow" | "photo" | "text";

export interface ChapterElement {
  id: string;
  chapter_id: string;
  page_id: string | null;
  side: Side;
  type: ElementType;
  content: string | null;
  image_url: string | null;
  storage_path: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  z_index: number;
  style: Record<string, any>;
}

// ---------------- pages ----------------

export async function listChapterPages(chapterId: string) {
  const { data, error } = await supabase
    .from("chapter_pages")
    .select("*")
    .eq("chapter_id", chapterId)
    .order("position", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as any[]) as ChapterPage[];
}

export async function createChapterPage(chapterId: string, position: number, paper?: PaperVariant | null) {
  const { data, error } = await supabase
    .from("chapter_pages")
    .insert({ chapter_id: chapterId, position, paper_variant: paper ?? null, left_text: "", right_text: "", page_style: "lined" })
    .select().single();
  if (error) throw error;
  return data as any as ChapterPage;
}

export async function updateChapterPage(id: string, patch: Partial<ChapterPage>) {
  const { error } = await supabase.from("chapter_pages").update(patch as any).eq("id", id);
  if (error) throw error;
}

export async function deleteChapterPage(id: string) {
  const { error } = await supabase.from("chapter_pages").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderChapterPages(orderedIds: string[]) {
  // Update positions sequentially to avoid races.
  for (let i = 0; i < orderedIds.length; i++) {
    await supabase.from("chapter_pages").update({ position: i }).eq("id", orderedIds[i]);
  }
}

// ---------------- elements ----------------

export async function listChapterElements(chapterId: string) {
  const { data, error } = await supabase
    .from("chapter_elements")
    .select("*")
    .eq("chapter_id", chapterId)
    .order("z_index", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as any[]).map((d) => ({ ...d, style: d.style ?? {}, side: d.side ?? "left" })) as ChapterElement[];
}

export async function listPageElements(pageId: string) {
  const { data, error } = await supabase
    .from("chapter_elements")
    .select("*")
    .eq("page_id", pageId)
    .order("z_index", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as any[]).map((d) => ({ ...d, style: d.style ?? {}, side: d.side ?? "left" })) as ChapterElement[];
}

// ---------------- chapters ----------------

const STRIP_URLS = /https?:\/\/\S+\.(jpg|jpeg|png|webp|gif)(\?\S*)?/gi;
export const sanitizeText = (s: string | null | undefined) =>
  (s ?? "").replace(STRIP_URLS, "").replace(/\n{3,}/g, "\n\n").trim();

export const splitParagraphs = (text: string): string[] =>
  sanitizeText(text).split(/\n+/).map((s) => s.trim()).filter(Boolean);

// Adapt a DB row to the visual shape used by ChapterCard / JournalEntry.
export const rowToView = (r: ChapterRow): StaticChapter & { dbId: string } => ({
  dbId: r.id,
  id: r.slug || r.id,
  number: r.number ?? 0,
  title: r.title,
  date: r.date_label ?? "",
  mood: (r.mood as StaticChapter["mood"]) ?? "🌸",
  preview: sanitizeText(r.preview ?? ""),
  paperVariant: r.paper_variant,
  pages: {
    left: splitParagraphs(r.left_page),
    right: splitParagraphs(r.right_page),
    photo: r.cover_image_url ?? undefined,
    photoCaption: r.cover_caption ?? undefined,
  },
});

export async function listPublishedChapters() {
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .eq("status", "published")
    .order("number", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as ChapterRow[]) ?? [];
}

export async function listAllChapters() {
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as ChapterRow[]) ?? [];
}

export async function getChapterBySlugOrId(idOrSlug: string) {
  let { data } = await supabase
    .from("chapters")
    .select("*")
    .eq("slug", idOrSlug)
    .maybeSingle();
  if (!data) {
    const res = await supabase.from("chapters").select("*").eq("id", idOrSlug).maybeSingle();
    data = res.data;
  }
  return (data as ChapterRow | null) ?? null;
}

export async function getChapterImages(chapterId: string) {
  const { data, error } = await supabase
    .from("chapter_images")
    .select("*")
    .eq("chapter_id", chapterId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data as ChapterImage[]) ?? [];
}

export async function addChapterImage(chapterId: string, url: string, storagePath: string | null) {
  const { data, error } = await supabase
    .from("chapter_images")
    .insert({ chapter_id: chapterId, url, storage_path: storagePath, position: 0 })
    .select().single();
  if (error) throw error;
  return data as any as ChapterImage;
}

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) ||
  Math.random().toString(36).slice(2, 8);
