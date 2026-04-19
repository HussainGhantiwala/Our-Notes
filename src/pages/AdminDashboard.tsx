import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { listAllChapters, ChapterRow, slugify } from "@/lib/chapters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TapeDecoration } from "@/components/TapeDecoration";
import { FloatingPetals } from "@/components/FloatingPetals";
import { toast } from "sonner";

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<ChapterRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setRows(await listAllChapters());
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!user) return;
    const title = "Untitled chapter";
    const { data, error } = await supabase
      .from("chapters")
      .insert({
        author_id: user.id,
        title,
        slug: slugify(`${title}-${Date.now().toString(36)}`),
        number: rows.length + 1,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    nav(`/admin/chapter/${data.id}`);
  };

  const duplicate = async (r: ChapterRow) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("chapters")
      .insert({
        author_id: user.id,
        title: `${r.title} (copy)`,
        subtitle: r.subtitle,
        date_label: r.date_label,
        mood: r.mood,
        tags: r.tags,
        paper_variant: r.paper_variant,
        preview: r.preview,
        left_page: r.left_page,
        right_page: r.right_page,
        slug: slugify(`${r.title}-copy-${Date.now().toString(36)}`),
        status: "draft",
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    toast.success("Duplicated");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this chapter forever?")) return;
    const { error } = await supabase.from("chapters").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success("Removed");
  };

  const filtered = rows.filter((r) =>
    !q || r.title.toLowerCase().includes(q.toLowerCase()) || (r.preview ?? "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <FloatingPetals count={4} />
      <main className="relative min-h-screen pt-28 pb-20 px-4">
        <div className="container max-w-5xl">
          <motion.header
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <p className="font-ui text-xs tracking-[0.4em] text-ink-soft uppercase mb-2">the keeper's desk</p>
            <h1 className="font-script text-6xl text-ink">Your chapters</h1>
            <p className="font-hand text-xl text-ink-soft mt-2 italic">drafts, dreams, and finished pages</p>
          </motion.header>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-6">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="search your memories…"
              className="paper px-4 py-2 rounded-sm font-hand text-xl text-ink outline-none focus:ring-2 focus:ring-rose/40 w-full sm:max-w-xs"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={signOut}
                className="font-hand text-ink-soft hover:text-rose px-3 py-2"
              >
                sign out
              </button>
              <button
                onClick={create}
                className="bg-rose/90 hover:bg-rose text-cream font-hand text-xl px-5 py-2.5 rounded-sm shadow-lift"
              >
                ✎ write new chapter
              </button>
            </div>
          </div>

          {loading ? (
            <p className="font-hand text-xl text-ink-soft text-center py-16">opening pages…</p>
          ) : filtered.length === 0 ? (
            <div className="paper-lined p-12 rounded-sm text-center">
              <p className="font-hand text-2xl text-ink-soft">no chapters yet — start the first one ✿</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {filtered.map((r, i) => (
                <motion.li
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="paper relative p-5 sm:p-6 rounded-sm flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <TapeDecoration variant={i % 2 ? "pink" : "yellow"} rotate={-4} className="-top-3 left-8" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-2xl">{r.mood}</span>
                      <h3 className="font-script text-3xl text-ink truncate">{r.title}</h3>
                      <span
                        className={`font-print text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full ${
                          r.status === "published" ? "bg-sage/40 text-ink" : "bg-blush/60 text-ink-soft"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    {r.preview && (
                      <p className="font-hand text-lg text-ink-soft mt-1 line-clamp-2">{r.preview}</p>
                    )}
                    <p className="font-print text-xs text-ink-soft mt-1">
                      updated {new Date(r.updated_at).toLocaleDateString()}
                      {r.date_label ? ` · ${r.date_label}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 font-hand text-lg shrink-0">
                    <Link to={`/admin/chapter/${r.id}`} className="text-ink hover:text-rose">edit</Link>
                    {r.status === "published" && r.slug && (
                      <Link to={`/chapter/${r.slug}`} className="text-ink-soft hover:text-rose">view</Link>
                    )}
                    <button onClick={() => duplicate(r)} className="text-ink-soft hover:text-rose">duplicate</button>
                    <button onClick={() => remove(r.id)} className="text-ink-soft hover:text-rose">delete</button>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
};

export default AdminDashboard;
