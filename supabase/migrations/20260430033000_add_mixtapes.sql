create table public.mixtapes (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled mixtape',
  description text,
  created_at timestamptz not null default now()
);

create table public.mixtape_tracks (
  id uuid primary key default gen_random_uuid(),
  mixtape_id uuid not null references public.mixtapes(id) on delete cascade,
  track_id text not null,
  name text not null,
  artist text not null,
  album_art text,
  preview_url text,
  spotify_url text not null,
  note text,
  position integer not null default 0
);

create index idx_mixtape_tracks_mixtape_id_position
  on public.mixtape_tracks (mixtape_id, position);

alter table public.mixtapes enable row level security;
alter table public.mixtape_tracks enable row level security;

create policy "Mixtapes readable by all"
on public.mixtapes for select
to public
using (true);

create policy "Mixtape tracks readable by all"
on public.mixtape_tracks for select
to public
using (true);

create policy "Admins manage mixtapes"
on public.mixtapes for all
to authenticated
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

create policy "Admins manage mixtape tracks"
on public.mixtape_tracks for all
to authenticated
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));
