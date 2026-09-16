import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { fetchMonthlyTrend, fetchPopularPlaces } from '../services/api.js'

export default function TrendStats() {
  const [monthly, setMonthly] = useState([])
  const [places, setPlaces] = useState([])

  useEffect(() => {
    fetchMonthlyTrend().then(setMonthly)
    fetchPopularPlaces().then(setPlaces)
  }, [])

  return (
    <div>
      <p className="page-desc">
        월별 여행 방문 추이와 장소별 방문 랭킹을 보여주는 통계 페이지예요.
      </p>

      <div className="card">
        <h3>월별 방문 추이</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="visits" stroke="#2c6e9e" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3>장소별 방문 수</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={places}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="visits" fill="#2c6e9e" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
