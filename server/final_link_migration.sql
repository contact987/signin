-- Sugar Shot Studio OS — pending migrations (run once):
-- final cut link (required to close) + Sugar Shot / Sugar Bomb entity
alter table public.projects add column if not exists final_link text not null default '';
alter table public.cards    add column if not exists entity text not null default 'Sugar Shot';
alter table public.projects add column if not exists entity text not null default 'Sugar Shot';
