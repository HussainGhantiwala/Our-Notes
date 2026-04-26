CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for duplicate detection
CREATE INDEX IF NOT EXISTS idx_assets_size_name ON assets (file_size, file_name);

-- Link assets to scrapbook elements
ALTER TABLE chapter_elements ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;

-- Migrate existing chapter_images to assets
INSERT INTO assets (id, file_name, storage_path, public_url, created_at)
SELECT 
  id, 
  COALESCE(caption, 'migrated_image'), 
  storage_path, 
  url, 
  created_at
FROM chapter_images
WHERE storage_path IS NOT NULL
ON CONFLICT DO NOTHING;

-- Backfill chapter_elements to point to the newly migrated assets
UPDATE chapter_elements ce
SET asset_id = a.id
FROM assets a
WHERE ce.storage_path = a.storage_path
  AND ce.asset_id IS NULL;
