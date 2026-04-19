import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { TapeDecoration } from "./TapeDecoration";
import type { Chapter } from "@/data/journal";

const variantBg: Record<Chapter["paperVariant"], string> = {
  blush: "bg-gradient-rose",
  lavender: "bg-gradient-dusk",
  peach: "bg-gradient-rose",
  sage: "bg-gradient-meadow",
  blue: "bg-gradient-dusk",
};

const variantTape: Record<Chapter["paperVariant"], "pink" | "lavender" | "yellow" | "mint" | "blue"> = {
  blush: "pink",
  lavender: "lavender",
  peach: "yellow",
  sage: "mint",
  blue: "blue",
};

interface Props { chapter: Chapter; index: number }

export const ChapterCard = ({ chapter, index }: Props) => {
  const tilt = index % 2 === 0 ? -1.5 : 1.5;
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotate: tilt - 2 }}
      whileInView={{ opacity: 1, y: 0, rotate: tilt }}
      whileHover={{ y: -8, rotate: tilt + 0.5 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <Link to={`/chapter/${chapter.id}`} className="block group">
        <div className={`absolute -inset-2 ${variantBg[chapter.paperVariant]} rounded opacity-40 blur-xl`} aria-hidden />
        <article className="relative paper rounded-sm p-7 md:p-9 min-h-[320px] flex flex-col">
          <TapeDecoration variant={variantTape[chapter.paperVariant]} rotate={-6} className="-top-3 left-8" />
          <TapeDecoration variant={variantTape[chapter.paperVariant]} rotate={5} className="-top-3 right-10" width={60} />

          <div className="flex items-start justify-between mb-4">
            <span className="font-ui text-xs uppercase tracking-[0.3em] text-ink-soft">
              Chapter {String(chapter.number).padStart(2, "0")}
            </span>
            <span className="font-hand text-ink-soft text-lg">{chapter.date}</span>
          </div>

          <h3 className="font-display text-3xl md:text-4xl text-ink mb-3 italic">
            {chapter.title}
          </h3>

          <p className="font-hand text-xl text-ink-soft leading-snug flex-1">
            {chapter.preview}
          </p>

          <div className="mt-5 flex items-end justify-between">
            <span className="text-3xl" aria-label="mood">{chapter.mood}</span>
            <span className="font-hand text-lg text-rose group-hover:underline underline-offset-4">
              read this chapter →
            </span>
          </div>
        </article>
      </Link>
    </motion.div>
  );
};
