import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CANVAS_H, CANVAS_W, ChapterElement, ElementType, Side, listPageElements,
} from "@/lib/chapters";
import { ELEMENT_LIBRARY } from "./elementMeta";
import { ScrapbookElement } from "./ScrapbookElement";

interface Props {
  chapterId: string;
  pageId: string;
  side: Side;
  readOnly?: boolean;
  className?: string;
  children?: React.ReactNode;
  // Allow parent to register an "add element to this canvas" handler.
  registerAdd?: (side: Side, fn: (type: ElementType, opts?: Partial<ChapterElement>) => void) => void;
  // Notify parent after each save so it can show "saved just now"
  onSaved?: () => void;
  onRequestMedia?: (cb: (asset: any) => void) => void;
}

export const ScrapbookCanvas = ({
  chapterId, pageId, side, readOnly = false, className = "", children,
  registerAdd, onSaved, onRequestMedia,
}: Props) => {
  const wrap = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [els, setEls] = useState<ChapterElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const elsRef = useRef(els);
  useEffect(() => { elsRef.current = els; }, [els]);

  const dirty = useRef<Set<string>>(new Set());
  const debounce = useRef<number | null>(null);

  // load
  useEffect(() => {
    if (!pageId) return;
    listPageElements(pageId)
      .then((all) => setEls(all))
      .catch(() => { });
  }, [pageId]);

  // realtime: listen for element changes on this page (other-tab sync)
  useEffect(() => {
    if (!pageId) return;
    const ch = supabase
      .channel(`elements:${pageId}:canvas-${side}`)
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
  }, [pageId, side]);

  // measure scale: scale fixed virtual canvas down to actual width
  useEffect(() => {
    if (!wrap.current) return;
    const obs = new ResizeObserver(() => {
      const r = wrap.current!.getBoundingClientRect();
      setScale(Math.min(r.width / CANVAS_W, r.height / CANVAS_H, 1));
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
    setEls((arr) => arr.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    dirty.current.add(id);
  };

  const addElement = useCallback(async (type: ElementType, opts: Partial<ChapterElement> = {}) => {
    const spec = ELEMENT_LIBRARY.find((e) => e.type === type);
    const z = (els.reduce((m, e) => Math.max(m, e.z_index), 0) || 0) + 1;
    const w = opts.width ?? spec?.defaultWidth ?? 160;
    const h = opts.height ?? spec?.defaultHeight ?? 160;
    const payload: any = {
      chapter_id: chapterId,
      page_id: pageId,
      side,
      type,
      content: opts.content ?? spec?.defaultContent ?? null,
      image_url: opts.image_url ?? null,
      storage_path: opts.storage_path ?? null,
      x: opts.x ?? Math.max(20, CANVAS_W / 2 - w / 2),
      y: opts.y ?? Math.max(20, CANVAS_H / 2 - h / 2),
      width: w,
      height: h,
      rotation: opts.rotation ?? spec?.defaultRotation ?? 0,
      z_index: z,
      style: opts.style ?? {},
    };
    const { data, error } = await supabase.from("chapter_elements").insert(payload).select().single();
    if (error || !data) return;
    setEls((arr) => [...arr, { ...(data as any), style: (data as any).style ?? {}, side: (data as any).side ?? side }]);
    setSelectedId((data as any).id);
    onSaved?.();
  }, [chapterId, pageId, side, els, onSaved]);

  useEffect(() => {
    registerAdd?.(side, addElement);
  }, [registerAdd, addElement, side]);

  const remove = async (id: string) => {
    setEls((arr) => arr.filter((e) => e.id !== id));
    setSelectedId(null);
    await supabase.from("chapter_elements").delete().eq("id", id);
    onSaved?.();
  };
  const duplicate = async (id: string) => {
    const e = els.find((x) => x.id === id);
    if (!e) return;
    addElement(e.type, {
      content: e.content, image_url: e.image_url, width: e.width, height: e.height,
      rotation: e.rotation, x: e.x + 24, y: e.y + 24, style: e.style,
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
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}`, touchAction: "none" }}
    >
      {/* Fixed virtual canvas — same size in editor + public, scaled to fit */}
      <div className="absolute top-0 left-0 origin-top-left" style={{ transform: `scale(${scale})` }}>
        {/* The single-page bounds for backgrounds and text children */}
        <div ref={inner} className="relative" style={{ width: CANVAS_W, height: CANVAS_H }}>
          {children}
        </div>

        {/* The double-page bounds for spread elements, shifted if right leaf */}
        <div className="absolute top-0 left-0" style={{ width: CANVAS_W * 2, height: CANVAS_H, transform: `translateX(${side === "right" ? -CANVAS_W : 0}px)` }}>
          {els.map((el) => (
            <ScrapbookElement
              key={el.id}
              el={el}
              scale={scale}
              selected={selectedId === el.id}
              readOnly={readOnly}
              bounds={{ width: CANVAS_W * 2, height: CANVAS_H }}
              onRequestMedia={onRequestMedia}
              onSelect={() => setSelectedId(el.id)}
              onChange={(p) => updateEl(el.id, p)}
              onCommit={scheduleSave}
              onSetImage={(url, sp) => setElementImage(el.id, url, sp)}
            />
          ))}
        </div>

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
