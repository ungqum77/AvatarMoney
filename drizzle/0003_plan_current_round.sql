-- 플랜별 '지금 내 회차'. 0 = 아직 안 정함, 1~18 = 그 회차.
-- 총 예상 수당이 몇 회차까지 받는 돈인지 표시하고, 회차수당표에서
-- 내 자리를 짚어주는 데 쓴다.
-- SQLite 에는 ADD COLUMN IF NOT EXISTS 가 없다.
-- migrate 스크립트가 'duplicate column name' 을 건너뛰므로 여러 번 돌려도 안전하다.
ALTER TABLE plans ADD COLUMN current_round INTEGER NOT NULL DEFAULT 0;
