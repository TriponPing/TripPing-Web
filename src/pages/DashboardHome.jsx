import { useEffect, useState } from 'react'
import { fetchTrendSummary, fetchPopularPlaces, fetchPopularRoutes } from '../services/api.js'

export default function DashboardHome() {
  const [summary, setSummary] = useState(null)
  const [places, setPlaces] = useState([])
  const [routes, setRoutes] = useState([])

  useEffect(() => {
    fetchTrendSummary().then(setSummary)
    fetchPopularPlaces().then(setPlaces)
    fetchPopularRoutes().then(setRoutes)
  }, [])

  return (
    <div>
      <p className="page-desc">
        최근 여행 트렌드를 한눈에 요약해서 보여주는 대시보드 홈이에요.
      </p>

      {summary && (
        <div className="stat-grid">
          <div className="stat-tile">
            <span className="stat-label">총 방문자 수</span>
            <span className="stat-value">{summary.totalVisitors.toLocaleString()}명</span>
          </div>
          <div className="stat-tile">
            <span className="stat-label">전월 대비 증감률</span>
            <span className="stat-value stat-positive">+{summary.growthRate}%</span>
          </div>
          <div className="stat-tile">
            <span className="stat-label">이번달 인기 지역</span>
            <span className="stat-value">{summary.topRegion}</span>
          </div>
          <div className="stat-tile">
            <span className="stat-label">인기 루트</span>
            <span className="stat-value stat-value-sm">{summary.topRoute}</span>
          </div>
        </div>
      )}

      <div className="card-grid">
        <div className="card">
          <h3>인기 장소 TOP 5</h3>
          <ol className="rank-list">
            {places.map((p) => (
              <li key={p.name}>
                <span>{p.name}</span>
                <span className="rank-count">{p.visits.toLocaleString()}명</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="card">
          <h3>인기 여행 루트</h3>
          <ul className="route-list">
            {routes.map((r) => (
              <li key={r.id}>
                <span className="route-region">{r.region}</span>
                <span>{r.name}</span>
                <span className="rank-count">{r.pings}핑</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
