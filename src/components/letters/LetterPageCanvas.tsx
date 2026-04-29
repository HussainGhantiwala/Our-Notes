import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { TapeDecoration } from "@/components/TapeDecoration";
import { ScrapbookElement } from "@/components/scrapbook/ScrapbookElement";
import { ELEMENT_LIBRARY } from "@/components/scrapbook/elementMeta";
import type { Asset } from "@/lib/assets";
import {
  CANVAS_H,
  CANVAS_W,
  type ChapterElement,
  type ElementType,
} from "@/lib/chapters";
import {
  letterPageClass,
  letterPaperColorMap,
  type LetterPageData,
  type LetterPreviewViewport,
} from "@/lib/letters";

interface Props {
  letterId: string;
  pageData: LetterPageData;
  readOnly?: boolean;
  className?: string;
  rootStyle?: CSSProperties;
  embedded?: boolean;
  showTape?: boolean;
  viewport?: LetterPreviewViewport;
  readOnlyBodyPaddingClassName?: string;
  readOnlyBodyTextClassName?: string;
  registerAdd?: (fn: (type: ElementType, opts?: Partial<ChapterElement>) => void) => void;
  onChange?: (next: LetterPageData) => void;
  onRequestMedia?: (cb: (asset: Asset) => void) => void;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const LetterPageCanvas = ({
  letterId,
  pageData,
  readOnly = false,
  className = "",
  rootStyle,
  embedded = false,
  showTape = true,
  viewport,
  readOnlyBodyPaddingClassName = "p-12 pt-16",
  readOnlyBodyTextClassName = "font-hand text-[1.55rem] text-ink leading-relaxed whitespace-pre-wrap",
  registerAdd,
  onChange,
  onRequestMedia,
}: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeViewport = viewport ?? { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H };

  useEffect(() => {
    if (!wrapRef.current) return;
    const observer = new ResizeObserver(() => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const widthScale = rect.width / activeViewport.width;
      const heightScale = rect.height / activeViewport.height;
      const safeHeightScale = heightScale < widthScale * 0.88 ? heightScale : widthScale;
      setScale(Math.min(safeHeightScale, 1));
    });
    observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, [activeViewport.height, activeViewport.width]);

  const pageCls = useMemo(() => letterPageClass(pageData.pageStyle), [pageData.pageStyle]);

  const emit = useCallback((next: LetterPageData) => {
    onChange?.({
      ...next,
      elements: next.elements.slice().sort((a, b) => a.z_index - b.z_index),
    });
  }, [onChange]);

  const updateBody = (body: string) => emit({ ...pageData, body });

  const updateElement = (id: string, patch: Partial<ChapterElement>) => {
    emit({
      ...pageData,
      elements: pageData.elements.map((element) => {
        if (element.id !== id) return element;
        const mergedStyle = patch.style ? { ...(element.style ?? {}), ...patch.style } : element.style;
        return {
          ...element,
          ...patch,
          style: mergedStyle,
          x: clamp(typeof patch.x === "number" ? patch.x : element.x, -20, CANVAS_W - 20),
          y: clamp(typeof patch.y === "number" ? patch.y : element.y, -20, CANVAS_H - 20),
        };
      }),
    });
  };

  const addElement = useCallback((type: ElementType, opts: Partial<ChapterElement> = {}) => {
    const spec = ELEMENT_LIBRARY.find((item) => item.type === type);
    const width = opts.width ?? spec?.defaultWidth ?? 180;
    const height = opts.height ?? spec?.defaultHeight ?? 180;
    const next: ChapterElement = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `letter-el-${Math.random().toString(36).slice(2, 10)}`,
      chapter_id: letterId,
      page_id: null,
      side: "left",
      type,
      content: opts.content ?? spec?.defaultContent ?? null,
      image_url: opts.image_url ?? null,
      storage_path: opts.storage_path ?? null,
      x: clamp(opts.x ?? Math.max(20, CANVAS_W / 2 - width / 2), -20, CANVAS_W - 20),
      y: clamp(opts.y ?? Math.max(24, CANVAS_H / 2 - height / 2), -20, CANVAS_H - 20),
      width,
      height,
      rotation: opts.rotation ?? spec?.defaultRotation ?? 0,
      z_index: (pageData.elements.reduce((max, element) => Math.max(max, element.z_index), 0) || 0) + 1,
      style: opts.style ?? {},
    };

    emit({
      ...pageData,
      elements: [...pageData.elements, next],
    });
    setSelectedId(next.id);
  }, [letterId, pageData, emit]);

  useEffect(() => {
    registerAdd?.(addElement);
  }, [registerAdd, addElement]);

  const selected = pageData.elements.find((element) => element.id === selectedId) ?? null;

