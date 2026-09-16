import { useEffect, useState } from 'react'
import { fetchPopularPlaces, fetchPopularRoutes } from '../services/api.js'

export default function Overview() {
  const [places, setPlaces] = useState([])
  const [routes, setRoutes] = useState([])

  useEffect(() => {
    fetchPopularPlaces().then(setPlaces)
    fetchPopularRoutes().then(setRoutes)
  }, [])

  return (
    <div>
      <p className="page-desc">
        TripPing 앱에서 수집된 여행 데이터를 한눈에 요약해서 보여주는 페이지예요.
      </p>

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
