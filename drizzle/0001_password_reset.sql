-- 비밀번호 재설정(이름 + 휴대폰번호로 본인 확인).
-- 본인 확인에 성공하면 짧은 수명의 토큰을 발급하고, 그 토큰으로만 새 비밀번호를 설정한다.
CREATE TABLE IF NOT EXISTS password_resets (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);

-- 시도 횟수 제한용. 이름+번호는 아는 사람이 있을 수 있으므로
-- 자동화된 대량 시도만이라도 막는다.
CREATE TABLE IF NOT EXISTS auth_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  kind TEXT NOT NULL,
  ok INTEGER NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_attempts ON auth_attempts(phone, kind, at);
