# Avatar Money — 내 수당 플래너 (PWA)

회차별 목표금액을 넣으면 예상 수당·타임라인을 보여주는 모바일 웹앱.
회원가입/로그인(휴대폰+비번+이름) · 플랜 DB 저장 · PWA 설치 · 애드센스 · 프레젠테이션 모드.
**60대 어르신도 쓸 수 있게 큰 글씨/큰 버튼**으로 설계.

---

## VS Code에서 실행하는 법 (순서대로)

### 1) 설치
VS Code 터미널에서:
```
npm install
```

### 2) Turso DB 만들기 (한 번만)
Turso CLI 설치 후:
```
turso db create avatar-money
turso db show avatar-money --url        # → TURSO_DATABASE_URL 값
turso db tokens create avatar-money     # → TURSO_AUTH_TOKEN 값
```
그리고 테이블 생성(아래 SQL을 붙여넣기):
```
turso db shell avatar-money < drizzle/0000_init.sql
```
(위 명령이 안 되면, `turso db shell avatar-money` 로 들어가서 `drizzle/0000_init.sql` 내용을 복사해 붙여넣으세요.)

### 3) .env.local 만들기
`.env.local.example` 를 복사해서 **`.env.local`** 파일을 만들고 값을 채웁니다:
```
TURSO_DATABASE_URL=libsql://avatar-money-....turso.io
TURSO_AUTH_TOKEN=eyJ...
SESSION_SECRET=아무_길고_랜덤한_문자열
# 애드센스는 승인 후 입력(없으면 광고 안 나옴)
NEXT_PUBLIC_ADSENSE_CLIENT=
NEXT_PUBLIC_ADSENSE_SLOT=
```
> ⚠️ `.env.local` 은 **절대 깃(GitHub)에 올리지 마세요.** (이미 .gitignore 처리됨)

### 4) 실행
```
npm run dev
```
브라우저에서 http://localhost:3000 → 회원가입 → 플랜 만들기.

### 5) 계산 규칙 테스트(중요)
수당 계산은 `lib/points.ts` 하나가 본체입니다. 정답표 테스트:
```
npm test
```

---

## 배포 (Vercel)
1. GitHub에 새 저장소로 push (`.env.local` 제외 확인).
2. Vercel → New Project → 저장소 import.
3. **Environment Variables** 에 `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `SESSION_SECRET` (+ 애드센스 2개) 입력 → Deploy.
4. 배포 URL을 폰에서 열고 **홈 화면에 추가** → 앱처럼 사용.

---

## 애드센스
- 승인 후 `.env.local`(및 Vercel 환경변수)에 게시자/슬롯 ID 입력.
- 광고는 **플랜 목록·타임라인 하단에만** 나옵니다. 로그인/회원가입/시뮬레이터/프레젠테이션에는 안 나옵니다(어르신 오터치·비전 몰입 보호).
- 애드센스가 주는 `ads.txt` 내용을 `public/ads.txt` 로 저장하세요.

---

## 구조
```
app/
  (auth)/login, (auth)/signup      로그인·회원가입
  (app)/plans                      플랜 목록(홈)
  (app)/plans/[id]                 시뮬레이터(회차별 목표금액 입력)
  (app)/timeline                   회차별 수당 타임라인
  (app)/me                         내정보·로그아웃
  present                          프레젠테이션(전체화면, 광고 없음)
  api/auth/*, api/plans/*          인증·플랜 API
lib/
  points.ts                        ★ 수당 계산 엔진(정답표 = points.test.ts)
  db/                              Turso + Drizzle
  auth/                            비번 해시 + 세션
components/                        화면별 클라이언트 컴포넌트
public/sw.js, app/manifest.ts      PWA
```

## 보안
- 비밀번호 bcrypt 해시 저장, 세션 쿠키 HttpOnly.
- 서버에서 세션 userId로 **본인 플랜만** 조회/수정(IDOR 방지).
- `TURSO_AUTH_TOKEN`/`SESSION_SECRET` 은 클라이언트 노출 금지(`NEXT_PUBLIC_` 접두어 금지).
