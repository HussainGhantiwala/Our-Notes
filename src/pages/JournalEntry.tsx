import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link, useParams, Navigate } from "react-router-dom";
import HTMLFlipBook from "react-pageflip";

const FlipBook: any = HTMLFlipBook;
import { TapeDecoration } from "@/components/TapeDecoration";
import { FloatingPetals } from "@/components/FloatingPetals";
import { ScrapbookCanvas } from "@/components/scrapbook/ScrapbookCanvas";
import {
  ChapterPage, ChapterRow, getChapterBySlugOrId, listChapterPages,
  listPublishedChapters, sanitizeText,
} from "@/lib/chapters";
import pressedRose from "@/assets/pressed-rose.png";
import pressedLavender from "@/assets/pressed-lavender.png";
import doodleHeart from "@/assets/doodle-heart.png";

const JournalEntry = () => {
  const { id } = useParams();
  const [chapter, setChapter] = useState<ChapterRow | null>(null);
  const [pages, setPages] = useState<ChapterPage[]>([]);
  const [siblings, setSiblings] = useState<ChapterRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pageIdx, setPageIdx] = useState(0);
  const flipRef = useRef<any>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const ch = await getChapterBySlugOrId(id);
        if (!ch) { setLoaded(true); return; }
        setChapter(ch);
        const [pgs, all] = await Promise.all([listChapterPages(ch.id), listPublishedChapters()]);
        setPages(pgs);
        setSiblings(all);
      } finally { setLoaded(true); }
    })();
  }, [id]);

  if (!loaded) {
    return <main className="min-h-screen flex items-center justify-center"><p className="font-hand text-2xl text-ink-soft animate-pulse">turning the page…</p></main>;
  }
  if (!chapter || pages.length === 0) return <Navigate to="/chapters" replace />;

  const idx = siblings.findIndex((s) => s.id === chapter.id);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  // Each ChapterPage produces 2 leaves in the book (left + right side)
  const leaves: { pageId: string; side: "left" | "right"; text: string; pageNum: number; sideLabel: "L" | "R"; pageCls: string }[] = [];
  pages.forEach((p, i) => {
    const pStyle = p.page_style ?? "lined";
    const pageCls = pStyle === "vintage" ? "paper" : pStyle === "grid" ? "paper-grid" : "paper-lined";
    leaves.push({ pageId: p.id, side: "left", text: sanitizeText(p.left_text), pageNum: i + 1, sideLabel: "L", pageCls });
    leaves.push({ pageId: p.id, side: "right", text: sanitizeText(p.right_text), pageNum: i + 1, sideLabel: "R", pageCls });
  });

  const goPrev = () => flipRef.current?.pageFlip?.()?.flipPrev();
  const goNext = () => flipRef.current?.pageFlip?.()?.flipNext();

  return (
    <>
      <FloatingPetals count={6} />
      <main className="relative min-h-screen pt-24 pb-16 px-4">
        <div className="container max-w-6xl">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="text-center mb-6">
            <Link to="/chapters" className="font-hand text-ink-soft hover:text-rose">← all chapters</Link>
            <p className="font-ui text-xs tracking-[0.4em] text-ink-soft uppercase mt-4">
              Chapter {String(chapter.number ?? 0).padStart(2, "0")} · {chapter.date_label ?? ""}
            </p>
            <h1 className="font-script text-5xl md:text-6xl text-ink mt-2">{chapter.title}</h1>
            {chapter.subtitle && <p className="font-hand text-xl text-ink-soft italic mt-1">{chapter.subtitle}</p>}
          </motion.div>

          {/* Book */}
          <div className="flex items-center justify-center gap-2 md:gap-4 select-none">
            <button onClick={goPrev}
              className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-cream/80 border border-ink/10 hover:border-rose font-hand text-2xl text-ink-soft hover:text-rose transition-colors"
              aria-label="previous page">‹</button>

            <div className="w-full max-w-[1100px]">
              <FlipBook
                ref={flipRef}
                width={520}
                height={680}
                size="stretch"
                minWidth={280}
                maxWidth={620}
                minHeight={380}
                maxHeight={820}
                drawShadow
                flippingTime={700}
                usePortrait
                mobileScrollSupport
                showCover={false}
                onFlip={(e: any) => setPageIdx(e.data)}
                className="mx-auto shadow-lift rounded-sm bg-cream"
                style={{}}
                startPage={0}
                maxShadowOpacity={0.4}
                clickEventForward
                useMouseEvents
                swipeDistance={30}
                showPageCorners
                disableFlipByClick
              >
                {leaves.map((leaf, i) => (
                  <div 
                    key={`${leaf.pageId}-${leaf.side}-${i}`} 
                    className="bg-cream overflow-hidden"
                    style={{ isolation: "isolate", backfaceVisibility: "hidden", transform: "translateZ(0)" }}
                  >
                    <ScrapbookCanvas
                      chapterId={chapter.id}
                      pageId={leaf.pageId}
                      side={leaf.side}
                      readOnly
                      className={`${leaf.pageCls} relative w-full h-full`}
                    >
                      {leaf.side === "left" ? (
                        <>
                          <TapeDecoration variant="pink" rotate={-6} className="-top-3 left-10" />
                          <img src={pressedRose} alt="" aria-hidden className="absolute -top-6 -right-4 w-24 opacity-80 -rotate-12 pointer-events-none" />
                          <div className="absolute inset-0 p-12 pt-14 pointer-events-none">
                            <p className="font-print text-sm text-ink-soft mb-4">~ page {leaf.pageNum} ~</p>
                            <div className="space-y-4 font-hand text-2xl md:text-[1.6rem] text-ink leading-relaxed whitespace-pre-wrap">
                              {leaf.text}
                            </div>
                          </div>
                          <img src={doodleHeart} alt="" aria-hidden className="absolute bottom-6 right-6 w-12 opacity-70 pointer-events-none" />
                        </>
                      ) : (
                        <>
                          <TapeDecoration variant="lavender" rotate={5} className="-top-3 right-10" />
                          <img src={pressedLavender} alt="" aria-hidden className="absolute bottom-2 -left-4 w-20 opacity-80 rotate-12 pointer-events-none" />
                          <div className="absolute inset-0 p-12 pt-14 pointer-events-none">
                            <div className="space-y-4 font-hand text-2xl md:text-[1.6rem] text-ink leading-relaxed whitespace-pre-wrap">
                              {leaf.text}
                            </div>
                          </div>
                        </>
                      )}
                    </ScrapbookCanvas>
                  </div>
                ))}
              </FlipBook>
            </div>

            <button onClick={goNext}
              className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-cream/80 border border-ink/10 hover:border-rose font-hand text-2xl text-ink-soft hover:text-rose transition-colors"
              aria-label="next page">›</button>
          </div>

          <div className="flex md:hidden items-center justify-center gap-6 mt-4">
            <button onClick={goPrev} className="font-hand text-ink-soft hover:text-rose">‹ prev</button>
            <span className="font-print text-xs text-ink-soft">{Math.min(pageIdx + 1, leaves.length)} / {leaves.length}</span>
            <button onClick={goNext} className="font-hand text-ink-soft hover:text-rose">next ›</button>
          </div>

          <div className="flex items-center justify-between mt-10 font-hand text-xl">
            {prev ? (
              <Link to={`/chapter/${prev.slug || prev.id}`} className="text-ink-soft hover:text-rose">← {prev.title}</Link>
            ) : <span />}
            {next ? (
              <Link to={`/chapter/${next.slug || next.id}`} className="text-ink-soft hover:text-rose">{next.title} →</Link>
            ) : <span className="text-ink-soft italic">to be continued…</span>}
          </div>
        </div>
      </main>
    </>
  );
};

export default JournalEntry;
