-- PHASE 2: Multi-page book system + canvas coordinate normalization

-- 1. New chapter_pages table
CREATE TABLE public.chapter_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  left_text TEXT NOT NULL DEFAULT '',
  right_text TEXT NOT NULL DEFAULT '',
  paper_variant TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chapter_pages_chapter ON public.chapter_pages(chapter_id, position);

ALTER TABLE public.chapter_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage chapter pages"
ON public.chapter_pages FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Pages readable when chapter readable"
ON public.chapter_pages FOR SELECT
TO public
USING (EXISTS (
  SELECT 1 FROM public.chapters c
  WHERE c.id = chapter_pages.chapter_id
    AND (c.status = 'published' OR has_role(auth.uid(), 'admin'::app_role))
));

CREATE TRIGGER trg_chapter_pages_updated
BEFORE UPDATE ON public.chapter_pages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add page_id + side to chapter_elements (nullable for back-compat during migration)
ALTER TABLE public.chapter_elements
  ADD COLUMN page_id UUID REFERENCES public.chapter_pages(id) ON DELETE CASCADE,
  ADD COLUMN side TEXT NOT NULL DEFAULT 'left';

CREATE INDEX idx_chapter_elements_page ON public.chapter_elements(page_id);

-- 3. Migrate existing chapters: create page #1 from current left_page/right_page,
--    move existing elements onto it (default to left side).
DO $$
DECLARE
  c RECORD;
  new_page_id UUID;
BEGIN
  FOR c IN SELECT id, left_page, right_page, paper_variant FROM public.chapters LOOP
    INSERT INTO public.chapter_pages (chapter_id, position, left_text, right_text, paper_variant)
    VALUES (c.id, 0, COALESCE(c.left_page, ''), COALESCE(c.right_page, ''), c.paper_variant)
    RETURNING id INTO new_page_id;

    UPDATE public.chapter_elements
    SET page_id = new_page_id
    WHERE chapter_id = c.id AND page_id IS NULL;
  END LOOP;
END $$;

-- 4. Sanitize: strip raw image URLs (jpg/jpeg/png/webp/gif) out of left_text/right_text
--    on the new pages. They'll be re-rendered as photo elements client-side as needed.
UPDATE public.chapter_pages
SET left_text = regexp_replace(left_text, 'https?://\S+\.(jpg|jpeg|png|webp|gif)(\?\S*)?', '', 'gi'),
    right_text = regexp_replace(right_text, 'https?://\S+\.(jpg|jpeg|png|webp|gif)(\?\S*)?', '', 'gi');

-- Same cleanup on legacy chapters columns to be safe
UPDATE public.chapters
SET left_page = regexp_replace(COALESCE(left_page,''), 'https?://\S+\.(jpg|jpeg|png|webp|gif)(\?\S*)?', '', 'gi'),
    right_page = regexp_replace(COALESCE(right_page,''), 'https?://\S+\.(jpg|jpeg|png|webp|gif)(\?\S*)?', '', 'gi');
