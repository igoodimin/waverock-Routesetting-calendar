-- Supabase SQL Editor > Database에서 기존 테이블 생성 후 실행.
-- 기존 행/한국어 값/버전/정책을 변경하지 않는 추가 필드 migration.
begin;
alter table public.calendar_events
 add column if not exists sector_en text not null default '' check (char_length(sector_en)<=40),
 add column if not exists note_en text not null default '' check (char_length(note_en)<=40);
alter table public.calendar_holidays
 add column if not exists name_en text not null default '' check (char_length(name_en)<=40);
alter table public.calendar_art
 add column if not exists name_en text not null default '' check (char_length(name_en)<=40 and cardinality(regexp_split_to_array(name_en,E'\\r\\n?|\\n'))<=3);
commit;
