import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FloatingPetals } from "@/components/FloatingPetals";
import { MixtapeCard } from "@/components/mixtape/MixtapeCard";
import { supabase } from "@/integrations/supabase/client";
import { getMixtape, type MixtapeWithTracks } from "@/lib/mixtape";

const MixtapeDetail = () => {
  const { id } = useParams();
  const [mixtape, setMixtape] = useState<MixtapeWithTracks | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setMixtape(null);
        setLoading(false);
        return;
      }

      try {
        setMixtape(await getMixtape(id));
      } catch {
        setMixtape(null);
      } finally {
        setLoading(false);
      }
    };

    void load();

    if (!id) return;

    const channel = supabase
      .channel(`mixtape-detail-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "mixtapes", filter: `id=eq.${id}` }, () => {
        void load();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "mixtape_tracks", filter: `mixtape_id=eq.${id}` }, () => {
        void load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  return (
    <>
      <FloatingPetals count={5} />
      <main className="relative min-h-screen px-4 pb-20 pt-28">
        <div className="container max-w-5xl">
          <motion.header
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-10 text-center"
          >
            <Link to="/mixtapes" className="font-hand text-ink-soft hover:text-rose">
              back to mixtapes
            </Link>
            {loading ? (
              <p className="mt-6 font-hand text-3xl text-ink-soft">opening the cassette...</p>
            ) : mixtape ? (
              <>
                <p className="mt-4 font-ui text-xs uppercase tracking-[0.42em] text-ink-soft/75">
                  full tracklist
                </p>
                <h1 className="mt-3 font-script text-6xl text-ink sm:text-7xl">
                  {mixtape.title}
                </h1>
                {mixtape.description && (
                  <p className="mx-auto mt-4 max-w-3xl font-hand text-[1.9rem] leading-tight text-ink-soft">
                    {mixtape.description}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-6 font-hand text-3xl text-ink-soft">this mixtape could not be found.</p>
            )}
          </motion.header>

          {mixtape && (
            <div className="space-y-4">
              {mixtape.tracks.map((track, index) => (
                <MixtapeCard key={track.id} index={index} track={track} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default MixtapeDetail;
