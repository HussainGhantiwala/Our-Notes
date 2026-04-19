-- Roles enum + user_roles table (security best practice)
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "user_roles readable by self"
on public.user_roles for select to authenticated
using (auth.uid() = user_id);

-- Updated-at helper
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- Chapters
create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  slug text unique,
  number int,
  title text not null default 'Untitled chapter',
  subtitle text,
  date_label text,
  mood text default '🌸',
  tags text[] default '{}',
  paper_variant text default 'blush' check (paper_variant in ('blush','lavender','peach','sage','blue')),
  preview text,
  left_page text default '',
  right_page text default '',
  cover_image_url text,
  cover_caption text,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.chapters enable row level security;

create index chapters_author_idx on public.chapters(author_id);
create index chapters_status_idx on public.chapters(status);

create trigger chapters_updated_at before update on public.chapters
for each row execute function public.update_updated_at_column();

-- Anyone (incl. anon) can read PUBLISHED chapters; admin can read all
create policy "Published chapters readable by all"
on public.chapters for select
using (status = 'published' or public.has_role(auth.uid(), 'admin'));

create policy "Admins can insert chapters"
on public.chapters for insert to authenticated
with check (public.has_role(auth.uid(), 'admin') and author_id = auth.uid());

create policy "Admins can update chapters"
on public.chapters for update to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete chapters"
on public.chapters for delete to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- Chapter images (gallery within a chapter)
create table public.chapter_images (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  url text not null,
  storage_path text,
  caption text,
  position int not null default 0,
  rotation int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.chapter_images enable row level security;
create index chapter_images_chapter_idx on public.chapter_images(chapter_id);

create policy "Images readable when chapter readable"
on public.chapter_images for select
using (
  exists (
    select 1 from public.chapters c
    where c.id = chapter_images.chapter_id
      and (c.status = 'published' or public.has_role(auth.uid(), 'admin'))
  )
);

create policy "Admins manage chapter images"
on public.chapter_images for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for chapter media
insert into storage.buckets (id, name, public) values ('chapter-media','chapter-media', true);

create policy "Chapter media public read"
on storage.objects for select using (bucket_id = 'chapter-media');

create policy "Admins upload chapter media"
on storage.objects for insert to authenticated
with check (bucket_id = 'chapter-media' and public.has_role(auth.uid(), 'admin'));

create policy "Admins update chapter media"
on storage.objects for update to authenticated
using (bucket_id = 'chapter-media' and public.has_role(auth.uid(), 'admin'));

create policy "Admins delete chapter media"
on storage.objects for delete to authenticated
using (bucket_id = 'chapter-media' and public.has_role(auth.uid(), 'admin'));

-- First-user bootstrap: the first signup automatically becomes admin
create or replace function public.handle_first_user_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'user');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_first_user_admin();