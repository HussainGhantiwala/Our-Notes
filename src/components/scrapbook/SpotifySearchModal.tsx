import { useState, useRef, useEffect, useCallback } from "react";
import { searchSpotifyTracks, SpotifyTrack } from "@/lib/spotify";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (track: SpotifyTrack) => void;
}

export const SpotifySearchModal = ({ open, onClose, onSelect }: Props) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);

  // Auto-focus when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    setError(null);
    try {
      const tracks = await searchSpotifyTracks(q, 10);
      setResults(tracks);
    } catch (err: any) {
      setError(err.message ?? "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onInput = (val: string) => {
    setQuery(val);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => doSearch(val), 350);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-[94vw] max-w-lg max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(30 30% 96%) 0%, hsl(350 30% 95%) 100%)",
          border: "1px solid hsl(20 30% 25% / 0.12)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎵</span>
            <h2 className="font-hand text-2xl text-ink">add music</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-ink/5 hover:bg-ink/15 flex items-center justify-center font-hand text-ink-soft hover:text-rose transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Search input */}
        <div className="px-5 pb-3">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => onInput(e.target.value)}
              placeholder="search songs, artists, albums…"
              className="w-full bg-white/70 border border-ink/10 rounded-xl px-4 py-3 font-hand text-lg text-ink outline-none focus:border-rose/50 focus:ring-2 focus:ring-rose/20 transition-all placeholder:text-ink-soft/50"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-rose/30 border-t-rose rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 min-h-0">
          {error && (
            <p className="font-hand text-rose text-center py-4">{error}</p>
          )}

          {!loading && results.length === 0 && query.trim() && !error && (
            <p className="font-hand text-ink-soft text-center py-8 italic">no results found</p>
          )}

          {!query.trim() && !loading && (
            <div className="text-center py-8">
              <p className="text-4xl mb-2">🎧</p>
              <p className="font-hand text-ink-soft italic">search for a song to add to your scrapbook</p>
            </div>
          )}

          <div className="grid gap-2">
            {results.map((track) => (
              <button
                key={track.id}
                onClick={() => { onSelect(track); onClose(); }}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-white/50 hover:bg-white/80 border border-transparent hover:border-rose/30 transition-all group text-left"
              >
                {/* Album art */}
                {track.albumArt ? (
                  <img
                    src={track.albumArt}
                    alt=""
                    className="w-14 h-14 rounded-lg object-cover flex-none shadow-sm group-hover:shadow-md transition-shadow"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-ink/10 flex items-center justify-center flex-none text-2xl">
                    🎵
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-hand text-lg text-ink truncate leading-tight">
                    {track.name}
                  </p>
                  <p className="font-print text-xs text-ink-soft truncate">
                    {track.artist}
                  </p>
                  <p className="font-print text-[10px] text-ink-soft/70 truncate">
                    {track.albumName}
                  </p>
                </div>

                {/* Preview indicator */}
                <div className="flex-none flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {track.previewUrl && (
                    <span className="font-print text-[10px] text-sage uppercase tracking-wider">preview</span>
                  )}
                  <div className="w-8 h-8 rounded-full bg-rose/20 flex items-center justify-center text-rose text-sm">
                    +
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Spotify attribution */}
        <div className="px-5 py-2.5 border-t border-ink/8 flex items-center justify-center gap-2 bg-white/30">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#1DB954]">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381C8.88 5.76 15.78 6.06 20.1 8.82c.541.3.719 1.02.42 1.561-.299.421-1.02.599-1.439.299z" fill="currentColor" />
          </svg>
          <span className="font-print text-[10px] text-ink-soft uppercase tracking-wider">powered by spotify</span>
        </div>
      </div>
    </div>
  );
};
