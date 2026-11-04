-- Apply after 001_team.sql and 002_modules_controlling.sql.
-- Invites are provisioned inside auth.users' transaction before Auth sends mail.
begin;

alter table public.profiles add column if not exists access_updated_at timestamptz not null default now();
create table if not exists app_private.team_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  role text not null check(role in ('admin','studio_manager','employee')),
  studio_ids uuid[] not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '1 hour'),
  provisioned_user_id uuid references public.profiles(id)
);
create table if not exists app_private.team_mail_limits (
  user_id uuid primary key references public.profiles(id),
  requested_at timestamptz not null
);
create table if not exists public.team_access_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  target_id uuid references public.profiles(id),
  event text not null,
  details jsonb not null default '{}',
  at timestamptz not null default now()
);
alter table public.team_access_events enable row level security;
drop policy if exists team_access_events_admin on public.team_access_events;
create policy team_access_events_admin on public.team_access_events for select to authenticated using(app_private.is_admin());
revoke all on public.team_access_events from public,anon,authenticated;
grant select on public.team_access_events to authenticated;
revoke all on app_private.team_invitations,app_private.team_mail_limits from public,anon,authenticated;

create or replace function app_private.assert_team_access(p_name text,p_role text,p_studios uuid[],p_active boolean)
returns void language plpgsql set search_path='' as $$ begin
 if p_name is null or length(trim(p_name)) not between 1 and 100 or p_role is null or p_role not in ('admin','studio_manager','employee') or p_active is null then raise check_violation using message='Invalid employee name, role or status'; end if;
 if p_studios is null or cardinality(p_studios)>7 or exists(select 1 from unnest(p_studios) s where s is null or not exists(select 1 from public.studios where id=s)) or cardinality(p_studios)<>(select count(distinct s) from unnest(p_studios) s) then raise check_violation using message='Invalid employee studios'; end if;
 if p_active and p_role<>'admin' and cardinality(p_studios)=0 then raise check_violation using message='Active employees require a studio'; end if;
end; $$;

create or replace function public.admin_team_directory(p_page integer default 0,p_size integer default 50)
returns jsonb language plpgsql security definer set search_path='' as $$ begin
 if not app_private.is_admin() then raise insufficient_privilege using message='Administrator required'; end if;
 if p_page is null or p_size is null or p_page<0 or p_page>10000 or p_size not between 1 and 100 then raise check_violation using message='Invalid directory page'; end if;
 return jsonb_build_object(
  'members',(select coalesce(jsonb_agg(to_jsonb(m)),'[]') from (
    select p.id,p.full_name,p.role,p.active,p.access_updated_at,u.email,u.last_sign_in_at,u.invited_at,
      coalesce((select jsonb_agg(sm.studio_id order by sm.studio_id) from public.studio_memberships sm where sm.user_id=p.id),'[]') as studio_ids
    from public.profiles p join auth.users u on u.id=p.id order by lower(p.full_name),p.id offset p_page*p_size limit p_size
  ) m),
  'total',(select count(*) from public.profiles),
  'studios',(select coalesce(jsonb_agg(to_jsonb(s) order by s.name),'[]') from public.studios s)
 );
end; $$;

create or replace function public.admin_set_team_access(p_user uuid,p_full_name text,p_role text,p_studio_ids uuid[],p_active boolean,p_expected_updated_at timestamptz)
returns void language plpgsql security definer set search_path='' as $$ declare previous public.profiles; begin
 -- Serialize administrative access changes, then re-check the acting account.
 perform pg_advisory_xact_lock(732014,1);
 if not app_private.is_admin() then raise insufficient_privilege using message='Administrator required'; end if;
 perform app_private.assert_team_access(p_full_name,p_role,p_studio_ids,p_active);
 select * into previous from public.profiles where id=p_user for update;
 if not found or previous.access_updated_at is distinct from p_expected_updated_at then raise serialization_failure using message='Employee access changed; reload before saving'; end if;
 if p_user=auth.uid() and (p_role<>'admin' or not p_active) then raise check_violation using message='Cannot remove your own administrator access'; end if;
 if previous.active and previous.role='admin' and (not p_active or p_role<>'admin') and (select count(*) from public.profiles where active and role='admin')<=1 then raise check_violation using message='At least one active administrator required'; end if;
 update public.profiles set full_name=trim(p_full_name),role=p_role,active=p_active,access_updated_at=clock_timestamp() where id=p_user;
 delete from public.studio_memberships where user_id=p_user;
 insert into public.studio_memberships(user_id,studio_id) select p_user,s from unnest(p_studio_ids) s;
 insert into public.team_access_events(actor_id,target_id,event,details) values(auth.uid(),p_user,'access_updated',jsonb_build_object('role',p_role,'active',p_active,'studio_ids',p_studio_ids));
