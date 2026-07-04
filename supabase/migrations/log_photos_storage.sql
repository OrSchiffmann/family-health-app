-- ============================================================
-- Storage bucket for execution-log photos
-- Run ONCE in Supabase SQL Editor
-- ============================================================

insert into storage.buckets (id, name, public)
values ('log-photos', 'log-photos', true)
on conflict (id) do nothing;

drop policy if exists "log_photos_read" on storage.objects;
create policy "log_photos_read" on storage.objects
  for select using (bucket_id = 'log-photos');

drop policy if exists "log_photos_insert" on storage.objects;
create policy "log_photos_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'log-photos');

drop policy if exists "log_photos_delete" on storage.objects;
create policy "log_photos_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'log-photos');
