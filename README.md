# TripPing for Business — Insight Portal (Frontend)

여행사·지자체 담당자를 위한 TripPing B2B 대시보드 프론트엔드입니다. React + tRPC(client) + shadcn/ui 기반이며,
백엔드(Express + tRPC + Drizzle/MySQL)는 별도 프로젝트로 분리되어 있습니다.

## 시작하기

```bash
npm install
cp .env.example .env   # VITE_API_URL에 백엔드 주소 입력
npm run dev             # http://localhost:5173 (vite 기본 포트)
```

### `.env` 값 채우기

| 변수 | 설명 |
| --- | --- |
| `VITE_API_URL` | 백엔드 tRPC API의 base URL (예: `https://api.tripping.example.com`). 비워두면 같은 origin의 `/api/trpc`로 요청합니다. |

## 타입 안전성 관련 참고

원래는 `client/src/lib/trpc.ts`에서 백엔드의 `AppRouter` 타입을 직접 import해서 프론트/백엔드 간 완전한 타입 안전성을 가졌지만,
백엔드가 별도 프로젝트로 분리되면서 지금은 `trpc.someRouter.someProcedure` 호출이 타입 체크/자동완성이 되지 않습니다.
나중에 다시 타입 안전성을 원하면:
1. 백엔드의 `AppRouter` 타입만 뽑아서 작은 공유 패키지로 배포하거나,
2. 두 프로젝트를 하나의 모노레포(npm/pnpm workspace)로 묶어서 상대 경로로 다시 import하면 됩니다.

## 스크립트

- `npm run dev` — 개발 서버 (Vite)
- `npm run build` — 프로덕션 빌드 (`dist/`)
- `npm run preview` — 빌드 결과 로컬 미리보기
- `npm run check` — TypeScript 타입 체크