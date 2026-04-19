import { motion } from "framer-motion";
import { PolaroidPhoto } from "@/components/PolaroidPhoto";
import { galleryPhotos } from "@/data/journal";
import { FloatingPetals } from "@/components/FloatingPetals";

const Gallery = () => {
  return (
    <>
      <FloatingPetals count={6} />
      <main className="relative min-h-screen pt-28 pb-20 px-4">
        <div className="container max-w-6xl">
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <p className="font-ui text-xs tracking-[0.4em] text-ink-soft uppercase mb-3">
              The memory wall
            </p>
            <h1 className="font-script text-6xl md:text-7xl text-ink mb-4">Snapshots of us</h1>
            <p className="font-hand text-2xl text-ink-soft italic">
              hanging on a string, taped to a page, kept in a drawer of my heart
            </p>
          </motion.header>

          {/* String of polaroids */}
          <div className="relative mb-20 hidden md:block">
            <svg viewBox="0 0 1000 60" className="w-full h-12" aria-hidden>
              <path d="M0 10 Q 250 50 500 25 T 1000 15" stroke="hsl(var(--ink-soft))" strokeWidth="1.2" fill="none" strokeDasharray="3 4" />
            </svg>
            <div className="flex justify-around -mt-6">
              {galleryPhotos.slice(0, 4).map((p) => (
                <div key={p.id} className="relative">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-1 h-6 bg-ink-soft/50" />
                  <PolaroidPhoto src={p.src} caption={p.caption} rotate={p.rotate} size="sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Masonry collage */}
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-8 space-y-8">
            {galleryPhotos.map((p) => (
              <div key={`m-${p.id}`} className="break-inside-avoid">
                <PolaroidPhoto src={p.src} caption={p.caption} rotate={p.rotate} size="md" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
};

export default Gallery;
