import { ArrowDownRight, ArrowUpRight, Download, Filter, MapPin, Route, TrendingUp, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import PortalChrome from "@/components/PortalChrome";
import DateRangePicker from "@/components/DateRangePicker";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { insightApi, placesApi, type DailyVisit, type RegionalVisitor } from "@/lib/api";
import { ALL_REGIONS_LABEL, insightPeriods, type InsightPeriod } from "@/lib/dashboardData";

// "2026-08-01" -> "8/1"
function formatMonthDay(isoDate: string) {
  const [, month, day] = isoDate.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function toIsoDate(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function fmtDot(date: Date) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

// 큰 숫자를 "92만명" 같은 형태로 축약 (KPI 보조 정보, Y축 눈금용).
function formatManUnit(value: number) {
  if (value >= 10000) return `${Math.round(value / 10000).toLocaleString()}만`;
  return value.toLocaleString();
}

// 기간 pill(최근 7일/30일/1년)을 누르면 그에 맞는 날짜 범위를 계산해서 달력에도 반영한다.
function rangeForPeriod(period: InsightPeriod, end: Date): DateRange {
  const start = new Date(end);
  if (period === "최근 7일") start.setDate(end.getDate() - 6);
  else if (period === "최근 1년") start.setFullYear(end.getFullYear() - 1, end.getMonth(), end.getDate() + 1);
  else start.setDate(end.getDate() - 29);
  return { from: start, to: end };
}

// 차트 한 점. 막대(자체 방문 핑)와 선(관광공사 지역 이동량, 실측/추정 두 시리즈로 분리)을
// 같은 date 기준으로 병합한 것. 두 API 응답 모두 요청 구간의 모든 날짜를 빠짐없이 포함해서
// 오므로 date로 zip하면 된다.
type ChartPoint = {
  date: string;
  visitCount: number;
  totalVisitors: number | null;
  isEstimated: boolean | null;
  actualVisitors: number | null;
  estimatedVisitors: number | null;
};

function buildChartData(daily: DailyVisit[], regional: RegionalVisitor[]): ChartPoint[] {
  const visitByDate: Record<string, number> = {};
  daily.forEach((d) => {
    visitByDate[d.date] = d.visitCount;
  });
  const regionalByDate: Record<string, RegionalVisitor> = {};
  regional.forEach((d) => {
    regionalByDate[d.date] = d;
  });

  // 두 API 날짜의 합집합. 자체 방문 핑이 아직 하나도 없는 지역이라 daily가 비어 있거나
  // 구간이 어긋나도 관광공사 이동량 선은 그대로 그려져야 하기 때문에 합집합으로 돈다.
  // (Set/Map 이터레이터 전개는 tsconfig target 때문에 쓸 수 없어 객체로 중복 제거한다.)
  const seen: Record<string, true> = {};
  const allDates: string[] = [];
  daily.forEach((d) => {
    if (!seen[d.date]) {
      seen[d.date] = true;
      allDates.push(d.date);
    }
  });
  regional.forEach((d) => {
    if (!seen[d.date]) {
      seen[d.date] = true;
      allDates.push(d.date);
    }
  });
  allDates.sort();

  const points: ChartPoint[] = allDates.map((date) => {
    const r = regionalByDate[date];
    return {
      date,
      visitCount: visitByDate[date] ?? 0,
      totalVisitors: r ? r.totalVisitors : null,
      isEstimated: r ? r.isEstimated : null,
      actualVisitors: null,
      estimatedVisitors: null,
    };
  });

  points.forEach((point, i) => {
    if (point.totalVisitors === null) return;
    if (point.isEstimated) point.estimatedVisitors = point.totalVisitors;
    else point.actualVisitors = point.totalVisitors;

    // 경계 날짜: 직전 포인트와 실측/추정 여부가 다르면, 두 선(실선/점선)이 이 지점에서
    // 맞닿아 보이도록 이번 포인트에 두 시리즈 값을 모두 겹쳐서 채워준다.
    const prev = points[i - 1];
    if (prev && prev.totalVisitors !== null && prev.isEstimated !== point.isEstimated) {
      if (point.isEstimated) point.actualVisitors = point.totalVisitors;
      else point.estimatedVisitors = point.totalVisitors;
    }
  });

  return points;
}

function TrendChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const dailyPoint = payload.find((p) => p.dataKey === "visitCount");
  const regionalPoint = payload.find(
    (p) => (p.dataKey === "actualVisitors" || p.dataKey === "estimatedVisitors") && typeof p.value === "number"
  );

  return (
    <div className="trend-tooltip">
      <b>{label}</b>
      <div>
        <span>Trip Ping 방문 핑</span>
        <strong>{(Number(dailyPoint?.value) || 0).toLocaleString()}건</strong>
      </div>
      {regionalPoint && (
        <div>
          <span>지역 이동량</span>
          <strong>
            {Number(regionalPoint.value).toLocaleString()}명
            {regionalPoint.dataKey === "estimatedVisitors" ? " (추정)" : ""}
          </strong>
        </div>
      )}
    </div>
  );
}

export default function Trends() {
  const todayDate = new Date();
  const [period, setPeriod] = useState<InsightPeriod>("최근 30일");
  const [region, setRegion] = useState<string>(ALL_REGIONS_LABEL);
  const [range, setRange] = useState<DateRange>(() => rangeForPeriod("최근 30일", todayDate));

  const startDate = range.from ? toIsoDate(range.from) : undefined;
  const endDate = range.to ? toIsoDate(range.to) : startDate;

  function selectPeriod(item: InsightPeriod) {
    setPeriod(item);
    setRange(rangeForPeriod(item, todayDate));
  }

  const regionsQuery = useQuery({
    queryKey: ["regions"],
    queryFn: () => placesApi.regions().then((res) => res.data),
  });

  const summaryQuery = useQuery({
    queryKey: ["insight", "trends-summary", region, startDate, endDate],
    queryFn: () => insightApi.trendsSummary(period, region, endDate, startDate).then((res) => res.data),
  });

  const routesQuery = useQuery({
    queryKey: ["insight", "trends-routes", region, startDate, endDate],
    queryFn: () => insightApi.risingRoutes(period, region, endDate, startDate).then((res) => res.data),
  });

  const dailyQuery = useQuery({
    queryKey: ["insight", "trends-daily", period, region],
    queryFn: () => insightApi.dailyVisits(period, region).then((res) => res.data),
  });

  const regionalQuery = useQuery({
    queryKey: ["insight", "trends-regional-visitors", period, region],
    queryFn: () => insightApi.regionalVisitors(period, region).then((res) => res.data),
  });

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "summary", region, startDate, endDate],
    queryFn: () => insightApi.dashboardSummary(period, region, endDate, startDate).then((res) => res.data),
  });

  const dash = dashboardQuery.data;

  const totalVisits = summaryQuery.data ? summaryQuery.data.totalVisits.toLocaleString() : "—";
  const changeRate = summaryQuery.data ? summaryQuery.data.changeRate : null;
  const routeTones = ["blue", "mint", "orange"] as const;
  const topRoute = routesQuery.data?.[0];

  const dailyData = dailyQuery.data ?? [];
  const regionalData = regionalQuery.data ?? [];
  // "전체 지역"이거나 관광공사 지역코드 매핑이 없는 지역이면 백엔드가 빈 배열을 준다 —
  // 이때만 선을 숨기고 기존처럼 막대만 보여준다.
  const hasRegionalSeries = regionalData.length > 0;
  const regionalTotal = regionalData.reduce((sum, d) => sum + d.totalVisitors, 0);

  const chartData = useMemo(() => buildChartData(dailyData, regionalData), [dailyData, regionalData]);

  const labelIndexes =
    chartData.length <= 7
      ? chartData.map((_, i) => i)
      : Array.from(
          new Set([
            0,
            Math.round((chartData.length - 1) * 0.25),
            Math.round((chartData.length - 1) * 0.5),
            Math.round((chartData.length - 1) * 0.75),
            chartData.length - 1,
          ])
        );
  const xAxisTicks = labelIndexes.map((i) => chartData[i]?.date).filter((d): d is string => Boolean(d));

  function csvField(value: string | number) {
    const s = String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function csvRow(...cells: (string | number)[]) {
    return cells.map(csvField).join(",");
  }

  function exportCsv() {
    if (!summaryQuery.data || !routesQuery.data) {
      toast.error("데이터를 아직 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    const now = new Date();
    const generatedAt = `${fmtDot(now)} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const changeRate = summaryQuery.data.changeRate;
    const routes = routesQuery.data;

    const lines = [
      csvRow("Trip Ping 트렌드 분석 리포트"),
      "",
      csvRow("생성일시", generatedAt),
      csvRow("조회 지역", region),
      csvRow("조회 기간", period),
      csvRow("선택 구간", `${range.from ? fmtDot(range.from) : ""} ~ ${range.to ? fmtDot(range.to) : ""}`),
      "",
      csvRow("[ 요약 지표 ]"),
      csvRow("항목", "값"),
      csvRow("총 방문 핑", `${summaryQuery.data.totalVisits.toLocaleString()}건`),
      csvRow("이전 기간 대비 증감률", `${changeRate >= 0 ? "+" : ""}${changeRate.toFixed(1)}%`),
      csvRow("급상승 루트 수", `${routes.length}개`),
      "",
      csvRow(`[ 급상승 루트 랭킹 ]`),
      csvRow("순위", "루트", "방문 수", "증감률"),
    ];

    if (routes.length === 0) {
      lines.push(csvRow("-", "선택한 기간·지역에 급상승 루트가 없습니다.", "-", "-"));
    } else {
      routes.forEach((row, i) => {
        lines.push(csvRow(`${i + 1}위`, row.routeName, `${row.visitCount.toLocaleString()}건`, `${row.changeRate >= 0 ? "+" : ""}${row.changeRate.toFixed(1)}%`));
      });
    }

    lines.push("", csvRow("Trip Ping B2B 포털에서 자동 생성된 리포트입니다."));

    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `trip-ping-trends-${startDate}_${endDate}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("트렌드 분석 리포트를 다운로드했습니다.");
  }

  return (
    <PortalChrome title="트렌드 분석" eyebrow="TOURISM TREND INTELLIGENCE">
      <div className="trend-toolbar">
        <div className="period-pills">
          {insightPeriods.map((item) => {
            const matches = range.to && toIsoDate(range.to) === toIsoDate(todayDate) && startDate === toIsoDate(rangeForPeriod(item, todayDate).from!);
            return (
              <button key={item} className={matches ? "selected" : ""} onClick={() => selectPeriod(item)}>
                {item}
              </button>
            );
          })}
        </div>
        <div className="trend-filters">
          <label>
            <Filter size={14} />
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              <option>{ALL_REGIONS_LABEL}</option>
              {regionsQuery.data?.map((item) => (
                <option key={item.regionId} value={item.regionName}>
                  {item.regionName}
                </option>
              ))}
            </select>
          </label>
          <DateRangePicker value={range} onChange={setRange} maxDate={todayDate} />
          <button onClick={exportCsv}>
            <Download size={14} />
            내보내기
          </button>
        </div>
      </div>

      <div className="trend-kpi-grid">
        <div className="trend-kpi">
          <span>
            <MapPin size={16} />총 방문 핑
          </span>
          <b>{totalVisits}</b>
          <small>
            {changeRate !== null && (changeRate >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />)}
            {changeRate !== null ? `${Math.abs(changeRate).toFixed(1)}% 이전 기간 대비` : "불러오는 중..."}
          </small>
          {summaryQuery.data?.totalVisits === 0 && hasRegionalSeries && regionalTotal > 0 && (
            <small className="trend-kpi-sub">지역 전체 이동량 {formatManUnit(regionalTotal)}명 (관광공사)</small>
          )}
        </div>
        <div className="trend-kpi">
          <span>
            <TrendingUp size={16} />급상승 루트
          </span>
          <b>{routesQuery.data ? routesQuery.data.length : "—"}</b>
          <small>
            <ArrowUpRight size={13} />
            선택 기간 내 랭킹 진입 루트
          </small>
        </div>
        <div className="trend-kpi">
          <span>
            <Route size={16} />여행당 평균 방문지
          </span>
          <b>{dash ? `${dash.avgSpotsPerRoute.toFixed(1)}곳` : "—"}</b>
          <small>
            {dash && (dash.avgSpotsChangeRate >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />)}
            {dash ? `${Math.abs(dash.avgSpotsChangeRate).toFixed(1)}% 이전 기간 대비` : "불러오는 중..."}
          </small>
        </div>
        <div className="trend-kpi">
          <span>
            <Users size={16} />활성 여행객
          </span>
          <b>{dash ? dash.activeTravelers.toLocaleString() : "—"}</b>
          <small>
            {dash && (dash.travelerChangeRate >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />)}
            {dash ? `${Math.abs(dash.travelerChangeRate).toFixed(1)}% 이전 기간 대비` : "불러오는 중..."}
          </small>
        </div>
      </div>

      <div className="trend-layout">
        <section className="portal-panel large">
          <div className="panel-title">
            <div>
              <span>ROUTE MOMENTUM</span>
              <h2>방문 추이</h2>
            </div>
            <span className="panel-note">막대: 방문 핑(건) · 선: 이동량(명)</span>
          </div>
          <div className="large-chart">
            <ChartContainer config={{}} className="aspect-auto h-full w-full">
              <ComposedChart data={chartData} margin={{ top: 6, right: hasRegionalSeries ? 4 : 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e6edef" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  ticks={xAxisTicks}
                  tickFormatter={formatMonthDay}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 9, fill: "#a9b5ba" }}
                />
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  tick={{ fontSize: 9, fill: "#a9b5ba" }}
                  allowDecimals={false}
                />
                {hasRegionalSeries && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    width={34}
                    tick={{ fontSize: 9, fill: "#a9b5ba" }}
                    tickFormatter={formatManUnit}
                  />
                )}
                <ChartTooltip content={<TrendChartTooltip />} />
                <Bar
                  yAxisId="left"
                  dataKey="visitCount"
                  name="Trip Ping 방문 핑"
                  fill="#5db4e9"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={18}
                />
                {/* Recharts는 자식 중 Bar/Line 같은 "아는 타입"만 골라내는데, 프래그먼트(<>)로
                    감싸면 그 안을 들여다보지 않고 통째로 무시한다. 그래서 두 Line은 반드시
                    ComposedChart의 직계 자식이어야 한다. 묶지 말 것. */}
                {hasRegionalSeries && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="actualVisitors"
                    name="지역 이동량 (관광공사 통계)"
                    stroke="#5b6b74"
                    strokeWidth={1.75}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                )}
                {hasRegionalSeries && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="estimatedVisitors"
                    name="지역 이동량 (추정)"
                    stroke="#5b6b74"
                    strokeWidth={1.75}
                    strokeDasharray="5 4"
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                    legendType="none"
                  />
                )}
              </ComposedChart>
            </ChartContainer>
          </div>
          <div className="chart-legend">
            <span>
              <i className="blue-dot" />
              Trip Ping 방문 핑
            </span>
            {hasRegionalSeries && (
              <span>
                <i className="line-dot" />
                지역 이동량 (관광공사 통계)
              </span>
            )}
          </div>
          {hasRegionalSeries && (
            <p className="chart-footnote">
              지역 이동량은 한국관광공사 통계 기준이며, 최근 구간은 작년 동기 데이터로 추정한 값입니다.
            </p>
          )}
        </section>
        <section className="portal-panel insight-panel">
          <div className="panel-title">
            <div>
              <span>LIVE INSIGHT</span>
              <h2>지금 주목할 변화</h2>
            </div>
          </div>
          <div className="insight-highlight">
            <div>
              <TrendingUp size={19} />
            </div>
            <b>{topRoute?.routeName ?? "데이터 없음"}</b>
            <span>선택 기간 방문량</span>
            <strong>{topRoute ? `${topRoute.changeRate >= 0 ? "+" : ""}${topRoute.changeRate.toFixed(1)}%` : "—"}</strong>
          </div>
          {topRoute ? (
            <p>
              {topRoute.routeName} 루트 방문이 이전 기간 대비 {topRoute.changeRate >= 0 ? "+" : ""}
              {topRoute.changeRate.toFixed(1)}% {topRoute.changeRate >= 0 ? "늘고" : "줄고"} 있어요. 관련 상품 구성을 검토해보세요.
            </p>
          ) : (
            <p className="insight-empty">아직 이 지역·기간에는 주목할 만한 변화 데이터가 없어요.</p>
          )}
          {topRoute && (
            <button onClick={() => toast.success("상품 기획 초안을 만들 준비가 되었습니다.")}>
              이 루트로 상품 초안 만들기 <ArrowUpRight size={15} />
            </button>
          )}
        </section>
      </div>

      <section className="portal-panel trend-table-panel">
        <div className="panel-title">
          <div>
            <span>RISING ROUTES</span>
            <h2>급상승 루트</h2>
          </div>
          <button onClick={() => toast.info("전체 급상승 루트 화면을 준비 중입니다.")}>
            전체 보기 <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="trend-table">
          {routesQuery.isLoading && <p className="trend-table-empty">불러오는 중...</p>}
          {routesQuery.isError && <p className="trend-table-empty">급상승 루트를 불러오지 못했습니다.</p>}
          {routesQuery.data?.length === 0 && (
            <p className="trend-table-empty">
              아직 이 지역에 Trip Ping 데이터가 쌓이지 않았어요.
              <br />
              위 차트의 지역 이동량 추세를 참고해 주세요.
            </p>
          )}
          {routesQuery.data?.map((row, i) => (
            <div className="trend-row" key={row.routeName}>
              <span className="trend-rank">0{i + 1}</span>
              <span className={`trend-route-dot ${routeTones[i % routeTones.length]}`} />
              <div>
                <b>{row.routeName}</b>
              </div>
              <strong>
                {row.visitCount.toLocaleString()}
                <small>방문</small>
              </strong>
              <em>
                {row.changeRate >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                {row.changeRate >= 0 ? "+" : ""}
                {row.changeRate.toFixed(1)}%
              </em>
            </div>
          ))}
        </div>
      </section>
    </PortalChrome>
  );
}
