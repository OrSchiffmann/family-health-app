-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── FAMILIES ────────────────────────────────────────────────────────────────
create table families (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  first_day_of_week text not null default 'sunday' check (first_day_of_week in ('saturday','sunday','monday')),
  created_at   timestamptz not null default now()
);

-- ─── FAMILY USERS (membership + roles) ───────────────────────────────────────
create table family_users (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references families(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'user' check (role in ('admin','editor','user','viewer')),
  joined_at   timestamptz not null default now(),
  unique(family_id, user_id)
);

-- ─── USER PROFILES ────────────────────────────────────────────────────────────
create table user_profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  language     text not null default 'he' check (language in ('he','en')),
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- ─── MEMBERS ──────────────────────────────────────────────────────────────────
create table members (
  id           uuid primary key default uuid_generate_v4(),
  family_id    uuid not null references families(id) on delete cascade,
  name         text not null,
  avatar_color text not null default '#6366f1',
  is_archived  boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ─── CATEGORIES ───────────────────────────────────────────────────────────────
create table categories (
  id          uuid primary key default uuid_generate_v4(),
  member_id   uuid not null references members(id) on delete cascade,
  name        text not null,
  color       text not null default '#6366f1',
  is_default  boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ─── SUBCATEGORIES ────────────────────────────────────────────────────────────
create table subcategories (
  id          uuid primary key default uuid_generate_v4(),
  category_id uuid not null references categories(id) on delete cascade,
  name        text not null,
  sort_order  integer not null default 0
);

-- ─── TAGS ─────────────────────────────────────────────────────────────────────
create table tags (
  id        uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  name      text not null,
  color     text
);

-- ─── TASKS ────────────────────────────────────────────────────────────────────
create table tasks (
  id               uuid primary key default uuid_generate_v4(),
  family_id        uuid not null references families(id) on delete cascade,
  title            text not null,
  assigned_members uuid[] not null default '{}',
  category_id      uuid not null references categories(id),
  subcategory_id   uuid references subcategories(id),
  task_type        text not null check (task_type in ('done_not_done','duration')),
  description      text,
  end_date         date,
  is_archived      boolean not null default false,
  created_at       timestamptz not null default now(),
  created_by       uuid not null references auth.users(id)
);

-- ─── TASK TAGS (join table) ───────────────────────────────────────────────────
create table task_tags (
  task_id uuid not null references tasks(id) on delete cascade,
  tag_id  uuid not null references tags(id) on delete cascade,
  primary key (task_id, tag_id)
);

-- ─── ATTACHMENTS ─────────────────────────────────────────────────────────────
create table attachments (
  id            uuid primary key default uuid_generate_v4(),
  task_id       uuid not null references tasks(id) on delete cascade,
  type          text not null check (type in ('image','video','youtube','link')),
  url           text not null,
  title         text,
  thumbnail_url text
);

-- ─── CADENCE VERSIONS ────────────────────────────────────────────────────────
create table cadence_versions (
  id              uuid primary key default uuid_generate_v4(),
  task_id         uuid not null references tasks(id) on delete cascade,
  effective_from  date not null,
  target_count    integer,
  target_minutes  integer,
  per             text not null check (per in ('day','week','month')),
  created_at      timestamptz not null default now(),
  constraint max_4_versions check (true) -- enforced at app level
);

-- ─── LOG ENTRIES ─────────────────────────────────────────────────────────────
create table log_entries (
  id                 uuid primary key default uuid_generate_v4(),
  task_id            uuid not null references tasks(id) on delete cascade,
  member_id          uuid not null references members(id) on delete cascade,
  logged_by          uuid not null references auth.users(id),
  logged_at          timestamptz not null default now(),
  execution_time     timestamptz,
  cadence_version_id uuid not null references cadence_versions(id),
  completed          boolean not null default false,
  duration_minutes   integer,
  notes              text
);

-- ─── LOG ENTRY TAGS ──────────────────────────────────────────────────────────
create table log_entry_tags (
  log_entry_id uuid not null references log_entries(id) on delete cascade,
  tag_id       uuid not null references tags(id) on delete cascade,
  primary key (log_entry_id, tag_id)
);

-- ─── INVITATION LINKS ────────────────────────────────────────────────────────
create table invitations (
  id         uuid primary key default uuid_generate_v4(),
  family_id  uuid not null references families(id) on delete cascade,
  email      text,
  role       text not null default 'user' check (role in ('editor','user','viewer')),
  token      text not null unique default encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at    timestamptz,
  created_by uuid not null references auth.users(id)
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
create index on family_users(user_id);
create index on family_users(family_id);
create index on members(family_id);
create index on categories(member_id);
create index on tasks(family_id);
create index on tasks(is_archived);
create index on log_entries(task_id);
create index on log_entries(member_id);
create index on log_entries(logged_at);
create index on cadence_versions(task_id);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
alter table families        enable row level security;
alter table family_users    enable row level security;
alter table user_profiles   enable row level security;
alter table members         enable row level security;
alter table categories      enable row level security;
alter table subcategories   enable row level security;
alter table tags            enable row level security;
alter table tasks           enable row level security;
alter table task_tags       enable row level security;
alter table attachments     enable row level security;
alter table cadence_versions enable row level security;
alter table log_entries     enable row level security;
alter table log_entry_tags  enable row level security;
alter table invitations     enable row level security;

-- Helper: is the current user a member of a family?
create or replace function is_family_member(fid uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from family_users
    where family_id = fid and user_id = auth.uid()
  );
$$;

-- Helper: current user's role in a family
create or replace function family_role(fid uuid)
returns text language sql security definer as $$
  select role from family_users
  where family_id = fid and user_id = auth.uid()
  limit 1;
$$;

-- Families: members can read; admins can update
create policy "family_select" on families for select using (is_family_member(id));
create policy "family_update" on families for update using (family_role(id) = 'admin');

-- Family users: members can see their family's users; admins can insert/delete
create policy "family_users_select" on family_users for select using (is_family_member(family_id));
create policy "family_users_insert" on family_users for insert with check (family_role(family_id) = 'admin');
create policy "family_users_delete" on family_users for delete using (family_role(family_id) = 'admin' or user_id = auth.uid());

-- User profiles: users manage their own profile
create policy "profile_select" on user_profiles for select using (auth.uid() = id);
create policy "profile_insert" on user_profiles for insert with check (auth.uid() = id);
create policy "profile_update" on user_profiles for update using (auth.uid() = id);

-- Members, categories, subcategories, tags, tasks, attachments, cadence, logs:
-- any family member can read; editor/admin can write
create policy "members_select"    on members         for select using (is_family_member(family_id));
create policy "members_write"     on members         for all    using (family_role(family_id) in ('admin','editor'));

create policy "categories_select" on categories      for select using (exists (select 1 from members m where m.id = member_id and is_family_member(m.family_id)));
create policy "categories_write"  on categories      for all    using (exists (select 1 from members m where m.id = member_id and family_role(m.family_id) in ('admin','editor')));

create policy "subcategories_select" on subcategories for select using (exists (select 1 from categories c join members m on m.id = c.member_id where c.id = category_id and is_family_member(m.family_id)));
create policy "subcategories_write"  on subcategories for all    using (exists (select 1 from categories c join members m on m.id = c.member_id where c.id = category_id and family_role(m.family_id) in ('admin','editor')));

create policy "tags_select" on tags for select using (is_family_member(family_id));
create policy "tags_write"  on tags for all    using (family_role(family_id) in ('admin','editor'));

create policy "tasks_select" on tasks for select using (is_family_member(family_id));
create policy "tasks_write"  on tasks for all    using (family_role(family_id) in ('admin','editor'));

create policy "task_tags_select" on task_tags for select using (exists (select 1 from tasks t where t.id = task_id and is_family_member(t.family_id)));
create policy "task_tags_write"  on task_tags for all    using (exists (select 1 from tasks t where t.id = task_id and family_role(t.family_id) in ('admin','editor')));

create policy "attachments_select" on attachments for select using (exists (select 1 from tasks t where t.id = task_id and is_family_member(t.family_id)));
create policy "attachments_write"  on attachments for all    using (exists (select 1 from tasks t where t.id = task_id and family_role(t.family_id) in ('admin','editor')));

create policy "cadence_select" on cadence_versions for select using (exists (select 1 from tasks t where t.id = task_id and is_family_member(t.family_id)));
create policy "cadence_write"  on cadence_versions for all    using (exists (select 1 from tasks t where t.id = task_id and family_role(t.family_id) in ('admin','editor')));

-- Log entries: all members can read; user+ can insert; admin/editor can delete
create policy "logs_select" on log_entries for select using (exists (select 1 from tasks t where t.id = task_id and is_family_member(t.family_id)));
create policy "logs_insert" on log_entries for insert with check (exists (select 1 from tasks t where t.id = task_id and family_role(t.family_id) in ('admin','editor','user')));
create policy "logs_delete" on log_entries for delete using (exists (select 1 from tasks t where t.id = task_id and family_role(t.family_id) in ('admin','editor')));

create policy "log_tags_select" on log_entry_tags for select using (exists (select 1 from log_entries l join tasks t on t.id = l.task_id where l.id = log_entry_id and is_family_member(t.family_id)));
create policy "log_tags_write"  on log_entry_tags for all    using (exists (select 1 from log_entries l join tasks t on t.id = l.task_id where l.id = log_entry_id and family_role(t.family_id) in ('admin','editor','user')));

create policy "invitations_select" on invitations for select using (is_family_member(family_id));
create policy "invitations_write"  on invitations for all    using (family_role(family_id) = 'admin');

-- ─── AUTO-CREATE USER PROFILE ON SIGNUP ──────────────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into user_profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
