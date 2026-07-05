-- Run this once in Supabase → SQL Editor

create extension if not exists "pgcrypto";

create table questions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text not null,
  category text,
  body text not null,
  solved boolean default false,
  created_at timestamptz default now()
);

create table answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references questions(id) on delete cascade,
  name text not null,
  body text not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table questions enable row level security;
alter table answers enable row level security;

-- MVP policies: anyone (even not logged in) can read and post.
-- Tighten these later once you add real user accounts.
create policy "Public read questions" on questions for select using (true);
create policy "Public insert questions" on questions for insert with check (true);
create policy "Public update questions" on questions for update using (true);

create policy "Public read answers" on answers for select using (true);
create policy "Public insert answers" on answers for insert with check (true);
