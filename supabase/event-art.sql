-- 기존 schema.sql 적용 후 Supabase SQL Editor의 Database에서 한 번 실행하세요.
-- 날짜당 이벤트 1개. 이미지는 브라우저에서 632×608 JPEG로 압축해 저장합니다.
-- 삭제는 비활성화로 기록하여 버전 충돌 검사를 유지합니다.
begin;
create table public.calendar_art (
 id date primary key check (id between date '1900-01-01' and date '2201-12-31'),
 enabled boolean not null default true,
 font_size integer not null default 20 check (font_size between 12 and 36),
 name text not null default '' check (char_length(name) <= 40),
 image text not null default '' check (char_length(image) <= 700000 and (image = '' or image ~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+={0,2}$')),
 version integer not null default 1 check (version > 0),
 check (not enabled or char_length(trim(name)) > 0)
);
alter table public.calendar_art enable row level security;
revoke all on public.calendar_art from anon, authenticated;
grant select, insert, update on public.calendar_art to anon, authenticated;
create policy "Public art read" on public.calendar_art for select to anon, authenticated using (true);
create policy "Public art insert" on public.calendar_art for insert to anon, authenticated with check (version = 1);
create policy "Public art update" on public.calendar_art for update to anon, authenticated using (true) with check (true);
create trigger art_version before update on public.calendar_art
for each row execute function public.check_calendar_version();
commit;
