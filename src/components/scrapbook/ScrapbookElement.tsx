import { useRef, useState, useEffect, PointerEvent as RPE, ChangeEvent, memo } from "react";
import { ChapterElement, ElementType } from "@/lib/chapters";
import { isSticky, isTape, isMusic, isLyricCard } from "./elementMeta";
import { SmartImage } from "./SmartImage";
import { previewAudio, parseLRC, fetchLyrics, type SyncedLine } from "@/lib/spotify";

interface Props {
  el: ChapterElement;
  selected: boolean;
  readOnly?: boolean;
  bounds: { width: number; height: number };
  scale: number;
  onRequestMedia?: (cb: (asset: any) => void) => void;
  onSelect: () => void;
  onChange: (patch: Partial<ChapterElement>) => void;
  onCommit: () => void;
  onSetImage: (url: string | null, storagePath?: string | null, asset_id?: string) => void;
}

const stickyBg: Record<string, string> = {
  "sticky-yellow": "hsl(var(--washi-yellow))",
  "sticky-pink": "hsl(var(--blush))",
  "sticky-blue": "hsl(var(--dusty-blue))",
  "sticky-mint": "hsl(var(--washi-mint))",
  "sticky-lavender": "hsl(var(--lavender))",
};
const tapeBg: Record<string, string> = {
  "tape-pink": "hsl(var(--blush) / 0.85)",
  "tape-yellow": "hsl(var(--washi-yellow) / 0.8)",
  "tape-mint": "hsl(var(--washi-mint) / 0.8)",
  "tape-lavender": "hsl(var(--lavender) / 0.8)",
};
const stickerGlyph: Partial<Record<ElementType, string>> = {
  heart: "❤", flower: "🌷", sparkle: "✦", leaf: "🍃", stamp: "✉", envelope: "💌", arrow: "➶",
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/* ---- Lyrics overlay component ---- */
const LyricsOverlay = ({ lines, currentTime, snippet, trackName, artist }: {
  lines: SyncedLine[];
  currentTime: number;
  snippet?: string;
  trackName: string;
  artist: string;
}) => {
  // If we have synced lyrics, find the current line
  if (lines.length > 0) {
    let activeIdx = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (currentTime >= lines[i].time) { activeIdx = i; break; }
    }
    // Show current + next line
    const visibleLines = [];
    if (activeIdx >= 0) visibleLines.push({ text: lines[activeIdx].text, active: true });
    if (activeIdx + 1 < lines.length) visibleLines.push({ text: lines[activeIdx + 1].text, active: false });
    if (visibleLines.length === 0 && lines.length > 0) {
      visibleLines.push({ text: lines[0].text, active: false });
    }

    return (
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none" style={{ zIndex: 5 }}>
        <div className="text-center space-y-1 max-w-full">
          {visibleLines.map((l, i) => (
            <p
              key={`${i}-${l.text.slice(0, 20)}`}
              className="font-hand leading-snug transition-all duration-500 ease-out"
              style={{
                color: l.active ? "white" : "rgba(255,255,255,0.4)",
                fontSize: l.active ? "clamp(14px, 5cqi, 22px)" : "clamp(11px, 3.5cqi, 16px)",
                textShadow: l.active ? "0 2px 12px rgba(0,0,0,0.7)" : "0 1px 6px rgba(0,0,0,0.4)",
                transform: l.active ? "scale(1)" : "scale(0.92)",
                filter: l.active ? "none" : "blur(0.3px)",
              }}
            >
              {l.text}
            </p>
          ))}
        </div>
      </div>
    );
  }

  // Fallback: manual snippet
  if (snippet?.trim()) {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none" style={{ zIndex: 5 }}>
        <p className="font-hand text-white text-center leading-snug animate-pulse"
          style={{ fontSize: "clamp(13px, 4.5cqi, 20px)", textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>
          {snippet}
        </p>
      </div>
    );
  }

  // Fallback: animated track title
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none" style={{ zIndex: 5 }}>
      <div className="text-center">
        <p className="font-hand text-white text-lg leading-tight mb-1 animate-pulse"
          style={{ textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>
          {trackName}
        </p>
        <p className="text-white/50 text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>
          {artist}
        </p>
      </div>
    </div>
  );
};

/* ---- Waveform animation bars ---- */
const WaveformBars = () => (
  <div className="flex items-end gap-[2px] h-3">
    {[0, 1, 2, 3].map((i) => (
      <div
        key={i}
        className="w-[2px] bg-white rounded-full"
        style={{
          animation: `musicWave 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
          height: "100%",
        }}
      />
    ))}
    <style>{`@keyframes musicWave { 0% { transform: scaleY(0.3); } 100% { transform: scaleY(1); } }`}</style>
  </div>
);

const ScrapbookElementInner = ({
  el, selected, readOnly, bounds, scale, onRequestMedia,
  onSelect, onChange, onCommit, onSetImage,
}: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: "move" | "resize" | "rotate" | null; startX: number; startY: number; orig: ChapterElement } | null>(null);
  const hasDragged = useRef(false);
  const [editing, setEditing] = useState(false);
  const [picker, setPicker] = useState(false);
  const [editingLyrics, setEditingLyrics] = useState(false);
  const [customizingLyric, setCustomizingLyric] = useState(false);

  // Audio state from global singleton
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioTime, setAudioTime] = useState(0);

  useEffect(() => {
    if (!isMusic(el.type)) return;
    const unsub = previewAudio.subscribe((state) => {
      const isMe = state.elementId === el.id;
      setAudioPlaying(isMe && state.playing);
      setAudioTime(isMe ? state.currentTime : 0);
    });
    return unsub;
  }, [el.id, el.type]);

  // Auto-fetch lyrics from LRCLIB on first play
  const [fetchedLyrics, setFetchedLyrics] = useState<SyncedLine[]>([]);
  const lyricsFetched = useRef(false);

  useEffect(() => {
    if (!isMusic(el.type) || !audioPlaying || lyricsFetched.current) return;
    // Already have stored synced lyrics
    if (el.style?.synced_lyrics) return;
    // Already have a manual snippet — no need to fetch
    if (el.style?.lyrics_snippet?.trim()) return;

    lyricsFetched.current = true;
    const trackName = el.content ?? "";
    const artist = el.style?.artist_name ?? "";
    if (!trackName) return;

    fetchLyrics(trackName, artist).then((lyr) => {
      if (!lyr?.synced?.length) return;
      setFetchedLyrics(lyr.synced);
      // Persist to DB so we don't need to re-fetch
      onChange({ style: { ...(el.style ?? {}), synced_lyrics: lyr.synced } });
      onCommit();
    }).catch(() => { });
  }, [audioPlaying, el.type, el.content, el.style, onChange, onCommit]);

  const onPointerDown = (e: RPE<HTMLDivElement>, mode: "move" | "resize" | "rotate") => {
    if (readOnly) return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    onSelect();
    hasDragged.current = false;
    drag.current = { mode, startX: e.clientX, startY: e.clientY, orig: { ...el } };
  };
  const onPointerMove = (e: RPE<HTMLDivElement>) => {
    if (!drag.current) return;
    const d = drag.current;
    
    // Distinguish drag from click
    if (Math.abs(e.clientX - d.startX) > 5 || Math.abs(e.clientY - d.startY) > 5) {
      hasDragged.current = true;
    }

    // divide by scale so 1 screen px == 1 virtual px feels natural
    const dx = (e.clientX - d.startX) / Math.max(scale, 0.001);
    const dy = (e.clientY - d.startY) / Math.max(scale, 0.001);
    if (d.mode === "move") {
      onChange({
        x: clamp(d.orig.x + dx, -20, bounds.width - 20),
        y: clamp(d.orig.y + dy, -20, bounds.height - 20),
      });
    } else if (d.mode === "resize") {
      onChange({
        width: clamp(d.orig.width + dx, 40, 640),
        height: clamp(d.orig.height + dy, 24, 800),
      });
    } else if (d.mode === "rotate") {
      onChange({ rotation: d.orig.rotation + dx * 0.5 });
    }
  };
  const onPointerUp = () => {
    if (drag.current) {
      drag.current = null;
      onCommit();
    }
  };

  const renderBody = () => {
    if (isSticky(el.type)) {
      return (
        <div
          className="w-full h-full p-3 font-hand text-ink text-lg leading-snug overflow-hidden"
          style={{ background: stickyBg[el.type], boxShadow: "2px 4px 8px hsl(20 30% 25% / 0.18)", borderRadius: 2 }}
          onDoubleClick={() => !readOnly && setEditing(true)}
        >
          {editing ? (
            <textarea
              autoFocus
              defaultValue={el.content ?? ""}
              onPointerDown={(e) => e.stopPropagation()}
              onBlur={(e) => { setEditing(false); onChange({ content: e.target.value }); onCommit(); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
              className="w-full h-full bg-transparent outline-none resize-none font-hand text-ink text-lg"
            />
          ) : (
            <p className="whitespace-pre-wrap break-words">{el.content || "double-click to write"}</p>
          )}
        </div>
      );
    }
    if (isTape(el.type)) {
      return (
        <div
          className="w-full h-full"
          style={{
            background: tapeBg[el.type],
            backgroundImage: `repeating-linear-gradient(90deg, transparent 0 6px, hsl(20 30% 25% / 0.05) 6px 7px)`,
            boxShadow: "0 1px 2px hsl(20 30% 25% / 0.1)",
          }}
        />
      );
    }
    if (el.type === "highlight") {
      return (
        <div
          className="w-full h-full flex items-center px-3 font-hand text-ink text-lg"
          style={{ background: "hsl(var(--washi-yellow) / 0.7)", borderRadius: 4 }}
          onDoubleClick={() => !readOnly && setEditing(true)}
        >
          {editing ? (
            <input
              autoFocus
              defaultValue={el.content ?? ""}
              onPointerDown={(e) => e.stopPropagation()}
              onBlur={(e) => { setEditing(false); onChange({ content: e.target.value }); onCommit(); }}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
              className="w-full bg-transparent outline-none font-hand text-ink text-lg"
            />
          ) : (
            <span className="truncate">{el.content || "highlight"}</span>
          )}
        </div>
      );
    }
    if (el.type === "polaroid") {
      const fit = el.style?.fit === "contain" ? "object-contain" : "object-cover";
      return (
        <div className="polaroid w-full h-full p-2 flex flex-col" style={{ background: "white" }}>
          {el.image_url ? (
            <SmartImage src={el.image_url} className={`flex-1 w-full overflow-hidden`} />
          ) : (
            <button
              type="button"
              disabled={readOnly}
              onClick={(e) => { e.stopPropagation(); if (!readOnly) setPicker(true); }}
              className="flex-1 w-full bg-blush/40 hover:bg-blush/60 flex items-center justify-center font-hand text-ink-soft text-sm transition-colors"
            >
              {readOnly ? "photo" : "+ add a photo"}
            </button>
          )}
          <input
            defaultValue={el.content ?? ""}
            onPointerDown={(e) => e.stopPropagation()}
            onBlur={(e) => { onChange({ content: e.target.value }); onCommit(); }}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            placeholder="caption…"
            disabled={readOnly}
            className="mt-1 w-full text-center bg-transparent outline-none font-hand text-sm text-ink"
          />
          {/* hidden so SmartImage above can use cover/contain via style */}
          <style>{`.polaroid img { ${fit === "object-contain" ? "object-fit: contain;" : "object-fit: cover;"} }`}</style>
        </div>
      );
    }
    if (el.type === "photo") {
      return (
        <div className="w-full h-full polaroid p-2" style={{ background: "white" }}>
          {el.image_url ? (
            <SmartImage src={el.image_url} className="w-full h-full" />
          ) : (
            <button
              type="button"
              disabled={readOnly}
              onClick={(e) => { e.stopPropagation(); if (!readOnly) setPicker(true); }}
              className="w-full h-full bg-blush/40 hover:bg-blush/60 flex items-center justify-center font-hand text-ink-soft text-sm"
            >
              {readOnly ? "photo" : "+ add a photo"}
            </button>
          )}
        </div>
      );
    }
    if (el.type === "text") {
      return (
        <div
          className="w-full h-full font-script text-3xl text-ink leading-tight p-1"
          onDoubleClick={() => !readOnly && setEditing(true)}
        >
          {editing ? (
            <textarea
              autoFocus
              defaultValue={el.content ?? ""}
              onPointerDown={(e) => e.stopPropagation()}
              onBlur={(e) => { setEditing(false); onChange({ content: e.target.value }); onCommit(); }}
              className="w-full h-full bg-transparent outline-none resize-none font-script text-3xl text-ink"
            />
          ) : (
            <p className="whitespace-pre-wrap">{el.content}</p>
          )}
        </div>
      );
    }
    if (isMusic(el.type)) {
      const artist = el.style?.artist_name ?? "";
      const spotifyUrl = el.style?.spotify_url ?? "";
      const previewUrl = el.style?.preview_url ?? null;
      const albumArt = el.image_url;
      const layout = el.style?.music_layout ?? "full";
      const lyricsSnippet = el.style?.lyrics_snippet ?? "";
      const storedLyrics: SyncedLine[] = el.style?.synced_lyrics
        ? (typeof el.style.synced_lyrics === "string" ? parseLRC(el.style.synced_lyrics) : el.style.synced_lyrics as SyncedLine[])
        : [];
      const syncedLyrics = storedLyrics.length > 0 ? storedLyrics : fetchedLyrics;

      const handlePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (previewUrl) {
          previewAudio.play(el.id, previewUrl);
        } else if (spotifyUrl) {
          window.open(spotifyUrl, "_blank", "noopener");
        }
      };

      // Shared Spotify logo SVG path
      const spotifyPath = "M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381C8.88 5.76 15.78 6.06 20.1 8.82c.541.3.719 1.02.42 1.561-.299.421-1.02.599-1.439.299z";

      // Consistent play button across all layouts
      const PlayBtn = ({ size = 12, btnClass = "" }: { size?: number; btnClass?: string }) => (
        <button
          onClick={handlePlay}
          onPointerDown={(e) => e.stopPropagation()}
          className={`flex items-center justify-center transition-all ${btnClass}`}
          style={audioPlaying ? { animation: "musicPulse 2s ease-in-out infinite" } : {}}
        >
          {audioPlaying ? (
            <div className="flex items-center gap-1.5">
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="white">
                <rect x={size * 0.12} y={size * 0.12} width={size * 0.3} height={size * 0.76} rx={1} />
                <rect x={size * 0.58} y={size * 0.12} width={size * 0.3} height={size * 0.76} rx={1} />
              </svg>
              <WaveformBars />
            </div>
          ) : (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="white">
              <path d={`M${size * 0.2} ${size * 0.1}l${size * 0.7} ${size * 0.4}-${size * 0.7} ${size * 0.4}V${size * 0.1}z`} />
            </svg>
          )}
        </button>
      );

      // Shared keyframes style block (emitted once)
      const MusicKeyframes = () => (
        <style>{`
          @keyframes musicPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.2); } 50% { box-shadow: 0 0 12px 4px rgba(255,255,255,0.15); } }
          @keyframes musicWave { 0% { transform: scaleY(0.3); } 100% { transform: scaleY(1); } }
          @keyframes pillGlow { 0%, 100% { box-shadow: 0 0 8px 0 rgba(29,185,84,0.15); } 50% { box-shadow: 0 0 16px 4px rgba(29,185,84,0.3); } }
        `}</style>
      );

      // ==========================================
      // LAYOUT 3: MINI FLOATING PILL
      // ==========================================
      if (layout === "pill") {
        return (
          <div
            className="w-full h-full flex items-center justify-center cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (!hasDragged.current) {
                handlePlay(e);
              }
            }}
            style={{
              background: "linear-gradient(135deg, rgba(30,30,30,0.85) 0%, rgba(20,25,20,0.9) 100%)",
              borderRadius: 999,
              boxShadow: "0 2px 12px hsl(0 0% 0% / 0.25)",
              backdropFilter: "blur(12px)",
              containerType: "inline-size",
              minWidth: 180,
              minHeight: 36,
              pointerEvents: "auto",
              ...(audioPlaying ? { animation: "pillGlow 2s ease-in-out infinite" } : {}),
            }}
          >
            <div className="flex items-center gap-2 px-4 py-1 w-full min-w-0 pointer-events-none">
              <div className="flex items-center justify-center flex-none w-6 h-6 rounded-full transition-colors">
                {audioPlaying ? (
                  <WaveformBars />
                ) : (
                  <span className="text-[#1DB954] text-sm">♪</span>
                )}
              </div>
              <p
                className="flex-1 min-w-0 text-white text-[13px] font-medium truncate select-none"
                style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "0.01em" }}
              >
                {el.content || "song"} <span className="text-white/40">—</span> <span className="text-white/60">{artist}</span>
              </p>
              {audioPlaying && (
                <svg width={10} height={10} viewBox="0 0 10 10" fill="white" className="flex-none opacity-60">
                  <rect x={1} y={1} width={3} height={8} rx={0.5} />
                  <rect x={6} y={1} width={3} height={8} rx={0.5} />
                </svg>
              )}
            </div>
            <MusicKeyframes />
          </div>
        );
      }

      // ==========================================
      // LAYOUT 2: COMPACT HORIZONTAL CARD
      // ==========================================
      if (layout === "horizontal") {
        const isNarrow = el.width < 220;
        const artShape = el.style?.art_shape ?? "rounded"; // future: "square" | "rounded" | "circle"
        const artRadius = artShape === "circle" ? "50%" : artShape === "square" ? "4px" : "10px";

        return (
          <div
            className={`w-full h-full ${isNarrow ? "flex flex-col items-center justify-center gap-1.5 p-2" : "flex items-center gap-3 p-3"} overflow-hidden relative`}
            style={{
              background: "linear-gradient(135deg, hsl(160 30% 18%) 0%, hsl(200 28% 14%) 100%)",
              borderRadius: 14,
              boxShadow: "0 4px 20px hsl(0 0% 0% / 0.3), 0 1px 3px hsl(0 0% 0% / 0.15)",
              containerType: "inline-size",
            }}
          >
            {albumArt ? (
              <img
                src={albumArt} alt=""
                className={`${isNarrow ? "w-10 h-10" : "w-11 h-11"} object-cover flex-none shadow-md`}
                style={{ zIndex: 2, borderRadius: artRadius }}
              />
            ) : (
              <div
                className={`${isNarrow ? "w-10 h-10" : "w-11 h-11"} bg-white/10 flex items-center justify-center flex-none text-lg`}
                style={{ zIndex: 2, borderRadius: artRadius }}
              >🎵</div>
            )}
            <div className={`${isNarrow ? "text-center w-full" : "flex-1"} min-w-0`} style={{ zIndex: 2 }}>
              <p className={`text-white truncate leading-tight ${isNarrow ? "text-[11px]" : "text-[13px]"} font-semibold`} style={{ fontFamily: "'Inter', sans-serif" }}>
                {el.content || "song"}
              </p>
              <p className={`text-white/50 truncate ${isNarrow ? "text-[9px]" : "text-[11px]"}`} style={{ fontFamily: "'Inter', sans-serif" }}>
                {artist}
              </p>
            </div>
            {!isNarrow && (
              <div style={{ zIndex: 2 }}>
                <PlayBtn size={12} btnClass="flex-none w-8 h-8 rounded-full bg-white/15 hover:bg-white/25" />
              </div>
            )}
            {/* Tiny Spotify badge */}
            <div className="absolute bottom-1.5 right-2.5 opacity-40" style={{ zIndex: 2 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" className="text-[#1DB954]">
                <path d={spotifyPath} fill="currentColor" />
              </svg>
            </div>
            <MusicKeyframes />
          </div>
        );
      }

      // ==========================================
      // LAYOUT 1: FULL COVER CARD (default)
      // ==========================================
      return (
        <div
          className="w-full h-full relative overflow-hidden"
          style={{
            borderRadius: 14,
            boxShadow: "0 8px 32px hsl(0 0% 0% / 0.35), 0 2px 8px hsl(0 0% 0% / 0.2)",
            containerType: "inline-size",
          }}
        >
          {/* Background: album art or gradient */}
          {albumArt ? (
            <img src={albumArt} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, hsl(160 30% 20%) 0%, hsl(220 25% 18%) 100%)" }} />
          )}

          {/* Dark overlay — stronger when lyrics are showing */}
          <div className="absolute inset-0 transition-colors duration-500" style={{
            background: audioPlaying
              ? "linear-gradient(to top, hsl(0 0% 0% / 0.85) 0%, hsl(0 0% 0% / 0.55) 50%, hsl(0 0% 0% / 0.35) 100%)"
              : "linear-gradient(to top, hsl(0 0% 0% / 0.75) 0%, hsl(0 0% 0% / 0.25) 50%, hsl(0 0% 0% / 0.1) 100%)",
          }} />

          {/* Lyrics overlay — only when playing */}
          {audioPlaying && (
            <LyricsOverlay
              lines={syncedLyrics}
              currentTime={audioTime}
              snippet={lyricsSnippet}
              trackName={el.content || "song"}
              artist={artist}
            />
          )}

          {/* Content overlay */}
          <div className="absolute inset-0 flex flex-col justify-end p-4" style={{ zIndex: 6 }}>
            {/* Small album art + track info at top */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              {albumArt && (
                <img src={albumArt} alt="" className="w-10 h-10 rounded-md object-cover shadow-lg" />
              )}
              <div className="min-w-0">
                <p className="text-white/90 text-xs font-semibold truncate" style={{ fontFamily: "'Inter', sans-serif" }}>{el.content || "song"}</p>
                <p className="text-white/60 text-[10px] truncate" style={{ fontFamily: "'Inter', sans-serif" }}>Song · {artist}</p>
              </div>
            </div>

            {/* Bottom section */}
            <div className="flex items-end justify-between">
              <div className="flex-1 min-w-0 mr-3">
                {!audioPlaying && (
                  <>
                    <p className="font-hand text-2xl text-white leading-tight mb-1 drop-shadow-lg"
                      style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
                      {el.content || "song"}
                    </p>
                    <p className="text-white/70 text-sm truncate" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {artist}
                    </p>
                  </>
                )}
              </div>
              <PlayBtn size={16} btnClass="flex-none w-11 h-11 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/20 hover:scale-110" />
            </div>

            {/* Spotify attribution */}
            <div className="flex items-center gap-1.5 mt-3">
              <svg width="12" height="12" viewBox="0 0 24 24" className="text-[#1DB954]">
                <path d={spotifyPath} fill="currentColor" />
              </svg>
              <span className="text-white/40 text-[9px] uppercase tracking-wider" style={{ fontFamily: "'Inter', sans-serif" }}>Spotify</span>
            </div>
          </div>

          <MusicKeyframes />
        </div>
      );
    }
    if (isLyricCard(el.type)) {
      const artist = el.style?.artist_name ?? "";
      const albumArt = el.image_url;
      const theme = el.style?.theme ?? "dark";
      const align = el.style?.align ?? "center";
      const bgColor = el.style?.bg_color ?? (theme === "dark" ? "#1e1e1e" : "#f5f5f5");
      const textColor = el.style?.text_color ?? (theme === "dark" ? "#ffffff" : "#1a1a1a");
      const accentColor = el.style?.accent_color ?? "#1DB954";
      const transparency = el.style?.transparency ?? false;
      const showLogo = el.style?.show_logo ?? true;
      const showBgImage = el.style?.show_bg_image ?? true;
      const showAlbumArt = el.style?.show_album_art ?? true;

      // Auto font scaling: reduce size for longer lyrics
      const contentLen = (el.content ?? "").length;
      const autoScale = contentLen > 200 ? 0.7 : contentLen > 120 ? 0.8 : contentLen > 60 ? 0.9 : 1;

      const bgStyle: React.CSSProperties = {
        backgroundColor: transparency ? "transparent" : bgColor,
        color: textColor,
        borderRadius: 14,
        boxShadow: transparency ? "none" : "0 6px 24px hsl(0 0% 0% / 0.12), 0 2px 6px hsl(0 0% 0% / 0.06)",
        containerType: "inline-size",
        overflow: "hidden",
      };

      const headerAlignItems = align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";

      return (
        <div className="w-full h-full relative flex flex-col" style={bgStyle}>
          {showBgImage && albumArt && !transparency && (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${albumArt})`,
                  filter: "blur(60px) saturate(1.4)",
                  transform: "scale(1.3)",
                  opacity: theme === "dark" ? 0.4 : 0.3,
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: theme === "dark" ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.75)",
                }}
              />
            </>
          )}

          <div className="relative z-10 flex flex-col h-full p-4">
            {/* Header: Album Art & Track Info */}
            <div className="flex items-center gap-2.5 mb-0 pb-2.5" style={{
              textAlign: align as any,
              borderBottom: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
              justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
            }}>
              {showAlbumArt && albumArt && (
                <img src={albumArt} alt="" className="w-10 h-10 rounded-md object-cover shadow-sm flex-none" />
              )}
              <div className="min-w-0">
                <p className="font-semibold text-[13px] truncate" style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "0.01em" }}>
                  {el.style?.track_name ?? el.style?.album_name ?? "song"}
                </p>
                <p className="text-[10px] opacity-50 truncate mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {artist}
                </p>
              </div>
            </div>

            {/* Body: Lyric Text with fade overflow */}
            <div
              className="flex-1 overflow-hidden flex flex-col justify-center cursor-text group relative"
              onClick={() => !readOnly && setEditing(true)}
              style={{
                maskImage: "linear-gradient(to bottom, black 0%, black 75%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 75%, transparent 100%)",
                paddingTop: 12,
              }}
            >
              {editing ? (
                <textarea
                  autoFocus
                  defaultValue={el.content ?? ""}
                  onPointerDown={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    setEditing(false);
                    onChange({ content: e.target.value });
                    onCommit();
                  }}
                  className="w-full h-full bg-transparent p-0 outline-none resize-none font-semibold"
                  style={{
                    color: "inherit",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: `calc(clamp(14px, 7cqi, 26px) * ${autoScale})`,
                    textAlign: align as any,
                    lineHeight: 1.45,
                    letterSpacing: "-0.01em",
                  }}
                />
              ) : (
                <p
                  className={`whitespace-pre-wrap font-semibold ${!readOnly ? "group-hover:opacity-80 transition-opacity" : ""}`}
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: `calc(clamp(14px, 7cqi, 26px) * ${autoScale})`,
                    textAlign: align as any,
                    lineHeight: 1.45,
                    letterSpacing: "-0.01em",
                    textShadow: showBgImage && !transparency ? "0 1px 6px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  {el.content || (readOnly ? "" : "tap to add lyrics…")}
                </p>
              )}
            </div>

            {/* Footer: Smaller Spotify Logo */}
            {showLogo && (
              <div className="flex justify-end mt-2 opacity-60">
                <svg width="14" height="14" viewBox="0 0 24 24" style={{ color: accentColor }}>
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381C8.88 5.76 15.78 6.06 20.1 8.82c.541.3.719 1.02.42 1.561-.299.421-1.02.599-1.439.299z" fill="currentColor" />
                </svg>
              </div>
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center select-none" style={{ fontSize: Math.min(el.width, el.height) * 0.8 }}>
        <span style={{ filter: "drop-shadow(0 2px 2px hsl(20 30% 25% / 0.2))" }}>{stickerGlyph[el.type] ?? "✿"}</span>
      </div>
    );
  };

  const isImageHolder = el.type === "polaroid" || el.type === "photo" || isMusic(el.type) || isLyricCard(el.type);

  return (
    <div
      ref={ref}
      onPointerDown={(e) => onPointerDown(e, "move")}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className={`absolute touch-none ${selected ? "outline-dashed outline-2 outline-rose/60 outline-offset-4" : ""} ${readOnly ? "" : "cursor-move"}`}
      style={{
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        transform: `rotate(${el.rotation}deg)`,
        zIndex: el.z_index,
      }}
    >
      {renderBody()}

      {selected && !readOnly && (
        <>
          <div
            onPointerDown={(e) => onPointerDown(e, "resize")}
            className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-white border-2 border-rose cursor-se-resize"
            title="resize"
          />
          <div
            onPointerDown={(e) => onPointerDown(e, "rotate")}
            className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-sage cursor-grab"
            title="rotate"
          />
          {isImageHolder && (
            <div className="absolute -bottom-9 left-1/2 flex gap-1 bg-cream/95 border border-ink/15 rounded-full px-2 py-1 shadow-paper font-hand text-xs text-ink whitespace-nowrap"
              style={{ transform: `translateX(-50%) rotate(${-el.rotation}deg)` }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}>
              <button onClick={() => setPicker(true)} className="px-1.5 hover:text-rose">{el.image_url ? "replace" : "add image"}</button>
              {el.image_url && (
                <>
                  <span className="text-ink-soft">·</span>
                  <button
                    onClick={() => { onChange({ style: { ...(el.style ?? {}), fit: el.style?.fit === "contain" ? "cover" : "contain" } }); onCommit(); }}
                    className="px-1.5 hover:text-rose">
                    {el.style?.fit === "contain" ? "cover" : "fit"}
                  </button>
                  <span className="text-ink-soft">·</span>
                  <button onClick={() => onSetImage(null, null)} className="px-1.5 hover:text-rose">remove</button>
                </>
              )}
              {isMusic(el.type) && (
                <>
                  <span className="text-ink-soft">·</span>
                  {/* Layout switcher */}
                  {(["full", "horizontal", "pill"] as const).map((lay) => {
                    const label = lay === "full" ? "▣" : lay === "horizontal" ? "▬" : "●";
                    const title = lay === "full" ? "Full Cover" : lay === "horizontal" ? "Horizontal" : "Mini Pill";
                    const isActive = (el.style?.music_layout ?? "full") === lay;
                    const sizes: Record<string, { width: number; height: number }> = {
                      full: { width: 260, height: 300 },
                      horizontal: { width: 280, height: 72 },
                      pill: { width: 240, height: 36 },
                    };
                    return (
                      <button
                        key={lay}
                        onClick={() => {
                          const s = sizes[lay];
                          onChange({ width: s.width, height: s.height, style: { ...(el.style ?? {}), music_layout: lay } });
                          onCommit();
                        }}
                        className={`px-1 text-[11px] ${isActive ? "text-rose font-bold" : "hover:text-rose"}`}
                        title={title}
                      >{label}</button>
                    );
                  })}
                  <span className="text-ink-soft">·</span>
                  <button onClick={() => setEditingLyrics(!editingLyrics)} className="px-1.5 hover:text-rose">
                    {editingLyrics ? "close lyrics" : "✎ lyrics"}
                  </button>
                </>
              )}
              {isLyricCard(el.type) && (
                <>
                  <span className="text-ink-soft">·</span>
                  <button onClick={() => setCustomizingLyric(!customizingLyric)} className="px-1.5 hover:text-rose">
                    {customizingLyric ? "done" : "✨ customize"}
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}

      {picker && !readOnly && isImageHolder && (
        <div
          className="absolute z-[10000] left-1/2 -translate-x-1/2 top-full mt-12 w-[220px] bg-cream/98 border border-ink/15 rounded-md shadow-lift p-3 flex flex-col gap-2"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="font-hand text-base text-ink">choose a photo</p>
            <button onClick={() => setPicker(false)} className="font-hand text-ink-soft hover:text-rose">✕</button>
          </div>

          <button
            onClick={() => {
              if (onRequestMedia) {
                onRequestMedia((asset: any) => {
                  onSetImage(asset.public_url, asset.storage_path, asset.id);
                  setPicker(false);
                });
              }
            }}
            className="w-full text-left font-hand text-sm text-rose hover:text-ink cursor-pointer bg-white/50 border border-ink/10 rounded px-3 py-2 transition-colors"
          >
            + open media library
          </button>
        </div>
      )}

      {/* Lyrics editor for music cards */}
      {editingLyrics && !readOnly && isMusic(el.type) && (
        <div
          className="absolute z-[10000] left-1/2 -translate-x-1/2 top-full mt-16 w-[280px] bg-cream/98 border border-ink/15 rounded-xl shadow-lift p-4"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ transform: `translateX(-50%) rotate(${-el.rotation}deg)` }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="font-hand text-base text-ink">✎ lyrics snippet</p>
            <button onClick={() => setEditingLyrics(false)} className="font-hand text-ink-soft hover:text-rose">✕</button>
          </div>
          <p className="font-print text-[10px] text-ink-soft mb-2">
            shown on the card while the preview plays. leave empty for auto-lyrics from LRCLIB.
          </p>
          <textarea
            autoFocus
            defaultValue={el.style?.lyrics_snippet ?? ""}
            onPointerDown={(e) => e.stopPropagation()}
            onBlur={(e) => {
              onChange({ style: { ...(el.style ?? {}), lyrics_snippet: e.target.value } });
              onCommit();
            }}
            placeholder="e.g. today is friday, it is my day to do what I want…"
            rows={3}
            className="w-full bg-white/70 border border-ink/10 rounded-lg px-3 py-2 font-hand text-sm text-ink outline-none focus:border-rose/50 resize-none placeholder:text-ink-soft/40"
          />
        </div>
      )}

      {/* Lyric Card Customization Popover */}
      {customizingLyric && !readOnly && isLyricCard(el.type) && (
        <div
          className="absolute z-[10000] left-1/2 -translate-x-1/2 top-full mt-16 w-[280px] bg-cream/98 border border-ink/15 rounded-xl shadow-lift p-4"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ transform: `translateX(-50%) rotate(${-el.rotation}deg)` }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="font-hand text-base text-ink">✨ customize card</p>
            <button onClick={() => setCustomizingLyric(false)} className="font-hand text-ink-soft hover:text-rose">✕</button>
          </div>

          <div className="flex flex-col gap-3 font-hand text-sm text-ink">
            <label className="flex items-center justify-between cursor-pointer">
              <span>Theme</span>
              <select
                value={el.style?.theme ?? "dark"}
                onChange={(e) => {
                  const t = e.target.value;
                  onChange({ style: { ...(el.style ?? {}), theme: t, bg_color: t === "dark" ? "#1e1e1e" : "#f5f5f5", text_color: t === "dark" ? "#ffffff" : "#1a1a1a" } });
                  onCommit();
                }}
                className="bg-white/70 border border-ink/10 rounded px-2 py-1 outline-none"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span>Alignment</span>
              <select
                value={el.style?.align ?? "center"}
                onChange={(e) => { onChange({ style: { ...(el.style ?? {}), align: e.target.value } }); onCommit(); }}
                className="bg-white/70 border border-ink/10 rounded px-2 py-1 outline-none"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span>Background Color</span>
              <input type="color" value={el.style?.bg_color ?? "#1e1e1e"} onChange={(e) => { onChange({ style: { ...(el.style ?? {}), bg_color: e.target.value } }); onCommit(); }} />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span>Text Color</span>
              <input type="color" value={el.style?.text_color ?? "#ffffff"} onChange={(e) => { onChange({ style: { ...(el.style ?? {}), text_color: e.target.value } }); onCommit(); }} />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span>Accent Color</span>
              <input type="color" value={el.style?.accent_color ?? "#1DB954"} onChange={(e) => { onChange({ style: { ...(el.style ?? {}), accent_color: e.target.value } }); onCommit(); }} />
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={el.style?.transparency ?? false} onChange={(e) => { onChange({ style: { ...(el.style ?? {}), transparency: e.target.checked } }); onCommit(); }} />
              <span>Transparent Background</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={el.style?.show_bg_image ?? true} onChange={(e) => { onChange({ style: { ...(el.style ?? {}), show_bg_image: e.target.checked } }); onCommit(); }} />
              <span>Show Blurred Album Art</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={el.style?.show_album_art ?? true} onChange={(e) => { onChange({ style: { ...(el.style ?? {}), show_album_art: e.target.checked } }); onCommit(); }} />
              <span>Show Small Album Art</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={el.style?.show_logo ?? true} onChange={(e) => { onChange({ style: { ...(el.style ?? {}), show_logo: e.target.checked } }); onCommit(); }} />
              <span>Show Spotify Logo</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export const areEqualElements = (prev: Props, next: Props) => {
  return prev.el === next.el &&
    prev.selected === next.selected &&
    prev.scale === next.scale &&
    prev.readOnly === next.readOnly;
};

export const ScrapbookElement = memo(ScrapbookElementInner, areEqualElements);
ScrapbookElement.displayName = "ScrapbookElement";
