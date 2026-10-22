-- 기존 schema.sql 적용 후 Supabase SQL Editor > Database에서 실행.
begin;
alter table public.calendar_events add column if not exists show_logo boolean not null default true;
create table public.calendar_months (
 id text primary key check (id ~ '^(19[0-9]{2}|20[0-9]{2}|21[0-9]{2}|2200)-(0[1-9]|1[0-2])$'),
 is_draft boolean not null default false,
 version integer not null default 1 check (version > 0)
);
alter table public.calendar_months enable row level security;
revoke all on public.calendar_months from anon, authenticated;
grant select, insert, update on public.calendar_months to anon, authenticated;
create policy "Public month read" on public.calendar_months for select to anon, authenticated using (true);
create policy "Public month insert" on public.calendar_months for insert to anon, authenticated with check (version = 1);
create policy "Public month update" on public.calendar_months for update to anon, authenticated using (true) with check (true);
create trigger month_version before update on public.calendar_months
for each row execute function public.check_calendar_version();
commit;
