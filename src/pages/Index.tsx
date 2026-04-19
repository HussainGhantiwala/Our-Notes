import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FloatingPetals } from "@/components/FloatingPetals";
import { TapeDecoration } from "@/components/TapeDecoration";
import { EnvelopeLoader } from "@/components/EnvelopeLoader";
import pressedRose from "@/assets/pressed-rose.png";
import pressedLavender from "@/assets/pressed-lavender.png";
import pressedDaisy from "@/assets/pressed-daisy.png";
import doodleHeart from "@/assets/doodle-heart.png";
import doodleStar from "@/assets/doodle-star.png";

const Index = () => {
  return (
    <>
      <EnvelopeLoader />
      <FloatingPetals count={16} />

      <main className="relative min-h-screen flex items-center justify-center px-4 py-24 overflow-hidden">
        {/* Ambient pressed flowers */}
        <img
          src={pressedRose}
          alt=""
          aria-hidden
          className="absolute -top-6 -left-6 w-44 md:w-56 opacity-80 animate-float-slow pointer-events-none"
          style={{ transform: "rotate(-18deg)" }}
        />
        <img
          src={pressedLavender}
          alt=""
          aria-hidden
          className="absolute bottom-6 -right-4 w-32 md:w-44 opacity-80 animate-float-slow pointer-events-none"
          style={{ animationDelay: "1.5s", transform: "rotate(18deg)" }}
        />
        <img
          src={pressedDaisy}
          alt=""
          aria-hidden
          className="absolute top-24 right-12 w-24 md:w-28 opacity-90 animate-float-slow pointer-events-none hidden sm:block"
          style={{ animationDelay: "3s" }}
        />
        <img src={doodleStar} alt="" aria-hidden className="absolute bottom-20 left-10 w-16 md:w-20 animate-sparkle pointer-events-none opacity-80" />
        <img src={doodleHeart} alt="" aria-hidden className="absolute top-16 left-1/3 w-12 md:w-16 animate-sparkle pointer-events-none opacity-70" style={{ animationDelay: "1s" }} />

        <motion.section
          initial={{ opacity: 0, y: 30, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: -1 }}
          transition={{ delay: 1.6, duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative paper-lined max-w-2xl w-full px-8 py-14 md:px-16 md:py-20 rounded-sm"
        >
          <TapeDecoration variant="pink" rotate={-4} className="-top-3 left-1/2 -translate-x-1/2" width={120} />
          <TapeDecoration variant="lavender" rotate={3} className="-bottom-3 right-10" width={70} />
          <TapeDecoration variant="mint" rotate={-8} className="top-12 -right-6" width={60} />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 0.8 }}
            className="font-ui text-xs tracking-[0.4em] text-ink-soft text-center uppercase mb-3"
          >
            A handmade journal
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.1, duration: 1 }}
            className="font-script text-7xl md:text-8xl text-ink text-center leading-none"
          >
            Our Story
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.4, duration: 0.9 }}
            className="font-hand text-2xl md:text-3xl text-ink-soft text-center mt-6 italic text-balance"
          >
            A journal of <span className="ink-underline">us</span>, one chapter at a time.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.7, duration: 0.9 }}
            className="font-print text-lg text-ink-soft/80 text-center mt-6 max-w-md mx-auto leading-relaxed"
          >
            Pressed flowers. Taped photos. The little things I wanted to keep
            somewhere safe — like the way you laugh, and every quiet Sunday.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3, duration: 0.7 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/chapters" className="btn-romantic text-xl">
              ✿ Open Our Journal
            </Link>
            <Link
              to="/secret"
              className="font-hand text-lg text-ink-soft hover:text-rose underline-offset-4 hover:underline"
            >
              or peek at the secret page →
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3.3, duration: 1 }}
            className="font-hand text-base text-ink-soft/70 text-center mt-12 italic"
          >
            made with love — for you, only you ♥
          </motion.p>
        </motion.section>
      </main>
    </>
  );
};

export default Index;
