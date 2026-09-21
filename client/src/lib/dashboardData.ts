// 트렌드/대시보드/보고서(InsightController, DashboardController, ReportController) 공용 기간 값.
// 백엔드가 이 한글 문자열을 그대로 쿼리 파라미터/요청 바디로 받고 DateRange.forPeriod()가
// 이 값으로 날짜 구간을 계산하므로, 여기 값을 바꾸면 API가 집계하는 구간도 같이 바뀐다.
//
// 대시보드도 이 값을 그대로 쓴다 — 예전엔 대시보드만 "이번 주/이번 달" 같은 다른 문자열을
// 썼는데, 백엔드가 모르는 값이라 전부 기본값(최근 30일)으로 처리돼서 기간 탭을 눌러도
// 실제로는 같은 구간이 조회되고 있었다.
export const insightPeriods = ["최근 7일", "최근 30일", "최근 1년"] as const;

export type InsightPeriod = (typeof insightPeriods)[number];

// 지역 목록은 여기 고정값으로 두지 않는다 — DB region 테이블은 "서울특별시"가 아니라
// "서울" 같은 짧은 이름을 쓰고, 백엔드 InsightRouteRepository가 region_name과 완전히
// 똑같은 문자열로만 매칭(exact match)하기 때문에 프론트에서 긴 이름을 임의로 만들어 쓰면
// 절대 안 걸려서 항상 0건으로 나온다. 대신 placesApi.regions()(GET /regions)로 실제
// region_name을 그대로 받아와서 드롭다운/필터에 쓴다 (전체 지역은 필터 없음을 뜻하는
// 프론트 전용 센티널 값 — 백엔드 normalizeRegion도 이 문자열을 그렇게 취급함).
export const ALL_REGIONS_LABEL = "전체 지역";