  const duplicate = (id: string) => {
    const element = pageData.elements.find((item) => item.id === id);
    if (!element) return;

    addElement(element.type, {
      content: element.content,
      image_url: element.image_url,
      storage_path: element.storage_path,
      x: clamp(element.x + 24, -20, CANVAS_W - 20),
      y: clamp(element.y + 24, -20, CANVAS_H - 20),
      width: element.width,
      height: element.height,
      rotation: element.rotation,
      style: element.style,
    });
  };

  const remove = (id: string) => {
    emit({
      ...pageData,
      elements: pageData.elements.filter((element) => element.id !== id),
    });
    setSelectedId((current) => (current === id ? null : current));
  };

  const bringFront = (id: string) => {
    const nextZ = pageData.elements.reduce((max, element) => Math.max(max, element.z_index), 0) + 1;
    updateElement(id, { z_index: nextZ });
  };

  const sendBack = (id: string) => {
    const nextZ = pageData.elements.reduce((min, element) => Math.min(min, element.z_index), 0) - 1;
    updateElement(id, { z_index: nextZ });
  };

  const rotate = (id: string, delta: number) => {
    const element = pageData.elements.find((item) => item.id === id);
    if (!element) return;
    updateElement(id, { rotation: element.rotation + delta });
  };

  const setElementImage = (id: string, url: string | null, storagePath: string | null = null, assetId?: string) => {
    updateElement(id, {
      image_url: url,
      storage_path: storagePath,
      style: assetId ? { asset_id: assetId } : {},
    });
  };

  return (
    <div
      ref={wrapRef}
      onClick={() => setSelectedId(null)}
      className={`relative overflow-hidden ${className}`}
      style={rootStyle ? { touchAction: "none", ...rootStyle } : { aspectRatio: `${activeViewport.width} / ${activeViewport.height}`, touchAction: "none" }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: activeViewport.width, height: activeViewport.height, transform: `scale(${scale})` }}
      >
        <div
          className="relative"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `translate(${-activeViewport.x}px, ${-activeViewport.y}px)`,
          }}
        >
          <div
            className={`${embedded ? "" : pageCls} relative h-full w-full`}
            style={embedded ? undefined : { backgroundColor: letterPaperColorMap[pageData.paperVariant] }}
          >
            {showTape && (
              <>
                <TapeDecoration variant="pink" rotate={-5} className="-top-3 left-12" />
                <TapeDecoration variant="lavender" rotate={4} className="-top-3 right-12" />
              </>
            )}

            {readOnly ? (
              <div className={`absolute inset-0 pointer-events-none ${readOnlyBodyPaddingClassName}`}>
                <div className={readOnlyBodyTextClassName}>
                  {pageData.body}
                </div>
              </div>
            ) : (
              <textarea
                value={pageData.body}
                onChange={(event) => updateBody(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                placeholder="Write the heart of your letter here..."
                className="absolute inset-0 z-[1] bg-transparent p-12 pt-16 font-hand text-[1.55rem] text-ink leading-relaxed outline-none resize-none placeholder:text-ink-soft/45"
              />
            )}
          </div>

          <div className="absolute inset-0 z-10 pointer-events-none">
            {pageData.elements.map((element) => (
              <div key={element.id} className="pointer-events-auto">
                <ScrapbookElement
                  el={element}
                  selected={!readOnly && selectedId === element.id}
                  readOnly={readOnly}
                  bounds={{ width: CANVAS_W, height: CANVAS_H }}
                  scale={scale}
                  onRequestMedia={onRequestMedia}
                  onSelect={() => setSelectedId(element.id)}
                  onChange={(patch) => updateElement(element.id, patch)}
                  onCommit={() => undefined}
                  onSetImage={(url, storagePath, assetId) => setElementImage(element.id, url, storagePath, assetId)}
                />
              </div>
            ))}
          </div>
        </div>

        {selected && !readOnly && (
          <div
            className="absolute z-[9999] flex items-center gap-1 bg-cream/95 border border-ink/15 rounded-full px-2 py-1 shadow-lift font-hand text-sm text-ink"
            style={{
              left: Math.max(8, selected.x - activeViewport.x),
              top: Math.max(8, selected.y - activeViewport.y - 38),
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button onClick={() => duplicate(selected.id)} className="px-2 hover:text-rose" title="duplicate">copy</button>
            <button onClick={() => rotate(selected.id, -10)} className="px-2 hover:text-rose" title="rotate left">left</button>
            <button onClick={() => rotate(selected.id, 10)} className="px-2 hover:text-rose" title="rotate right">right</button>
            <button onClick={() => bringFront(selected.id)} className="px-2 hover:text-rose" title="bring to front">front</button>
            <button onClick={() => sendBack(selected.id)} className="px-2 hover:text-rose" title="send back">back</button>
            <button onClick={() => remove(selected.id)} className="px-2 hover:text-rose" title="delete">delete</button>
          </div>
        )}
      </div>
    </div>
  );
};
