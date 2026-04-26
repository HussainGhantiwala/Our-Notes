import { useEffect, useRef, useState, ChangeEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  ChapterPage, ChapterRow, ElementType, PaperVariant, Side, slugify,
  listChapterPages, createChapterPage, updateChapterPage, deleteChapterPage,
  reorderChapterPages, addChapterImage, getChapterImages, sanitizeText,
} from "@/lib/chapters";
import { TapeDecoration } from "@/components/TapeDecoration";
import { FloatingPetals } from "@/components/FloatingPetals";
import { ScrapbookSpread } from "@/components/scrapbook/ScrapbookSpread";
import { AddOnsPanel } from "@/components/scrapbook/AddOnsPanel";
import { SmartImage } from "@/components/scrapbook/SmartImage";
import { SpotifySearchModal } from "@/components/scrapbook/SpotifySearchModal";
import type { SpotifyTrack } from "@/lib/spotify";
import { toast } from "sonner";

const MOODS = ["🌸", "💌", "✨", "🌙", "☕", "🌿"];
const PAPERS: PaperVariant[] = ["blush", "lavender", "peach", "sage", "blue"];
const PAGE_MODES = [
  { id: "lined", label: "lined notebook", cls: "paper-lined" },
  { id: "vintage", label: "vintage paper", cls: "paper" },
  { id: "grid", label: "grid", cls: "paper-grid" },
] as const;
type PageMode = typeof PAGE_MODES[number]["id"];

const ACCEPTED = "image/jpeg,image/jpg,image/png,image/webp";

