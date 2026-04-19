-- Step 1. Add page_style to chapter_pages to persist the page layout style
ALTER TABLE public.chapter_pages
  ADD COLUMN page_style TEXT NOT NULL DEFAULT 'lined';

-- Step 2. Migrate right side elements to the shared 1440px spread coordinate system.
-- We add 720px to their `x` coordinate so they natively position on the right half.
UPDATE public.chapter_elements
SET x = x + 720
WHERE side = 'right' AND x < 720;
