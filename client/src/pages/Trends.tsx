import { ArrowDownRight, ArrowUpRight, CalendarDays, Download, Filter, MapPin, Route, Sparkles, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import PortalChrome from "@/components/PortalChrome";
import { insightApi, placesApi, type DailyVisit } from "@/lib/api";
import { ALL_REGIONS_LABEL, insightPeriods, type InsightPeriod } from "@/lib/dashboardData";

// "2026-08-01" -> "8/1"
function formatMonthDay(isoDate: string) {
  const [, month, day] = isoDate.split("-");
  return `${Number(month)}/${Number(day)}`;
}

// dailyQuery 결과의 첫/마지막 날짜로 툴바 날짜 표시를 만든다 ("2026.08.01 — 08.31").
// 예전엔 이 라벨이 고정 문자열이라 기간을 "최근 7일"로 바꿔도 안 바뀌는 문제가 있었음.
function formatRangeLabel(daily: DailyVisit[]) {
  if (daily.length === 0) return "불러오는 중...";
  const [startY, startM, startD] = daily[0].date.split("-");
  const [, endM, endD] = daily[daily.length - 1].date.split("-");
  return `${startY}.${startM}.${startD} — ${endM}.${endD}`;
}

export default function Trends() {
  const [period, setPeriod] = useState<InsightPeriod>("최근 30일");
  const [region, setRegion] = useState<string>(ALL_REGIONS_LABEL);

  // 드롭다운에 백엔드 region 테이블의 실제 region_name("서울", "제주" 등)을 그대로 쓴다 —
  // 프론트에서 "서울특별시" 같은 긴 이름을 임의로 만들면 InsightRouteRepository의
  // exact-match 쿼리에 안 걸려서 항상 0건으로 나온다 (실제로 겪은 문제).
  const regionsQuery = useQuery({
    queryKey: ["regions"],
    queryFn: () => placesApi.regions().then((res) => res.data),
  });

  const summaryQuery = useQuery({
    queryKey: ["insight", "trends-summary", period, region],
    queryFn: () => insightApi.trendsSummary(period, region).then((res) => res.data),
  });

  const routesQuery = useQuery({
    queryKey: ["insight", "trends-routes", period, region],
    queryFn: () => insightApi.risingRoutes(period, region).then((res) => res.data),
  });

  // 일자별 이동량(막대그래프) - summary의 "총 방문 핑"과 같은 집계를 날짜별로 쪼갠 것.
  const dailyQuery = useQuery({
    queryKey: ["insight", "trends-daily", period, region],
    queryFn: () => insightApi.dailyVisits(period, region).then((res) => res.data),
  });

  // 한국관광공사 "빅데이터 지역별 방문자수(DataLabService)" 기준 국가 통계 방문자수.
  // 우리 자체 방문 핑 데이터가 아직 적어서(콜드스타트), 특정 지역을 골랐을 때 실제 규모를
  // 참고선처럼 같이 보여주기 위한 것. "전체 지역"이거나 매핑이 없는 지역이면 백엔드가 빈
  // 배열을 내려주고, 그럴 땐 아래에서 hasRegionalContext가 false가 되어 안 보인다.
  const regionalQuery = useQuery({
    queryKey: ["insight", "trends-regional-visitors", period, region],
    queryFn: () => insightApi.regionalVisitors(period, region).then((res) => res.data),
  });

  const totalVisits = summaryQuery.data ? summaryQuery.data.totalVisits.toLocaleString() : "—";
  const changeRate = summaryQuery.data ? summaryQuery.data.changeRate : null;
  const routeTones = ["blue", "mint", "orange"] as const;

  const dailyData = dailyQuery.data ?? [];
  const maxDailyVisits = Math.max(1, ...dailyData.map((d) => d.visitCount));
  // "최근 N일" 구간 중 마지막 7일(또는 구간 전체가 7일 이하면 전체)을 파란색으로 강조.
  const highlightCount = Math.min(7, dailyData.length);
  const highlightStartIndex = dailyData.length - highlightCount;
  // 날짜가 많을 때(최근 30일/1년)는 x축에 5개 지점만 골라서 보여준다.
  const labelIndexes =
    dailyData.length <= 7
      ? dailyData.map((_, i) => i)
      : Array.from(
          new Set([
            0,
            Math.round((dailyData.length - 1) * 0.25),
            Math.round((dailyData.length - 1) * 0.5),
            Math.round((dailyData.length - 1) * 0.75),
            dailyData.length - 1,
          ])
        );

  const regionalTotal = (regionalQuery.data ?? []).reduce((sum, d) => sum + d.totalVisitors, 0);
  const hasRegionalContext = region !== ALL_REGIONS_LABEL && regionalTotal > 0;

  return (
    <PortalChrome title="트렌드 분석" eyebrow="TOURISM TREND INTELLIGENCE">
      <div className="trend-toolbar">
        <div className="period-pills">
          {insightPeriods.map((item) => (
            <button key={item} className={period === item ? "selected" : ""} onClick={() => setPeriod(item)}>
              {item}
            </button>
          ))}
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
          <label>
            <CalendarDays size={14} />
            {formatRangeLabel(dailyData)}
          </label>
          <button onClick={() => toast.success("트렌드 분석 리포트를 다운로드했습니다.")}>
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
        </div>
        {/* 아래 2개 KPI는 아직 대응하는 백엔드 API가 없어 임시 고정값으로 남겨둠 */}
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
            <Route size={16} />평균 체류 시간
          </span>
          <b>4.7h</b>
          <small>
            <ArrowUpRight size={13} />
            12.1% 상승
          </small>
        </div>
        <div className="trend-kpi">
          <span>
            <Sparkles size={16} />신규 기회 점수
          </span>
          <b>86</b>
          <small>
            <ArrowUpRight size={13} />
            상위 8% 루트
          </small>
        </div>
      </div>

      <div className="trend-layout">
        <section className="portal-panel large">
          <div className="panel-title">
            <div>
              <span>ROUTE MOMENTUM</span>
              <h2>지역별 이동량 변화</h2>
            </div>
            <span className="panel-note">단위: 방문 핑</span>
          </div>
          <div className="large-chart">
            <div className="chart-lines">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="chart-bars">
              {dailyData.map((d, i) => (
                <div
                  key={d.date}
                  style={{ height: `${Math.max(4, (d.visitCount / maxDailyVisits) * 100)}%` }}
                  className={i >= highlightStartIndex ? "active" : ""}
                  title={`${d.date} · 방문 핑 ${d.visitCount}건`}
                />
              ))}
            </div>
            <div className="chart-labels">
              {labelIndexes.map((i) => (
                <span key={i}>{formatMonthDay(dailyData[i].date)}</span>
              ))}
            </div>
          </div>
          <div className="chart-legend">
            <span>
              <i className="blue-dot" />
              최근 {highlightCount || 7}일
            </span>
            <span>
              <i className="gray-dot" />
              이전 날짜
            </span>
            {/* 지역을 선택하면 관광공사 통계(DataLabService) 실데이터로 바뀜.
                "전체 지역"이거나 매핑된 지역코드가 없으면 아직 고정 예시 문구를 보여줌
                (item 4: 동적 인사이트 문구 생성은 별도 작업 예정) */}
            <b>
              {hasRegionalContext ? (
                <>
                  <TrendingUp size={13} /> {region} 전체 방문자 {regionalTotal.toLocaleString()}명 · 관광공사 통계({period})
                </>
              ) : (
                <>
                  <TrendingUp size={13} /> 주말에 제주 동부 방문이 집중돼요
                </>
              )}
            </b>
          </div>
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
            <b>{routesQuery.data?.[0]?.routeName ?? "데이터 없음"}</b>
            <span>{period} 방문량</span>
            <strong>{routesQuery.data?.[0] ? `${routesQuery.data[0].changeRate >= 0 ? "+" : ""}${routesQuery.data[0].changeRate.toFixed(1)}%` : "—"}</strong>
          </div>
          <p>성산일출봉 이후 섭지코지로 이어지는 이동이 빠르게 늘고 있어요. 기존 동선에 우도를 결합한 1박 2일 상품을 검토해보세요.</p>
          <button onClick={() => toast.success("상품 기획 초안을 만들 준비가 되었습니다.")}>
            이 루트로 상품 초안 만들기 <ArrowUpRight size={15} />
          </button>
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
          {routesQuery.data?.length === 0 && <p className="trend-table-empty">선택한 기간·지역에 급상승 루트가 없습니다.</p>}
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
