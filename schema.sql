-- Run once in the Supabase SQL editor.
create table if not exists articles (
  id           bigint generated always as identity primary key,
  url          text not null unique,
  source       text not null,
  title        text not null default '',
  image        text,
  summary      text not null default '',
  published_at timestamptz,
  categories   text[] not null default '{}',
  fetched_at   timestamptz not null default now()
);

create index if not exists articles_published_idx on articles (published_at desc);
create index if not exists articles_categories_idx on articles using gin (categories);
create index if not exists articles_source_idx on articles (source);

-- Lock the table down; the scraper uses the service_role key, which bypasses RLS.
alter table articles enable row level security;

-- Optional: let the web page (index.html) read with the public anon key.
create policy "public read" on articles for select to anon using (true);

-- If the table already exists (created before categories/image were added):
-- alter table articles add column if not exists image text;
-- alter table articles add column if not exists categories text[] not null default '{}';
