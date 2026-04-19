import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export const EnvelopeLoader = () => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShow(false), 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="text-center">
            <motion.div
              className="relative w-44 h-32 mx-auto"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <div className="absolute inset-0 rounded-sm bg-gradient-rose shadow-lift" />
              <motion.div
                className="absolute top-0 left-0 right-0 h-20 origin-top"
                style={{
                  background: "hsl(var(--rose))",
                  clipPath: "polygon(0 0, 100% 0, 50% 90%)",
                }}
                initial={{ rotateX: 0 }}
                animate={{ rotateX: 180 }}
                transition={{ delay: 0.8, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.div
                className="absolute top-12 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl shadow-petal"
                initial={{ y: 0, opacity: 1 }}
                animate={{ y: -30, opacity: 0 }}
                transition={{ delay: 1.3, duration: 0.5 }}
              >
                ♥
              </motion.div>
            </motion.div>
            <motion.p
              className="font-hand text-2xl text-ink-soft mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              opening our story…
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
