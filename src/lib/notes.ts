import { supabase } from "@/integrations/supabase/client";

export type NoteColor = "yellow" | "pink" | "mint" | "blue" | "lavender" | "peach";
export type NotePinStyle = "none" | "pin" | "tape";

export interface NoteRow {
  id: string;
  front_text: string;
  back_text: string;
  color: NoteColor;
  rotation: number;
  pin_style: NotePinStyle;
  created_at: string;
  updated_at: string;
}

export interface NoteInput {
  front_text: string;
  back_text: string;
  color: NoteColor;
  rotation: number;
  pin_style: NotePinStyle;
}

export const DEFAULT_NOTE: NoteInput = {
  front_text: "",
  back_text: "",
  color: "yellow",
  rotation: -2,
  pin_style: "tape",
};

export async function listNotes() {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as NoteRow[];
}

export async function createNote(input: NoteInput) {
  const { data, error } = await supabase
    .from("notes")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as NoteRow;
}

export async function updateNote(id: string, input: Partial<NoteInput>) {
  const { data, error } = await supabase
    .from("notes")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as NoteRow;
}

export async function deleteNote(id: string) {
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw error;
}
