import { ELEMENT_LIBRARY } from "./elementMeta";
import type { ElementType } from "@/lib/chapters";

interface Props {
  onAdd: (type: ElementType) => void;
  onAddMusic?: () => void;
  onAddLyricCard?: () => void;
  allowedTypes?: ElementType[];
}

const groups: { key: string; label: string }[] = [
  { key: "sticky", label: "sticky notes" },
  { key: "tape", label: "washi tape" },
  { key: "sticker", label: "stickers" },
  { key: "frame", label: "frames" },
  { key: "text", label: "text" },
  { key: "music", label: "music" },
];

export const AddOnsPanel = ({ onAdd, onAddMusic, onAddLyricCard, allowedTypes }: Props) => {
  const isAllowed = (type: ElementType) => !allowedTypes || allowedTypes.includes(type);

  return (
    <div>
      <p className="font-print text-xs text-ink-soft uppercase tracking-widest mb-2">add-ons</p>
      {groups.map((group) => {
        const options = ELEMENT_LIBRARY.filter((item) => item.category === group.key && isAllowed(item.type));
        const canShowMusic = group.key === "music" && (isAllowed("music") || isAllowed("lyric_card"));

        if (group.key !== "music" && options.length === 0) return null;
        if (group.key === "music" && !canShowMusic) return null;

        return (
          <div key={group.key} className="mb-3">
            <p className="font-hand text-base text-ink-soft mb-1">{group.label}</p>
            {group.key === "music" ? (
              <div className="flex flex-col gap-2">
                {isAllowed("music") && (
                  <button
                    onClick={onAddMusic}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1DB954]/10 hover:bg-[#1DB954]/25 border border-[#1DB954]/30 font-hand text-base text-ink hover:text-[#1a5c2a] shadow-paper transition-all hover:scale-105"
                  >
                    <span className="text-lg">🎵</span>
                    + add music
                  </button>
                )}
                {isAllowed("lyric_card") && (
                  <button
                    onClick={onAddLyricCard}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose/10 hover:bg-rose/25 border border-rose/30 font-hand text-base text-ink hover:text-rose-700 shadow-paper transition-all hover:scale-105"
                  >
                    <span className="text-lg">🎤</span>
                    + add lyric card
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {options.map((spec) => (
                  <button
                    key={spec.type}
                    onClick={() => onAdd(spec.type)}
                    title={spec.label}
                    className="w-10 h-10 rounded-md bg-cream/70 hover:bg-blush/60 border border-ink/10 flex items-center justify-center text-xl shadow-paper transition-all hover:scale-110"
                  >
                    {spec.glyph}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <p className="font-print text-[10px] text-ink-soft italic mt-2">click an item to drop it onto the page</p>
    </div>
  );
};
