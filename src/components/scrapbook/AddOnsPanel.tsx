import { ELEMENT_LIBRARY } from "./elementMeta";
import { ElementType } from "@/lib/chapters";

interface Props {
  onAdd: (type: ElementType) => void;
}

const groups: { key: string; label: string }[] = [
  { key: "sticky", label: "sticky notes" },
  { key: "tape", label: "washi tape" },
  { key: "sticker", label: "stickers" },
  { key: "frame", label: "frames" },
  { key: "text", label: "text" },
];

export const AddOnsPanel = ({ onAdd }: Props) => (
  <div>
    <p className="font-print text-xs text-ink-soft uppercase tracking-widest mb-2">add-ons</p>
    {groups.map((g) => (
      <div key={g.key} className="mb-3">
        <p className="font-hand text-base text-ink-soft mb-1">{g.label}</p>
        <div className="flex flex-wrap gap-2">
          {ELEMENT_LIBRARY.filter((e) => e.category === g.key).map((spec) => (
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
      </div>
    ))}
    <p className="font-print text-[10px] text-ink-soft italic mt-2">click an item to drop it onto the page</p>
  </div>
);
