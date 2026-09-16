// 백엔드 통계/상품 API가 준비되기 전까지 화면 확인용으로 쓰는 목업 데이터.
// 실제 연동 시 src/services/api.js 쪽 함수 내부만 교체하면 됨.

export const mockRegions = ['전체', '제주', '부산', '강원', '경주', '여수']
export const mockPeriods = ['최근 1개월', '최근 3개월', '최근 6개월', '최근 1년']

export const mockPopularPlaces = [
  { name: '제주 성산일출봉', visits: 1240 },
  { name: '부산 해운대', visits: 1105 },
  { name: '강릉 안목해변', visits: 980 },
  { name: '경주 대릉원', visits: 860 },
  { name: '여수 밤바다', visits: 790 },
]

export const mockMonthlyTrend = [
  { month: '4월', visits: 320 },
  { month: '5월', visits: 480 },
  { month: '6월', visits: 610 },
  { month: '7월', visits: 890 },
  { month: '8월', visits: 1020 },
  { month: '9월', visits: 940 },
]

export const mockPopularRoutes = [
  { id: 1, name: '제주 동부 1박2일 코스', region: '제주', pings: 312 },
  { id: 2, name: '부산 해변 당일치기', region: '부산', pings: 275 },
  { id: 3, name: '강릉 감성 여행 코스', region: '강원', pings: 210 },
]

// 대시보드 홈 상단 요약 카드용
export const mockTrendSummary = {
  totalVisitors: 12450,
  growthRate: 12.4, // 전월 대비 %
  topRegion: '제주',
  topRoute: '제주 동부 1박2일 코스',
}

// 관광상품 기획 목록
export const mockProducts = [
  {
    id: 1,
    name: '제주 감성 로드트립 3일',
    region: '제주',
    status: '기획중',
    createdAt: '2026-09-01',
    routeCount: 5,
  },
  {
    id: 2,
    name: '부산 해변 당일치기 패키지',
    region: '부산',
    status: '검토중',
    createdAt: '2026-08-20',
    routeCount: 3,
  },
  {
    id: 3,
    name: '강릉 감성여행 2일',
    region: '강원',
    status: '완료',
    createdAt: '2026-08-10',
    routeCount: 4,
  },
]

// 관광상품 상세: AI 추천 루트 기반. 실제로는 TripPing 핑 데이터를 분석해서
// 백엔드가 추천 루트를 내려주는 형태가 될 예정.
export const mockProductDetail = {
  1: {
    id: 1,
    name: '제주 감성 로드트립 3일',
    region: '제주',
    status: '기획중',
    description: 'TripPing 유저들이 많이 방문한 제주 동부 코스를 기반으로 한 3일 여행 상품안',
    createdAt: '2026-09-01',
    recommendedRoute: [
      { order: 1, name: '제주 성산일출봉', lat: 33.4587, lng: 126.9425 },
      { order: 2, name: '우도', lat: 33.5044, lng: 126.9514 },
      { order: 3, name: '섭지코지', lat: 33.4238, lng: 126.9280 },
    ],
  },
  2: {
    id: 2,
    name: '부산 해변 당일치기 패키지',
    region: '부산',
    status: '검토중',
    description: '해운대 중심의 당일치기 코스 상품안',
    createdAt: '2026-08-20',
    recommendedRoute: [
      { order: 1, name: '부산 해운대', lat: 35.1587, lng: 129.1604 },
      { order: 2, name: '광안리해수욕장', lat: 35.1532, lng: 129.1187 },
    ],
  },
  3: {
    id: 3,
    name: '강릉 감성여행 2일',
    region: '강원',
    status: '완료',
    description: '강릉 안목해변 중심의 감성 여행 코스 상품안',
    createdAt: '2026-08-10',
    recommendedRoute: [
      { order: 1, name: '강릉 안목해변', lat: 37.7749, lng: 128.9486 },
      { order: 2, name: '경포호', lat: 37.7955, lng: 128.8971 },
    ],
  },
}

// 조직 설정
export const mockOrgInfo = {
  orgName: '(예시) 한국여행사',
  manager: '홍길동',
  email: 'contact@example.com',
  phone: '02-1234-5678',
}
