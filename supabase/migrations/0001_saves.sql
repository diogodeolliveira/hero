-- Hero · tabela de saves (um por jogador)
-- Rode no Supabase: SQL Editor → New query → cole tudo → Run

create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  dados jsonb not null,
  versao int not null default 1,
  atualizado_em timestamptz not null default now()
);

alter table public.saves enable row level security;

-- Cada jogador só enxerga e altera o próprio save
create policy "ler o proprio save" on public.saves
  for select using (auth.uid() = user_id);
create policy "criar o proprio save" on public.saves
  for insert with check (auth.uid() = user_id);
create policy "atualizar o proprio save" on public.saves
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "apagar o proprio save" on public.saves
  for delete using (auth.uid() = user_id);
