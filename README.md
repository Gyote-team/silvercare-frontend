# 🩺 SilverCare AI · Frontend

SilverCare의 고령 사용자·보호자용 Next.js 웹 화면입니다. Spring Boot 백엔드 API와 통신하며, OCR·STT·LLM 같은 Python AI 서버 코드는 이 레포에 포함하지 않습니다.

## 🧭 구성

- Next.js 15 / React 19 / TypeScript
- 카카오 로그인과 역할 선택 화면
- 개인·보호자 홈, 연결 관리, 건강기록·문서·타임라인 화면
- 백엔드 API: `http://localhost:8080` (기본값)

## 🚀 실행

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. 백엔드는 별도 터미널에서 먼저 실행해야 합니다.

## 🔗 환경 변수

- `NEXT_PUBLIC_API_BASE`: Spring Boot API 주소입니다. 기본값은 `http://localhost:8080`입니다.
- `NEXT_PUBLIC_`으로 시작하는 값은 브라우저에 노출됩니다. API 키·비밀번호 같은 비밀값은 절대 넣지 않습니다.

## 🧪 확인

```powershell
npm run build
```

## 📦 함께 사용하는 레포

- Backend: https://github.com/Gyote-team/silvercare-backend
- AI 서버: 별도 Python 레포 예정

## 음성 기록

`/records`에서 건강 음성을, `/visits/{visitId}`에서 진료실 녹음을 올리고 변환 초안을 확인·수정·확정할 수 있습니다. 확정 전에는 건강기록에 저장하지 않습니다. 마이크를 사용할 수 없는 브라우저는 음성 파일을 선택할 수 있습니다.

실제 변환에는 백엔드의 음성 마이그레이션과 `VOICE_ENABLED=true`, 같은 DB·저장소를 사용하는 AI 음성 작업자 및 STT 키 설정이 필요합니다. 기본 비활성 환경은 업로드 시 사용 불가 안내를 표시합니다. 브라우저 마이크는 HTTPS 또는 localhost 환경에서 사용합니다.

## 진료 전 요약 (#16)

홈에서 `/previsit`로 이동해 최근 7·14·30일 건강기록을 요약할 수 있습니다. 개인은 본인, 보호자는 ACTIVE 연결된 개인을 선택합니다. 비동기 상태와 요약에 사용한 원본 기록을 함께 표시하며, 계정·대상별 마지막 요청 식별자만 기억해 새로고침 후 다시 조회합니다. 원본이 수정·삭제되거나 연결이 해제되면 기존 결과를 숨기고 재요청을 안내합니다.

Spring에 `V202611031000__previsit_summaries.sql`과 `PREVISIT_ENABLED=true`, AI 서버에 전용 `PREVISIT_SUMMARY_API_KEY` 설정이 필요합니다. 프론트에는 API 키를 넣지 않습니다. 상세 계약은 백엔드 `docs/issues/issue-16-previsit-summary.md`를 따릅니다.

2026-11-04 최신 develop의 채팅·문서 화면을 병합했습니다. 대기 중 원본 변경·권한 해제·요청 소실은 반복 조회를 중단하고 재요청할 수 있게 처리했습니다. sessionStorage가 제한돼도 현재 화면에서 결과를 확인할 수 있습니다. 전체 테스트 22건과 타입 검사·배포 빌드를 통과했습니다.

