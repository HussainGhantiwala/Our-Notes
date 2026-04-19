import { useEffect, useRef, useState } from "react";

// Soft ambient piano loop (royalty-free, hosted CDN).
const AMBIENT_SRC =
  "https://cdn.pixabay.com/audio/2022/10/30/audio_347117c181.mp3";

export const MusicToggle = () => {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = new Audio(AMBIENT_SRC);
    a.loop = true;
    a.volume = 0.25;
    audioRef.current = a;
    return () => {
      a.pause();
      audioRef.current = null;
    };
  }, []);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      try {
        await a.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={playing ? "Pause ambient music" : "Play ambient music"}
      className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full bg-background/80 backdrop-blur shadow-lift border border-rose/30 flex items-center justify-center font-hand text-xl text-ink hover:scale-110 transition-transform"
      title={playing ? "soft music — playing" : "soft music — off"}
    >
      {playing ? "♪" : "♫"}
    </button>
  );
};
