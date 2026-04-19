import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { futureLetters } from "@/data/journal";
import { FloatingPetals } from "@/components/FloatingPetals";
import { TapeDecoration } from "@/components/TapeDecoration";

const FutureLetters = () => {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = futureLetters.find((l) => l.id === openId);

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
            <h1 className="font-script text-6xl md:text-7xl text-ink mb-3">
              Open when…
            </h1>
            <p className="font-hand text-2xl text-ink-soft italic">
              tuck these away. open them when the moment finds you.
            </p>
          </motion.header>

          <div className="grid sm:grid-cols-2 gap-8">
            {futureLetters.map((l, i) => (
              <motion.button
                key={l.id}
                onClick={() => setOpenId(l.id)}
                initial={{ opacity: 0, y: 30, rotate: i % 2 ? 2 : -2 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ y: -6, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                className="relative text-left group"
              >
                <div className="paper rounded-sm p-7 md:p-9 min-h-[200px] flex flex-col justify-between">
                  <TapeDecoration variant={i % 2 ? "lavender" : "pink"} rotate={-6} className="-top-3 left-8" />
                  <div>
                    <p className="font-ui text-xs tracking-[0.3em] uppercase text-ink-soft mb-2">
                      {l.subtitle}
                    </p>
                    <h2 className="font-display text-3xl italic text-ink">{l.title}</h2>
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
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenId(null)}
              className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.85, opacity: 0, rotate: -3 }}
                animate={{ scale: 1, opacity: 1, rotate: -1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="paper-lined max-w-xl w-full p-8 md:p-12 rounded-sm relative"
              >
                <TapeDecoration variant="pink" rotate={-5} className="-top-3 left-1/2 -translate-x-1/2" width={100} />
                <button
                  onClick={() => setOpenId(null)}
                  className="absolute top-3 right-5 font-hand text-2xl text-ink-soft hover:text-rose"
                  aria-label="close"
                >
                  ×
                </button>
                <p className="font-ui text-xs tracking-[0.3em] uppercase text-ink-soft mb-2">
                  {open.subtitle}
                </p>
                <h3 className="font-script text-4xl text-ink mb-5">{open.title}</h3>
                <p className="font-hand text-2xl text-ink leading-relaxed">{open.body}</p>
                <p className="font-script text-2xl text-rose mt-6 text-right">— me, from before ♥</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </>
  );
};

export default FutureLetters;
