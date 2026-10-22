-- Supabase SQL Editor → Database에서 실행. 기존 이벤트는 노란색 유지.
alter table public.calendar_art
 add column if not exists background_color text not null default '#e4c64f'
 check (background_color ~ '^#[0-9a-fA-F]{6}$');
notify pgrst, 'reload schema';
