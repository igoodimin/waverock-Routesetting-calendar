-- 기존 schema.sql 적용 후 Supabase SQL Editor의 Database에서 한 번 실행하세요.
-- 기존 일정은 변경하지 않습니다. 공휴일 수정은 기존 달력처럼 누구나 가능합니다.
begin;
create table public.calendar_holidays (
 id date primary key check (id between date '1900-01-01' and date '2201-12-31'),
 mode text not null check (mode in ('auto','custom','off')),
 name text not null default '' check (char_length(name) <= 40),
 version integer not null default 1 check (version > 0),
 check (mode <> 'custom' or char_length(trim(name)) > 0)
);
alter table public.calendar_holidays enable row level security;
revoke all on public.calendar_holidays from anon, authenticated;
grant select, insert, update on public.calendar_holidays to anon, authenticated;
create policy "Public holiday read" on public.calendar_holidays for select to anon, authenticated using (true);
create policy "Public holiday insert" on public.calendar_holidays for insert to anon, authenticated with check (version = 1);
create policy "Public holiday update" on public.calendar_holidays for update to anon, authenticated using (true) with check (true);
create trigger holiday_version before update on public.calendar_holidays
for each row execute function public.check_calendar_version();
commit;
