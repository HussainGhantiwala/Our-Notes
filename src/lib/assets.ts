import { supabase } from "@/integrations/supabase/client";

export interface Asset {
  id: string;
  file_name: string;
  storage_path: string;
  public_url: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

export async function uploadAsset(file: File): Promise<Asset> {
  // Check for duplicates based on name and size heuristically
  const { data: existing } = await supabase
    .from("assets")
    .select("*")
    .eq("file_name", file.name)
    .eq("file_size", file.size)
    .maybeSingle();

  if (existing) {
    return existing as Asset;
  }

  const fileExt = file.name.split(".").pop();
  const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const filePath = `${Date.now()}-${baseName}.${fileExt}`;

  const { error: upErr } = await supabase.storage
    .from("chapter-media")
    .upload(filePath, file, { contentType: file.type, cacheControl: "3600", upsert: false });

  if (upErr) throw upErr;

  const { data: pubData } = supabase.storage.from("chapter-media").getPublicUrl(filePath);

  const { data: asset, error: dbErr } = await supabase
    .from("assets")
    .insert({
      file_name: file.name,
      storage_path: filePath,
      public_url: pubData.publicUrl,
      file_size: file.size,
      mime_type: file.type,
    })
    .select()
    .single();

  if (dbErr) throw dbErr;

  return asset as Asset;
}

export async function listAssets(): Promise<Asset[]> {
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Asset[];
}

export async function checkAssetReferences(assetId: string): Promise<number> {
  const { count, error } = await supabase
    .from("chapter_elements")
    .select("*", { count: "exact", head: true })
    .eq("asset_id", assetId);

  if (error) throw error;
  return count || 0;
}

export async function deleteAsset(assetId: string, storagePath: string, force: boolean = false): Promise<void> {
  if (!force) {
    const refs = await checkAssetReferences(assetId);
    if (refs > 0) {
      throw new Error(`IN_USE:${refs}`);
    }
  }

  // If force is true, we could theoretically delete the asset.
  // Because of the ON DELETE SET NULL on chapter_elements.asset_id,
  // the database will automatically nullify asset_id on elements.
  // The image_url remains, but since the storage file is deleted, it will return 404.

  const { error: rmErr } = await supabase.storage.from("chapter-media").remove([storagePath]);
  if (rmErr) throw rmErr;

  const { error: dbErr } = await supabase.from("assets").delete().eq("id", assetId);
  if (dbErr) throw dbErr;
}
