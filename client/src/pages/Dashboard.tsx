import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Layers3,
  Loader2,
  Map as MapIcon,
  MapPin,
  MoreHorizontal,
  RefreshCw,
  Route,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { toast } from "sonner";
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
import RouteNetworkMap from "@/components/RouteNetworkMap";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  authApi,
  insightApi,
  placesApi,
  type DailyVisit,
  type RegionalVisitor,
  type RouteNetwork,
} from "@/lib/api";
import { ALL_REGIONS_LABEL, insightPeriods, type InsightPeriod } from "@/lib/dashboardData";
import { createDraftFromRoute } from "@/lib/productDraft";

// 지역별 인기 행의 점 색상. 순위 순서대로 돌려쓴다(데이터가 아니라 표현용).
const REGION_TONES = ["#9ee36f", "#69d6c0", "#7fb7ff", "#f6bd68", "#c9a7f5"];

// "2026-08-01" -> "8/1"
function formatMonthDay(isoDate: string) {
  const [, month, day] = isoDate.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function fmtDot(date: Date) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function toIsoDate(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

// 큰 숫자를 "92만" 같은 형태로 축약.
function formatManUnit(value: number) {
  if (value >= 10000) return `${Math.round(value / 10000).toLocaleString()}만`;
  return value.toLocaleString();
}

function signed(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

// 기간 pill을 실제 날짜 구간으로. 백엔드 DateRange.forPeriod()와 같은 규칙이라
// 화면에 표시되는 구간과 서버가 집계하는 구간이 항상 일치한다.
function rangeForPeriod(period: InsightPeriod, end: Date) {
  const start = new Date(end);
  if (period === "최근 7일") start.setDate(end.getDate() - 6);
  else if (period === "최근 1년") start.setFullYear(end.getFullYear() - 1, end.getMonth(), end.getDate() + 1);
  else start.setDate(end.getDate() - 29);
  return { from: start, to: end };
}

type ChartPoint = {
  date: string;
  visitCount: number;
  totalVisitors: number | null;
  isEstimated: boolean | null;
  actualVisitors: number | null;
  estimatedVisitors: number | null;
};

// 트렌드 화면과 같은 병합 규칙 — 두 API 날짜의 합집합으로 돌려서, 자체 방문 핑이
// 없는 지역이어도 관광공사 이동량 선은 그대로 그려지게 한다.
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

    // 경계 날짜에서 실선/점선이 맞닿아 보이도록 두 시리즈 값을 한 점 겹쳐준다.
    const prev = points[i - 1];
    if (prev && prev.totalVisitors !== null && prev.isEstimated !== point.isEstimated) {
      if (point.isEstimated) point.actualVisitors = point.totalVisitors;
      else point.estimatedVisitors = point.totalVisitors;
    }
  });

  return points;
}

