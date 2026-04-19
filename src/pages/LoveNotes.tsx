import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { loveNotes } from "@/data/journal";
import { StickyNote } from "@/components/StickyNote";
import { FloatingPetals } from "@/components/FloatingPetals";

const LoveNotes = () => {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = loveNotes.find((n) => n.id === openId);

  return (
    <>
      <FloatingPetals count={5} />
      <main className="relative min-h-screen pt-28 pb-20 px-4">
        <div className="container max-w-6xl">
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-14"
          >
            <p className="font-ui text-xs tracking-[0.4em] text-ink-soft uppercase mb-3">
              Things I never said out loud
            </p>
            <h1 className="font-script text-6xl md:text-7xl text-ink mb-3">Notes for you</h1>
            <p className="font-hand text-2xl text-ink-soft italic">
              tap a sticky note — there's more on the back
            </p>
          </motion.header>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
            {loveNotes.map((n, i) => (
              <StickyNote
                key={n.id}
                color={n.color}
                rotate={i % 2 === 0 ? -2 : 2.5}
                onClick={() => setOpenId(n.id)}
              >
                {n.short}
              </StickyNote>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenId(null)}
              className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.85, rotate: -6, opacity: 0 }}
                animate={{ scale: 1, rotate: -2, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="paper max-w-md w-full p-8 md:p-10 rounded-sm relative"
              >
                <button
                  onClick={() => setOpenId(null)}
                  className="absolute top-3 right-4 font-hand text-2xl text-ink-soft hover:text-rose"
                  aria-label="close"
                >
                  ×
                </button>
                <p className="font-script text-3xl text-rose mb-4">a little note</p>
                <p className="font-hand text-2xl text-ink leading-snug">{open.full}</p>
                <p className="font-script text-2xl text-ink-soft mt-6 text-right">♥</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </>
  );
};

export default LoveNotes;
