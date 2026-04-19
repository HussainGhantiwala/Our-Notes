import { motion } from "framer-motion";
import { TapeDecoration } from "./TapeDecoration";

interface PolaroidPhotoProps {
  src: string;
  caption?: string;
  rotate?: number;
  tape?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}

const sizeMap = {
  sm: "w-40",
  md: "w-56",
  lg: "w-72",
};

export const PolaroidPhoto = ({
  src,
  caption,
  rotate = 0,
  tape = true,
  size = "md",
  className = "",
  onClick,
}: PolaroidPhotoProps) => (
  <motion.figure
    initial={{ opacity: 0, y: 20, rotate: rotate - 4 }}
    whileInView={{ opacity: 1, y: 0, rotate }}
    whileHover={{ rotate: rotate + 1, y: -6, scale: 1.03 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    onClick={onClick}
    className={`polaroid relative ${sizeMap[size]} cursor-pointer ${className}`}
  >
    {tape && <TapeDecoration variant="yellow" rotate={-6} className="-top-3 left-1/2 -translate-x-1/2" />}
    <img
      src={src}
      alt={caption || "memory"}
      loading="lazy"
      className="w-full aspect-square object-cover bg-muted"
    />
    {caption && (
      <figcaption className="font-hand text-ink-soft text-center text-lg mt-2 pb-1">
        {caption}
      </figcaption>
    )}
  </motion.figure>
);
