import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import DashboardHome from './pages/DashboardHome.jsx'
import Trends from './pages/Trends.jsx'
import Products from './pages/Products.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Settings from './pages/Settings.jsx'

// TripPing for Business: 여행사/지자체에게 TripPing 앱 데이터를 보여주는 B2B 대시보드.
//
// 경로       화면                      필요 데이터
// /login     B2B 로그인                인증 API
// /          대시보드 홈               트렌드 요약 API
// /trends    지역별/기간별 트렌드 분석   트렌드 상세 API
// /products  관광상품 기획 목록         상품 목록 API
// /products/:id  관광상품 상세/편집     상품 상세 API
// /settings  조직 설정                 조직 정보 API
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardHome />} />
        <Route path="trends" element={<Trends />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
