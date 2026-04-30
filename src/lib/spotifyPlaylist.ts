import type { MixtapeTrackDraft, MixtapeTrackRow, MixtapeWithTracks } from "@/lib/mixtape";
import { clearSpotifyAccessToken, getSpotifyAccessToken } from "@/lib/spotifyAuth";

interface SpotifyCurrentUser {
  id: string;
}

interface SpotifyPlaylistResponse {
  id: string;
  external_urls?: {
    spotify?: string;
  };
}

export interface SpotifyPlaylistResult {
  playlistUrl: string;
  playlistId: string;
}

type SpotifyPlaylistTrack = Pick<MixtapeTrackDraft, "spotifyUrl"> | Pick<MixtapeTrackRow, "spotify_url">;

type SpotifyPlaylistInput = Pick<MixtapeWithTracks, "title" | "description"> & {
  tracks: SpotifyPlaylistTrack[];
};

export function isSpotifyConnected() {
  return !!getSpotifyAccessToken();
}

const getTrackSpotifyUrl = (track: SpotifyPlaylistTrack) =>
  "spotify_url" in track ? track.spotify_url : track.spotifyUrl;

const extractSpotifyTrackId = (spotifyUrl: string) => {
  const trimmed = spotifyUrl.trim();
  const match = trimmed.match(/(?:spotify\.com\/track\/|spotify:track:)([A-Za-z0-9]+)/i);
  return match?.[1] ?? "";
};

const buildSpotifyTrackUri = (spotifyUrl: string) => {
  const trackId = extractSpotifyTrackId(spotifyUrl);
  return trackId ? `spotify:track:${trackId}` : "";
};

const throwIfUnauthorized = (status: number) => {
  if (status !== 401) return;
  clearSpotifyAccessToken();
  throw new Error("Spotify access token expired. Reconnect Spotify.");
};

const spotifyRequest = async (input: RequestInfo | URL, init: RequestInit, token: string) => {
  const response = await fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

  throwIfUnauthorized(response.status);
  return response;
};

export async function createSpotifyPlaylist(
  mixtape: SpotifyPlaylistInput,
): Promise<SpotifyPlaylistResult> {
  const token = getSpotifyAccessToken();
  if (!token) {
    throw new Error("Connect Spotify before creating a playlist.");
  }

  const uris = mixtape.tracks
    .map((track) => buildSpotifyTrackUri(getTrackSpotifyUrl(track)))
    .filter(Boolean);
  console.log("TRACK URIS:", uris);

  if (uris.length === 0) {
    throw new Error("No Spotify track links were found for this mixtape.");
  }

  const meResponse = await spotifyRequest("https://api.spotify.com/v1/me", {}, token);

  if (!meResponse.ok) {
    const body = await meResponse.text();
    throw new Error(`Spotify /me failed (${meResponse.status}): ${body}`);
  }

  const me = await meResponse.json() as SpotifyCurrentUser;

  const playlistResponse = await spotifyRequest(
    `https://api.spotify.com/v1/me/playlists`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: mixtape.title.trim(),
        description: mixtape.description?.trim() || "",
        public: false,
      }),
    },
    token
  );

  if (!playlistResponse.ok) {
    const body = await playlistResponse.text();
    throw new Error(`Spotify playlist creation failed (${playlistResponse.status}): ${body}`);
  }

  const playlist = await playlistResponse.json() as SpotifyPlaylistResponse;

  const trackIds = mixtape.tracks
    .map((track) => extractSpotifyTrackId(getTrackSpotifyUrl(track)))
    .filter(Boolean);

  const addTracksResponse = await spotifyRequest(
    `https://api.spotify.com/v1/playlists/${playlist.id}/items`, // ✅ NEW
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris: trackIds.map(id => `spotify:track:${id}`),
      }),
    },
    token
  );

  if (!addTracksResponse.ok) {
    const body = await addTracksResponse.text();
    console.error("ADD TRACKS ERROR:", body);
    throw new Error(`Spotify add tracks failed (${addTracksResponse.status}): ${body}`);
  }

  return {
    playlistUrl: playlist.external_urls?.spotify ?? `https://open.spotify.com/playlist/${playlist.id}`,
    playlistId: playlist.id,
  };
}
