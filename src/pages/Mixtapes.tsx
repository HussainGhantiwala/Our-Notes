import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FloatingPetals } from "@/components/FloatingPetals";
import { MixtapeCassette } from "@/components/mixtape/MixtapeCassette";
import { supabase } from "@/integrations/supabase/client";
import { listMixtapes, type MixtapeWithTracks } from "@/lib/mixtape";

const Mixtapes = () => {
  const [mixtapes, setMixtapes] = useState<MixtapeWithTracks[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setMixtapes(await listMixtapes());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();

    const channel = supabase
      .channel("mixtapes-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "mixtapes" }, () => {
        void load();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "mixtape_tracks" }, () => {
        void load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <>
      <FloatingPetals count={7} />
      <main className="relative min-h-screen px-4 pb-20 pt-28">
        <div className="container max-w-6xl space-y-10">
          <motion.header
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="font-ui text-xs uppercase tracking-[0.42em] text-ink-soft/75">
              songs with a point of view
            </p>
            <h1 className="mt-3 font-script text-6xl text-ink sm:text-7xl">
              Mixtapes for the scrapbook
            </h1>
            <p className="mt-4 font-hand text-[1.85rem] leading-tight text-ink-soft">
              soft cassette tapes, each one carrying a small sequence of songs someone bothered to arrange by hand.
            </p>
          </motion.header>

          <section className="space-y-6">
            <div className="text-center">
              <p className="font-ui text-xs uppercase tracking-[0.42em] text-ink-soft/75">
                saved tapes
              </p>
              <h2 className="mt-3 font-display text-4xl italic text-ink sm:text-5xl">
                Tapes on the shelf
              </h2>
            </div>

            {loading ? (
              <div className="paper-lined rounded-[30px] px-6 py-12 text-center">
                <p className="font-hand text-3xl text-ink-soft">stacking the tapes on the shelf...</p>
              </div>
            ) : mixtapes.length === 0 ? (
              <div className="paper-lined rounded-[30px] px-6 py-12 text-center">
                <p className="font-script text-4xl text-rose">nothing saved yet</p>
                <p className="mt-3 font-hand text-3xl text-ink-soft">
                  the first tape is still waiting to be made.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {mixtapes.map((mixtape, index) => (
                  <MixtapeCassette key={mixtape.id} mixtape={mixtape} index={index} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
};

export default Mixtapes;
