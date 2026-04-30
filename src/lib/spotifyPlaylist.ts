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

export const extractSpotifyPlaylistId = (playlistUrl: string) => {
  const trimmed = playlistUrl.trim();
  const match = trimmed.match(/(?:spotify\.com\/playlist\/|spotify:playlist:)([A-Za-z0-9]+)/i);
  return match?.[1] ?? null;
};

export async function createSpotifyPlaylist(
  mixtape: SpotifyPlaylistInput & { existingPlaylistUrl?: string | null },
): Promise<SpotifyPlaylistResult> {
  const token = getSpotifyAccessToken();
  if (!token) {
    throw new Error("Connect Spotify before creating a playlist.");
  }

  const uris = mixtape.tracks
    .map((track) => buildSpotifyTrackUri(getTrackSpotifyUrl(track)))
    .filter(Boolean);

  if (uris.length === 0) {
    throw new Error("No Spotify track links were found for this mixtape.");
  }

  let playlistId = mixtape.existingPlaylistUrl ? extractSpotifyPlaylistId(mixtape.existingPlaylistUrl) : null;
  let playlistUrl = mixtape.existingPlaylistUrl || "";

  if (playlistId) {
    // Update existing playlist name and description
    await spotifyRequest(
      `https://api.spotify.com/v1/playlists/${playlistId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: mixtape.title.trim(),
          description: mixtape.description?.trim() || "",
        }),
      },
      token
    );

    // Replace all tracks
    await spotifyRequest(
      `https://api.spotify.com/v1/playlists/${playlistId}/items`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uris }),
      },
      token
    );
  } else {
    // Create new playlist
    const playlistResponse = await spotifyRequest(
      `https://api.spotify.com/v1/me/playlists`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    playlistId = playlist.id;
    playlistUrl = playlist.external_urls?.spotify ?? `https://open.spotify.com/playlist/${playlist.id}`;

    // Add tracks to new playlist
    await spotifyRequest(
      `https://api.spotify.com/v1/playlists/${playlistId}/items`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uris }),
      },
      token
    );
  }

  return {
    playlistUrl,
    playlistId: playlistId!,
  };
}
