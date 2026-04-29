import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { StickyNote } from "@/components/StickyNote";
import { FloatingPetals } from "@/components/FloatingPetals";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { listNotes, type NoteRow } from "@/lib/notes";

const upsertNote = (notes: NoteRow[], next: NoteRow) => {
  const idx = notes.findIndex((note) => note.id === next.id);
  if (idx === -1) return [...notes, next].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const copy = notes.slice();
  copy[idx] = next;
  return copy;
};

const LoveNotes = () => {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setNotes(await listNotes());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const channel = supabase
      .channel("notes-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const deleted = payload.old as Tables<"notes">;
          setNotes((current) => current.filter((note) => note.id !== deleted.id));
          setOpenId((current) => (current === deleted.id ? null : current));
          return;
        }

        const next = payload.new as Tables<"notes">;
        setNotes((current) => upsertNote(current, next as NoteRow));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const open = notes.find((note) => note.id === openId);

  return (
    <>
      <FloatingPetals count={5} />
      <main className="relative min-h-screen pt-28 pb-20 px-4">
        <div className="container max-w-6xl">
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-14"
          >
            <p className="font-ui text-xs tracking-[0.4em] text-ink-soft uppercase mb-3">
              Things I never said out loud
            </p>
            <h1 className="font-script text-6xl md:text-7xl text-ink mb-3">Notes for you</h1>
            <p className="font-hand text-2xl text-ink-soft italic">
              tap a sticky note - there&apos;s more on the back
            </p>
          </motion.header>

          {loading ? (
            <p className="font-hand text-2xl text-ink-soft text-center py-14">finding the little notes...</p>
          ) : notes.length === 0 ? (
            <div className="paper-lined rounded-sm p-12 text-center">
              <p className="font-hand text-2xl text-ink-soft">No notes have been pinned up yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {notes.map((note) => (
                <StickyNote
                  key={note.id}
                  color={note.color}
                  rotate={note.rotation}
                  accessory={note.pin_style}
                  sticker={note.sticker}
                  onClick={() => setOpenId(note.id)}
                >
                  {note.front_text}
                </StickyNote>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenId(null)}
              className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.85, rotate: -6, opacity: 0 }}
                animate={{ scale: 1, rotate: -2, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                onClick={(event) => event.stopPropagation()}
                className="paper max-w-md w-full p-8 md:p-10 rounded-sm relative"
              >
                <button
                  onClick={() => setOpenId(null)}
                  className="absolute top-3 right-4 font-hand text-2xl text-ink-soft hover:text-rose"
                  aria-label="close"
                >
                  x
                </button>
                <p className="font-script text-3xl text-rose mb-4">a little note</p>
                {open.sticker && (
                  <span className="absolute top-8 right-16 text-3xl leading-none" aria-hidden>
                    {open.sticker}
                  </span>
                )}
                <p className="font-hand text-2xl text-ink leading-snug whitespace-pre-wrap">{open.back_text}</p>
                <p className="font-script text-2xl text-ink-soft mt-6 text-right">love</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </>
  );
};

export default LoveNotes;
