-- To-Do drag-to-reorder: manual position for My Tasks ordering.
-- Run in Supabase SQL Editor.
alter table public.todos add column if not exists pos numeric;
