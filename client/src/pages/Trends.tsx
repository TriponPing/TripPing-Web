import { ArrowDownRight, ArrowUpRight, CalendarDays, Download, Filter, MapPin, Route, Sparkles, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import PortalChrome from "@/components/PortalChrome";
import { insightApi, placesApi } from "@/lib/api";
import { ALL_REGIONS_LABEL, insightPeriods, type InsightPeriod } from "@/lib/dashboardData";

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

  const totalVisits = summaryQuery.data ? summaryQuery.data.totalVisits.toLocaleString() : "—";
  const changeRate = summaryQuery.data ? summaryQuery.data.changeRate : null;
  const routeTones = ["blue", "mint", "orange"] as const;

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
            2026.08.01 — 08.31
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
        {/* 아래 3개 KPI는 아직 대응하는 백엔드 API가 없어 임시 고정값으로 남겨둠 */}
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
        {/* 일자별 이동량 차트는 아직 대응하는 백엔드 API가 없어 임시 목데이터로 남겨둠 */}
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
              {[38, 45, 41, 56, 52, 65, 61, 73, 68, 80, 78, 87, 84, 95, 91, 100, 94, 97, 89, 96, 100, 92, 98, 94, 100, 97].map((n, i) => (
                <div key={i} style={{ height: `${n}%` }} className={i > 17 ? "active" : ""} />
              ))}
            </div>
            <div className="chart-labels">
              <span>8/1</span>
              <span>8/8</span>
              <span>8/15</span>
              <span>8/22</span>
              <span>8/31</span>
            </div>
          </div>
          <div className="chart-legend">
            <span>
              <i className="blue-dot" />전체 이동량
            </span>
            <span>
              <i className="gray-dot" />이전 기간 평균
            </span>
            <b>
              <TrendingUp size={13} /> 주말에 제주 동부 방문이 집중돼요
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
