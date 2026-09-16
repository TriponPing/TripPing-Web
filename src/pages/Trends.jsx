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
import { fetchTrendDetail } from '../services/api.js'
import { mockRegions, mockPeriods } from '../mock/mockData.js'

export default function Trends() {
  const [region, setRegion] = useState(mockRegions[0])
  const [period, setPeriod] = useState(mockPeriods[1])
  const [monthly, setMonthly] = useState([])
  const [places, setPlaces] = useState([])

  useEffect(() => {
    fetchTrendDetail({ region, period }).then((data) => {
      setMonthly(data.monthly)
      setPlaces(data.places)
    })
  }, [region, period])

  return (
    <div>
      <p className="page-desc">
        지역/기간을 필터링해서 방문 추이와 인기 장소를 분석하는 페이지예요.
      </p>

      <div className="filter-row">
        <label className="field-label field-label-inline">
          지역
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            {mockRegions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="field-label field-label-inline">
          기간
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            {mockPeriods.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="card">
        <h3>방문 추이 ({region} · {period})</h3>
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
