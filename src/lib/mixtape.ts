import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { SpotifyTrack } from "@/lib/spotify";

async function ensureUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    console.error("Auth error:", error);
    throw new Error("User not authenticated. RLS will block this request.");
  }

  return user;
}

export interface MixtapeTrackDraft {
  id: string;
  name: string;
  artist: string;
  albumArt: string;
  previewUrl: string | null;
  spotifyUrl: string;
  note?: string;
  position: number;
}

export interface MixtapeRow {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
}

export interface MixtapeTrackRow {
  id: string;
  mixtape_id: string;
  track_id: string;
  name: string;
  artist: string;
  album_art: string | null;
  preview_url: string | null;
  spotify_url: string;
  note: string | null;
  position: number;
}

export interface MixtapeWithTracks extends MixtapeRow {
  tracks: MixtapeTrackRow[];
}

export interface MixtapeEditorInput {
  id?: string;
  title: string;
  description: string;
  spotifyPlaylistUrl: string;
  tracks: MixtapeTrackDraft[];
}

const sortTracks = <T extends { position: number }>(tracks: T[]) =>
  tracks.slice().sort((a, b) => a.position - b.position);

const mapTrackRows = (tracks: Tables<"mixtape_tracks">[] | null | undefined) =>
  sortTracks((tracks ?? []) as MixtapeTrackRow[]);

const mapMixtapeRow = (
  row: Tables<"mixtapes"> & { mixtape_tracks?: Tables<"mixtape_tracks">[] | null },
): MixtapeWithTracks => ({
  id: row.id,
  title: row.title,
  description: row.description,
  created_at: row.created_at,
  tracks: mapTrackRows(row.mixtape_tracks),
});

export const emptyMixtapeEditor = (): MixtapeEditorInput => ({
  title: "",
  description: "",
  spotifyPlaylistUrl: "",
  tracks: [],
});

export const trackDraftFromSpotify = (track: SpotifyTrack, position: number): MixtapeTrackDraft => ({
  id: track.id,
  name: track.name,
  artist: track.artist,
  albumArt: track.albumArt,
  previewUrl: track.previewUrl,
  spotifyUrl: track.spotifyUrl,
  note: "",
  position,
});

export const trackDraftFromRow = (track: MixtapeTrackRow): MixtapeTrackDraft => ({
  id: track.track_id,
  name: track.name,
  artist: track.artist,
  albumArt: track.album_art ?? "",
  previewUrl: track.preview_url,
  spotifyUrl: track.spotify_url,
  note: track.note ?? "",
  position: track.position,
});

export const editorInputFromMixtape = (mixtape: MixtapeWithTracks): MixtapeEditorInput => ({
  id: mixtape.id,
  title: mixtape.title,
  description: mixtape.description ?? "",
  spotifyPlaylistUrl: "",
  tracks: sortTracks(mixtape.tracks).map(trackDraftFromRow),
});

export const normalizeTrackPositions = (tracks: MixtapeTrackDraft[]) =>
  tracks.map((track, index) => ({ ...track, position: index }));

export const estimateMixtapeMinutes = (trackCount: number) => trackCount * 3;

const normalizeNullableText = (value: string | null | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
};

const normalizeRequiredText = (value: string | null | undefined) => value?.trim() ?? "";

export async function listMixtapes() {
  const { data, error } = await supabase
    .from("mixtapes")
    .select("*, mixtape_tracks(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) =>
    mapMixtapeRow(row as Tables<"mixtapes"> & { mixtape_tracks?: Tables<"mixtape_tracks">[] | null }),
  );
}

export async function getMixtape(id: string) {
  const { data, error } = await supabase
    .from("mixtapes")
    .select("*, mixtape_tracks(*)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return mapMixtapeRow(data as Tables<"mixtapes"> & { mixtape_tracks?: Tables<"mixtape_tracks">[] | null });
}

const buildTrackRows = (mixtapeId: string, tracks: MixtapeTrackDraft[]): TablesInsert<"mixtape_tracks">[] =>
  normalizeTrackPositions(tracks).map((track, index) => ({
    mixtape_id: mixtapeId,
    track_id: normalizeRequiredText(track.id),
    name: normalizeRequiredText(track.name),
    artist: normalizeRequiredText(track.artist),
    album_art: normalizeNullableText(track.albumArt),
    preview_url: normalizeNullableText(track.previewUrl),
    spotify_url: normalizeRequiredText(track.spotifyUrl),
    note: normalizeNullableText(track.note),
    position: index,
  }));

export async function saveMixtape(input: MixtapeEditorInput) {
  await ensureUser();

  const title = normalizeRequiredText(input.title);
  if (!title) {
    throw new Error("Title is required");
  }

  const payload: TablesInsert<"mixtapes"> = {
    title,
    description: normalizeNullableText(input.description),
  };

  console.log("Saving mixtape payload:", payload);

  let mixtapeId = input.id;

  if (mixtapeId) {
    const updatePayload: TablesUpdate<"mixtapes"> = payload;
    const { error } = await supabase
      .from("mixtapes")
      .update(updatePayload)
      .eq("id", mixtapeId);

    if (error) {
      console.error("Mixtape update failed:", error);
      throw error;
    }

    const { error: deleteTracksError } = await supabase
      .from("mixtape_tracks")
      .delete()
      .eq("mixtape_id", mixtapeId);

    if (deleteTracksError) {
      console.error("Existing tracks delete failed:", deleteTracksError);
      throw deleteTracksError;
    }
  } else {
    const { data, error } = await supabase
      .from("mixtapes")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Mixtape insert failed:", error);
      throw error;
    }

    mixtapeId = data.id;
  }

  const tracksPayload = buildTrackRows(mixtapeId, input.tracks);
  console.log("Tracks payload:", tracksPayload);

  if (tracksPayload.length > 0) {
    const { error: tracksError } = await supabase
      .from("mixtape_tracks")
      .insert(tracksPayload);

    if (tracksError) {
      console.error("Tracks insert failed:", tracksError);
      throw tracksError;
    }
  }

  const savedMixtape = await getMixtape(mixtapeId);
  return savedMixtape;
}

export async function deleteMixtape(id: string) {
  await ensureUser();

  const { error: tracksError } = await supabase
    .from("mixtape_tracks")
    .delete()
    .eq("mixtape_id", id);

  if (tracksError) {
    console.error("Delete tracks failed:", tracksError);
    throw tracksError;
  }

  const { error } = await supabase
    .from("mixtapes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Delete failed:", error);
    throw error;
  }
}
