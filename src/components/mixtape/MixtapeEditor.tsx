import { useEffect, useMemo, useState } from "react";
import { GripVertical, Music2, Plus, Search, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { FloatingPetals } from "@/components/FloatingPetals";
import { TapeDecoration } from "@/components/TapeDecoration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  deleteMixtape,
  editorInputFromMixtape,
  emptyMixtapeEditor,
  listMixtapes,
  normalizeTrackPositions,
  saveMixtape,
  trackDraftFromSpotify,
  type MixtapeEditorInput,
  type MixtapeTrackDraft,
  type MixtapeWithTracks,
} from "@/lib/mixtape";
import { previewAudio, searchSpotifyTracks, type SpotifyTrack } from "@/lib/spotify";

const toMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const reorderTracks = (tracks: MixtapeTrackDraft[], activeId: string, overId: string) => {
  if (activeId === overId) return tracks;
  const oldIndex = tracks.findIndex((track) => track.id === activeId);
  const newIndex = tracks.findIndex((track) => track.id === overId);
  if (oldIndex === -1 || newIndex === -1) return tracks;

  const next = tracks.slice();
  const [moved] = next.splice(oldIndex, 1);
  next.splice(newIndex, 0, moved);
  return normalizeTrackPositions(next);
};

export const MixtapeEditor = () => {
  const [draft, setDraft] = useState<MixtapeEditorInput>(emptyMixtapeEditor());
  const [savedMixtapes, setSavedMixtapes] = useState<MixtapeWithTracks[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [draggedTrackId, setDraggedTrackId] = useState<string | null>(null);
  const [audioState, setAudioState] = useState(previewAudio.getState());

  const selectedTrack = useMemo(
    () => draft.tracks.find((track) => track.id === selectedTrackId) ?? null,
    [draft.tracks, selectedTrackId],
  );

  const load = async () => {
    try {
      setSavedMixtapes(await listMixtapes());
    } catch (error: unknown) {
      toast.error(toMessage(error, "Could not load mixtapes"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();

    const channel = supabase
      .channel("mixtapes-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "mixtapes" }, () => {
        void load();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "mixtape_tracks" }, () => {
        void load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => previewAudio.subscribe(setAudioState), []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSearchLoading(false);
      return;
    }

    const handle = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        setResults(await searchSpotifyTracks(searchQuery, 10));
      } catch (error: unknown) {
        toast.error(toMessage(error, "Spotify search failed"));
        setResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 320);

    return () => window.clearTimeout(handle);
  }, [searchQuery]);

  const resetDraft = () => {
    setDraft(emptyMixtapeEditor());
    setSelectedTrackId(null);
  };

  const openMixtape = (mixtape: MixtapeWithTracks) => {
    const next = editorInputFromMixtape(mixtape);
    setDraft(next);
    setSelectedTrackId(next.tracks[0]?.id ?? null);
  };

  const addTrack = (track: SpotifyTrack) => {
    setDraft((current) => {
      if (current.tracks.some((item) => item.id === track.id)) {
        toast.message("That song is already on this tape.");
        return current;
      }

      const nextTrack = trackDraftFromSpotify(track, current.tracks.length);
      const next = { ...current, tracks: [...current.tracks, nextTrack] };
      setSelectedTrackId(nextTrack.id);
      return next;
    });
  };

  const removeTrack = (trackId: string) => {
    setDraft((current) => {
      const nextTracks = normalizeTrackPositions(current.tracks.filter((track) => track.id !== trackId));
      if (selectedTrackId === trackId) {
        setSelectedTrackId(nextTracks[0]?.id ?? null);
      }
      return { ...current, tracks: nextTracks };
    });
  };

  const updateSelectedTrackNote = (note: string) => {
    if (!selectedTrackId) return;
    setDraft((current) => ({
      ...current,
      tracks: current.tracks.map((track) =>
        track.id === selectedTrackId ? { ...track, note } : track,
      ),
    }));
  };

  const handleSave = async () => {
    if (!draft.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    try {
      const saved = await saveMixtape({
        ...draft,
        tracks: normalizeTrackPositions(draft.tracks),
      });

      setDraft(editorInputFromMixtape(saved));
      setSelectedTrackId(saved.tracks[0]?.track_id ?? null);
      setSavedMixtapes((current) => {
        const filtered = current.filter((item) => item.id !== saved.id);
        return [saved, ...filtered];
      });
      toast.success(draft.id ? "Mixtape updated" : "Mixtape saved");
    } catch (error: unknown) {
      toast.error(toMessage(error, "Failed to save mixtape"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!draft.id) return;
    if (!confirm("Delete this mixtape forever?")) return;

    try {
      await deleteMixtape(draft.id);
      setSavedMixtapes((current) => current.filter((item) => item.id !== draft.id));
      resetDraft();
      toast.success("Mixtape deleted");
    } catch (error: unknown) {
      toast.error(toMessage(error, "Failed to delete mixtape"));
    }
  };

  const playTrack = (track: MixtapeTrackDraft) => {
    const nextPlayerId = `editor-track-${track.id}`;
    if (track.previewUrl) {
      previewAudio.play(nextPlayerId, track.previewUrl);
      return;
    }

    if (track.spotifyUrl) {
      window.open(track.spotifyUrl, "_blank", "noopener");
    }
  };

  return (
    <>
      <FloatingPetals count={4} />
      <main className="relative min-h-screen px-4 pb-20 pt-28">
        <div className="container max-w-[1440px]">
          <motion.header
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-10 text-center"
          >
            <Link to="/admin" className="font-hand text-ink-soft hover:text-rose">
              back to the desk
            </Link>
            <p className="mt-4 mb-2 font-ui text-xs uppercase tracking-[0.4em] text-ink-soft">
              mixtape editor
            </p>
            <h1 className="font-script text-6xl text-ink">Handcrafted Mixtapes</h1>
            <p className="mt-2 font-hand text-xl italic text-ink-soft">
              search, stack, reorder, and leave little notes where the songs need them
            </p>
          </motion.header>

          <section className="paper relative overflow-hidden rounded-[32px] px-5 py-6 sm:px-7 sm:py-7">
            <TapeDecoration variant="pink" rotate={-5} className="-top-3 left-10" width={90} />
            <TapeDecoration variant="lavender" rotate={6} className="-top-3 right-10" width={116} />

            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
              <Input
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="mixtape title"
                className="h-14 rounded-[22px] border-ink/10 bg-white/70 px-5 font-display text-2xl italic text-ink placeholder:text-ink-soft/45"
              />
              <Input
                value={draft.description}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="a sentence about what this tape is holding"
                className="h-14 rounded-[22px] border-ink/10 bg-white/70 px-5 font-hand text-2xl text-ink placeholder:text-ink-soft/45"
              />
              <Input
                value={draft.spotifyPlaylistUrl}
                onChange={(event) => setDraft((current) => ({ ...current, spotifyPlaylistUrl: event.target.value }))}
                placeholder="spotify playlist url (optional)"
                className="h-14 rounded-[22px] border-ink/10 bg-white/70 px-5 font-ui text-sm text-ink placeholder:text-ink-soft/45"
              />
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_1.15fr_0.8fr]">
              <section className="rounded-[28px] bg-white/58 p-4 shadow-paper sm:p-5">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-ink-soft" />
                  <p className="font-ui text-xs uppercase tracking-[0.34em] text-ink-soft">
                    song search
                  </p>
                </div>
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="search spotify tracks..."
                  className="mt-4 h-12 rounded-[18px] border-ink/10 bg-white/78 px-4 font-hand text-2xl text-ink placeholder:text-ink-soft/45"
                />
                <div className="mt-4 max-h-[560px] space-y-2 overflow-y-auto pr-1">
                  {searchLoading ? (
                    <p className="py-8 text-center font-hand text-2xl text-ink-soft">listening for songs...</p>
                  ) : results.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-ink/10 bg-white/42 px-4 py-8 text-center">
                      <p className="font-hand text-2xl text-ink-soft">
                        start with a song title, artist, or mood.
                      </p>
                    </div>
                  ) : (
                    results.map((track) => (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => addTrack(track)}
                        className="flex w-full items-center gap-3 rounded-[18px] border border-transparent bg-white/58 p-3 text-left transition-all hover:border-rose/18 hover:bg-white/82"
                      >
                        {track.albumArt ? (
                          <img src={track.albumArt} alt="" className="h-14 w-14 rounded-[14px] object-cover shadow-paper" />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-blush/35 text-ink-soft">
                            <Music2 className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-hand text-2xl leading-none text-ink">{track.name}</p>
                          <p className="mt-1 truncate font-ui text-sm text-ink-soft">{track.artist}</p>
                        </div>
                        <span className="rounded-full bg-rose/14 px-3 py-1 font-hand text-lg text-rose">
                          + add
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-[28px] bg-white/58 p-4 shadow-paper sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-ui text-xs uppercase tracking-[0.34em] text-ink-soft">
                      tracklist
                    </p>
                    <p className="mt-1 font-hand text-2xl text-ink-soft">
                      drag songs into the order that feels right
                    </p>
                  </div>
                  <span className="rounded-full bg-white/78 px-3 py-1 font-hand text-lg text-ink shadow-paper">
                    {draft.tracks.length} songs
                  </span>
                </div>

                <div className="mt-4 max-h-[560px] space-y-3 overflow-y-auto pr-1">
                  {draft.tracks.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-ink/10 bg-white/42 px-4 py-8 text-center">
                      <p className="font-hand text-2xl text-ink-soft">
                        add songs from the left panel to start building the tape.
                      </p>
                    </div>
                  ) : (
                    draft.tracks.map((track, index) => {
                      const isSelected = selectedTrackId === track.id;
                      const currentPlayerId = `editor-track-${track.id}`;
                      const isPlaying = audioState.elementId === currentPlayerId && audioState.playing;

                      return (
                        <div
                          key={track.id}
                          draggable
                          onDragStart={() => setDraggedTrackId(track.id)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => {
                            if (!draggedTrackId) return;
                            setDraft((current) => ({
                              ...current,
                              tracks: reorderTracks(current.tracks, draggedTrackId, track.id),
                            }));
                            setDraggedTrackId(null);
                          }}
                          onDragEnd={() => setDraggedTrackId(null)}
                          className={`rounded-[22px] border px-3 py-3 transition-all ${isSelected
                              ? "border-rose/28 bg-white/88 shadow-paper"
                              : "border-transparent bg-white/58 hover:bg-white/78"
                            }`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedTrackId(track.id)}
                            className="flex w-full items-center gap-3 text-left"
                          >
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-ink-soft/65" />
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blush/42 font-ui text-sm text-ink">
                                {index + 1}
                              </span>
                            </div>
                            {track.albumArt ? (
                              <img src={track.albumArt} alt="" className="h-12 w-12 rounded-[14px] object-cover shadow-paper" />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-peach/35 text-ink-soft">
                                <Music2 className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-hand text-2xl leading-none text-ink">{track.name}</p>
                              <p className="mt-1 truncate font-ui text-sm text-ink-soft">{track.artist}</p>
                              {track.note && (
                                <p className="mt-1 truncate font-hand text-lg text-rose/90">
                                  {track.note}
                                </p>
                              )}
                            </div>
                          </button>

                          <div className="mt-3 flex flex-wrap items-center gap-2 pl-10">
                            <Button
                              type="button"
                              onClick={() => playTrack(track)}
                              className="rounded-full border border-rose/24 bg-rose/85 px-4 text-sm text-primary-foreground shadow-none hover:bg-rose"
                            >
                              {isPlaying ? "pause preview" : track.previewUrl ? "play preview" : "open spotify"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => removeTrack(track.id)}
                              className="rounded-full font-hand text-lg text-ink-soft hover:bg-white/55 hover:text-rose"
                            >
                              remove
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="rounded-[28px] bg-white/58 p-4 shadow-paper sm:p-5">
                <p className="font-ui text-xs uppercase tracking-[0.34em] text-ink-soft">
                  track note
                </p>
                {selectedTrack ? (
                  <>
                    <div className="mt-4 rounded-[22px] bg-white/76 p-4">
                      <p className="font-display text-2xl italic leading-tight text-ink">
                        {selectedTrack.name}
                      </p>
                      <p className="mt-1 font-ui text-sm text-ink-soft">{selectedTrack.artist}</p>
                    </div>
                    <Textarea
                      value={selectedTrack.note ?? ""}
                      onChange={(event) => updateSelectedTrackNote(event.target.value)}
                      placeholder="this one sounds like..."
                      className="mt-4 min-h-[220px] rounded-[22px] border-ink/10 bg-white/78 px-4 py-4 font-hand text-2xl leading-tight text-ink placeholder:text-ink-soft/45"
                    />
                    <p className="mt-3 font-hand text-xl text-ink-soft">
                      keep it short, personal, and a little handwritten.
                    </p>
                  </>
                ) : (
                  <div className="mt-4 rounded-[22px] border border-dashed border-ink/10 bg-white/42 px-4 py-10 text-center">
                    <p className="font-hand text-2xl text-ink-soft">
                      choose a track from the middle panel to write a note for it.
                    </p>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-romantic h-auto rounded-full px-6 py-3 font-hand text-2xl text-ink"
                  >
                    <Plus className="h-4 w-4" />
                    {saving ? "saving..." : draft.id ? "save changes" : "save mixtape"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={resetDraft}
                    className="rounded-full bg-white/60 px-5 font-hand text-xl text-ink hover:bg-white"
                  >
                    new tape
                  </Button>
                  {draft.id && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleDelete}
                      className="rounded-full bg-white/60 px-5 font-hand text-xl text-rose hover:bg-white"
                    >
                      <Trash2 className="h-4 w-4" />
                      delete
                    </Button>
                  )}
                </div>
              </section>
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-ui text-xs uppercase tracking-[0.34em] text-ink-soft">
                  saved mixtapes
                </p>
                <p className="mt-1 font-hand text-2xl text-ink-soft">
                  reopen one to tweak the order or rewrite a note
                </p>
              </div>
            </div>

            {loading ? (
              <div className="paper-lined rounded-[28px] px-5 py-10 text-center">
                <p className="font-hand text-2xl text-ink-soft">pulling tapes from the shelf...</p>
              </div>
            ) : savedMixtapes.length === 0 ? (
              <div className="paper-lined rounded-[28px] px-5 py-10 text-center">
                <p className="font-hand text-2xl text-ink-soft">no mixtapes saved yet.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {savedMixtapes.map((mixtape, index) => (
                  <button
                    key={mixtape.id}
                    type="button"
                    onClick={() => openMixtape(mixtape)}
                    className="paper relative rounded-[24px] p-5 text-left transition-transform hover:-translate-y-1"
                  >
                    <TapeDecoration variant={index % 2 === 0 ? "yellow" : "mint"} rotate={-4} className="-top-3 left-8" />
                    <p className="font-script text-4xl leading-none text-ink">{mixtape.title}</p>
                    <p className="mt-2 font-hand text-xl leading-tight text-ink-soft">
                      {mixtape.description || "open to add a note, swap a song, or soften the order."}
                    </p>
                    <p className="mt-4 font-ui text-[11px] uppercase tracking-[0.28em] text-ink-soft/75">
                      {mixtape.tracks.length} songs
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
};
