-- Supabase SQL Editor에서 한 번 실행하세요. 이 달력은 누구나 조회/추가/수정/삭제할 수 있습니다.
begin;
create table public.calendar_events (
  id uuid primary key,
  branch text not null check (branch in ('남천점','서면점','부산대점')),
  sector text not null check (char_length(trim(sector)) between 1 and 40),
  start date not null check (start between date '1900-01-01' and date '2201-12-31'),
  "end" date not null check ("end" >= start and "end" <= date '2201-12-31'),
  time text not null check (char_length(trim(time)) between 1 and 40),
  note text not null check (char_length(trim(note)) between 1 and 40),
  version integer not null default 1 check (version > 0)
);
alter table public.calendar_events enable row level security;
revoke all on public.calendar_events from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.calendar_events to anon, authenticated;
create policy "Public calendar read" on public.calendar_events for select to anon, authenticated using (true);
create policy "Public calendar insert" on public.calendar_events for insert to anon, authenticated with check (version = 1);
create policy "Public calendar update" on public.calendar_events for update to anon, authenticated using (true) with check (true);
create policy "Public calendar delete" on public.calendar_events for delete to anon, authenticated using (true);
create function public.check_calendar_version() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id <> old.id or new.version <> old.version + 1 then
    raise exception 'Calendar version must advance by one and id must remain unchanged';
  end if;
  return new;
end;
$$;
create trigger calendar_version before update on public.calendar_events
for each row execute function public.check_calendar_version();
commit;
