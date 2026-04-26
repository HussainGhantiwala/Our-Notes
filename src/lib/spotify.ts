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

  const safeLimit =
    typeof limit === "number" && !Number.isNaN(limit)
      ? Math.min(Math.max(limit, 1), 10)
      : 5;

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
    console.log(txt);
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
  }));
}
