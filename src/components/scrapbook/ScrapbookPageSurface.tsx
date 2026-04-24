import { Side } from "@/lib/chapters";
import { TapeDecoration } from "../TapeDecoration";

interface Props {
  side: Side;
  pageCls: string;
  label?: string;
  className?: string;
}

export const ScrapbookPageSurface = ({
  side,
  pageCls,
  label,
  className = "",
}: Props) => {
  const tape =
    side === "left" ? (
      <TapeDecoration variant="pink" rotate={-6} className="-top-3 left-10" />
    ) : (
      <TapeDecoration variant="lavender" rotate={5} className="-top-3 right-10" />
    );

  return (
    <div
      className={`${pageCls} ${side === "left" ? "border-r border-ink/10" : ""} relative h-full ${className}`}
    >
      {tape}
      {label && (
        <p className="pointer-events-none absolute left-8 top-4 mb-3 font-print text-sm text-ink-soft">
          {label}
        </p>
      )}
    </div>
  );
};
