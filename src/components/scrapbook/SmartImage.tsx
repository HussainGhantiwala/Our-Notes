import { useState } from "react";

interface Props {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const SmartImage = ({ src, alt = "", className, style }: Props) => {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const [bust, setBust] = useState(0);

  return (
    <div className={`relative ${className ?? ""}`} style={style}>
      {state === "loading" && (
        <div className="absolute inset-0 animate-pulse bg-blush/40 rounded-sm" />
      )}
      {state === "error" ? (
        <button
          onClick={() => { setState("loading"); setBust((b) => b + 1); }}
          className="absolute inset-0 flex flex-col items-center justify-center bg-blush/30 font-hand text-ink-soft text-sm hover:bg-blush/50"
        >
          <span>image didn't load</span>
          <span className="text-rose underline">tap to retry</span>
        </button>
      ) : (
        <img
          key={bust}
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setState("loaded")}
          onError={() => setState("error")}
          className="w-full h-full object-cover block"
          style={{ opacity: state === "loaded" ? 1 : 0, transition: "opacity 250ms" }}
        />
      )}
    </div>
  );
};
