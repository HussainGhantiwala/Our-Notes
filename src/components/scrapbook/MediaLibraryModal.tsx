import { useState, useRef, useEffect, useCallback, ChangeEvent } from "react";
import { toast } from "sonner";
import { Asset, listAssets, uploadAsset, deleteAsset, checkAssetReferences } from "@/lib/assets";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: Asset) => void;
}

export const MediaLibraryModal = ({ open, onClose, onSelect }: Props) => {
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAssets();
      setAssets(data);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load library");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && tab === "library") {
      fetchLibrary();
    }
  }, [open, tab, fetchLibrary]);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];

    setLoading(true);
    try {
      const asset = await uploadAsset(file);
      toast.success("Asset uploaded successfully");
      onSelect(asset);
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const handleDeleteClick = async (asset: Asset, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDeletingId(asset.id);
      const refs = await checkAssetReferences(asset.id);
      if (refs > 0) {
        if (!window.confirm(`This image is used in ${refs} places. Are you sure you want to force delete it? This will break existing elements.`)) {
          return;
        }
      } else {
        if (!window.confirm("Are you sure you want to delete this asset?")) {
          return;
        }
      }

      await deleteAsset(asset.id, asset.storage_path, true);
      toast.success("Asset deleted");
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  if (!open) return null;

  const filteredAssets = assets
    .filter((a) => a.file_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const t1 = new Date(a.created_at).getTime();
      const t2 = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? t2 - t1 : t1 - t2;
    });

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-[90vw] max-w-4xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden bg-white"
        style={{
          border: "1px solid hsl(20 30% 25% / 0.12)",
        }}
      >
        {/* Header Tabs */}
        <div className="flex items-center gap-4 px-6 pt-5 pb-3 border-b border-ink/10">
          <button
            className={`text-lg font-hand ${tab === "library" ? "text-ink font-bold" : "text-ink-soft hover:text-ink"}`}
            onClick={() => setTab("library")}
          >
            Media Library
          </button>
          <button
            className={`text-lg font-hand ${tab === "upload" ? "text-ink font-bold" : "text-ink-soft hover:text-ink"}`}
            onClick={() => setTab("upload")}
          >
            Upload New
          </button>
          <button onClick={onClose} className="ml-auto text-xl text-ink-soft hover:text-rose transition-colors">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
          {tab === "upload" && (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-ink/20 rounded-xl p-12 bg-white text-center">
              <div className="text-4xl mb-4 opacity-60">📁</div>
              <h3 className="font-print font-bold text-lg mb-2">Upload a New Asset</h3>
              <p className="text-sm text-ink-soft mb-6 max-w-sm">Images uploaded here will be available globally across all your chapters.</p>

              <label className="bg-ink text-cream px-6 py-2 rounded-full font-hand text-lg cursor-pointer hover:bg-ink/90 transition-colors shadow-sm text-white">
                {loading ? "Uploading..." : "Select File"}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={handleUpload} disabled={loading} />
              </label>
            </div>
          )}

          {tab === "library" && (
            <div className="flex flex-col h-full">
              <div className="flex flex-wrap gap-4 items-center mb-6">
                <input
                  type="text"
                  placeholder="Search file name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-4 py-2 border border-ink/15 rounded-lg font-inter text-sm flex-1 max-w-xs outline-none focus:border-ink/40"
                />
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="px-4 py-2 border border-ink/15 rounded-lg font-inter text-sm outline-none focus:border-ink/40 bg-white"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
                {loading && <span className="text-sm text-ink-soft italic">Loading...</span>}
              </div>

              {filteredAssets.length === 0 && !loading ? (
                <div className="flex-1 flex items-center justify-center text-ink-soft font-hand text-lg italic">
                  No assets found.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="group relative aspect-square bg-white rounded-xl overflow-hidden shadow-sm border border-ink/5 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => onSelect(asset)}
                    >
                      <img
                        src={asset.public_url}
                        alt={asset.file_name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

                      {/* Truncated File Name */}
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[10px] text-white truncate font-inter">{asset.file_name}</p>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => handleDeleteClick(asset, e)}
                        disabled={deletingId === asset.id}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-50"
                      >
                        {deletingId === asset.id ? "..." : "🗑️"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
