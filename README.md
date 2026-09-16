# TripPing for Business

TripPing 앱에서 수집된 여행 데이터를 여행사/지자체에게 보여주는 B2B 대시보드 웹페이지.

## 시작하기

```
npm install
npm run dev
```

## 페이지 구조

| 경로 | 화면 | 목적 | 필요 데이터 |
|---|---|---|---|
| `/login` | B2B 로그인 | 여행사/지자체 계정 로그인 | 인증 API |
| `/` | 대시보드 홈 | 최근 트렌드 요약 카드 + 주요 지표 | 트렌드 요약 API |
| `/trends` | 트렌드 분석 | 지역/기간 필터 + 차트 | 트렌드 상세 API |
| `/products` | 관광상품 기획 목록 | 기획한 상품 리스트 | 상품 목록 API |
| `/products/:id` | 관광상품 상세/편집 | AI 추천 루트 기반 상품 편집 | 상품 상세 API |
| `/settings` | 조직 설정 | 계정/조직 정보 관리 | 조직 정보 API |

## 폴더 구조

```
src/
  components/   Layout, Sidebar, Header 등 공통 UI
  pages/        위 표의 6개 화면
  services/     백엔드 API 연동 (지금은 목업 데이터 사용 중, api.js의 USE_MOCK 참고)
  mock/         실제 API 나오기 전까지 쓰는 목업 데이터
  styles/       전역 스타일
```

## 다음에 할 일

- TripPing-Backend에 B2B용 API 추가: 인증, 트렌드 요약/상세, 상품 목록/상세/수정, 조직 정보
- `src/services/api.js`의 `USE_MOCK`을 `false`로 바꾸고 실제 엔드포인트 연결
- `Layout.jsx`에 로그인 가드 추가 (미로그인 시 `/login`으로 리다이렉트)
- `ProductDetail.jsx`의 AI 추천 루트에 카카오맵/네이버 지도 JS SDK 연동
- 여행사 계정 회원가입/권한 관리 플로우
