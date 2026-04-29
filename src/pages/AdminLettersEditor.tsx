import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FloatingPetals } from "@/components/FloatingPetals";
import { TapeDecoration } from "@/components/TapeDecoration";
import type { Asset } from "@/lib/assets";
import { AddOnsPanel } from "@/components/scrapbook/AddOnsPanel";
import { MediaLibraryModal } from "@/components/scrapbook/MediaLibraryModal";
import { SpotifySearchModal } from "@/components/scrapbook/SpotifySearchModal";
import { LetterPageCanvas } from "@/components/letters/LetterPageCanvas";
import type { ChapterElement, ElementType } from "@/lib/chapters";
import {
  DEFAULT_LETTER,
  createLetter,
  deleteLetter,
  listLetters,
  updateLetter,
  type LetterCoverStyle,
  type LetterInput,
  type LetterPageData,
  type LetterRow,
} from "@/lib/letters";
import { fetchLyrics, type SpotifyTrack } from "@/lib/spotify";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const COVER_STYLES: { value: LetterCoverStyle; label: string; tape: "yellow" | "pink" | "mint" | "blue" | "lavender" }[] = [
  { value: "pink", label: "blush", tape: "pink" },
  { value: "lavender", label: "lavender", tape: "lavender" },
  { value: "mint", label: "mint", tape: "mint" },
  { value: "blue", label: "blue", tape: "blue" },
  { value: "yellow", label: "golden", tape: "yellow" },
];

const PAPER_VARIANTS: LetterPageData["paperVariant"][] = ["blush", "lavender", "peach", "sage", "blue"];
const PAGE_STYLES: LetterPageData["pageStyle"][] = ["lined", "vintage", "grid"];
const LETTER_ADDONS: ElementType[] = [
  "tape-pink",
  "tape-yellow",
  "tape-mint",
  "tape-lavender",
  "heart",
  "flower",
  "sparkle",
  "leaf",
  "stamp",
  "envelope",
  "arrow",
  "highlight",
  "polaroid",
  "photo",
  "text",
  "music",
  "lyric_card",
];

const toMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const AdminLettersEditor = () => {
  const [letters, setLetters] = useState<LetterRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [spotifyModalMode, setSpotifyModalMode] = useState<"music" | "lyric_card" | null>(null);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);

  const lettersRef = useRef<LetterRow[]>([]);
  const dirtyIds = useRef<Set<string>>(new Set());
  const saveDebounce = useRef<number | null>(null);
  const addToCanvas = useRef<((type: ElementType, opts?: Partial<ChapterElement>) => void) | null>(null);
  const mediaModalCallback = useRef<((asset: Asset) => void) | null>(null);

  useEffect(() => {
    lettersRef.current = letters;
  }, [letters]);

  const flashSaved = () => {
    setSaving("saved");
    window.setTimeout(() => setSaving("idle"), 1200);
  };

  const load = async () => {
    try {
      const rows = await listLetters();
      setLetters(rows);
      setSelectedId((current) => {
        if (current && rows.some((row) => row.id === current)) return current;
        return rows[0]?.id ?? null;
      });
    } catch (error: unknown) {
      toast.error(toMessage(error, "Could not load letters"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const channel = supabase
      .channel("letters-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "letters" }, () => {
        load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const selected = letters.find((letter) => letter.id === selectedId) ?? null;

  const saveDirty = async () => {
    const ids = Array.from(dirtyIds.current);
    dirtyIds.current.clear();
    if (ids.length === 0) return;

    setSaving("saving");

    try {
      for (const id of ids) {
        const letter = lettersRef.current.find((item) => item.id === id);
        if (!letter) continue;

        const payload: LetterInput = {
          title: letter.title,
          subtitle: letter.subtitle ?? "",
          preview_text: letter.preview_text ?? "",
          cover_style: letter.cover_style,
          page_data_json: letter.page_data_json,
        };

        await updateLetter(id, payload);
      }

      flashSaved();
    } catch (error: unknown) {
      setSaving("idle");
      toast.error(toMessage(error, "Could not save letter"));
    }
  };

  const scheduleSave = (id: string) => {
    dirtyIds.current.add(id);
    if (saveDebounce.current) window.clearTimeout(saveDebounce.current);
    saveDebounce.current = window.setTimeout(saveDirty, 650);
  };

  const updateSelected = (patch: Partial<LetterRow>) => {
    if (!selectedId) return;
    setLetters((current) =>
      current.map((letter) => (letter.id === selectedId ? { ...letter, ...patch } : letter)),
    );
    scheduleSave(selectedId);
  };

  const create = async () => {
    try {
      const created = await createLetter(DEFAULT_LETTER);
      setLetters((current) => [...current, created]);
      setSelectedId(created.id);
      toast.success("Letter created");
    } catch (error: unknown) {
      toast.error(toMessage(error, "Could not create letter"));
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this letter forever?")) return;

    try {
      await deleteLetter(id);
      const nextLetters = letters.filter((letter) => letter.id !== id);
      setLetters(nextLetters);
      setSelectedId((current) => {
        if (current !== id) return current;
        return nextLetters[0]?.id ?? null;
      });
      toast.success("Letter deleted");
    } catch (error: unknown) {
      toast.error(toMessage(error, "Could not delete letter"));
    }
  };

  const saveNow = async () => {
    if (saveDebounce.current) window.clearTimeout(saveDebounce.current);
    await saveDirty();
  };

  const requestMedia = (callback: (asset: Asset) => void) => {
    mediaModalCallback.current = callback;
    setMediaModalOpen(true);
  };

  const selectedCover = COVER_STYLES.find((item) => item.value === selected?.cover_style)?.tape ?? "pink";

  return (
    <>
      <FloatingPetals count={4} />
      <main className="relative min-h-screen pt-24 pb-20 px-4">
        <div className="container max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <Link to="/admin" className="font-hand text-ink-soft hover:text-rose">
              back to the desk
            </Link>
            <div className="flex items-center gap-3 font-hand text-lg">
              <span className="font-print text-xs text-ink-soft">
                {saving === "saving" ? "saving..." : saving === "saved" ? "saved just now" : "autosave on"}
              </span>
              <button onClick={saveNow} className="text-ink-soft hover:text-rose">save now</button>
              <button
                onClick={create}
                className="bg-rose/90 hover:bg-rose text-cream px-4 py-2 rounded-sm shadow-paper"
              >
                + create letter
              </button>
            </div>
          </div>

          <motion.header
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <p className="font-ui text-xs tracking-[0.4em] text-ink-soft uppercase mb-2">manage letters</p>
            <h1 className="font-script text-6xl text-ink">Open when...</h1>
            <p className="font-hand text-xl text-ink-soft mt-2 italic">
              one page only, but as layered and tender as you want it to be
            </p>
          </motion.header>

          <div className="grid lg:grid-cols-[300px_1fr] gap-6">
            <aside className="paper p-5 rounded-sm space-y-4 h-fit max-h-[calc(100vh-7rem)] overflow-y-auto sticky top-24">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-print text-xs tracking-[0.3em] uppercase text-ink-soft">your letters</p>
                  <p className="font-hand text-lg text-ink">{letters.length} saved</p>
                </div>
                <button onClick={create} className="font-hand text-rose hover:text-ink">+ new</button>
              </div>

              {loading ? (
                <p className="font-hand text-lg text-ink-soft">opening envelopes...</p>
              ) : letters.length === 0 ? (
                <div className="paper-lined rounded-sm p-4">
                  <p className="font-hand text-lg text-ink-soft">No letters yet. Start the first one.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {letters.map((letter) => {
                    const cover = COVER_STYLES.find((item) => item.value === letter.cover_style)?.tape ?? "pink";
                    const isActive = letter.id === selectedId;

                    return (
                      <button
                        key={letter.id}
                        type="button"
                        onClick={() => setSelectedId(letter.id)}
                        className={`paper relative w-full rounded-sm p-4 text-left transition-all ${
                          isActive ? "ring-2 ring-rose/35 shadow-lift" : "hover:-translate-y-1"
                        }`}
                      >
                        <TapeDecoration variant={cover} rotate={-5} className="-top-3 left-7" />
                        <p className="font-ui text-[10px] tracking-[0.3em] uppercase text-ink-soft mb-2">
                          {letter.subtitle || "for later"}
                        </p>
                        <h2 className="font-display text-2xl italic text-ink">{letter.title}</h2>
                        {letter.preview_text && (
                          <p className="font-hand text-base text-ink-soft mt-3 line-clamp-2">{letter.preview_text}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </aside>

            <section>
              {!selected ? (
                <div className="paper-lined rounded-sm p-12 text-center">
                  <p className="font-hand text-2xl text-ink-soft">Choose a letter or create a new one.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    <input
                      value={selected.title}
                      onChange={(event) => updateSelected({ title: event.target.value })}
                      className="w-full text-center bg-transparent outline-none font-script text-5xl md:text-6xl text-ink"
                    />
                    <input
                      value={selected.subtitle ?? ""}
                      onChange={(event) => updateSelected({ subtitle: event.target.value })}
                      placeholder="a little category..."
                      className="mt-1 w-full text-center bg-transparent outline-none font-hand text-xl text-ink-soft italic"
                    />
                    <textarea
                      value={selected.preview_text ?? ""}
                      onChange={(event) => updateSelected({ preview_text: event.target.value })}
                      placeholder="The short line shown on the letter card..."
                      rows={2}
                      className="mt-2 w-full text-center bg-transparent outline-none font-print text-sm text-ink-soft resize-none"
                    />
                  </div>

                  <div className="grid xl:grid-cols-[280px_1fr] gap-6 items-start">
                    <aside className="paper p-5 rounded-sm space-y-5 xl:sticky xl:top-24">
                      <div>
                        <p className="font-print text-xs tracking-[0.3em] uppercase text-ink-soft mb-2">cover style</p>
                        <div className="flex flex-wrap gap-2">
                          {COVER_STYLES.map((style) => (
                            <button
                              key={style.value}
                              onClick={() => updateSelected({ cover_style: style.value })}
                              className={`rounded-full px-3 py-1.5 font-hand text-base border transition-all ${
                                selected.cover_style === style.value
                                  ? "border-rose bg-blush/50 text-ink"
                                  : "border-ink/10 bg-white/70 text-ink-soft hover:text-ink"
                              }`}
                            >
                              {style.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="font-print text-xs tracking-[0.3em] uppercase text-ink-soft mb-2">paper color</p>
                        <div className="flex flex-wrap gap-2">
                          {PAPER_VARIANTS.map((variant) => (
                            <button
                              key={variant}
                              onClick={() =>
                                updateSelected({
                                  page_data_json: { ...selected.page_data_json, paperVariant: variant },
                                })
                              }
                              className={`rounded-full px-3 py-1.5 font-hand text-base border transition-all ${
                                selected.page_data_json.paperVariant === variant
                                  ? "border-rose bg-blush/50 text-ink"
                                  : "border-ink/10 bg-white/70 text-ink-soft hover:text-ink"
                              }`}
                            >
                              {variant}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="font-print text-xs tracking-[0.3em] uppercase text-ink-soft mb-2">page texture</p>
                        <div className="flex flex-col gap-2">
                          {PAGE_STYLES.map((style) => (
                            <button
                              key={style}
                              onClick={() =>
                                updateSelected({
                                  page_data_json: { ...selected.page_data_json, pageStyle: style },
                                })
                              }
                              className={`rounded-sm px-3 py-2 text-left font-hand text-lg border transition-all ${
                                selected.page_data_json.pageStyle === style
                                  ? "border-rose bg-blush/50 text-ink"
                                  : "border-ink/10 bg-white/70 text-ink-soft hover:text-ink"
                              }`}
                            >
                              {style}
                            </button>
                          ))}
                        </div>
                      </div>

                      <AddOnsPanel
                        onAdd={(type) => addToCanvas.current?.(type)}
                        onAddMusic={() => setSpotifyModalMode("music")}
                        onAddLyricCard={() => setSpotifyModalMode("lyric_card")}
                        allowedTypes={LETTER_ADDONS}
                      />

                      <div className="pt-2 border-t border-ink/10">
                        <button onClick={() => remove(selected.id)} className="font-hand text-ink-soft hover:text-rose">
                          delete this letter
                        </button>
                      </div>
                    </aside>

                    <div className="space-y-4">
                      <div className="paper rounded-sm p-4 text-center">
                        <p className="font-print text-xs tracking-[0.3em] uppercase text-ink-soft">single page scrapbook editor</p>
                        <p className="font-hand text-lg text-ink-soft mt-1">
                          one fixed page, no page turning, but all the layered details still work
                        </p>
                      </div>

                      <article className="relative shadow-lift rounded-sm overflow-visible bg-cream w-full mx-auto max-w-[860px]">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                          <TapeDecoration variant={selectedCover} rotate={-4} width={120} />
                        </div>
                        <LetterPageCanvas
                          letterId={selected.id}
                          pageData={selected.page_data_json}
                          registerAdd={(fn) => {
                            addToCanvas.current = fn;
                          }}
                          onChange={(page) => updateSelected({ page_data_json: page })}
                          onRequestMedia={requestMedia}
                          className="w-full"
                        />
                      </article>

                      <p className="text-center font-print text-xs text-ink-soft italic">
                        tip: drag and layer anything you add, or keep it simple and let the letter body carry the moment
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <SpotifySearchModal
        open={spotifyModalMode !== null}
        onClose={() => setSpotifyModalMode(null)}
        onSelect={async (track: SpotifyTrack) => {
          if (spotifyModalMode === "music") {
            addToCanvas.current?.("music", {
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
            setSpotifyModalMode(null);
            toast.success("Music card added");
            return;
          }

          const lyrics = await fetchLyrics(track.name, track.artist);
          let lyricText = "";
          if (lyrics?.synced?.length) {
            lyricText = lyrics.synced.slice(0, 4).map((line) => line.text).join("\n");
          } else if (lyrics?.plain) {
            lyricText = lyrics.plain.split("\n").slice(0, 4).join("\n");
          } else {
            lyricText = `No lyrics found yet.\n\n${track.name} - ${track.artist}`;
          }

          addToCanvas.current?.("lyric_card", {
            content: lyricText,
            image_url: track.albumArt,
            width: 240,
            height: 260,
            rotation: 0,
            style: {
              track_name: track.name,
              artist_name: track.artist,
              album_name: track.albumName,
              spotify_url: track.spotifyUrl,
              preview_url: track.previewUrl,
              original_album_art: track.albumArt,
              theme: "dark",
              align: "center",
              bg_color: "#1e1e1e",
              text_color: "#ffffff",
              accent_color: "#1DB954",
              transparency: false,
              show_logo: true,
              show_bg_image: true,
            },
          });
          setSpotifyModalMode(null);
          toast.success("Lyric card added");
        }}
      />

      <MediaLibraryModal
        open={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        onSelect={(asset) => {
          mediaModalCallback.current?.(asset);
          mediaModalCallback.current = null;
          setMediaModalOpen(false);
        }}
      />
    </>
  );
};

export default AdminLettersEditor;
