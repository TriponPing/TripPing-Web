import axios from "axios";

// Base URL of the real Spring Boot backend (TripPing-Backend), e.g.
// https://api.tripping.example.com. Leave VITE_API_URL empty to call
// same-origin (useful if you proxy the backend through Vite in dev).
const API_URL = import.meta.env.VITE_API_URL ?? "";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export type LoginRequest = {
  email: string;
  password: string;
};

export type JoinRequest = {
  orgName: string;
  orgType: string;
  managerName: string;
  managerEmail: string;
  password: string;
  documentUrl?: string;
};

export type OrgReviewStatus = "APPROVED" | "REJECTED";

export type AdminMe = {
  type: "admin";
  adminId: number;
  email: string;
};

export type OrgMe = {
  type: "org";
  orgId: number;
  orgName: string;
  orgType: string;
  managerName: string;
  managerEmail: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export type MeResponse = AdminMe | OrgMe;

export type OrgSummary = {
  orgId: number;
  orgName: string;
  orgType: string;
  managerName: string;
  managerEmail: string;
  documentUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
};

export const authApi = {
  join: (data: JoinRequest) => api.post<string>("/b2b/auth/join", data),
  login: (data: LoginRequest) => api.post<string>("/b2b/auth/login", data),
  logout: () => api.post<string>("/b2b/auth/logout"),
  me: () => api.get<MeResponse>("/b2b/auth/me"),
};

export const adminApi = {
  pendingOrganizations: () => api.get<OrgSummary[]>("/b2b/admin/organizations"),
  review: (orgId: number, status: OrgReviewStatus) =>
    api.patch<OrgSummary>(`/b2b/admin/organizations/${orgId}`, { status }),
};

export type PlaceSearchResult = {
  spotId: number;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  description: string | null;
  popularTimeSlot: string | null;
  pingCount: number;
};

export type PlaceDetail = PlaceSearchResult & {
  averageRating: number | null;
  reviewCount: number;
};

export type Region = {
  regionId: string;
  regionName: string;
  regionType: string;
};

export const placesApi = {
  search: (query: string, regionId?: string) =>
    api.get<PlaceSearchResult[]>("/places/search", {
      params: { query, ...(regionId ? { regionId } : {}) },
    }),
  detail: (spotId: number) => api.get<PlaceDetail>(`/places/${spotId}/detail`),
  regions: () => api.get<Region[]>("/regions"),
};

export const PRODUCT_STATUS = {
  DRAFT: "초안",
  REVIEW: "검토 중",
  DONE: "완료",
  PUBLISHED: "게시",
} as const;

export type ProductStatusCode = keyof typeof PRODUCT_STATUS;

export type ProductSpot = {
  spotId: number;
  name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  visitOrder: number;
  stayDuration: number | null;
};

export type ProductSummary = {
  productId: number;
  productName: string;
  status: ProductStatusCode;
  regionId: string | null;
  regionName: string | null;
  price: number | null;
  spotCount: number;
  updatedAt: string | null;
  createdAt: string;
};

export type ProductDetail = ProductSummary & {
  targetCustomer: string | null;
  expectedDuration: number | null;
  transport: string | null;
  mealIncluded: boolean | null;
  trendBasis: string | null;
  description: string | null;
  spots: ProductSpot[];
  hashtags: string[];
};

export type ProductUpdate = Partial<{
  productName: string;
  status: ProductStatusCode;
  regionId: string | null;
  targetCustomer: string;
  expectedDuration: number;
  description: string;
  price: number;
  spots: { spotId: number; stayDuration?: number | null }[];
  hashtags: string[];
}>;

export const productsApi = {
  list: () => api.get<ProductSummary[]>("/b2b/products"),
  detail: (productId: number) =>
    api.get<ProductDetail>(`/b2b/products/${productId}`),
  create: (data?: { productName?: string; regionId?: string }) =>
    api.post<ProductDetail>("/b2b/products", data ?? {}),
  update: (productId: number, data: ProductUpdate) =>
    api.patch<ProductDetail>(`/b2b/products/${productId}`, data),
  remove: (productId: number) => api.delete(`/b2b/products/${productId}`),
};

export type OrgProfile = {
  orgId: number;
  orgName: string;
  orgType: string;
  managerName: string;
  managerEmail: string;
  department: string | null;
  description: string | null;
  logoUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export type NotificationSetting = {
  notifyTrend: boolean;
  notifyReport: boolean;
};

export type ApiKey = {
  keyId: number;
  label: string;
  keyPrefix: string;
  plainKey: string | null;
  createdAt: string;
};

export const organizationApi = {
  profile: () => api.get<OrgProfile>("/b2b/organization"),
  updateProfile: (data: Partial<Omit<OrgProfile, "orgId" | "status">>) =>
    api.patch<OrgProfile>("/b2b/organization", data),
  notifications: () =>
    api.get<NotificationSetting>("/b2b/organization/notifications"),
  updateNotifications: (data: Partial<NotificationSetting>) =>
    api.patch<NotificationSetting>("/b2b/organization/notifications", data),
  apiKeys: () => api.get<ApiKey[]>("/b2b/organization/api-keys"),
  issueApiKey: (label: string) =>
    api.post<ApiKey>("/b2b/organization/api-keys", { label }),
  revokeApiKey: (keyId: number) =>
    api.delete(`/b2b/organization/api-keys/${keyId}`),
};

export type TrendsSummary = {
  totalVisits: number;
  changeRate: number;
};

export type RouteRanking = {
  routeName: string;
  visitCount: number;
  changeRate: number;
};

export type DailyVisit = {
  date: string;
  visitCount: number;
};

// 한국관광공사 "빅데이터 지역별 방문자수(DataLabService)" 기준 국가 통계 방문자수.
// 우리 자체 daily(방문 핑) 데이터가 아직 적어서(콜드스타트), 참고선으로 같이 보여주는 용도.
// "전체 지역"이거나 매핑이 없는 지역이면 백엔드가 빈 배열을 내려준다.
export type RegionalVisitor = {
  date: string;
  totalVisitors: number;
  isEstimated: boolean; // true면 작년 동기 데이터 기반 추정치, false면 실측치.
};

export type ReportStatus = "COMPLETED" | "IN_PROGRESS";

export type ReportSummary = {
  reportId: number;
  title: string;
  type: string;
  period: string;
  region: string;
  status: ReportStatus;
  createdAt: string;
};

export type ReportDetail = ReportSummary & {
  content: string;
};

export type ReportCreateRequest = {
  title: string;
  type: string;
  period: string;
  region: string;
};

export const insightApi = {
  // endDate: "YYYY-MM-DD" 구간의 마지막 날 (생략하면 백엔드가 오늘로 계산).
  // startDate까지 같이 주면 period는 무시되고 그 구간을 그대로 쓴다 (달력에서 직접
  // 범위를 고른 경우).
  trendsSummary: (period: string, region: string, endDate?: string, startDate?: string) =>
    api.get<TrendsSummary>("/b2b/insight/trends/summary", { params: { period, region, endDate, startDate } }),
  risingRoutes: (period: string, region: string, endDate?: string, startDate?: string) =>
    api.get<RouteRanking[]>("/b2b/insight/trends/routes", { params: { period, region, endDate, startDate } }),
  dailyVisits: (period: string, region: string) =>
    api.get<DailyVisit[]>("/b2b/insight/trends/daily", { params: { period, region } }),
  regionalVisitors: (period: string, region: string) =>
    api.get<RegionalVisitor[]>("/b2b/insight/trends/regional-visitors", { params: { period, region } }),
  reports: () => api.get<ReportSummary[]>("/b2b/insight/reports"),
  createReport: (data: ReportCreateRequest) =>
    api.post<ReportDetail>("/b2b/insight/reports", data),
  reportDetail: (reportId: number) =>
    api.get<ReportDetail>(`/b2b/insight/reports/${reportId}`),
};

export type SpotSearchResult = {
  spotId: number | null;
  contentId: string | null;
  name: string;
  address: string | null;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  registered: boolean;
};

// 대체 관광지 후보 한 건.
//
// 추천 순서는 방문자 수 → 평점 → 거리 순이라, 핑이 아직 없는 장소끼리는
// 가까운 곳부터 올라온다. 세 값 모두 화면에 근거로 보여준다.
export type AlternativeSpot = {
  spotId: number;
  name: string;
  category: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  visitCount: number;
  averageRating: number | null;
  distanceKm: number;
};

export const spotsApi = {
  search: (query: string) =>
    api.get<SpotSearchResult[]>("/b2b/spots/search", { params: { query } }),
  register: (contentId: string) =>
    api.post<SpotSearchResult>("/b2b/spots/register", null, {
      params: { contentId },
    }),
  alternatives: (spotId: number, category?: string, limit = 4) =>
    api.get<AlternativeSpot[]>(`/b2b/spots/${spotId}/alternatives`, {
      params: { category, limit },
    }),
};