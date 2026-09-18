-- 플랜 옵션: 아바타를 0으로(그 회차엔 안 만들기) 잡을 수 있는지.
-- SQLite 에는 ADD COLUMN IF NOT EXISTS 가 없다.
-- migrate 스크립트가 'duplicate column name' 을 건너뛰므로 여러 번 돌려도 안전하다.
ALTER TABLE plans ADD COLUMN allow_zero INTEGER NOT NULL DEFAULT 0;
