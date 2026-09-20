import { ArrowDownRight, ArrowUpRight, Download, Filter, MapPin, Route, Sparkles, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";
import PortalChrome from "@/components/PortalChrome";
import DateRangePicker from "@/components/DateRangePicker";
import { insightApi, placesApi } from "@/lib/api";
import { ALL_REGIONS_LABEL, insightPeriods, type InsightPeriod } from "@/lib/dashboardData";

function toIsoDate(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function fmtDot(date: Date) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

// 기간 pill(최근 7일/30일/1년)을 누르면 그에 맞는 날짜 범위를 계산해서 달력에도 반영한다.
function rangeForPeriod(period: InsightPeriod, end: Date): DateRange {
  const start = new Date(end);
  if (period === "최근 7일") start.setDate(end.getDate() - 6);
  else if (period === "최근 1년") start.setFullYear(end.getFullYear() - 1, end.getMonth(), end.getDate() + 1);
  else start.setDate(end.getDate() - 29);
  return { from: start, to: end };
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

  // 드롭다운에 백엔드 region 테이블의 실제 region_name("서울", "제주" 등)을 그대로 쓴다 —
  // 프론트에서 "서울특별시" 같은 긴 이름을 임의로 만들면 InsightRouteRepository의
  // exact-match 쿼리에 안 걸려서 항상 0건으로 나온다 (실제로 겪은 문제).
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

  const totalVisits = summaryQuery.data ? summaryQuery.data.totalVisits.toLocaleString() : "—";
  const changeRate = summaryQuery.data ? summaryQuery.data.changeRate : null;
  const routeTones = ["blue", "mint", "orange"] as const;

  // 필드에 쉼표·줄바꿈·따옴표가 섞여 있어도 엑셀에서 열이 안 밀리도록 감싼다.
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

    // 엑셀에서 한글 안 깨지게 UTF-8 BOM 붙임.
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
            // 달력에서 임의 구간을 고르면 어떤 pill과도 안 맞을 수 있으니, 실제로 현재
            // range가 그 pill이 뜻하는 구간이랑 똑같을 때만 선택된 것처럼 표시한다.
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
            <span>선택 기간 방문량</span>
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
