export const dashboardPeriods = ["이번 주", "이번 달", "최근 1년"] as const;

export type DashboardPeriod = (typeof dashboardPeriods)[number];

export function totalForPeriod(period: DashboardPeriod) {
  if (period === "이번 주") return "8,612";
  if (period === "최근 1년") return "128,404";
  return "24,820";
}

export function buildReportText(period: DashboardPeriod, region: string) {
  return [
    "Trip Ping Insight Report",
    `기간: ${period}`,
    `지역: ${region}`,
    "",
    `방문 핑: ${totalForPeriod(period)}`,
    "인기 루트: 성산일출봉 → 섭지코지 → 우도",
    "급상승 루트: 제주 동부 해안 루트 (+24.8%)",
  ].join("\n");
}

// 트렌드/보고서(InsightController, ReportController) 전용 기간 값.
// 백엔드가 이 한글 문자열을 그대로 쿼리 파라미터/요청 바디로 받으므로
// 여기 값을 바꾸면 API 호출값도 같이 바뀐다 — 위 dashboardPeriods(대시보드용)와는 별개.
export const insightPeriods = ["최근 7일", "최근 30일", "최근 1년"] as const;

export type InsightPeriod = (typeof insightPeriods)[number];

// 지역 목록은 여기 고정값으로 두지 않는다 — DB region 테이블은 "서울특별시"가 아니라
// "서울" 같은 짧은 이름을 쓰고, 백엔드 InsightRouteRepository가 region_name과 완전히
// 똑같은 문자열로만 매칭(exact match)하기 때문에 프론트에서 긴 이름을 임의로 만들어 쓰면
// 절대 안 걸려서 항상 0건으로 나온다. 대신 placesApi.regions()(GET /regions)로 실제
// region_name을 그대로 받아와서 드롭다운/필터에 쓴다 (전체 지역은 필터 없음을 뜻하는
// 프론트 전용 센티널 값 — 백엔드 InsightService.normalizeRegion도 이 문자열을 그렇게 취급함).
export const ALL_REGIONS_LABEL = "전체 지역";
