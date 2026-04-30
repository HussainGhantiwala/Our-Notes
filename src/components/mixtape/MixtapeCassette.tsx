import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { estimateMixtapeMinutes, type MixtapeWithTracks } from "@/lib/mixtape";

interface MixtapeCassetteProps {
  mixtape: MixtapeWithTracks;
  index?: number;
}

export const MixtapeCassette = ({ mixtape, index = 0 }: MixtapeCassetteProps) => {
  const minutes = estimateMixtapeMinutes(mixtape.tracks.length);
  const subtitle = mixtape.description?.trim();
  const tilt = index % 2 === 0 ? -0.85 : 0.85;

  // Base beige/cream color used for the neumorphic design
  const baseColor = "#EFEAE0";
  const darkShadow = "#D2C9BB";
  const lightShadow = "#FFFFFF";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, rotate: tilt + (tilt < 0 ? -0.55 : 0.55) }}
      animate={{ opacity: 1, y: 0, rotate: tilt }}
      transition={{ duration: 0.45, delay: index * 0.05 }}
      whileHover={{ scale: 1.015, y: -4, rotate: tilt + (tilt < 0 ? -0.2 : 0.2) }}
      whileTap={{ scale: 0.995, y: -1 }}
      className="group relative mx-auto w-full max-w-[400px]"
    >
      <Link
        to={`/mixtapes/${mixtape.id}`}
        className="relative block h-[256px] overflow-hidden rounded-[28px] p-5 transition-shadow duration-500"
        style={{
          background: `linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(210,201,187,0.1) 100%), ${baseColor}`,
          boxShadow: `
            16px 16px 32px ${darkShadow}99, 
            -16px -16px 32px ${lightShadow}, 
            inset 2px 2px 4px ${lightShadow}88, 
            inset -2px -2px 4px ${darkShadow}44
          `,
        }}
      >
        {/* Noise overlay for subtle texture */}
        <div
          className="absolute inset-0 opacity-[0.02] mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Top left corner highlight */}
        <div className="absolute inset-0 rounded-[28px] shadow-[inset_1px_1px_1px_rgba(255,255,255,0.9)] pointer-events-none" />

        {/* Cassette Indentations (Top) */}
        <div
          className="absolute left-[12%] top-3.5 h-2 w-7 rounded-full"
          style={{
            boxShadow: `inset 2px 2px 4px ${darkShadow}88, inset -1px -1px 2px ${lightShadow}`,
          }}
        />
        <div
          className="absolute left-[16%] top-3.5 h-2 w-2 rounded-full"
          style={{
            boxShadow: `inset 2px 2px 4px ${darkShadow}88, inset -1px -1px 2px ${lightShadow}`,
          }}
        />
        <div
          className="absolute right-[12%] top-3.5 h-2 w-16 rounded-full"
          style={{
            boxShadow: `inset 2px 2px 4px ${darkShadow}88, inset -1px -1px 2px ${lightShadow}`,
          }}
        />

        {/* Bottom screw holes */}
        <div
          className="absolute bottom-4 left-4 h-2.5 w-2.5 rounded-full"
          style={{
            boxShadow: `inset 1px 1px 3px ${darkShadow}, inset -1px -1px 2px ${lightShadow}`,
          }}
        />
        <div
          className="absolute bottom-4 right-4 h-2.5 w-2.5 rounded-full"
          style={{
            boxShadow: `inset 1px 1px 3px ${darkShadow}, inset -1px -1px 2px ${lightShadow}`,
          }}
        />

        <div className="relative z-10 flex h-full flex-col">
          {/* REELS SECTION */}
          <div className="relative mt-3 flex justify-center gap-[72px] px-4 py-2">
            {[0, 1].map((reel) => (
              <div
                key={reel}
                className={`relative flex h-[90px] w-[90px] items-center justify-center rounded-full transition-transform ease-out ${reel === 0 ? "group-hover:rotate-[25deg]" : "group-hover:-rotate-[25deg]"
                  }`}
                style={{
                  background: baseColor,
                  boxShadow: `
                    inset 6px 6px 12px ${darkShadow}aa, 
                    inset -6px -6px 12px ${lightShadow}, 
                    1px 1px 2px ${lightShadow}88
                  `,
                  transitionDuration: "1600ms",
                }}
              >
                {/* Micro highlight on outer embedded edge */}
                <div className="absolute inset-0 rounded-full shadow-[inset_1px_1px_1px_rgba(255,255,255,0.7)] pointer-events-none" />

                {/* Dashed ring */}
                <div className="absolute inset-[20px] rounded-full border-[1.5px] border-dashed border-[#C1B7A6] opacity-70" />

                {/* Center hole recess */}
                <div
                  className="relative z-10 flex h-[24px] w-[24px] items-center justify-center rounded-full"
                  style={{
                    background: "#E8E2D6",
                    boxShadow: `
                      inset 3px 3px 6px ${darkShadow}cc, 
                      inset -2px -2px 5px ${lightShadow}, 
                      1px 1px 3px ${lightShadow}cc
                    `,
                  }}
                >
                  {/* Spindle hole */}
                  <div
                    className="h-[8px] w-[8px] rounded-full bg-[#B2A896]"
                    style={{ boxShadow: "inset 1px 1px 3px rgba(0,0,0,0.15)" }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* LABEL SECTION */}
          <div className="relative z-20 mt-auto">
            {/* Paper Label */}
            <div
              className="relative mx-1 h-[88px] overflow-hidden rounded-[6px] bg-[#FAF8F5] px-6 py-4"
              style={{
                transform: "rotate(-0.4deg)",
                boxShadow: `
                  0 4px 12px ${darkShadow}44, 
                  0 1px 3px ${darkShadow}22, 
                  inset 0 0 0 1px rgba(255,255,255,0.8),
                  inset 0 0 0 2px rgba(230,224,214,0.3)
                `,
              }}
            >
              {/* Subtle inner lines like notebook paper */}
              <div
                className="absolute inset-0 opacity-50"
                style={{
                  backgroundImage: `repeating-linear-gradient(180deg, transparent, transparent 25px, #EAE5DC 25px, #EAE5DC 26px)`,
                }}
              />

              <div className="relative flex h-full items-center justify-between">
                <div className="flex-1 pr-16">
                  <h3 className="font-script text-[1.9rem] leading-[1.1] text-[#6D5D4E] truncate">
                    {mixtape.title}
                  </h3>

                  {subtitle && (
                    <p className="mt-2 font-serif text-[0.9rem] italic text-[#968E83] line-clamp-2">
                      {subtitle}
                    </p>
                  )}
                </div>

                <div className="flex items-end pb-[2px]">
                  <p className="font-ui text-[9px] font-semibold uppercase tracking-[0.22em] text-[#A69C8F]">
                    {mixtape.tracks.length} tracks
                  </p>
                </div>
              </div>
            </div>

            {/* PLAY BUTTON (Floating above cassette and label) */}
            <button
              type="button"
              onClick={(e) => {
                if (mixtape.spotify_playlist_url) {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(mixtape.spotify_playlist_url, "_blank", "noopener");
                }
              }}
              className={`absolute right-0 bottom-0 translate-x-1/3 translate-y-1/3 
flex h-[58px] w-[58px] items-center justify-center rounded-full 
transition-all duration-300

ring-2 ring-[#EFEAE0]

${mixtape.spotify_playlist_url
                  ? "cursor-pointer hover:scale-105 hover:translate-y-[2px] hover:shadow-[0_12px_30px_rgba(91,102,81,0.35)] active:scale-95"
                  : "cursor-default opacity-60"
                }`}
              style={{
                background: "#5B6651",
                boxShadow: `
      0 10px 20px rgba(0,0,0,0.18),
      0 4px 10px rgba(0,0,0,0.12),
      inset 1px 1px 3px rgba(255,255,255,0.25)
    `,
              }}
            >
              <div
                className="ml-1 h-0 w-0 border-y-[8px] border-y-transparent border-l-[13px] border-l-[#F2EFEA] drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
