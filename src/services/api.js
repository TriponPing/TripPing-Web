import axios from 'axios'
import {
  mockPopularPlaces,
  mockMonthlyTrend,
  mockPopularRoutes,
  mockTrendSummary,
  mockProducts,
  mockProductDetail,
  mockOrgInfo,
} from '../mock/mockData.js'

// TripPing-Backend(Railway) 주소. 실제 API가 만들어지면 이 값과
// 아래 함수들만 바꾸면 됨 (화면 쪽 코드는 건드릴 필요 없음).
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://tripping-backend-production.up.railway.app'

const client = axios.create({ baseURL: BASE_URL })

// 백엔드에 여행사/지자체용 API가 아직 없어서 지금은 전부 목업 데이터로 동작함.
// 실제 엔드포인트가 생기면 USE_MOCK을 false로 바꾸고, 아래 각 함수의
// axios 호출 경로만 실제 스펙에 맞게 고치면 됨.
const USE_MOCK = true

// ── 인증 ──────────────────────────────────────
export async function login({ email, password }) {
  if (USE_MOCK) return { token: 'mock-token', orgName: mockOrgInfo.orgName }
  const res = await client.post('/auth/b2b/login', { email, password })
  return res.data
}

// ── 대시보드 홈 ────────────────────────────────
export async function fetchTrendSummary() {
  if (USE_MOCK) return mockTrendSummary
  const res = await client.get('/stats/trend-summary')
  return res.data
}

export async function fetchPopularPlaces() {
  if (USE_MOCK) return mockPopularPlaces
  const res = await client.get('/stats/popular-places')
  return res.data
}

export async function fetchPopularRoutes() {
  if (USE_MOCK) return mockPopularRoutes
  const res = await client.get('/stats/popular-routes')
  return res.data
}

// ── 트렌드 분석 (지역/기간 필터) ──────────────────
export async function fetchTrendDetail({ region, period } = {}) {
  if (USE_MOCK) {
    // TODO: 실제 API에서는 region/period로 서버에서 필터링된 데이터를 내려줄 예정.
    // 지금은 필터 UI 동작 확인용으로 동일한 목업을 그대로 반환함.
    return { monthly: mockMonthlyTrend, places: mockPopularPlaces, region, period }
  }
  const res = await client.get('/stats/trend-detail', { params: { region, period } })
  return res.data
}

// ── 관광상품 기획 ─────────────────────────────
export async function fetchProducts() {
  if (USE_MOCK) return mockProducts
  const res = await client.get('/products')
  return res.data
}

export async function fetchProductDetail(id) {
  if (USE_MOCK) return mockProductDetail[id]
  const res = await client.get(`/products/${id}`)
  return res.data
}

export async function updateProduct(id, data) {
  if (USE_MOCK) return { ...mockProductDetail[id], ...data }
  const res = await client.put(`/products/${id}`, data)
  return res.data
}

// ── 조직 설정 ─────────────────────────────────
export async function fetchOrgInfo() {
  if (USE_MOCK) return mockOrgInfo
  const res = await client.get('/org/me')
  return res.data
}

export async function updateOrgInfo(data) {
  if (USE_MOCK) return { ...mockOrgInfo, ...data }
  const res = await client.put('/org/me', data)
  return res.data
}
