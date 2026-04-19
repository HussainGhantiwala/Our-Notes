import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { bouquetFlowers } from "@/data/journal";
import { FloatingPetals } from "@/components/FloatingPetals";
import { TapeDecoration } from "@/components/TapeDecoration";

const positions = [
  { x: -90, y: -40, scale: 1.1 },
  { x: 90, y: -40, scale: 1.1 },
  { x: -140, y: 40, scale: 1 },
  { x: 0, y: -90, scale: 1.2 },
  { x: 140, y: 40, scale: 1 },
  { x: 0, y: 80, scale: 1 },
];

const Bouquet = () => {
  const [active, setActive] = useState<string | null>(null);
  const activeFlower = bouquetFlowers.find((f) => f.id === active);

  return (
    <>
      <FloatingPetals count={6} />
      <main className="relative min-h-screen pt-28 pb-20 px-4">
        <div className="container max-w-5xl">
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <p className="font-ui text-xs tracking-[0.4em] text-ink-soft uppercase mb-3">
              A little bouquet
            </p>
            <h1 className="font-script text-6xl md:text-7xl text-ink mb-3">For you, today</h1>
            <p className="font-hand text-2xl text-ink-soft italic max-w-xl mx-auto">
              tap a flower — each one is carrying something I wanted to say
            </p>
          </motion.header>

          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Bouquet */}
            <div className="relative h-[460px] flex items-end justify-center">
              <div className="absolute bottom-0 w-44 h-56 rounded-b-[40%] rotate-[3deg] shadow-lift" style={{ background: "linear-gradient(180deg, hsl(var(--kraft)), hsl(25 40% 25%))" }}>
                <div className="absolute top-2 inset-x-0 h-2 bg-blush/70" />
                <TapeDecoration variant="pink" rotate={-6} className="top-6 left-1/2 -translate-x-1/2" width={70} />
              </div>

              <div className="relative w-full h-80 flex items-center justify-center">
                {bouquetFlowers.map((f, i) => {
                  const pos = positions[i % positions.length];
                  return (
                    <motion.button
                      key={f.id}
                      onClick={() => setActive(f.id)}
                      initial={{ opacity: 0, y: 40, scale: 0 }}
                      animate={{ opacity: 1, y: pos.y, x: pos.x, scale: pos.scale }}
                      transition={{ delay: 0.3 + i * 0.12, type: "spring", stiffness: 80 }}
                      whileHover={{ scale: pos.scale * 1.15, rotate: 8 }}
                      className="absolute text-6xl md:text-7xl drop-shadow-lg"
                      aria-label={f.name}
                      style={{ filter: active === f.id ? "drop-shadow(0 0 12px hsl(var(--rose) / 0.6))" : undefined }}
                    >
                      {f.emoji}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Note card */}
            <div className="relative">
              <AnimatePresence mode="wait">
                {activeFlower ? (
                  <motion.div
                    key={activeFlower.id}
                    initial={{ opacity: 0, y: 20, rotate: -3 }}
                    animate={{ opacity: 1, y: 0, rotate: -1 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="paper relative p-8 md:p-10 rounded-sm"
                  >
                    <TapeDecoration variant="yellow" rotate={-6} className="-top-3 left-8" />
                    <p className="font-ui text-xs tracking-[0.3em] uppercase text-ink-soft mb-2">
                      {activeFlower.name}
                    </p>
                    <p className="font-hand text-3xl md:text-4xl text-ink leading-snug">
                      {activeFlower.message}
                    </p>
                    <p className="font-script text-2xl text-rose mt-6 text-right">— me</p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="paper-lined p-8 md:p-10 rounded-sm rotate-tilt-3"
                  >
                    <p className="font-hand text-2xl text-ink-soft italic text-center">
                      pick any flower —<br />
                      it'll tell you a secret
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default Bouquet;
