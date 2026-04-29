import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { FloatingPetals } from "@/components/FloatingPetals";
import { TapeDecoration } from "@/components/TapeDecoration";
import { LetterPageCanvas } from "@/components/letters/LetterPageCanvas";
import { supabase } from "@/integrations/supabase/client";
import {
  getLetterPreviewViewport,
  letterPageClass,
  letterPaperColorMap,
  listLetters,
  type LetterCoverStyle,
  type LetterRow,
} from "@/lib/letters";

const tapeByCover: Record<LetterCoverStyle, "yellow" | "pink" | "mint" | "blue" | "lavender"> = {
  pink: "pink",
  lavender: "lavender",
  mint: "mint",
  blue: "blue",
  yellow: "yellow",
};

const FutureLetters = () => {
  const [letters, setLetters] = useState<LetterRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLetters(await listLetters());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const channel = supabase
      .channel("letters-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "letters" }, () => {
        load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const open = letters.find((letter) => letter.id === openId);
  const openViewport = useMemo(
    () => (open ? getLetterPreviewViewport(open.page_data_json) : null),
    [open],
  );
  const paperWidth = openViewport ? Math.min(openViewport.width + 56, 980) : 760;

  return (
    <>
      <FloatingPetals count={6} />
      <main className="relative min-h-screen pt-28 pb-20 px-4">
        <div className="container max-w-5xl">
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-14"
          >
            <p className="font-ui text-xs tracking-[0.4em] text-ink-soft uppercase mb-3">
              Letters for later
            </p>
            <h1 className="font-script text-6xl md:text-7xl text-ink mb-3">Open when...</h1>
            <p className="font-hand text-2xl text-ink-soft italic">
              tuck these away. open them when the moment finds you.
            </p>
          </motion.header>

          {loading ? (
            <p className="font-hand text-2xl text-ink-soft text-center py-14">setting out the envelopes...</p>
          ) : letters.length === 0 ? (
            <div className="paper-lined rounded-sm p-12 text-center">
              <p className="font-hand text-2xl text-ink-soft">No letters are waiting here yet.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-8">
              {letters.map((letter, index) => (
                <motion.button
                  key={letter.id}
                  onClick={() => setOpenId(letter.id)}
                  initial={{ opacity: 0, y: 30, rotate: index % 2 ? 2 : -2 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -6, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.08 }}
                  className="relative text-left group"
                >
                  <div className="paper rounded-sm p-7 md:p-9 min-h-[200px] flex flex-col justify-between">
                    <TapeDecoration variant={tapeByCover[letter.cover_style]} rotate={-6} className="-top-3 left-8" />
                    <div>
                      <p className="font-ui text-xs tracking-[0.3em] uppercase text-ink-soft mb-2">
                        {letter.subtitle}
                      </p>
                      <h2 className="font-display text-3xl italic text-ink">{letter.title}</h2>
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                      <span className="text-3xl">✉</span>
                      <span className="font-hand text-lg text-rose group-hover:underline underline-offset-4">
                        open this letter →
                      </span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenId(null)}
              className="fixed inset-0 z-50 bg-ink/45 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.94, y: 28, opacity: 0, rotate: -2 }}
                animate={{ scale: 1, y: 0, opacity: 1, rotate: -0.8 }}
                exit={{ scale: 0.96, y: 18, opacity: 0, rotate: -1.4 }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                onClick={(event) => event.stopPropagation()}
                className={`${letterPageClass(open.page_data_json.pageStyle)} relative my-2 sm:my-4 rounded-[22px] sm:rounded-[26px] shadow-[0_18px_50px_-18px_hsl(20_30%_25%_/_0.45)] border border-white/35 overflow-hidden max-h-[94vh]`}
                style={{
                  width: paperWidth,
                  maxWidth: "96vw",
                  backgroundColor: letterPaperColorMap[open.page_data_json.paperVariant],
                }}
              >
                <TapeDecoration
                  variant={tapeByCover[open.cover_style]}
                  rotate={-4}
                  className="-top-3 left-1/2 -translate-x-1/2"
                  width={120}
                />
                <button
                  onClick={() => setOpenId(null)}
                  className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 z-20 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white/45 backdrop-blur-sm border border-white/40 font-hand text-xl sm:text-2xl text-ink-soft hover:text-rose transition-colors"
                  aria-label="close"
                >
                  x
                </button>
                <div className="px-5 sm:px-8 pt-6 sm:pt-8 text-center">
                  <p className="font-ui text-[9px] sm:text-[10px] tracking-[0.34em] uppercase text-ink-soft/90 mb-1.5 sm:mb-2">
                    {open.subtitle || "for later"}
                  </p>
                  <h3 className="font-script text-[1.5rem] sm:text-[1.9rem] md:text-[2.2rem] leading-[1.05] text-ink">
                    {open.title}
                  </h3>
                </div>

                <div className="px-3 sm:px-5 pt-1.5 sm:pt-2.5">
                  <LetterPageCanvas
                    letterId={open.id}
                    pageData={open.page_data_json}
                    readOnly
                    embedded
                    showTape={false}
                    viewport={openViewport ?? undefined}
                    className="mx-auto"
                    rootStyle={
                      openViewport
                        ? {
                          width: `min(100%, ${openViewport.width}px)`,
                          aspectRatio: `${openViewport.width} / ${openViewport.height}`,
                        }
                        : undefined
                    }
                    readOnlyBodyPaddingClassName="px-8 pt-12 pb-2 sm:p-12 sm:pt-16"
                    readOnlyBodyTextClassName="font-hand text-[1.05rem] leading-[1.62] text-ink whitespace-pre-wrap sm:text-[1.55rem] sm:leading-relaxed"
                  />
                </div>

                <div className="px-5 sm:px-8 pb-4 sm:pb-5 pt-0.5">
                  <p className="font-script text-[1.2rem] sm:text-[1.45rem] text-rose text-right leading-none">
                    - me, from before love
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </>
  );
};

export default FutureLetters;
