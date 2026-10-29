create table if not exists events (
  id uuid primary key,
  state jsonb not null,
  ikey uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists syncs (
  profile_id uuid primary key,
  data jsonb not null,
  expires_at timestamptz not null
);
