create table if not exists events (
  id uuid primary key,
  state jsonb not null,
  ikey uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
