import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChapterCard } from "@/components/ChapterCard";
import { FloatingPetals } from "@/components/FloatingPetals";
import { chapters as seedChapters } from "@/data/journal";
import { listPublishedChapters, rowToView } from "@/lib/chapters";
import doodleStar from "@/assets/doodle-star.png";

const Chapters = () => {
  const [items, setItems] = useState(seedChapters);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const rows = await listPublishedChapters();
        if (rows.length > 0) setItems(rows.map(rowToView));
      } catch {
        // fall back to seed
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  return (
    <>
      <FloatingPetals count={8} />
      <main className="relative min-h-screen pt-28 pb-20 px-4">
        <div className="container max-w-6xl">
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16 relative"
          >
            <img src={doodleStar} alt="" aria-hidden className="absolute -top-4 right-1/4 w-14 animate-sparkle opacity-80" />
            <p className="font-ui text-xs tracking-[0.4em] text-ink-soft uppercase mb-3">
              The chapters of us
            </p>
            <h1 className="font-script text-6xl md:text-7xl text-ink mb-4">
              Every month, a memory.
            </h1>
            <p className="font-hand text-2xl text-ink-soft italic max-w-xl mx-auto">
              Pick a page. Read it slowly. There's no rush — we have all of this.
            </p>
          </motion.header>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {items.map((c, i) => (
              <ChapterCard key={c.id} chapter={c} index={i} />
            ))}

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="paper-grid rounded-sm p-9 min-h-[320px] flex flex-col items-center justify-center text-center border-2 border-dashed border-rose/30 rotate-tilt-2"
            >
              <p className="font-hand text-3xl text-ink mb-2">to be continued…</p>
              <p className="font-print text-ink-soft">
                a new chapter is added every month
              </p>
              <span className="text-3xl mt-4">🌷</span>
            </motion.div>
          </div>
          {!loaded && <p className="sr-only">loading</p>}
        </div>
      </main>
    </>
  );
};

export default Chapters;
