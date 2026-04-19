import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { FloatingPetals } from "@/components/FloatingPetals";
import { TapeDecoration } from "@/components/TapeDecoration";

const SECRET = "iloveyou"; // placeholder — easily changed later

const Secret = () => {
  const [input, setInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim().toLowerCase().replace(/\s/g, "") === SECRET) {
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <>
      <FloatingPetals count={8} />
      <main className="relative min-h-screen pt-28 pb-20 px-4 flex items-center justify-center">
        <div className="container max-w-2xl">
          <AnimatePresence mode="wait">
            {!unlocked ? (
              <motion.div
                key="locked"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <p className="font-ui text-xs tracking-[0.4em] text-ink-soft uppercase mb-3">
                  Locked page
                </p>
                <h1 className="font-script text-6xl md:text-7xl text-ink mb-4">Just for you</h1>
                <p className="font-hand text-2xl text-ink-soft italic mb-10">
                  hint: three little words, no spaces ♥
                </p>

                {/* Envelope */}
                <motion.div
                  className="relative w-64 h-44 mx-auto mb-8"
                  whileHover={{ y: -4 }}
                >
                  <div className="absolute inset-0 rounded-sm bg-gradient-rose shadow-lift" />
                  <div
                    className="absolute top-0 left-0 right-0 h-28"
                    style={{ background: "hsl(var(--rose))", clipPath: "polygon(0 0, 100% 0, 50% 95%)" }}
                  />
                  <div className="absolute top-14 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl shadow-petal">
                    ♥
                  </div>
                </motion.div>

                <form onSubmit={submit} className="paper rounded-sm p-6 max-w-sm mx-auto rotate-tilt-3 relative">
                  <TapeDecoration variant="yellow" rotate={-6} className="-top-3 left-10" />
                  <label className="font-hand text-xl text-ink block mb-3">
                    whisper the password
                  </label>
                  <input
                    type="password"
                    value={input}
                    onChange={(e) => { setInput(e.target.value); setError(false); }}
                    className="w-full bg-transparent border-b-2 border-ink/40 focus:border-rose outline-none font-hand text-2xl text-ink py-2 text-center"
                    placeholder="• • • • • • • • •"
                  />
                  {error && (
                    <p className="font-hand text-sm text-destructive mt-2">not quite — try again ♥</p>
                  )}
                  <button type="submit" className="btn-romantic mt-5 w-full">
                    unlock the letter
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="paper-lined relative p-8 md:p-14 rounded-sm rotate-tilt-3"
              >
                <TapeDecoration variant="pink" rotate={-5} className="-top-3 left-1/2 -translate-x-1/2" width={120} />
                <p className="font-script text-4xl text-rose mb-6">to my favorite person,</p>
                <div className="space-y-4 font-hand text-2xl md:text-[1.55rem] text-ink leading-relaxed">
                  <p>If you got here, you guessed right. Of course you did.</p>
                  <p>
                    I just wanted you to have a place that's <span className="ink-highlight">only ours</span> —
                    a soft little corner of the internet where I get to say the things I'm too shy
                    to say at dinner.
                  </p>
                  <p>
                    Thank you for being the person I become softer around. For the
                    way you listen. For the way you stay.
                  </p>
                  <p>I love you. In the loud way and in the quiet way. In every way I know how.</p>
                </div>
                <p className="font-script text-3xl text-ink-soft mt-8 text-right">— always yours ♥</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </>
  );
};

export default Secret;
