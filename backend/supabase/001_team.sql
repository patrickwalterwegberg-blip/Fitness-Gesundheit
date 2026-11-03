-- Run in a NEW Supabase project's SQL editor as its database administrator.
-- The client uses only a publishable key. Authorization is enforced here.
begin;

create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;

create table if not exists public.studios (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 1 and 100),
  role text not null default 'employee' check (role in ('admin', 'studio_manager', 'employee')),
  active boolean not null default true
);
create table if not exists public.studio_memberships (
  user_id uuid not null references public.profiles(id) on delete cascade,
  studio_id uuid not null references public.studios(id) on delete cascade,
  primary key (user_id, studio_id)
);
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 180),
  description text not null default '' check (length(description) <= 5000),
  studio_id uuid not null references public.studios(id),
  assignee_id uuid not null references public.profiles(id),
  due_date date not null,
  priority text not null default 'normal' check (priority in ('normal', 'high')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  created_by uuid not null references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.profiles(id) default auth.uid(),
  body text not null check (length(trim(body)) between 1 and 3000),
  created_at timestamptz not null default now()
);
create index if not exists tasks_studio_assignee on public.tasks(studio_id, assignee_id);
create index if not exists tasks_due on public.tasks(due_date);
create index if not exists task_comments_task on public.task_comments(task_id, created_at);

create or replace function app_private.is_active()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and active);
$$;
create or replace function app_private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and active and role = 'admin');
$$;
create or replace function app_private.has_studio(site uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app_private.is_active() and (app_private.is_admin() or exists(
    select 1 from public.studio_memberships where user_id = auth.uid() and studio_id = site
  ));
$$;
create or replace function app_private.can_manage_studio(site uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app_private.is_admin() or (app_private.has_studio(site) and exists(
    select 1 from public.profiles where id = auth.uid() and active and role = 'studio_manager'
  ));
$$;
create or replace function app_private.can_view_task(site uuid, assignee uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app_private.is_active() and (app_private.can_manage_studio(site) or (assignee = auth.uid() and app_private.has_studio(site)));
$$;
create or replace function app_private.can_view_profile(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app_private.is_active() and (target = auth.uid() or app_private.is_admin() or exists(
    select 1 from public.studio_memberships m where m.user_id = target and app_private.can_manage_studio(m.studio_id)
  ));
$$;
create or replace function app_private.valid_assignee(target uuid, site uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.id = target and p.active and (
    p.role = 'admin' or exists(select 1 from public.studio_memberships m where m.user_id = target and m.studio_id = site)
  ));
$$;

alter table public.studios enable row level security;
alter table public.profiles enable row level security;
alter table public.studio_memberships enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;

drop policy if exists studios_read on public.studios;
create policy studios_read on public.studios for select to authenticated using (app_private.has_studio(id));
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (app_private.can_view_profile(id));
drop policy if exists profiles_admin on public.profiles;
create policy profiles_admin on public.profiles for all to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
drop policy if exists memberships_read on public.studio_memberships;
create policy memberships_read on public.studio_memberships for select to authenticated using (
  app_private.is_active() and (user_id = auth.uid() or app_private.can_manage_studio(studio_id))
);
drop policy if exists memberships_admin on public.studio_memberships;
create policy memberships_admin on public.studio_memberships for all to authenticated using (app_private.is_admin()) with check (app_private.is_admin());
drop policy if exists tasks_read on public.tasks;
create policy tasks_read on public.tasks for select to authenticated using (app_private.can_view_task(studio_id, assignee_id));
drop policy if exists tasks_create on public.tasks;
create policy tasks_create on public.tasks for insert to authenticated with check (
  app_private.can_manage_studio(studio_id) and created_by = auth.uid() and app_private.valid_assignee(assignee_id, studio_id)
);
drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update to authenticated using (
  app_private.can_view_task(studio_id, assignee_id)
) with check (app_private.can_view_task(studio_id, assignee_id) and app_private.valid_assignee(assignee_id, studio_id));
drop policy if exists comments_read on public.task_comments;
create policy comments_read on public.task_comments for select to authenticated using (exists(
  select 1 from public.tasks t where t.id = task_id and app_private.can_view_task(t.studio_id, t.assignee_id)
));
drop policy if exists comments_insert on public.task_comments;
create policy comments_insert on public.task_comments for insert to authenticated with check (
  author_id = auth.uid() and exists(select 1 from public.tasks t where t.id = task_id and app_private.can_view_task(t.studio_id, t.assignee_id))
);

-- Employees may update their own status, not assign themselves another studio,
-- change the due date, rewrite the task or forge its audit timestamps.
create or replace function app_private.guard_task()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not app_private.is_active() then raise insufficient_privilege using message = 'Active employee profile required'; end if;
  if tg_op = 'INSERT' then
    if not app_private.can_manage_studio(new.studio_id) then raise insufficient_privilege using message = 'Task creation requires a manager'; end if;
    new.created_by := auth.uid();
    new.created_at := clock_timestamp();
  else
    if not app_private.can_manage_studio(old.studio_id) and
      row(new.title, new.description, new.studio_id, new.assignee_id, new.due_date, new.priority)
      is distinct from row(old.title, old.description, old.studio_id, old.assignee_id, old.due_date, old.priority)
    then raise insufficient_privilege using message = 'Employees can change only task status'; end if;
    new.id := old.id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  if not app_private.valid_assignee(new.assignee_id, new.studio_id) then raise check_violation using message = 'Assignee must be active and belong to the studio'; end if;
  new.updated_at := clock_timestamp();
  if new.status = 'done' then
    if tg_op = 'UPDATE' and old.status = 'done' then new.completed_at := old.completed_at;
    else new.completed_at := clock_timestamp(); end if;
  else new.completed_at := null; end if;
  return new;
end;
$$;
drop trigger if exists task_guard on public.tasks;
create trigger task_guard before insert or update on public.tasks for each row execute function app_private.guard_task();

create or replace function app_private.stamp_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.created_at := clock_timestamp();
  return new;
end;
$$;
drop trigger if exists comment_stamp on public.task_comments;
create trigger comment_stamp before insert on public.task_comments for each row execute function app_private.stamp_comment();

revoke all on all functions in schema app_private from public;
grant execute on all functions in schema app_private to authenticated;
revoke all on public.studios, public.profiles, public.studio_memberships, public.tasks, public.task_comments from anon, authenticated;
grant select on public.studios to authenticated;
grant select, insert, update, delete on public.profiles, public.studio_memberships to authenticated;
grant select, insert, update on public.tasks to authenticated;
grant select, insert on public.task_comments to authenticated;

insert into public.studios(name) values
 ('Sögel'), ('Bersenbrück'), ('Dörpen'), ('Lathen'), ('Haselünne'), ('Löningen'), ('Werlte')
on conflict(name) do nothing;

commit;
