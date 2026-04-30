import type { MixtapeTrackDraft, MixtapeWithTracks } from "@/lib/mixtape";

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

export async function createSpotifyPlaylist(
  mixtape: Pick<MixtapeWithTracks, "title" | "description">,
  tracks: MixtapeTrackDraft[],
): Promise<SpotifyPlaylistResult | null> {
  const token = localStorage.getItem("spotify_access_token")?.trim() ?? "";
  if (!token) {
    console.warn("Spotify playlist warning: missing spotify_access_token");
    return null;
  }

  const uris = tracks
    .map((track) => track.id?.trim() ?? "")
    .filter(Boolean)
    .map((trackId) => `spotify:track:${trackId}`);

  if (uris.length === 0) {
    console.warn("Spotify playlist warning: no track URIs available");
    return null;
  }

  try {
    const meResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!meResponse.ok) {
      const body = await meResponse.text();
      throw new Error(`Spotify /me failed (${meResponse.status}): ${body}`);
    }

    const me = await meResponse.json() as SpotifyCurrentUser;

    const playlistResponse = await fetch(`https://api.spotify.com/v1/users/${me.id}/playlists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: mixtape.title.trim(),
        description: mixtape.description?.trim() || "",
        public: false,
      }),
    });

    if (!playlistResponse.ok) {
      const body = await playlistResponse.text();
      throw new Error(`Spotify playlist creation failed (${playlistResponse.status}): ${body}`);
    }

    const playlist = await playlistResponse.json() as SpotifyPlaylistResponse;

    const addTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris,
      }),
    });

    if (!addTracksResponse.ok) {
      const body = await addTracksResponse.text();
      throw new Error(`Spotify add tracks failed (${addTracksResponse.status}): ${body}`);
    }

    return {
      playlistUrl: playlist.external_urls?.spotify ?? `https://open.spotify.com/playlist/${playlist.id}`,
      playlistId: playlist.id,
    };
  } catch (error) {
    console.error("Spotify playlist error:", error);
    return null;
  }
}
