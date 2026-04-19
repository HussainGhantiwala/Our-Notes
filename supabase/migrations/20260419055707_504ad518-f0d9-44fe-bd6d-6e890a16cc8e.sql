create table public.chapter_elements (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  type text not null,
  content text,
  image_url text,
  storage_path text,
  x numeric not null default 40,
  y numeric not null default 40,
  width numeric not null default 180,
  height numeric not null default 180,
  rotation numeric not null default 0,
  z_index integer not null default 1,
  style jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_chapter_elements_chapter on public.chapter_elements(chapter_id);

alter table public.chapter_elements enable row level security;

create policy "Elements readable when chapter readable"
on public.chapter_elements for select
to public
using (exists (
  select 1 from public.chapters c
  where c.id = chapter_elements.chapter_id
    and (c.status = 'published' or public.has_role(auth.uid(), 'admin'))
));

create policy "Admins manage chapter elements"
on public.chapter_elements for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create trigger update_chapter_elements_updated_at
before update on public.chapter_elements
for each row execute function public.update_updated_at_column();