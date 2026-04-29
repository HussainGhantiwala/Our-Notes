import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FloatingPetals } from "@/components/FloatingPetals";
import { StickyNote } from "@/components/StickyNote";
import { NoteEditorModal } from "@/components/notes/NoteEditorModal";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_NOTE,
  createNote,
  deleteNote,
  listNotes,
  updateNote,
  type NoteInput,
  type NoteRow,
} from "@/lib/notes";
import { toast } from "sonner";

const toMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const AdminNotesEditor = () => {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<NoteRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setNotes(await listNotes());
    } catch (error: unknown) {
      toast.error(toMessage(error, "Could not load notes"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const channel = supabase
      .channel("notes-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, () => {
        load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const openCreate = () => {
    setEditingNote(null);
    setModalOpen(true);
  };

  const openEdit = (note: NoteRow) => {
    setEditingNote(note);
    setModalOpen(true);
  };

  const handleSave = async (input: NoteInput) => {
    try {
      setSaving(true);
      if (editingNote) {
        await updateNote(editingNote.id, input);
        toast.success("Note updated");
      } else {
        await createNote(input);
        toast.success("Note created");
      }
      setModalOpen(false);
    } catch (error: unknown) {
      toast.error(toMessage(error, "Could not save note"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this note forever?")) return;

    try {
      await deleteNote(id);
      toast.success("Note deleted");
    } catch (error: unknown) {
      toast.error(toMessage(error, "Could not delete note"));
    }
  };

  return (
    <>
      <FloatingPetals count={4} />
      <main className="relative min-h-screen pt-28 pb-20 px-4">
        <div className="container max-w-6xl">
          <motion.header
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <Link to="/admin" className="font-hand text-ink-soft hover:text-rose">
              back to the desk
            </Link>
            <p className="font-ui text-xs tracking-[0.4em] text-ink-soft uppercase mt-4 mb-2">manage notes</p>
            <h1 className="font-script text-6xl text-ink">Little notes</h1>
            <p className="font-hand text-xl text-ink-soft mt-2 italic">
              quick thoughts on the front, the full feeling on the back
            </p>
          </motion.header>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="paper px-5 py-4 rounded-sm">
              <p className="font-print text-xs tracking-[0.3em] uppercase text-ink-soft">journal lite mode</p>
              <p className="font-hand text-xl text-ink mt-1">text only, no drag or clutter, just the note itself</p>
            </div>
            <button
              onClick={openCreate}
              className="bg-rose/90 hover:bg-rose text-cream font-hand text-xl px-5 py-2.5 rounded-sm shadow-lift"
            >
              + add note
            </button>
          </div>

          {loading ? (
            <p className="font-hand text-xl text-ink-soft text-center py-16">collecting notes...</p>
          ) : notes.length === 0 ? (
            <div className="paper-lined rounded-sm p-12 text-center">
              <p className="font-hand text-2xl text-ink-soft">no notes yet - start the first little confession</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {notes.map((note, index) => (
                <motion.article
                  key={note.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="space-y-3"
                >
                  <button type="button" onClick={() => openEdit(note)} className="w-full text-left">
                    <StickyNote
                      color={note.color}
                      rotate={note.rotation}
                      accessory={note.pin_style}
                      className="min-h-[180px]"
                    >
                      <p className="whitespace-pre-wrap break-words line-clamp-5">{note.front_text}</p>
                    </StickyNote>
                  </button>

                  <div className="paper rounded-sm px-4 py-3">
                    <p className="font-hand text-base text-ink-soft line-clamp-3">{note.back_text}</p>
                    <div className="flex items-center justify-between mt-3 font-hand text-lg">
                      <button onClick={() => openEdit(note)} className="text-ink hover:text-rose">edit</button>
                      <button onClick={() => remove(note.id)} className="text-ink-soft hover:text-rose">delete</button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </main>

      <NoteEditorModal
        open={modalOpen}
        note={editingNote}
        defaultValue={DEFAULT_NOTE}
        saving={saving}
        onOpenChange={setModalOpen}
        onSave={handleSave}
      />
    </>
  );
};

export default AdminNotesEditor;