end; $$;

create or replace function public.admin_prepare_team_invitation(p_email text,p_full_name text,p_role text,p_studio_ids uuid[])
returns uuid language plpgsql security definer set search_path='' as $$ declare invitation uuid; normalized text:=lower(trim(p_email)); begin
 if not app_private.is_admin() then raise insufficient_privilege using message='Administrator required'; end if;
 perform app_private.assert_team_access(p_full_name,p_role,p_studio_ids,true);
 if normalized is null or length(normalized)>254 or normalized!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise check_violation using message='Invalid employee email'; end if;
 if exists(select 1 from auth.users where lower(email)=normalized) then raise unique_violation using message='Account already exists; use the directory to send a login link'; end if;
 insert into app_private.team_invitations(email,full_name,role,studio_ids,created_by) values(normalized,trim(p_full_name),p_role,p_studio_ids,auth.uid())
 on conflict(email) do update set id=gen_random_uuid(),full_name=excluded.full_name,role=excluded.role,studio_ids=excluded.studio_ids,created_by=excluded.created_by,created_at=clock_timestamp(),expires_at=clock_timestamp()+interval '1 hour',provisioned_user_id=null
 returning id into invitation;
 insert into public.team_access_events(actor_id,event,details) values(auth.uid(),'invitation_prepared',jsonb_build_object('invitation_id',invitation));
 return invitation;
end; $$;

create or replace function app_private.provision_invited_employee()
returns trigger language plpgsql security definer set search_path='' as $$ declare invitation app_private.team_invitations; begin
 select * into invitation from app_private.team_invitations i where i.email=lower(new.email) and i.id::text=new.raw_user_meta_data->>'team_invitation_id' and i.expires_at>clock_timestamp() and i.provisioned_user_id is null for update;
 if not found then return new; end if;
 -- The request may have been staged earlier; its creator must still be admin.
 if not exists(select 1 from public.profiles where id=invitation.created_by and active and role='admin') then raise insufficient_privilege using message='Invitation creator is no longer an administrator'; end if;
 perform app_private.assert_team_access(invitation.full_name,invitation.role,invitation.studio_ids,true);
 insert into public.profiles(id,full_name,role,active) values(new.id,invitation.full_name,invitation.role,true);
 insert into public.studio_memberships(user_id,studio_id) select new.id,s from unnest(invitation.studio_ids) s;
 update app_private.team_invitations set provisioned_user_id=new.id where id=invitation.id;
 insert into public.team_access_events(actor_id,target_id,event) values(invitation.created_by,new.id,'account_provisioned');
 return new;
end; $$;
drop trigger if exists teamhub_provision_invited_employee on auth.users;
create trigger teamhub_provision_invited_employee after insert on auth.users for each row execute function app_private.provision_invited_employee();

create or replace function public.admin_team_login_target(p_user uuid)
returns text language plpgsql security definer set search_path='' as $$ declare address text; begin
 if not app_private.is_admin() then raise insufficient_privilege using message='Administrator required'; end if;
 select u.email into address from public.profiles p join auth.users u on u.id=p.id where p.id=p_user and p.active and (p.role='admin' or exists(select 1 from public.studio_memberships where user_id=p.id));
 if address is null then raise check_violation using message='Active provisioned employee required'; end if;
 insert into app_private.team_mail_limits(user_id,requested_at) values(p_user,clock_timestamp())
 on conflict(user_id) do update set requested_at=excluded.requested_at where app_private.team_mail_limits.requested_at<clock_timestamp()-interval '60 seconds';
 if not found then raise check_violation using message='Wait 60 seconds before requesting another email'; end if;
 insert into public.team_access_events(actor_id,target_id,event) values(auth.uid(),p_user,'login_link_requested');
 return address;
end; $$;

-- Profiles and studio memberships now change together through the checked RPC.
-- SQL-editor/bootstrap administration by the database owner remains available.
revoke insert,update,delete on public.profiles,public.studio_memberships from authenticated;
revoke all on all functions in schema app_private from public;
grant execute on all functions in schema app_private to authenticated;
revoke all on function public.admin_team_directory(integer,integer),public.admin_set_team_access(uuid,text,text,uuid[],boolean,timestamptz),public.admin_prepare_team_invitation(text,text,text,uuid[]),public.admin_team_login_target(uuid) from public,anon;
grant execute on function public.admin_team_directory(integer,integer),public.admin_set_team_access(uuid,text,text,uuid[],boolean,timestamptz),public.admin_prepare_team_invitation(text,text,text,uuid[]),public.admin_team_login_target(uuid) to authenticated;
commit;
