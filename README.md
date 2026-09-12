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
