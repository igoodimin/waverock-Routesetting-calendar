-- 기존 calendar_art용. Supabase SQL Editor → Database에서 실행.
-- 기존 이벤트는 20px로 유지합니다. 여러 번 실행해도 안전합니다.
alter table public.calendar_art
 add column if not exists font_size integer not null default 20
 check (font_size between 12 and 36);
notify pgrst, 'reload schema';
