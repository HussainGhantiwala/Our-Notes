// Spotify Web API client — Client Credentials flow
// Uses VITE_SPOTIFY_CLIENT_ID and VITE_SPOTIFY_CLIENT_SECRET from .env

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim() ?? "";
const CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET?.trim() ?? "";

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  albumName: string;
  albumArt: string;       // largest album image URL
  previewUrl: string | null;
  spotifyUrl: string;     // external Spotify link
  popularity: number;
}

// ---------- Token cache ----------

let cachedToken: string | null = null;
let tokenExpiry = 0;

export async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error(`Spotify auth failed: ${res.status}`);

  const json = await res.json();
  cachedToken = json.access_token as string;
  // Expire 60 s early to avoid edge-of-expiry requests
  tokenExpiry = Date.now() + (json.expires_in - 60) * 1000;
  return cachedToken;

}

// ---------- Search ----------

export async function searchSpotifyTracks(
  query: string,
  limit?: number,
): Promise<SpotifyTrack[]> {
  if (!query.trim()) return [];

  const token = await getSpotifyToken();

  const rawLimit =
    typeof limit === "number" && Number.isFinite(limit)
      ? limit
      : 10;
  const safeLimit = Math.min(Math.max(Math.trunc(rawLimit), 1), 50);

  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
    query.trim()
  )}&type=track&limit=${safeLimit}&market=IN`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("SPOTIFY SEARCH ERROR:", { status: res.status, body: txt, safeLimit, query });
    throw new Error(`Spotify search failed: ${res.status}`);
  }

  const json = await res.json();
  const items: any[] = json.tracks?.items ?? [];

  return items.map((t) => ({
    id: t.id,
    name: t.name,
    artist: (t.artists ?? []).map((a: any) => a.name).join(", "),
    albumName: t.album?.name ?? "",
    albumArt: t.album?.images?.[0]?.url ?? "",
    previewUrl: t.preview_url ?? null,
    spotifyUrl: t.external_urls?.spotify ?? "",
    popularity: typeof t.popularity === "number" ? t.popularity : 0,
  }));
}

// ---------- Global Audio Manager ----------
// Ensures only one preview plays at a time across all music cards.

export interface AudioState {
  elementId: string | null; // which scrapbook element is currently playing
  playing: boolean;
  currentTime: number;
}

type AudioListener = (state: AudioState) => void;

class PreviewAudioManager {
  private audio: HTMLAudioElement | null = null;
  private currentElementId: string | null = null;
  private listeners: Set<AudioListener> = new Set();
  private rafId: number | null = null;

  subscribe(fn: AudioListener) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private notify() {
    const state: AudioState = {
      elementId: this.currentElementId,
      playing: this.audio ? !this.audio.paused : false,
      currentTime: this.audio?.currentTime ?? 0,
    };
    this.listeners.forEach((fn) => fn(state));
  }

  private startTick() {
    if (this.rafId !== null) return;
    const tick = () => {
      this.notify();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopTick() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  play(elementId: string, previewUrl: string) {
    // If same element is already playing → pause/toggle
    if (this.currentElementId === elementId && this.audio && !this.audio.paused) {
      this.audio.pause();
      this.stopTick();
      this.notify();
      return;
    }

    // Stop any previous playback
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute("src");
      this.audio.load();
      this.stopTick();
    }

    this.currentElementId = elementId;
    this.audio = new Audio(previewUrl);

    this.audio.addEventListener("ended", () => {
      this.currentElementId = null;
      this.stopTick();
      this.notify();
    });

    this.audio.addEventListener("error", () => {
      this.currentElementId = null;
      this.stopTick();
      this.notify();
    });

    this.audio.play().then(() => {
      this.startTick();
      this.notify();
    }).catch(() => {
      this.currentElementId = null;
      this.notify();
    });

    this.notify();
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute("src");
      this.audio.load();
      this.audio = null;
    }
    this.currentElementId = null;
    this.stopTick();
    this.notify();
  }

  getState(): AudioState {
    return {
      elementId: this.currentElementId,
      playing: this.audio ? !this.audio.paused : false,
      currentTime: this.audio?.currentTime ?? 0,
    };
  }
}

export const previewAudio = new PreviewAudioManager();

// ---------- LRCLIB Lyrics ----------

export interface SyncedLine {
  time: number;  // seconds
  text: string;
}

/** Parse LRC format "[mm:ss.xx] text" into sorted {time, text}[] */
export function parseLRC(lrc: string): SyncedLine[] {
  const lines: SyncedLine[] = [];
  for (const raw of lrc.split("\n")) {
    const m = raw.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/);
    if (!m) continue;
    const time = parseInt(m[1]) * 60 + parseFloat(m[2]);
    const text = m[3].trim();
    if (text) lines.push({ time, text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

/** Fetch synced lyrics from LRCLIB (free, no API key) */
export async function fetchLyrics(
  trackName: string,
  artistName: string,
): Promise<{ plain: string; synced: SyncedLine[] } | null> {
  try {
    const url = `https://lrclib.net/api/search?track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data: any[] = await res.json();
    if (!data?.length) return null;

    // Prefer the result with synced lyrics
    const withSync = data.find((d) => d.syncedLyrics);
    const best = withSync ?? data[0];

    return {
      plain: best.plainLyrics ?? "",
      synced: best.syncedLyrics ? parseLRC(best.syncedLyrics) : [],
    };
  } catch {
    return null;
  }
}
