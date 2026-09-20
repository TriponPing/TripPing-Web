import { useEffect, useMemo, useState } from "react";
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
  Map,
  MapPin,
  MoreHorizontal,
  RefreshCw,
  Route,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import PortalChrome from "@/components/PortalChrome";
import { buildReportText, dashboardPeriods, totalForPeriod, type DashboardPeriod } from "@/lib/dashboardData";
import { placesApi, type PopularPlace, type TrendingPlace } from "@/lib/api";

const regions = [
  { name: "제주특별자치도", value: "24,820", change: "+18.4%", tone: "up", color: "#9ee36f" },
  { name: "서울특별시", value: "18,410", change: "+12.1%", tone: "up", color: "#69d6c0" },
  { name: "부산광역시", value: "13,970", change: "+8.7%", tone: "up", color: "#7fb7ff" },
  { name: "강원특별자치도", value: "11,860", change: "-2.4%", tone: "down", color: "#f6bd68" },
];

export default function Dashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>("이번 달");
  const [filterOpen, setFilterOpen] = useState(false);
  const [region, setRegion] = useState("전체 지역");
  const [reportReady, setReportReady] = useState(false);
  const [popularPlaces, setPopularPlaces] = useState<PopularPlace[]>([]);
  const [trendingPlaces, setTrendingPlaces] = useState<TrendingPlace[]>([]);

  useEffect(() => {
    placesApi.popular(3)
      .then((res) => setPopularPlaces(res.data))
      .catch((err) => console.error("인기 장소 조회 실패:", err));
  }, []);

  useEffect(() => {
  placesApi.trending(3)
    .then((res) => setTrendingPlaces(res.data))
    .catch((err) => console.error("급상승 장소 조회 실패:", err));
}, []);

  const chartTotal = useMemo(() => totalForPeriod(period), [period]);
  const routeColors = ["#9ee36f", "#69d6c0", "#7fb7ff"];

  const bars = [38, 44, 42, 57, 49, 63, 68, 60, 72, 66, 78, 84, 76, 89, 92, 86, 100, 93, 96, 88, 91, 97, 84, 90];

  function MetricCard({ icon, label, value, change, note, accent }: { icon: React.ReactNode; label: string; value: string; change: string; note: string; accent: string }) {
    return (
      <div className="metric-card" style={{ "--metric-accent": accent } as React.CSSProperties}>
        <div className="metric-top"><span className="metric-icon">{icon}</span><span className="metric-label">{label}</span><MoreHorizontal size={17} className="muted" /></div>
        <div className="metric-value">{value}</div>
        <div className="metric-bottom"><span className="change"><ArrowUpRight size={14} />{change}</span><span>{note}</span></div>
      </div>
    );
  }

  function TinySparkline({ color = "#9ee36f" }: { color?: string }) {
    return <svg className="sparkline" viewBox="0 0 112 36" preserveAspectRatio="none" aria-hidden="true"><path d="M1 30 C10 29, 12 20, 20 24 S32 28, 39 18 S50 26, 58 20 S72 8, 80 14 S92 19, 99 8 S106 12,111 2" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" /></svg>;
  }

  function RouteMap() {
    return (
      <div className="route-list">
        {trendingPlaces.map((place, index) => (
          <button className="route-row" key={place.spotId} onClick={() => toast.info(`${place.name} 상세 분석을 준비 중입니다.`)}>
            <span className="route-rank">0{index + 1}</span>
            <span className="route-accent" style={{ background: routeColors[index % routeColors.length] }} />
            <div className="route-copy"><b>{place.name}</b><span>{place.category} · {place.address}</span></div>
            <div className="route-stats"><b>{place.recentVisitCount}회 방문</b></div>
            <ChevronRight size={17} className="muted" />
          </button>
        ))}
      </div>
    );
  }

  function downloadReport() {
    const content = buildReportText(period, region);
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `trip-ping-report-${period}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setReportReady(true);
    toast.success("분석 리포트를 다운로드했습니다.");
  }

  return (
    <PortalChrome title="대시보드" eyebrow="LIVE TOURISM INTELLIGENCE">
      <div className="page-heading"><div><div className="eyebrow"><Activity size={14} />LIVE TOURISM INTELLIGENCE</div><h1>안녕하세요, 지훈님 <span>👋</span></h1><p>실제 여행객의 움직임에서 다음 관광 기회를 발견하세요.</p></div><div className="heading-actions"><button className="ghost-button" onClick={() => toast.success("데이터를 최신 상태로 동기화했습니다.")}><RefreshCw size={16} />마지막 업데이트 3분 전</button><button className="primary-button" onClick={downloadReport}><Download size={16} />리포트 다운로드</button></div></div>

      <div className="toolbar"><div className="period-tabs">{dashboardPeriods.map((item) => <button key={item} className={period === item ? "selected" : ""} onClick={() => setPeriod(item)}>{item}</button>)}</div><div className="toolbar-right"><div className="filter-wrap"><button className="filter-button" onClick={() => setFilterOpen(!filterOpen)}><Filter size={15} />{region}<ChevronDown size={14} /></button>{filterOpen && <div className="filter-menu">{["전체 지역", "제주특별자치도", "서울특별시", "부산광역시"].map((item) => <button key={item} onClick={() => { setRegion(item); setFilterOpen(false); }}>{item}</button>)}</div>}</div><button className="date-button"><CalendarDays size={15} />2026. 08. 01 — 08. 31</button></div></div>

      <div className="metrics-grid"><MetricCard icon={<MapPin size={17} />} label="총 방문 핑" value={chartTotal} change="18.4%" note="전월 대비" accent="#9ee36f" /><MetricCard icon={<Users size={17} />} label="활성 여행객" value="8,412" change="12.6%" note="지난달 대비" accent="#69d6c0" /><MetricCard icon={<Route size={17} />} label="기록된 루트" value="1,284" change="24.8%" note="새롭게 발견" accent="#7fb7ff" /><MetricCard icon={<Star size={17} />} label="평균 만족도" value="4.72" change="0.18" note="별점 상승" accent="#f6bd68" /></div>

      <div id="dashboard-trends" className="main-grid"><section className="panel trend-panel"><div className="panel-head"><div><div className="section-kicker">VISITOR MOMENTUM</div><h2>방문 흐름</h2><p>선택한 기간의 핑 기록 추이입니다.</p></div><button className="more-button" onClick={() => toast.info("상세 분석 화면을 준비 중입니다.")}><MoreHorizontal size={18} /></button></div><div className="trend-summary"><div><span className="big-number">{chartTotal}</span><span className="summary-unit">회</span><span className="positive"><ArrowUpRight size={15} />18.4%</span></div><span className="summary-note">지난 기간 대비</span></div><div className="chart-area"><div className="chart-y"><span>30k</span><span>20k</span><span>10k</span><span>0</span></div><div className="bar-chart">{bars.map((height, index) => <div key={index} className="bar-group"><div className={index > 15 ? "bar bright" : "bar"} style={{ height: `${height}%` }} /></div>)}</div><div className="chart-x"><span>8/1</span><span>8/8</span><span>8/15</span><span>8/22</span><span>8/31</span></div></div><div className="chart-footer"><span><i className="dot mint" />전체 방문 핑</span><span><i className="dot yellow" />전년 동기 평균</span><span className="chart-insight"><Zap size={14} />주말 방문이 평일보다 32% 높아요</span></div></section><section className="panel region-panel"><div className="panel-head"><div><div className="section-kicker">TOP DESTINATIONS</div><h2>지역별 인기</h2><p>방문 핑이 많이 쌓인 지역입니다.</p></div><button className="more-button" onClick={() => toast.info("지역별 상세 분석을 준비 중입니다.")}><MoreHorizontal size={18} /></button></div><div className="region-list">{regions.map((item, index) => <div className="region-row" key={item.name}><span className="region-rank">0{index + 1}</span><span className="region-dot" style={{ background: item.color }} /><div className="region-info"><b>{item.name}</b><span>{item.value} 방문</span></div><TinySparkline color={item.color} /><span className={item.tone === "down" ? "region-change down" : "region-change"}>{item.tone === "down" ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}{item.change}</span></div>)}</div><button className="text-link" onClick={() => toast.info("전체 지역 분석을 준비 중입니다.")}>전체 지역 보기 <ChevronRight size={15} /></button></section></div>

      <section className="panel map-panel"><div className="panel-head map-head"><div><div className="section-kicker">MOVEMENT NETWORK</div><h2>여행 루트 네트워크</h2><p>실제 여행객이 함께 방문한 관광지의 연결 흐름을 보여줍니다.</p></div><div className="map-actions"><button className="outline-button" onClick={() => toast.info("지도 레이어를 변경했습니다.")}><Map size={15} />레이어</button><button className="outline-button" onClick={() => toast.success("지도 데이터를 CSV로 준비했습니다.")}><Download size={15} />내보내기</button></div></div><RouteMap /></section>

      <div id="dashboard-products" className="bottom-grid"><section className="panel routes-panel"><div className="panel-head"><div><div className="section-kicker">POPULAR COMBINATIONS</div><h2>인기 관광지 조합</h2></div><button className="more-button" onClick={() => toast.info("인기 조합 전체 보기를 준비 중입니다.")}><MoreHorizontal size={18} /></button></div><div className="route-list">{popularPlaces.map((place, index) => <button className="route-row" key={place.spotId} onClick={() => toast.info(`${place.name} 상세 분석을 준비 중입니다.`)}><span className="route-rank">0{index + 1}</span><span className="route-accent" style={{ background: routeColors[index % routeColors.length] }} /><div className="route-copy"><b>{place.name}</b><span>{place.category} · {place.address}</span></div><div className="route-stats"><b>{place.savedCount}회 저장</b></div><ChevronRight size={17} className="muted" /></button>)}</div><button className="text-link" onClick={() => toast.info("루트 분석 화면을 준비 중입니다.")}>모든 조합 분석하기 <ChevronRight size={15} /></button></section><section className="panel opportunity-panel"><div className="opportunity-glow" /><div className="section-kicker">NEXT OPPORTUNITY</div><div className="opportunity-icon"><Sparkles size={21} /></div><h2>새로운 상품 기회를<br /><em>발견했어요.</em></h2><p>제주 동부 해안에 머무는 여행객이<br />지난달보다 24.8% 늘었습니다.</p><button className="dark-button" onClick={() => toast.success("상품 설계 화면을 열었습니다.")}>상품 초안 만들기 <ArrowUpRight size={16} /></button><div className="opportunity-meta"><span><MapPin size={14} />제주 동부</span><span><TrendingUp size={14} />급상승 루트</span></div></section></div>

      <footer className="page-footer"><span>Trip Ping Insight Portal · 데이터 기준 2026.08.31</span><span>한국관광공사 OpenAPI + Trip Ping 익명화 이동 데이터</span></footer>

      {reportReady && <div className="download-toast"><FileText size={16} />리포트가 다운로드 폴더에 저장되었습니다.<button onClick={() => setReportReady(false)}><X size={14} /></button></div>}
    </PortalChrome>
  );
}