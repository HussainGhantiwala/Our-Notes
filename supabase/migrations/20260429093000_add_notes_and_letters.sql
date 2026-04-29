create table public.notes (
  id uuid primary key default gen_random_uuid(),
  front_text text not null default '',
  back_text text not null default '',
  color text not null default 'yellow' check (color in ('yellow', 'pink', 'mint', 'blue', 'lavender', 'peach')),
  rotation numeric not null default 0,
  pin_style text not null default 'tape' check (pin_style in ('none', 'pin', 'tape')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notes enable row level security;

create trigger trg_notes_updated
before update on public.notes
for each row execute function public.update_updated_at_column();

create policy "Notes readable by all"
on public.notes for select
to public
using (true);

create policy "Admins manage notes"
on public.notes for all
to authenticated
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

create table public.letters (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled letter',
  subtitle text,
  preview_text text,
  cover_style text not null default 'pink' check (cover_style in ('yellow', 'pink', 'mint', 'blue', 'lavender')),
  page_data_json jsonb not null default '{"pageStyle":"lined","paperVariant":"blush","body":"","elements":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.letters enable row level security;

create trigger trg_letters_updated
before update on public.letters
for each row execute function public.update_updated_at_column();

create policy "Letters readable by all"
on public.letters for select
to public
using (true);

create policy "Admins manage letters"
on public.letters for all
to authenticated
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

insert into public.notes (front_text, back_text, color, rotation, pin_style)
values
  ('I replay this day a lot.', 'That ordinary Tuesday. The walk home. The way you held my hand without thinking about it. I replay it more than you''d believe.', 'yellow', -2, 'tape'),
  ('You looked beautiful here.', 'Not in a posed way. In the sleepy, real, mid-laugh way. The kind I wish I could take a picture of with my whole chest.', 'pink', 2.5, 'pin'),
  ('Still smiling about this.', 'Whatever silly thing you said - yeah, that one. I think about it at random and accidentally smile in public. You''re a menace.', 'mint', -2.5, 'tape'),
  ('I''m so proud of you.', 'I don''t say this enough out loud. Watching you be brave, even quietly, is one of my favorite things to witness.', 'lavender', 1.5, 'pin'),
  ('You make me softer.', 'I used to think I had to be sharp to be safe. You taught me I can be gentle and still be okay.', 'peach', -1.5, 'tape'),
  ('Thank you for this life.', 'For the small one. The one with breakfast and grocery runs and our weird inside jokes. It is, and always will be, enough.', 'blue', 2, 'pin'),
  ('You are my favorite weather.', 'Every kind. Sunny you, rainy you, thunderstorm you. I''d stand outside in any of it.', 'yellow', -3, 'tape'),
  ('Come back to bed.', 'It''s cold without you. The blanket knows. I know. Come back, slowly. Bring your sleepy voice.', 'pink', 2.5, 'tape'),
  ('You''re my safe place.', 'Of all the places I''ve ever lived, you''re the only one that ever felt like home on the first day.', 'mint', -2, 'pin');

insert into public.letters (title, subtitle, preview_text, cover_style, page_data_json)
values
  (
    'Open when you''re sad',
    'for the heavy days',
    'Hi. I''m so sorry today is hard. You don''t have to explain. You don''t have to fix it.',
    'pink',
    '{"pageStyle":"lined","paperVariant":"blush","body":"Hi. I''m so sorry today is hard. You don''t have to explain. You don''t have to fix it. Just sit with me for a minute. You are loved exactly as you are right now - messy hair, tired eyes, all of it. Drink some water. Eat the snack. Come back to me when you can. I''m not going anywhere.","elements":[]}'::jsonb
  ),
  (
    'Open when you miss me',
    'for the in-between',
    'I miss you too. Probably more. Close your eyes and think of the last time I made you laugh.',
    'lavender',
    '{"pageStyle":"lined","paperVariant":"lavender","body":"I miss you too. Probably more. Close your eyes and think of the last time I made you laugh - that''s where I am right now, just on the other side of the day. I''ll be back. I always come back to you.","elements":[]}'::jsonb
  ),
  (
    'Open one year from now',
    'for future us',
    'Hi from past me. I hope this year was kind. I hope you grew, and rested, and laughed loud enough to scare yourself.',
    'blue',
    '{"pageStyle":"lined","paperVariant":"blue","body":"Hi from past me. I hope this year was kind. I hope you grew, and rested, and laughed loud enough to scare yourself. I hope we''re still us - softer, maybe. Funnier, probably. I''m certain of one thing: I''m still choosing you.","elements":[]}'::jsonb
  ),
  (
    'Open on our anniversary',
    'for the day that started it all',
    'Happy us-day. Whatever number this is, it''s not enough yet.',
    'yellow',
    '{"pageStyle":"lined","paperVariant":"peach","body":"Happy us-day. Whatever number this is, it''s not enough yet. Thank you for the most ordinary, magical, real love I''ve ever known. I''d do it all again - even the hard parts - just to find you the same way.","elements":[]}'::jsonb
  );
