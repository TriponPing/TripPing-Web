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
