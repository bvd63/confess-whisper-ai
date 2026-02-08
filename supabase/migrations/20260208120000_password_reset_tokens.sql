-- Password reset tokens for user-specific, single-use links
create table if not exists public.password_reset_tokens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    token_hash text not null unique,
    expires_at timestamptz not null,
    used boolean not null default false,
    used_at timestamptz,
    requested_ip text,
    created_at timestamptz not null default now()
);

alter table public.password_reset_tokens enable row level security;

create index if not exists password_reset_tokens_user_id_idx on public.password_reset_tokens(user_id);
create index if not exists password_reset_tokens_expires_idx on public.password_reset_tokens(expires_at);
