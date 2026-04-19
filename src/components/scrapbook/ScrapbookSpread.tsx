import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CANVAS_H, CANVAS_W, ChapterElement, ElementType, listPageElements, Side, ChapterPage
} from "@/lib/chapters";
import { ELEMENT_LIBRARY } from "./elementMeta";
import { ScrapbookElement } from "./ScrapbookElement";
import { TapeDecoration } from "../TapeDecoration";

interface Props {
  chapterId: string;
  activePage: ChapterPage;
  pageCls: string;
  readOnly?: boolean;
  className?: string;
  registerAdd?: (side: Side, fn: (type: ElementType, opts?: Partial<ChapterElement>) => void) => void;
  onSaved?: () => void;
  imageLibrary?: { url: string }[];
  onUploadImage?: (file: File) => Promise<string | null>;
  onUpdateText?: (patch: Partial<ChapterPage>) => void;
}

const SPREAD_W = CANVAS_W * 2;

export const ScrapbookSpread = ({
  chapterId, activePage, pageCls, readOnly = false, className = "",
  registerAdd, onSaved, imageLibrary = [], onUploadImage, onUpdateText
}: Props) => {
  const pageId = activePage.id;
  const wrap = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [els, setEls] = useState<ChapterElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const elsRef = useRef(els);
  useEffect(() => { elsRef.current = els; }, [els]);
  
  const dirty = useRef<Set<string>>(new Set());
  const debounce = useRef<number | null>(null);

  // load all elements for both sides of the page
  useEffect(() => {
    if (!pageId) return;
    listPageElements(pageId)
      .then((all) => setEls(all))
      .catch(() => {});
  }, [pageId]);

  // realtime: listen for element changes on this page (other-tab sync)
  useEffect(() => {
    if (!pageId) return;
    const ch = supabase
      .channel(`elements:${pageId}:spread`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chapter_elements", filter: `page_id=eq.${pageId}` },
        (payload) => {
          const row: any = payload.new ?? payload.old;
          if (payload.eventType === "DELETE") {
            setEls((arr) => arr.filter((e) => e.id !== row.id));
          } else {
            setEls((arr) => {
              const idx = arr.findIndex((e) => e.id === row.id);
              const merged = { ...row, style: row.style ?? {}, side: row.side ?? "left" } as ChapterElement;
              if (idx === -1) return [...arr, merged];
              const copy = arr.slice();
              copy[idx] = merged;
              return copy;
            });
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [pageId]);

  // measure scale: scale fixed virtual canvas down to actual width
  useEffect(() => {
    if (!wrap.current) return;
    const obs = new ResizeObserver(() => {
      const r = wrap.current!.getBoundingClientRect();
      // scale logic matches aspect ratio of SPREAD_W and CANVAS_H
      setScale(Math.min(r.width / SPREAD_W, r.height / CANVAS_H, 1));
    });
    obs.observe(wrap.current);
    return () => obs.disconnect();
  }, []);

  const persistDirty = useCallback(async () => {
    const ids = Array.from(dirty.current);
    dirty.current.clear();
    for (const id of ids) {
      const e = elsRef.current.find((x) => x.id === id);
      if (!e) continue;
      await supabase.from("chapter_elements").update({
        content: e.content, image_url: e.image_url, x: e.x, y: e.y,
        width: e.width, height: e.height, rotation: e.rotation,
        z_index: e.z_index, style: e.style, side: e.side,
      }).eq("id", id);
    }
    onSaved?.();
  }, [els, onSaved]);

  const scheduleSave = useCallback(() => {
    if (readOnly) return;
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(persistDirty, 500);
  }, [persistDirty, readOnly]);

  const updateEl = (id: string, patch: Partial<ChapterElement>) => {
    setEls((arr) => arr.map((e) => {
      if (e.id !== id) return e;
      const next = { ...e, ...patch };
      // auto-update side based on coordinate to maintain DB integrity
      next.side = next.x >= CANVAS_W ? "right" : "left";
      return next;
    }));
    dirty.current.add(id);
  };

  const addElement = useCallback(async (type: ElementType, opts: Partial<ChapterElement> = {}, preferRight: boolean = false) => {
    const spec = ELEMENT_LIBRARY.find((e) => e.type === type);
    const z = (els.reduce((m, e) => Math.max(m, e.z_index), 0) || 0) + 1;
    const w = opts.width ?? spec?.defaultWidth ?? 160;
    const h = opts.height ?? spec?.defaultHeight ?? 160;
    
    // Default placement centers on left page, or right page if preferred
    const defaultX = preferRight ? CANVAS_W + Math.max(20, CANVAS_W / 2 - w / 2) : Math.max(20, CANVAS_W / 2 - w / 2);
    const sideAttr = opts.x !== undefined ? (opts.x >= CANVAS_W ? "right" : "left") : (preferRight ? "right" : "left");

    const payload: any = {
      chapter_id: chapterId,
      page_id: pageId,
      side: sideAttr,
      type,
      content: opts.content ?? spec?.defaultContent ?? null,
      image_url: opts.image_url ?? null,
      storage_path: opts.storage_path ?? null,
      x: opts.x ?? defaultX,
      y: opts.y ?? Math.max(20, CANVAS_H / 2 - h / 2),
      width: w,
      height: h,
      rotation: opts.rotation ?? spec?.defaultRotation ?? 0,
      z_index: z,
      style: opts.style ?? {},
    };
    const { data, error } = await supabase.from("chapter_elements").insert(payload).select().single();
    if (error || !data) return;
    setEls((arr) => [...arr, { ...(data as any), style: (data as any).style ?? {}, side: (data as any).side ?? sideAttr }]);
    setSelectedId((data as any).id);
    onSaved?.();
  }, [chapterId, pageId, els, onSaved]);

  useEffect(() => {
    registerAdd?.("left", (t, o) => addElement(t, o, false));
    registerAdd?.("right", (t, o) => addElement(t, o, true));
  }, [registerAdd, addElement]);

  const remove = async (id: string) => {
    setEls((arr) => arr.filter((e) => e.id !== id));
    setSelectedId(null);
    await supabase.from("chapter_elements").delete().eq("id", id);
    onSaved?.();
  };
  const duplicate = async (id: string) => {
    const e = els.find((x) => x.id === id);
    if (!e) return;
    let nextX = e.x + 24;
    // ensure duplication stays within bounds gracefully
    if (nextX + e.width > SPREAD_W) nextX = e.x - 24;
    addElement(e.type, {
      content: e.content, image_url: e.image_url, width: e.width, height: e.height,
      rotation: e.rotation, x: nextX, y: e.y + 24, style: e.style,
    });
  };
  const bringFront = (id: string) => {
    const max = els.reduce((m, e) => Math.max(m, e.z_index), 0) + 1;
    updateEl(id, { z_index: max });
    scheduleSave();
  };
  const sendBack = (id: string) => {
    const min = els.reduce((m, e) => Math.min(m, e.z_index), 0) - 1;
    updateEl(id, { z_index: min });
    scheduleSave();
  };
  const rotate = (id: string, delta: number) => {
    const e = els.find((x) => x.id === id);
    if (!e) return;
    updateEl(id, { rotation: e.rotation + delta });
    scheduleSave();
  };

  const setElementImage = async (id: string, url: string | null, storagePath: string | null = null) => {
    updateEl(id, { image_url: url, storage_path: storagePath });
    await persistDirty();
  };

  const selected = els.find((e) => e.id === selectedId) ?? null;

  return (
    <div
      ref={wrap}
      onClick={() => setSelectedId(null)}
      className={`relative overflow-hidden ${className} w-full`}
      style={{ aspectRatio: `${SPREAD_W} / ${CANVAS_H}`, touchAction: "none" }}
    >
      <div
        ref={inner}
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: SPREAD_W, height: CANVAS_H, transform: `scale(${scale})` }}
      >
        {/* The Two Pages representing the backgrounds & textareas */}
        <div className="flex w-full h-full relative">
          {/* LEFT PAGE */}
          <div className={`${pageCls} w-1/2 flex-none h-full relative border-r border-ink/10`}>
            <TapeDecoration variant="pink" rotate={-6} className="-top-3 left-10" />
            <p className="font-print text-sm text-ink-soft mb-3 pointer-events-none absolute top-4 left-8">~ left page ~</p>
            <textarea
              value={activePage.left_text}
              onChange={(e) => onUpdateText?.({ left_text: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="start writing here…"
              className="absolute inset-0 z-[1] p-12 pt-14 w-full h-full bg-transparent outline-none resize-none font-hand text-2xl md:text-[1.6rem] text-ink leading-relaxed placeholder:text-ink-soft/50"
            />
          </div>
          {/* RIGHT PAGE */}
          <div className={`${pageCls} w-1/2 flex-none h-full relative`}>
            <TapeDecoration variant="lavender" rotate={5} className="-top-3 right-10" />
            <p className="font-print text-sm text-ink-soft mb-3 pointer-events-none absolute top-4 left-8">~ right page ~</p>
            <textarea
              value={activePage.right_text}
              onChange={(e) => onUpdateText?.({ right_text: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="…and continue here"
              className="absolute inset-0 z-[1] p-12 pt-14 w-full h-full bg-transparent outline-none resize-none font-hand text-2xl md:text-[1.6rem] text-ink leading-relaxed placeholder:text-ink-soft/50"
            />
          </div>
        </div>

        {/* Draggable Layer Layered ON TOP Of Pages & Textbars */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {els.map((el) => (
            <div key={el.id} className="pointer-events-auto">
              <ScrapbookElement
                el={el}
                scale={scale}
                selected={selectedId === el.id}
                readOnly={readOnly}
                bounds={{ width: SPREAD_W, height: CANVAS_H }}
                imageLibrary={imageLibrary}
                onUploadImage={onUploadImage}
                onSelect={() => setSelectedId(el.id)}
                onChange={(p) => updateEl(el.id, p)}
                onCommit={scheduleSave}
                onSetImage={(url, sp) => setElementImage(el.id, url, sp)}
              />
            </div>
          ))}
        </div>

        {/* Editor Controls */}
        {selected && !readOnly && (
          <div
            className="absolute z-[9999] flex items-center gap-1 bg-cream/95 border border-ink/15 rounded-full px-2 py-1 shadow-lift font-hand text-sm text-ink"
            style={{ left: Math.max(8, selected.x), top: Math.max(8, selected.y - 38) }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => duplicate(selected.id)} className="px-2 hover:text-rose" title="duplicate">⎘</button>
            <button onClick={() => rotate(selected.id, -10)} className="px-2 hover:text-rose" title="rotate left">↺</button>
            <button onClick={() => rotate(selected.id, 10)} className="px-2 hover:text-rose" title="rotate right">↻</button>
            <button onClick={() => bringFront(selected.id)} className="px-2 hover:text-rose" title="bring to front">▲</button>
            <button onClick={() => sendBack(selected.id)} className="px-2 hover:text-rose" title="send back">▼</button>
            <button onClick={() => remove(selected.id)} className="px-2 hover:text-rose" title="delete">✕</button>
          </div>
        )}
      </div>
    </div>
  );
};
