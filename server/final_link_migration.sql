-- Sugar Shot Studio OS — final cut link on projects (required to close)
alter table public.projects add column if not exists final_link text not null default '';
