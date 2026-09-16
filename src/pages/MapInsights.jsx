import { useEffect, useState } from 'react'
import { fetchMapPoints } from '../services/api.js'

// TODO: 실제 지도는 카카오맵 JS SDK 또는 네이버 지도 JS SDK 붙이면 됨
// (안드로이드 앱에서 네이버 지도 쓰고 있으니 웹도 네이버로 맞추는 게 자연스러움).
// 지금은 좌표 목록만 카드로 보여주는 자리표시자 상태.
export default function MapInsights() {
  const [points, setPoints] = useState([])

  useEffect(() => {
    fetchMapPoints().then(setPoints)
  }, [])

  return (
    <div>
      <p className="page-desc">
        인기 장소를 지도 위에 시각화하는 페이지예요. (지도 SDK 연동 예정)
      </p>

      <div className="card map-placeholder">
        <p>지도가 들어갈 자리예요 🗺️</p>
        <p className="map-placeholder-sub">카카오맵 / 네이버 지도 JS SDK 연동 예정</p>
      </div>

      <div className="card">
        <h3>지점별 방문 데이터</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>장소</th>
              <th>위도</th>
              <th>경도</th>
              <th>방문 수</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.name}>
                <td>{p.name}</td>
                <td>{p.lat}</td>
                <td>{p.lng}</td>
                <td>{p.visits.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
