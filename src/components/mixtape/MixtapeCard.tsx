import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TapeDecoration } from "@/components/TapeDecoration";
import { Button } from "@/components/ui/button";
import { previewAudio } from "@/lib/spotify";
import type { MixtapeTrackDraft, MixtapeTrackRow } from "@/lib/mixtape";

interface MixtapeCardProps {
  index: number;
  track: MixtapeTrackDraft | MixtapeTrackRow;
  onRemove?: () => void;
}

const toTrackData = (track: MixtapeTrackDraft | MixtapeTrackRow) => ({
  id: "track_id" in track ? track.track_id : track.id,
  name: track.name,
  artist: track.artist,
  albumArt: "album_art" in track ? track.album_art : track.albumArt,
  previewUrl: "preview_url" in track ? track.preview_url : track.previewUrl,
  spotifyUrl: "spotify_url" in track ? track.spotify_url : track.spotifyUrl,
  note: track.note ?? "",
});

export const MixtapeCard = ({ index, track, onRemove }: MixtapeCardProps) => {
  const data = useMemo(() => toTrackData(track), [track]);
  const playerId = `mixtape-card-${data.id}-${index}`;
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const unsubscribe = previewAudio.subscribe((state) => {
      setPlaying(state.elementId === playerId && state.playing);
    });
    return unsubscribe;
  }, [playerId]);

  const handlePlay = () => {
    if (data.previewUrl) {
      previewAudio.play(playerId, data.previewUrl);
      return;
    }

    if (data.spotifyUrl) {
      window.open(data.spotifyUrl, "_blank", "noopener");
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 18, rotate: index % 2 === 0 ? -0.9 : 0.9 }}
      animate={{ opacity: 1, y: 0, rotate: index % 2 === 0 ? -0.55 : 0.55 }}
      transition={{ duration: 0.45, delay: index * 0.04 }}
      className="paper relative overflow-hidden rounded-[28px] border border-white/55 px-5 py-5 sm:px-6 sm:py-6"
      style={{
        boxShadow: "0 14px 34px -22px hsl(20 30% 25% / 0.45), 0 5px 18px -10px hsl(20 30% 25% / 0.22)",
      }}
    >
      <TapeDecoration
        variant={index % 3 === 0 ? "pink" : index % 3 === 1 ? "lavender" : "mint"}
        rotate={index % 2 === 0 ? -8 : 7}
        className="-top-2 left-6"
        width={92}
      />

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex items-start gap-4 sm:w-[42%]">
          <div className="relative shrink-0">
            {data.albumArt ? (
              <img
                src={data.albumArt}
                alt=""
                className="h-24 w-24 rounded-[20px] object-cover shadow-[0_10px_24px_-12px_hsl(20_30%_25%_/_0.5)] sm:h-28 sm:w-28"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-[20px] bg-blush/35 text-3xl text-ink-soft sm:h-28 sm:w-28">
                note
              </div>
            )}
            <span className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 font-hand text-lg text-ink shadow-paper">
              {index + 1}
            </span>
          </div>

          <div className="min-w-0 pt-1">
            <p className="font-ui text-[10px] uppercase tracking-[0.32em] text-ink-soft/70">
              mixtape pick
            </p>
            <h3 className="mt-1 font-display text-2xl italic leading-tight text-ink">
              {data.name}
            </h3>
            <p className="mt-1 font-ui text-sm text-ink-soft">
              {data.artist}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={handlePlay}
                className="rounded-full border border-rose/25 bg-rose/85 px-4 text-sm text-primary-foreground shadow-none hover:bg-rose"
              >
                {playing ? "pause preview" : data.previewUrl ? "play preview" : "open on spotify"}
              </Button>
              {onRemove && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onRemove}
                  className="rounded-full font-hand text-lg text-ink-soft hover:bg-white/55 hover:text-rose"
                >
                  remove
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="relative sm:flex-1">
          <div className="rounded-[24px] bg-white/60 px-5 py-4 shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.4)]">
            <p className="font-ui text-[10px] uppercase tracking-[0.3em] text-ink-soft/65">
              little note
            </p>
            <p className="mt-2 font-hand text-[1.7rem] leading-[1.1] text-ink">
              {data.note || "this one still feels unfinished, but it wanted to be here."}
            </p>
          </div>
        </div>
      </div>
    </motion.article>
  );
};
