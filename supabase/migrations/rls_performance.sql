-- ─── RLS PERFORMANCE ─────────────────────────────────────────────────────────
-- The read policies called is_family_member() once PER ROW. Reading a few
-- thousand log entries meant a few thousand extra lookups (and a join to
-- tasks for each), which made every screen that reads logs slow.
--
-- These policies grant exactly the same access: they still go through
-- is_family_member(), but evaluate it once per query, over the families table,
-- instead of once per row. Postgres caches a `(select ...)` subquery in a
-- policy as an InitPlan, so it runs a single time.
--
-- Safe to re-run. Runs as one transaction: if any expected policy is missing
-- (e.g. it was renamed in the dashboard), it stops and changes nothing.

begin;

do $$
declare
  expected text[][] := array[
    ['families', 'family_select'],
    ['family_users', 'family_users_select'],
    ['members', 'members_select'],
    ['categories', 'categories_select'],
    ['subcategories', 'subcategories_select'],
    ['tags', 'tags_select'],
    ['tasks', 'tasks_select'],
    ['task_tags', 'task_tags_select'],
    ['attachments', 'attachments_select'],
    ['cadence_versions', 'cadence_select'],
    ['log_entries', 'logs_select'],
    ['log_entry_tags', 'log_tags_select']
  ];
  i int;
begin
  for i in 1 .. array_length(expected, 1) loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = expected[i][1] and policyname = expected[i][2]
    ) then
      raise exception 'Policy "%" on table "%" not found — nothing was changed', expected[i][2], expected[i][1];
    end if;
  end loop;
end $$;

-- Families the current user belongs to, by whatever rule is_family_member()
-- implements. Evaluated per family, not per row of the table being read.
create or replace function my_family_ids()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select f.id from families f where is_family_member(f.id)
$$;

alter function is_family_member(uuid) stable;
alter function family_role(uuid) stable;

drop policy "family_select" on families;
create policy "family_select" on families for select
  using (id in (select my_family_ids()));

drop policy "family_users_select" on family_users;
create policy "family_users_select" on family_users for select
  using (family_id in (select my_family_ids()));

drop policy "members_select" on members;
create policy "members_select" on members for select
  using (family_id in (select my_family_ids()));

drop policy "categories_select" on categories;
create policy "categories_select" on categories for select
  using (member_id in (select m.id from members m where m.family_id in (select my_family_ids())));

drop policy "subcategories_select" on subcategories;
create policy "subcategories_select" on subcategories for select
  using (category_id in (
    select c.id from categories c join members m on m.id = c.member_id
    where m.family_id in (select my_family_ids())));

drop policy "tags_select" on tags;
create policy "tags_select" on tags for select
  using (family_id in (select my_family_ids()));

drop policy "tasks_select" on tasks;
create policy "tasks_select" on tasks for select
  using (family_id in (select my_family_ids()));

drop policy "task_tags_select" on task_tags;
create policy "task_tags_select" on task_tags for select
  using (task_id in (select t.id from tasks t where t.family_id in (select my_family_ids())));

drop policy "attachments_select" on attachments;
create policy "attachments_select" on attachments for select
  using (task_id in (select t.id from tasks t where t.family_id in (select my_family_ids())));

drop policy "cadence_select" on cadence_versions;
create policy "cadence_select" on cadence_versions for select
  using (task_id in (select t.id from tasks t where t.family_id in (select my_family_ids())));

drop policy "logs_select" on log_entries;
create policy "logs_select" on log_entries for select
  using (task_id in (select t.id from tasks t where t.family_id in (select my_family_ids())));

drop policy "log_tags_select" on log_entry_tags;
create policy "log_tags_select" on log_entry_tags for select
  using (log_entry_id in (
    select l.id from log_entries l join tasks t on t.id = l.task_id
    where t.family_id in (select my_family_ids())));

-- The app reads logs by task, newest first (filtered and paged on logged_at)
create index if not exists log_entries_task_id_logged_at_idx
  on log_entries (task_id, logged_at desc);

commit;