const AdminChapterEditor = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const [c, setC] = useState<ChapterRow | null>(null);
  const [pages, setPages] = useState<ChapterPage[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [imageLib, setImageLib] = useState<{ url: string; id: string }[]>([]);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [showSpotifyModal, setShowSpotifyModal] = useState(false);

  const pagesRef = useRef(pages);
  useEffect(() => { pagesRef.current = pages; }, [pages]);

  const cRef = useRef(c);
  useEffect(() => { cRef.current = c; }, [c]);

  const dirty = useRef(false);
  const debounce = useRef<number | null>(null);
  const pageDirty = useRef<Set<string>>(new Set());
  const pageDebounce = useRef<number | null>(null);
  const addToCanvas = useRef<Record<Side, ((t: ElementType, o?: any) => void) | null>>({ left: null, right: null });

  // initial load
  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase.from("chapters").select("*").eq("id", id).maybeSingle();
      if (error || !data) { toast.error("Chapter not found"); nav("/admin"); return; }
      const row = data as ChapterRow;
      // sanitize legacy text bodies
      row.left_page = sanitizeText(row.left_page);
      row.right_page = sanitizeText(row.right_page);
      setC(row);

      const pgs = await listChapterPages(row.id);
      setPages(pgs);
      setActivePageId(pgs[0]?.id ?? null);

      const imgs = await getChapterImages(row.id);
      setImageLib(imgs.map((i) => ({ url: i.url, id: i.id })));
    })();
  }, [id, nav]);

  const flash = () => { setSaving("saved"); window.setTimeout(() => setSaving("idle"), 1200); };

  const updateChapter = (patch: Partial<ChapterRow>) => {
    setC((cur) => (cur ? { ...cur, ...patch } : cur));
    dirty.current = true;
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(saveChapter, 700);
  };

  const saveChapter = async () => {
    const currentC = cRef.current;
    if (!dirty.current || !currentC) return;
    setSaving("saving");
    dirty.current = false;
    const { error } = await supabase
      .from("chapters")
      .update({
        title: currentC.title, subtitle: currentC.subtitle, date_label: currentC.date_label,
        mood: currentC.mood, tags: currentC.tags, paper_variant: currentC.paper_variant,
        preview: sanitizeText(currentC.preview), cover_caption: currentC.cover_caption,
        slug: currentC.slug || slugify(currentC.title),
      })
      .eq("id", currentC.id);
    if (error) { toast.error(error.message); setSaving("idle"); }
    else flash();
  };

  // --- page text autosave
  const updateActivePage = (patch: Partial<ChapterPage>) => {
    if (!activePageId) return;
    setPages((arr) => arr.map((p) => (p.id === activePageId ? { ...p, ...patch } : p)));
    pageDirty.current.add(activePageId);
    if (pageDebounce.current) window.clearTimeout(pageDebounce.current);
    pageDebounce.current = window.setTimeout(savePages, 600);
  };

  const savePages = async () => {
    const ids = Array.from(pageDirty.current);
    pageDirty.current.clear();
    if (ids.length === 0) return;
    setSaving("saving");
    for (const pid of ids) {
      const p = pagesRef.current.find((x) => x.id === pid);
      if (!p) continue;
      await updateChapterPage(pid, {
        left_text: sanitizeText(p.left_text),
        right_text: sanitizeText(p.right_text),
        paper_variant: p.paper_variant,
        page_style: p.page_style,
        position: p.position,
      });
    }
    flash();
  };

  const togglePublish = async () => {
    if (!c) return;
    const next = c.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("chapters").update({
      status: next,
      published_at: next === "published" ? new Date().toISOString() : null,
      slug: c.slug || slugify(c.title),
    }).eq("id", c.id);
    if (error) return toast.error(error.message);
    setC({ ...c, status: next });
    toast.success(next === "published" ? "Published ✿" : "Moved to drafts");
  };

  // --- uploads
  const uploadOne = async (file: File): Promise<string | null> => {
    if (!c) return null;
    if (!/^image\/(jpeg|jpg|png|webp)$/.test(file.type)) {
      toast.error(`${file.name}: unsupported format`); return null;
    }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${c.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("chapter-media")
      .upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
    if (upErr) { toast.error(upErr.message); return null; }
    const { data: pub } = supabase.storage.from("chapter-media").getPublicUrl(path);
    const url = pub.publicUrl;
    try { const img = await addChapterImage(c.id, url, path); setImageLib((l) => [{ url, id: img.id }, ...l]); } catch {}
    return url;
  };

  const onUploadCover = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !c) return;
    const url = await uploadOne(e.target.files[0]);
    e.target.value = "";
    if (!url) return;
    await supabase.from("chapters").update({ cover_image_url: url }).eq("id", c.id);
    setC((cur) => cur ? { ...cur, cover_image_url: url } : cur);
    flash();
  };

  const onUploadPagePhotos = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    for (const f of Array.from(e.target.files)) {
      const url = await uploadOne(f);
      if (url) addToCanvas.current.left?.("photo", { image_url: url, width: 200, height: 200, rotation: -3 });
    }
    e.target.value = "";
    toast.success("Photos added ✿");
  };

  // --- pages CRUD
  const addPage = async () => {
    if (!c) return;
    const next = await createChapterPage(c.id, pages.length, c.paper_variant);
    setPages((arr) => [...arr, next]);
    setActivePageId(next.id);
    flash();
  };

  const removePage = async (pid: string) => {
    if (pages.length === 1) { toast.error("Keep at least one page"); return; }
    if (!confirm("Delete this page and everything on it?")) return;
    await deleteChapterPage(pid);
    const remaining = pages.filter((p) => p.id !== pid);
    await reorderChapterPages(remaining.map((p) => p.id));
    setPages(remaining.map((p, i) => ({ ...p, position: i })));
    setActivePageId(remaining[0]?.id ?? null);
    flash();
  };

  const duplicatePage = async (pid: string) => {
    if (!c) return;
    const src = pages.find((p) => p.id === pid);
    if (!src) return;
    const copy = await createChapterPage(c.id, pages.length, src.paper_variant);
    await updateChapterPage(copy.id, { left_text: src.left_text, right_text: src.right_text });
    // duplicate elements
    const { data: srcEls } = await supabase.from("chapter_elements").select("*").eq("page_id", pid);
    if (srcEls && srcEls.length) {
      const rows = (srcEls as any[]).map((e) => ({
        chapter_id: e.chapter_id, page_id: copy.id, side: e.side, type: e.type,
        content: e.content, image_url: e.image_url, storage_path: e.storage_path,
        x: e.x, y: e.y, width: e.width, height: e.height, rotation: e.rotation,
        z_index: e.z_index, style: e.style ?? {},
      }));
      await supabase.from("chapter_elements").insert(rows);
    }
    const refreshed = await listChapterPages(c.id);
    setPages(refreshed);
    setActivePageId(copy.id);
    flash();
  };

  const movePage = async (pid: string, dir: -1 | 1) => {
    const idx = pages.findIndex((p) => p.id === pid);
    const j = idx + dir;
    if (idx === -1 || j < 0 || j >= pages.length) return;
    const arr = pages.slice();
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    setPages(arr.map((p, i) => ({ ...p, position: i })));
    await reorderChapterPages(arr.map((p) => p.id));
    flash();
  };

  if (!c) {
    return <main className="min-h-screen flex items-center justify-center"><p className="font-hand text-2xl text-ink-soft animate-pulse">opening your page…</p></main>;
  }

  const activePage = pages.find((p) => p.id === activePageId);
  const pageMode = activePage?.page_style ?? "lined";
  const pageCls = PAGE_MODES.find((m) => m.id === pageMode)?.cls ?? "paper-lined";

  return (
    <>
      <FloatingPetals count={3} />
      <main className="relative min-h-screen pt-24 pb-20 px-4">
        <div className="container max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <Link to="/admin" className="font-hand text-ink-soft hover:text-rose">← back to chapters</Link>
            <div className="flex items-center gap-3 font-hand text-lg">
              <span className="font-print text-xs text-ink-soft">
                {saving === "saving" ? "saving…" : saving === "saved" ? "saved just now ✓" : "autosave on"}
              </span>
              <button onClick={() => { saveChapter(); savePages(); }} className="text-ink-soft hover:text-rose">save now</button>
              <button onClick={togglePublish} className="bg-sage/70 hover:bg-sage text-ink px-4 py-2 rounded-sm shadow-paper">
                {c.status === "published" ? "unpublish" : "publish"}
              </button>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid lg:grid-cols-[280px_1fr] gap-6">
            {/* Sidebar */}
            <aside className="paper p-5 rounded-sm space-y-5 h-fit max-h-[calc(100vh-7rem)] overflow-y-auto sticky top-24">
              <div>
                <p className="font-print text-xs text-ink-soft uppercase tracking-widest mb-1">mood</p>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map((m) => (
                    <button key={m} onClick={() => updateChapter({ mood: m })}
                      className={`text-2xl w-10 h-10 rounded-full transition-all ${c.mood === m ? "bg-rose/30 scale-110" : "hover:bg-blush/40"}`}>{m}</button>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-print text-xs text-ink-soft uppercase tracking-widest mb-1">paper</p>
                <div className="flex gap-2">
                  {PAPERS.map((p) => (
                    <button key={p} onClick={() => updateChapter({ paper_variant: p })} title={p}
                      className={`w-7 h-7 rounded-full border-2 ${c.paper_variant === p ? "border-rose scale-110" : "border-white/60"}`}
                      style={{
                        background:
                          p === "blush" ? "hsl(350 70% 92%)" :
                          p === "lavender" ? "hsl(265 50% 92%)" :
                          p === "peach" ? "hsl(20 70% 90%)" :
                          p === "sage" ? "hsl(120 25% 85%)" :
                          "hsl(210 40% 90%)",
                      }} />
                  ))}
                </div>
              </div>

              <div>
                <p className="font-print text-xs text-ink-soft uppercase tracking-widest mb-1">page style</p>
                <div className="flex flex-col gap-1">
                  {PAGE_MODES.map((m) => (
                    <button key={m.id} onClick={() => updateActivePage({ page_style: m.id })}
                      className={`font-hand text-lg text-left px-2 py-1 rounded ${pageMode === m.id ? "bg-blush/60 text-ink" : "text-ink-soft hover:text-ink"}`}>{m.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-print text-xs text-ink-soft uppercase tracking-widest mb-1">date / season</p>
                <input value={c.date_label ?? ""} onChange={(e) => updateChapter({ date_label: e.target.value })}
                  placeholder="e.g. Spring 2026"
                  className="w-full bg-transparent border-b-2 border-ink/15 focus:border-rose outline-none font-hand text-xl text-ink py-1" />
              </div>

              <div>
                <p className="font-print text-xs text-ink-soft uppercase tracking-widest mb-1">tags (comma)</p>
                <input value={(c.tags ?? []).join(", ")}
                  onChange={(e) => updateChapter({ tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  className="w-full bg-transparent border-b-2 border-ink/15 focus:border-rose outline-none font-hand text-lg text-ink py-1" />
              </div>

              <div>
                <p className="font-print text-xs text-ink-soft uppercase tracking-widest mb-1">cover photo</p>
                {c.cover_image_url && (
                  <SmartImage src={c.cover_image_url} className="w-full aspect-square mb-2 polaroid p-2" />
                )}
                <label className="block font-hand text-rose hover:text-ink cursor-pointer">
                  + upload cover
                  <input type="file" accept={ACCEPTED} hidden onChange={onUploadCover} />
                </label>
                <input value={c.cover_caption ?? ""} onChange={(e) => updateChapter({ cover_caption: e.target.value })}
                  placeholder="caption…"
                  className="mt-1 w-full bg-transparent border-b-2 border-ink/15 focus:border-rose outline-none font-hand text-base text-ink py-1" />
              </div>

              <div>
                <p className="font-print text-xs text-ink-soft uppercase tracking-widest mb-1">photos</p>
                <label className="block font-hand text-rose hover:text-ink cursor-pointer">
                  + add photos to current page
                  <input type="file" accept={ACCEPTED} multiple hidden onChange={onUploadPagePhotos} />
                </label>
                {imageLib.length > 0 && (
                  <>
                    <p className="font-print text-[10px] uppercase tracking-widest text-ink-soft mt-2 mb-1">library — click to drop</p>
                    <div className="grid grid-cols-3 gap-1 max-h-32 overflow-y-auto">
                      {imageLib.map((img) => (
                        <button key={img.id}
                          onClick={() => addToCanvas.current.left?.("photo", { image_url: img.url, width: 200, height: 200, rotation: -3 })}
                          className="aspect-square overflow-hidden rounded-sm border border-ink/10 hover:border-rose">
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <AddOnsPanel onAdd={(t) => addToCanvas.current.left?.(t)} onAddMusic={() => setShowSpotifyModal(true)} />
            </aside>

            {/* Notebook + page nav */}
            <div>
              <div className="text-center mb-4">
                <input value={c.title} onChange={(e) => updateChapter({ title: e.target.value })}
                  className="w-full text-center bg-transparent outline-none font-script text-5xl md:text-6xl text-ink" />
                <input value={c.subtitle ?? ""} onChange={(e) => updateChapter({ subtitle: e.target.value })}
                  placeholder="a soft subtitle…"
                  className="mt-1 w-full text-center bg-transparent outline-none font-hand text-xl text-ink-soft italic" />
                <textarea value={c.preview ?? ""} onChange={(e) => updateChapter({ preview: e.target.value })}
                  placeholder="preview shown on the chapters page…" rows={2}
                  className="mt-2 w-full text-center bg-transparent outline-none font-print text-sm text-ink-soft resize-none" />
              </div>

              {/* Page tabs */}
              <div className="flex flex-wrap items-center gap-2 mb-3 justify-center">
                {pages.map((p, i) => (
                  <div key={p.id}
                    className={`group relative flex items-center gap-1 rounded-full border px-3 py-1 font-hand text-base transition-all ${activePageId === p.id ? "bg-blush/70 border-rose text-ink" : "bg-cream/70 border-ink/10 text-ink-soft hover:border-rose/40"}`}>
                    <button onClick={() => setActivePageId(p.id)}>page {i + 1}</button>
                    <button onClick={() => movePage(p.id, -1)} className="opacity-0 group-hover:opacity-100 hover:text-rose" title="move left">‹</button>
                    <button onClick={() => movePage(p.id, 1)} className="opacity-0 group-hover:opacity-100 hover:text-rose" title="move right">›</button>
                    <button onClick={() => duplicatePage(p.id)} className="opacity-0 group-hover:opacity-100 hover:text-rose" title="duplicate">⎘</button>
                    <button onClick={() => removePage(p.id)} className="opacity-0 group-hover:opacity-100 hover:text-rose" title="delete">✕</button>
                  </div>
                ))}
                <button onClick={addPage} className="font-hand text-rose hover:text-ink px-3 py-1 rounded-full border border-dashed border-rose/50">
                  + add page
                </button>
              </div>

              {activePage && (
                <article className="relative shadow-lift rounded-sm overflow-visible bg-cream w-full mx-auto"
                  style={{ perspective: "1500px" }}>
                  <ScrapbookSpread
                    chapterId={c.id}
                    activePage={activePage}
                    pageCls={pageCls}
                    registerAdd={(s, fn) => { addToCanvas.current[s] = fn; }}
                    onSaved={flash}
                    imageLibrary={imageLib}
                    onUploadImage={uploadOne}
                    onUpdateText={updateActivePage}
                  />
                </article>
              )}

              <p className="text-center font-print text-xs text-ink-soft italic mt-4">
                tip: drag items anywhere on either page · double-click sticky notes to write · click a polaroid to add a photo
              </p>
            </div>
          </motion.div>
        </div>
      </main>

      <SpotifySearchModal
        open={showSpotifyModal}
        onClose={() => setShowSpotifyModal(false)}
        onSelect={(track: SpotifyTrack) => {
          addToCanvas.current.left?.("music" as ElementType, {
            content: track.name,
            image_url: track.albumArt,
            width: 260,
            height: 300,
            rotation: -2,
            style: {
              artist_name: track.artist,
              album_name: track.albumName,
              spotify_url: track.spotifyUrl,
              preview_url: track.previewUrl,
              original_album_art: track.albumArt,
            },
          });
          setShowSpotifyModal(false);
          toast.success("Music card added ✿");
        }}
      />
    </>
  );
};

export default AdminChapterEditor;
