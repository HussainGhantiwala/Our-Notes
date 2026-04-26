import { useRef, useState, PointerEvent as RPE, ChangeEvent, memo } from "react";
import { ChapterElement, ElementType } from "@/lib/chapters";
import { isSticky, isTape, isMusic } from "./elementMeta";
import { SmartImage } from "./SmartImage";

interface Props {
  el: ChapterElement;
  selected: boolean;
  readOnly?: boolean;
  bounds: { width: number; height: number };
  scale: number;
  imageLibrary?: { url: string }[];
  onUploadImage?: (file: File) => Promise<string | null>;
  onSelect: () => void;
  onChange: (patch: Partial<ChapterElement>) => void;
  onCommit: () => void;
  onSetImage: (url: string | null, storagePath?: string | null) => void;
}

const stickyBg: Record<string, string> = {
  "sticky-yellow":   "hsl(var(--washi-yellow))",
  "sticky-pink":     "hsl(var(--blush))",
  "sticky-blue":     "hsl(var(--dusty-blue))",
  "sticky-mint":     "hsl(var(--washi-mint))",
  "sticky-lavender": "hsl(var(--lavender))",
};
const tapeBg: Record<string, string> = {
  "tape-pink":     "hsl(var(--blush) / 0.85)",
  "tape-yellow":   "hsl(var(--washi-yellow) / 0.8)",
  "tape-mint":     "hsl(var(--washi-mint) / 0.8)",
  "tape-lavender": "hsl(var(--lavender) / 0.8)",
};
const stickerGlyph: Partial<Record<ElementType, string>> = {
  heart: "❤", flower: "🌷", sparkle: "✦", leaf: "🍃", stamp: "✉", envelope: "💌", arrow: "➶",
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const ScrapbookElementInner = ({
  el, selected, readOnly, bounds, scale, imageLibrary = [], onUploadImage,
  onSelect, onChange, onCommit, onSetImage,
}: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: "move" | "resize" | "rotate" | null; startX: number; startY: number; orig: ChapterElement } | null>(null);
  const [editing, setEditing] = useState(false);
  const [picker, setPicker] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const onPointerDown = (e: RPE<HTMLDivElement>, mode: "move" | "resize" | "rotate") => {
    if (readOnly) return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    onSelect();
    drag.current = { mode, startX: e.clientX, startY: e.clientY, orig: { ...el } };
  };
  const onPointerMove = (e: RPE<HTMLDivElement>) => {
    if (!drag.current) return;
    const d = drag.current;
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

  const onPickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !onUploadImage) return;
    const url = await onUploadImage(f);
    if (url) onSetImage(url);
    setPicker(false);
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
      const isCompact = el.width < 240;

      const handlePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (previewUrl) {
          if (isPlaying && audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
          } else {
            if (!audioRef.current) {
              audioRef.current = new Audio(previewUrl);
              audioRef.current.addEventListener("ended", () => setIsPlaying(false));
            }
            audioRef.current.play().catch(() => setIsPlaying(false));
            setIsPlaying(true);
          }
        } else if (spotifyUrl) {
          window.open(spotifyUrl, "_blank", "noopener");
        }
      };

      if (isCompact) {
        // ---- COMPACT CARD ----
        return (
          <div
            className="w-full h-full flex items-center gap-3 p-3 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, hsl(160 30% 20%) 0%, hsl(170 25% 16%) 100%)",
              borderRadius: 14,
              boxShadow: "0 4px 20px hsl(0 0% 0% / 0.3), 0 1px 3px hsl(0 0% 0% / 0.2)",
            }}
          >
            {albumArt ? (
              <img src={albumArt} alt="" className="w-12 h-12 rounded-lg object-cover flex-none shadow-md" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center flex-none text-xl">🎵</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-hand text-sm text-white truncate leading-tight">{el.content || "song"}</p>
              <p className="text-[11px] text-white/60 truncate" style={{ fontFamily: "'Inter', sans-serif" }}>{artist}</p>
            </div>
            <button
              onClick={handlePlay}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex-none w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            >
              {isPlaying ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="white"><rect x="1" y="1" width="4" height="10" rx="1" /><rect x="7" y="1" width="4" height="10" rx="1" /></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="white"><path d="M2 1l9 5-9 5V1z" /></svg>
              )}
            </button>
          </div>
        );
      }

      // ---- PREMIUM LARGE CARD ----
      return (
        <div
          className="w-full h-full relative overflow-hidden"
          style={{
            borderRadius: 16,
            boxShadow: "0 8px 32px hsl(0 0% 0% / 0.35), 0 2px 8px hsl(0 0% 0% / 0.2)",
          }}
        >
          {/* Background: album art or gradient */}
          {albumArt ? (
            <img src={albumArt} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, hsl(160 30% 20%) 0%, hsl(220 25% 18%) 100%)" }} />
          )}

          {/* Dark overlay gradient */}
          <div className="absolute inset-0" style={{
            background: "linear-gradient(to top, hsl(0 0% 0% / 0.75) 0%, hsl(0 0% 0% / 0.25) 50%, hsl(0 0% 0% / 0.1) 100%)",
          }} />

          {/* Content overlay */}
          <div className="absolute inset-0 flex flex-col justify-end p-4">
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
                <p className="font-hand text-2xl text-white leading-tight mb-1 drop-shadow-lg"
                  style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
                  {el.content || "song"}
                </p>
                <p className="text-white/70 text-sm truncate" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {artist}
                </p>
              </div>
              <button
                onClick={handlePlay}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex-none w-11 h-11 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all hover:scale-110"
              >
                {isPlaying ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="white"><rect x="2" y="2" width="5" height="12" rx="1" /><rect x="9" y="2" width="5" height="12" rx="1" /></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="white"><path d="M3 2l11 6-11 6V2z" /></svg>
                )}
              </button>
            </div>

            {/* Spotify attribution */}
            <div className="flex items-center gap-1.5 mt-3">
              <svg width="14" height="14" viewBox="0 0 24 24" className="text-[#1DB954]">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381C8.88 5.76 15.78 6.06 20.1 8.82c.541.3.719 1.02.42 1.561-.299.421-1.02.599-1.439.299z" fill="currentColor"/>
              </svg>
              <span className="text-white/50 text-[10px] uppercase tracking-wider" style={{ fontFamily: "'Inter', sans-serif" }}>Spotify</span>
            </div>
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

  const isImageHolder = el.type === "polaroid" || el.type === "photo" || isMusic(el.type);

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
            </div>
          )}
        </>
      )}

      {picker && !readOnly && isImageHolder && (
        <div
          className="absolute z-[10000] left-1/2 -translate-x-1/2 top-full mt-12 w-[260px] bg-cream/98 border border-ink/15 rounded-md shadow-lift p-3"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="font-hand text-base text-ink">choose a photo</p>
            <button onClick={() => setPicker(false)} className="font-hand text-ink-soft hover:text-rose">✕</button>
          </div>
          <label className="block font-hand text-sm text-rose hover:text-ink cursor-pointer mb-2">
            + upload from device
            <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" hidden onChange={onPickFile} />
          </label>
          {imageLibrary.length > 0 && (
            <>
              <p className="font-print text-[10px] uppercase tracking-widest text-ink-soft mb-1">chapter library</p>
              <div className="grid grid-cols-3 gap-1 max-h-40 overflow-y-auto">
                {imageLibrary.map((img) => (
                  <button
                    key={img.url}
                    onClick={() => { onSetImage(img.url); setPicker(false); }}
                    className="aspect-square overflow-hidden rounded-sm border border-ink/10 hover:border-rose"
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </>
          )}
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