function DashboardTooltip({ active, payload, label }: TooltipProps<number, string>) {
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

function MetricCard({
  icon,
  label,
  value,
  change,
  note,
  accent,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: number | null;
  note: string;
  accent: string;
  sub?: string;
}) {
  return (
    <div className="metric-card" style={{ "--metric-accent": accent } as React.CSSProperties}>
      <div className="metric-top">
        <span className="metric-icon">{icon}</span>
        <span className="metric-label">{label}</span>
        <MoreHorizontal size={17} className="muted" />
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-bottom">
        {change !== null ? (
          <span className="change">
            {change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(change).toFixed(1)}%
          </span>
        ) : (
          <span className="change">—</span>
        )}
        <span>{sub ?? note}</span>
      </div>
    </div>
  );
}

// 실제 방문 기록의 위경도를 지도 박스 안의 % 좌표로 투영한다.
// 노드가 하나뿐이거나 모두 같은 자리면 범위가 0이 되므로 가운데로 보낸다.
function projectNodes(nodes: RouteNetwork["nodes"]) {
  if (nodes.length === 0) return [];
  const lats = nodes.map((n) => n.latitude);
  const lngs = nodes.map((n) => n.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;
  const maxVisits = Math.max(...nodes.map((n) => n.visitCount), 1);

  return nodes.map((node) => ({
    ...node,
    // 위도가 클수록 북쪽이라 위로 가야 해서 뒤집는다.
    top: latSpan === 0 ? 50 : 88 - ((node.latitude - minLat) / latSpan) * 76,
    left: lngSpan === 0 ? 50 : 8 + ((node.longitude - minLng) / lngSpan) * 76,
    weightRatio: node.visitCount / maxVisits,
  }));
}

function RouteMap({ network, isLoading }: { network: RouteNetwork | undefined; isLoading: boolean }) {
  const placed = useMemo(() => projectNodes(network?.nodes ?? []), [network]);
  const positionById = useMemo(() => {
    const byId: Record<number, (typeof placed)[number]> = {};
    placed.forEach((n) => {
      byId[n.spotId] = n;
    });
    return byId;
  }, [placed]);
  const maxEdgeWeight = Math.max(...(network?.edges ?? []).map((e) => e.weight), 1);

  if (isLoading) {
    return (
      <div className="route-map">
        <div className="map-grid" />
        <p className="map-empty">
          <Loader2 size={18} className="spin" />
          <br />
          이동 경로를 불러오는 중이에요
        </p>
      </div>
    );
  }

  if (placed.length === 0) {
    return (
      <div className="route-map">
        <div className="map-grid" />
        <p className="map-empty">
          아직 이 기간·지역에 기록된 이동 경로가 없어요.
          <br />
          여행객이 관광지에 핑을 남기면 실제 이동 흐름이 여기에 그려집니다.
        </p>
      </div>
    );
  }

  return (
    <div className="route-map" aria-label="관광지 이동 흐름 지도">
      <div className="map-grid" />
      <svg className="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
        {(network?.edges ?? []).map((edge) => {
          const from = positionById[edge.fromSpotId];
          const to = positionById[edge.toSpotId];
          if (!from || !to) return null;
          return (
            <line
              key={`${edge.fromSpotId}-${edge.toSpotId}`}
              x1={from.left}
              y1={from.top}
              x2={to.left}
              y2={to.top}
              stroke="#5db4e9"
              strokeOpacity={0.25 + (edge.weight / maxEdgeWeight) * 0.5}
              strokeWidth={0.4 + (edge.weight / maxEdgeWeight) * 1.1}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      {placed.map((node) => (
        <div
          className="map-node"
          key={node.spotId}
          style={{ left: `${node.left}%`, top: `${node.top}%` }}
          title={`${node.name} · 방문 핑 ${node.visitCount.toLocaleString()}건`}
        >
          <span>{node.name}</span>
          <b>{node.visitCount.toLocaleString()}</b>
        </div>
      ))}
      <div className="map-control"><Layers3 size={15} /> 관광지 {placed.length}곳</div>
      <div className="map-legend">
        <span><i className="legend-dot blue" /> 실제 이동 경로</span>
        <span>선이 굵을수록 자주 이어진 구간</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const todayDate = new Date();
  const [period, setPeriod] = useState<InsightPeriod>("최근 30일");
  const [filterOpen, setFilterOpen] = useState(false);
  const [region, setRegion] = useState(ALL_REGIONS_LABEL);
  const [reportReady, setReportReady] = useState(false);
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const range = useMemo(() => rangeForPeriod(period, todayDate), [period, todayDate.getTime()]);

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.me().then((res) => res.data),
  });

  const regionsQuery = useQuery({
    queryKey: ["regions"],
    queryFn: () => placesApi.regions().then((res) => res.data),
  });

  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary", period, region],
    queryFn: () => insightApi.dashboardSummary(period, region).then((res) => res.data),
  });

  const dailyQuery = useQuery({
    queryKey: ["insight", "trends-daily", period, region],
    queryFn: () => insightApi.dailyVisits(period, region).then((res) => res.data),
  });

  const regionalQuery = useQuery({
    queryKey: ["insight", "trends-regional-visitors", period, region],
    queryFn: () => insightApi.regionalVisitors(period, region).then((res) => res.data),
  });

  const regionRankQuery = useQuery({
    queryKey: ["dashboard", "regions", period],
    queryFn: () => insightApi.dashboardRegions(period).then((res) => res.data),
  });

  const routesQuery = useQuery({
    queryKey: ["insight", "trends-routes", region, period],
    queryFn: () => insightApi.risingRoutes(period, region).then((res) => res.data),
  });

  const networkQuery = useQuery({
    queryKey: ["dashboard", "network", period, region],
    queryFn: () => insightApi.dashboardNetwork(period, region).then((res) => res.data),
  });

  const summary = summaryQuery.data;
  const dailyData = dailyQuery.data ?? [];
  const regionalData = regionalQuery.data ?? [];
  const hasRegionalSeries = regionalData.length > 0;
  const chartData = useMemo(() => buildChartData(dailyData, regionalData), [dailyData, regionalData]);

  // 관광공사 API는 최초 조회 시 1년치를 페이지네이션으로 받아와 몇 초 걸린다.
  const isChartLoading = dailyQuery.isLoading || regionalQuery.isLoading;

  // 발견한 루트를 그대로 상품 초안으로 옮기고 상세 화면으로 보낸다.
  const [creatingDraft, setCreatingDraft] = useState(false);

  async function createDraft() {
    if (!topRoute || creatingDraft) return;
    setCreatingDraft(true);
    try {
      // 백엔드는 지역을 regionId로 받는데 화면은 regionName으로 고르므로 여기서 맞춰준다.
      const regionId = regionsQuery.data?.find((r) => r.regionName === region)?.regionId;
      const productId = await createDraftFromRoute(topRoute, regionId);
      toast.success("상품 초안을 만들었어요.");
      navigate(`/products/${productId}`);
    } catch {
      toast.error("상품 초안을 만들지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setCreatingDraft(false);
    }
  }
  const topRoute = routesQuery.data?.[0];
  const regionRanks = regionRankQuery.data ?? [];

  const managerName = meQuery.data && meQuery.data.type === "org" ? meQuery.data.managerName : null;

  const xAxisTicks = useMemo(() => {
    if (chartData.length === 0) return [];
    const indexes =
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
    return indexes.map((i) => chartData[i]?.date).filter((d): d is string => Boolean(d));
  }, [chartData]);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["insight"] });
    toast.success("데이터를 다시 불러왔습니다.");
  }

  function downloadReport() {
    if (!summary) {
      toast.error("데이터를 아직 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    const lines = [
      "Trip Ping Insight Report",
      `생성일시: ${fmtDot(new Date())}`,
      `기간: ${period} (${fmtDot(range.from)} ~ ${fmtDot(range.to)})`,
      `지역: ${region}`,
      "",
      "[ 요약 지표 ]",
      `총 방문 핑: ${summary.totalVisits.toLocaleString()}건 (${signed(summary.changeRate)})`,
      `활성 여행객: ${summary.activeTravelers.toLocaleString()}명 (${signed(summary.travelerChangeRate)})`,
      `기록된 루트: ${summary.routeCount.toLocaleString()}건 (${signed(summary.routeChangeRate)})`,
      `여행당 평균 방문 관광지: ${summary.avgSpotsPerRoute.toFixed(1)}곳`,
      summary.averageRating === null
        ? "평균 만족도: 평점 기록 없음"
        : `평균 만족도: ${summary.averageRating.toFixed(2)} (평점 ${summary.ratingCount.toLocaleString()}건)`,
      "",
      "[ 지역별 인기 · 관광공사 방문자수 기준 ]",
      ...(regionRanks.length === 0
        ? ["데이터 없음"]
        : regionRanks
            .slice(0, 10)
            .map(
              (r, i) =>
                `${i + 1}위 ${r.regionName} · 지역 이동량 ${r.regionVisitors === null ? "—" : `${r.regionVisitors.toLocaleString()}명`} · 자체 방문 핑 ${r.visitPings.toLocaleString()}건`
            )),
      "",
      "[ 인기 관광지 조합 ]",
      ...(routesQuery.data && routesQuery.data.length > 0
        ? routesQuery.data
            .slice(0, 5)
            .map((r, i) => `${i + 1}위 ${r.routeName} · ${r.visitCount.toLocaleString()}회 (${signed(r.changeRate)})`)
        : ["아직 이 기간·지역에 기록된 루트 조합이 없습니다."]),
      "",
      "총 방문 핑은 여행 기록에 남은 관광지 체크인 건수이며,",
      "지역 이동량은 한국관광공사 DataLab 기준 통계입니다.",
    ];
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `trip-ping-report-${toIsoDate(range.from)}_${toIsoDate(range.to)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setReportReady(true);
    toast.success("분석 리포트를 다운로드했습니다.");
  }

  return (
    <PortalChrome title="대시보드" eyebrow="LIVE TOURISM INTELLIGENCE">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><Activity size={14} />LIVE TOURISM INTELLIGENCE</div>
          <h1>안녕하세요{managerName ? `, ${managerName}님` : ""} <span>👋</span></h1>
          <p>실제 여행객의 움직임에서 다음 관광 기회를 발견하세요.</p>
        </div>
        <div className="heading-actions">
          <button className="ghost-button" onClick={refresh}><RefreshCw size={16} />새로고침</button>
          <button className="primary-button" onClick={downloadReport}><Download size={16} />리포트 다운로드</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="period-tabs">
          {insightPeriods.map((item) => (
            <button key={item} className={period === item ? "selected" : ""} onClick={() => setPeriod(item)}>
              {item}
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <div className="filter-wrap">
            <button className="filter-button" onClick={() => setFilterOpen(!filterOpen)}>
              <Filter size={15} />{region}<ChevronDown size={14} />
            </button>
            {filterOpen && (
              <div className="filter-menu">
                <button onClick={() => { setRegion(ALL_REGIONS_LABEL); setFilterOpen(false); }}>{ALL_REGIONS_LABEL}</button>
                {regionsQuery.data?.map((item) => (
                  <button key={item.regionId} onClick={() => { setRegion(item.regionName); setFilterOpen(false); }}>
                    {item.regionName}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="date-button"><CalendarDays size={15} />{fmtDot(range.from)} — {fmtDot(range.to)}</button>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard
          icon={<MapPin size={17} />}
          label="총 방문 핑"
          value={summary ? summary.totalVisits.toLocaleString() : "—"}
          change={summary ? summary.changeRate : null}
          note="이전 기간 대비"
          accent="#9ee36f"
        />
        <MetricCard
          icon={<Users size={17} />}
          label="활성 여행객"
          value={summary ? summary.activeTravelers.toLocaleString() : "—"}
          change={summary ? summary.travelerChangeRate : null}
          note="이전 기간 대비"
          accent="#69d6c0"
        />
        <MetricCard
          icon={<Route size={17} />}
          label="기록된 루트"
          value={summary ? summary.routeCount.toLocaleString() : "—"}
          change={summary ? summary.routeChangeRate : null}
          note="이전 기간 대비"
          accent="#7fb7ff"
          sub={summary ? `여행당 평균 ${summary.avgSpotsPerRoute.toFixed(1)}곳 방문` : undefined}
        />
        <MetricCard
          icon={<Star size={17} />}
          label="평균 만족도"
          value={summary && summary.averageRating !== null ? summary.averageRating.toFixed(2) : "—"}
          change={null}
          note="이전 기간 대비"
          accent="#f6bd68"
          sub={
            summary
              ? summary.averageRating === null
                ? "아직 남겨진 평점이 없어요"
                : `평점 ${summary.ratingCount.toLocaleString()}건 기준`
              : undefined
          }
        />
      </div>

      <div id="dashboard-trends" className="main-grid">
        <section className="panel trend-panel">
          <div className="panel-head">
            <div>
              <div className="section-kicker">VISITOR MOMENTUM</div>
              <h2>방문 흐름</h2>
              <p>막대는 Trip Ping 방문 핑(건), 선은 관광공사 지역 이동량(명)입니다.</p>
            </div>
            <button className="more-button" onClick={() => toast.info("상세 분석은 트렌드 분석 화면에서 볼 수 있어요.")}>
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="trend-summary">
            <div>
              <span className="big-number">{summary ? summary.totalVisits.toLocaleString() : "—"}</span>
              <span className="summary-unit">건</span>
              {summary && (
                <span className={summary.changeRate >= 0 ? "positive" : "positive down"}>
                  {summary.changeRate >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                  {Math.abs(summary.changeRate).toFixed(1)}%
                </span>
              )}
            </div>
            <span className="summary-note">이전 기간 대비</span>
          </div>
          {/* .chart-area는 옛 막대 레이아웃용 CSS Grid(32px 1fr / 132px 17px)라
              차트를 유일한 자식으로 넣으면 첫 칸(32px)에 갇힌다. 전용 컨테이너를 쓴다. */}
          <div style={{ position: "relative", height: 240, marginTop: 13, padding: "0 2px 4px" }}>
            {chartData.length === 0 && isChartLoading && (
              <div className="chart-loading">
                <Loader2 size={18} className="spin" />
                <b>데이터를 불러오는 중이에요</b>
                <small>
                  지역을 처음 조회할 때는 관광공사 공공데이터에서 1년치를 받아오느라
                  <br />
                  몇 초 걸릴 수 있어요. 한 번 불러온 구간은 이후 바로 표시됩니다.
                </small>
              </div>
            )}
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
                <ChartTooltip content={<DashboardTooltip />} />
                <Bar
                  yAxisId="left"
                  dataKey="visitCount"
                  name="Trip Ping 방문 핑"
                  fill="#5db4e9"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={18}
                />
                {/* Recharts는 Bar/Line 같은 아는 타입만 골라내므로 프래그먼트로 묶으면 무시된다.
                    두 Line은 반드시 ComposedChart의 직계 자식이어야 한다. */}
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
          <div className="chart-footer">
            <span><i className="dot mint" />Trip Ping 방문 핑</span>
            {hasRegionalSeries && <span><i className="line-dot" />지역 이동량 (관광공사 통계)</span>}
            {regionalQuery.isFetching && chartData.length > 0 && (
              <span className="legend-loading"><Loader2 size={12} className="spin" />지역 이동량 불러오는 중…</span>
            )}
            {!hasRegionalSeries && <span className="chart-insight">지역을 선택하면 관광공사 이동량 추세가 함께 표시돼요</span>}
          </div>
          {hasRegionalSeries && (
            <p className="chart-footnote">
              지역 이동량은 한국관광공사 통계 기준이며, 최근 구간은 작년 동기 데이터로 추정한 값입니다.
            </p>
          )}
        </section>

        <section className="panel region-panel">
          <div className="panel-head">
            <div>
              <div className="section-kicker">TOP DESTINATIONS</div>
              <h2>지역별 인기</h2>
              <p>관광공사 이동량 기준 순위입니다.</p>
            </div>
            <button className="more-button" onClick={() => toast.info("지역별 상세 분석을 준비 중입니다.")}>
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="region-list">
            {regionRankQuery.isLoading && <p className="dash-empty">불러오는 중...</p>}
            {!regionRankQuery.isLoading && regionRanks.length === 0 && (
              <p className="dash-empty">지역별 데이터를 불러오지 못했어요.</p>
            )}
            {regionRanks.slice(0, 5).map((item, index) => (
              <div className="region-row" key={item.regionName}>
                <span className="region-rank">0{index + 1}</span>
                <span className="region-dot" style={{ background: REGION_TONES[index % REGION_TONES.length] }} />
                <div className="region-info">
                  <b>{item.regionName}</b>
                  <span>
                    {item.regionVisitors === null
                      ? "이동량 데이터 없음"
                      : `지역 이동량 ${formatManUnit(item.regionVisitors)}명`}
                  </span>
                </div>
                <span className="region-change">
                  {item.visitPings.toLocaleString()} 핑
                </span>
              </div>
            ))}
          </div>
          <button className="text-link" onClick={() => toast.info("전체 지역 분석을 준비 중입니다.")}>
            전체 지역 보기 <ChevronRight size={15} />
          </button>
        </section>
      </div>

      <section className="panel map-panel">
        <div className="panel-head map-head">
          <div>
            <div className="section-kicker">MOVEMENT NETWORK</div>
            <h2>여행 루트 네트워크</h2>
            <p>실제 여행객이 이어서 방문한 관광지의 연결 흐름입니다.</p>
          </div>
          <div className="map-actions">
            <button className="outline-button" onClick={() => toast.info("지도 레이어 전환을 준비 중입니다.")}>
              <MapIcon size={15} />레이어
            </button>
            <button className="outline-button" onClick={downloadReport}>
              <Download size={15} />내보내기
            </button>
          </div>
        </div>
        <RouteNetworkMap
          network={networkQuery.data}
          fallback={<RouteMap network={networkQuery.data} isLoading={networkQuery.isLoading} />}
        />
      </section>

      <div id="dashboard-products" className="bottom-grid">
        <section className="panel routes-panel">
          <div className="panel-head">
            <div>
              <div className="section-kicker">POPULAR COMBINATIONS</div>
              <h2>인기 관광지 조합</h2>
            </div>
            <button className="more-button" onClick={() => toast.info("인기 조합 전체 보기를 준비 중입니다.")}>
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="route-list">
            {routesQuery.isLoading && <p className="dash-empty">불러오는 중...</p>}
            {!routesQuery.isLoading && (routesQuery.data?.length ?? 0) === 0 && (
              <p className="dash-empty">
                아직 이 기간·지역에 기록된 관광지 조합이 없어요.
                <br />
                여행객이 두 곳 이상을 이어서 방문하면 여기에 쌓입니다.
              </p>
            )}
            {routesQuery.data?.map((route, index) => (
              <button
                className="route-row"
                key={route.routeName}
                onClick={() => toast.info(`${route.routeName} 상세 분석을 준비 중입니다.`)}
              >
                <span className="route-rank">0{index + 1}</span>
                <span className="route-accent" style={{ background: REGION_TONES[index % REGION_TONES.length] }} />
                <div className="route-copy">
                  <b>{route.routeName}</b>
                  <span>관광지 {route.spotIds.length}곳</span>
                </div>
                <div className="route-stats">
                  <b>{route.visitCount.toLocaleString()}회</b>
                  <span>
                    {route.changeRate >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {signed(route.changeRate)}
                  </span>
                </div>
                <ChevronRight size={17} className="muted" />
              </button>
            ))}
          </div>
          <button className="text-link" onClick={() => toast.info("루트 분석 화면을 준비 중입니다.")}>
            모든 조합 분석하기 <ChevronRight size={15} />
          </button>
        </section>

        <section className="panel opportunity-panel">
          <div className="opportunity-glow" />
          <div className="section-kicker">NEXT OPPORTUNITY</div>
          <div className="opportunity-icon"><Sparkles size={21} /></div>
          {topRoute ? (
            <>
              <h2>새로운 상품 기회를<br /><em>발견했어요.</em></h2>
              <p>
                {topRoute.routeName} 조합이<br />
                이전 기간 대비 {signed(topRoute.changeRate)} 변화했어요.
              </p>
              <button className="dark-button" onClick={createDraft} disabled={creatingDraft}>
                {creatingDraft ? "초안 만드는 중..." : "상품 초안 만들기"} <ArrowUpRight size={16} />
              </button>
              <div className="opportunity-meta">
                <span><MapPin size={14} />{region}</span>
                <span><TrendingUp size={14} />관광지 {topRoute.spotIds.length}곳</span>
              </div>
            </>
          ) : (
            <>
              <h2>기회를 찾는 중<br /><em>이에요.</em></h2>
              <p>
                아직 이 기간·지역에는 상품으로 만들 만한<br />
                루트 조합이 쌓이지 않았어요.
              </p>
              <div className="opportunity-meta">
                <span><MapPin size={14} />{region}</span>
                <span><TrendingUp size={14} />{period}</span>
              </div>
            </>
          )}
        </section>
      </div>

      <footer className="page-footer">
        <span>Trip Ping Insight Portal · 데이터 기준 {fmtDot(range.to)}</span>
        <span>한국관광공사 OpenAPI + Trip Ping 익명화 이동 데이터</span>
      </footer>

      {reportReady && (
        <div className="download-toast">
          <FileText size={16} />
          리포트가 다운로드 폴더에 저장되었습니다.
          <button onClick={() => setReportReady(false)}><X size={14} /></button>
        </div>
      )}
    </PortalChrome>
  );
}
