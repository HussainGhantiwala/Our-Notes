import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { estimateMixtapeMinutes, type MixtapeWithTracks } from "@/lib/mixtape";

interface MixtapeCassetteProps {
  mixtape: MixtapeWithTracks;
  index?: number;
}

const palette = [
  {
    shell: "linear-gradient(180deg, #f8f1ec 0%, #f2e6df 100%)",
    label: "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(248,225,223,0.88))",
    reel: "#e3d5cc",
    accent: "#d9b7b1",
  },
  {
    shell: "linear-gradient(180deg, #f7f0e6 0%, #efe3d8 100%)",
    label: "linear-gradient(135deg, rgba(255,255,255,0.88), rgba(245,228,212,0.86))",
    reel: "#ddcfc0",
    accent: "#c8b29e",
  },
  {
    shell: "linear-gradient(180deg, #f6efef 0%, #f0e1e6 100%)",
    label: "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(238,219,226,0.88))",
    reel: "#dfcdd3",
    accent: "#c9aab5",
  },
];

export const MixtapeCassette = ({ mixtape, index = 0 }: MixtapeCassetteProps) => {
  const colors = palette[index % palette.length];
  const minutes = estimateMixtapeMinutes(mixtape.tracks.length);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, rotate: index % 2 === 0 ? -1.3 : 1.3 }}
      animate={{ opacity: 1, y: 0, rotate: index % 2 === 0 ? -0.8 : 0.8 }}
      transition={{ duration: 0.45, delay: index * 0.05 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="group relative mx-auto w-full max-w-[380px]"
    >
      <Link
        to={`/mixtapes/${mixtape.id}`}
        className="relative block h-[212px] overflow-hidden rounded-[24px] border border-white/55 p-5 shadow-[0_18px_38px_-24px_rgba(98,74,61,0.48),0_7px_18px_-14px_rgba(98,74,61,0.26)]"
        style={{ background: colors.shell }}
      >
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 18%, rgba(255,255,255,0.7), transparent 26%), radial-gradient(circle at 82% 72%, rgba(255,255,255,0.5), transparent 24%), url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.6 0 0 0 0 0.54 0 0 0 0 0.48 0 0 0 0.05 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          }}
        />

        <div className="relative z-10 flex h-full flex-col">
          <div
            className="rounded-[18px] border border-white/60 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
            style={{ background: colors.label }}
          >
            <p className="font-script text-[2rem] leading-none text-ink">
              {mixtape.title}
            </p>
            <p className="mt-1 font-hand text-xl leading-none text-ink-soft">
              {mixtape.tracks.length} songs * {minutes} mins
            </p>
          </div>

          <div className="mt-5 flex flex-1 items-center justify-between px-2">
            <div className="relative flex items-center gap-7 pl-3">
              {[0, 1].map((reel) => (
                <div
                  key={reel}
                  className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition-transform duration-500 group-hover:rotate-180"
                  style={{ background: colors.reel }}
                >
                  <div className="h-4 w-4 rounded-full bg-white/75" />
                  <div className="absolute h-1 w-8 rounded-full bg-white/65" />
                  <div className="absolute h-8 w-1 rounded-full bg-white/65" />
                </div>
              ))}
              <div
                className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full"
                style={{ background: `linear-gradient(90deg, transparent, ${colors.accent}, transparent)` }}
              />
            </div>

            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1db954] text-white shadow-[0_10px_18px_-12px_rgba(29,185,84,0.6)] transition-transform hover:scale-105"
              aria-label="Open mixtape"
            >
              <span className="ml-0.5 text-sm">▶</span>
            </button>
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-ink/8 pt-3">
            <span className="font-ui text-[11px] uppercase tracking-[0.28em] text-ink-soft/70">
              {mixtape.tracks.length} songs
            </span>
            <span className="font-hand text-xl text-rose">
              open
            </span>
          </div>

          <span className="absolute left-3 top-3 h-2 w-2 rounded-full bg-ink/18" />
          <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-ink/18" />
          <span className="absolute bottom-3 left-3 h-2 w-2 rounded-full bg-ink/18" />
          <span className="absolute bottom-3 right-3 h-2 w-2 rounded-full bg-ink/18" />
        </div>
      </Link>
    </motion.div>
  );
};
