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

export type PopularPlace = {
  spotId: number;
  name: string;
  category: string;
  address: string;
  savedCount: number;
  photoUrl: string | null;
};

export type TrendingPlace = {
  spotId: number;
  name: string;
  category: string;
  address: string;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  recentVisitCount: number;
};

export const placesApi = {
  search: (query: string, regionId?: string) =>
    api.get<PlaceSearchResult[]>("/places/search", {
      params: { query, ...(regionId ? { regionId } : {}) },
    }),
  detail: (spotId: number) => api.get<PlaceDetail>(`/places/${spotId}/detail`),
  regions: () => api.get<Region[]>("/regions"),
  popular: (limit = 10) => api.get<PopularPlace[]>("/places/popular", { params: { limit } }),
  trending: (limit: number) => api.get<TrendingPlace[]>("/places/trending", { params: { limit } }),
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
  // routeName과 같은 순서의 spotId 목록. 대체 관광지 추천(스팟별 alternatives 조회)에 쓴다.
  spotIds: number[];
};

export type DailyVisit = {
  date: string;
  visitCount: number;
};

// 관광지들에 실제로 쌓인 평점·후기 근거. "상품 기획안" 보고서에서 관리자가 입력한
// 스펙이 아니라 실제 Pinger 반응을 그대로 보여주는 데 쓴다.
export type SpotEvidence = {
  averageRating: number | null; // 평점이 하나도 없으면 null (지어내지 않음)
  ratingCount: number;
  sampleComments: string[];
};

// 한국관광공사 "빅데이터 지역별 방문자수(DataLabService)" 기준 국가 통계 방문자수.
// 우리 자체 daily(방문 핑) 데이터가 아직 적어서(콜드스타트), 참고선으로 같이 보여주는 용도.
// "전체 지역"이거나 매핑이 없는 지역이면 백엔드가 빈 배열을 내려준다.
export type RegionalVisitor = {
  date: string;
  totalVisitors: number;
  isEstimated: boolean; // true면 작년 동기 데이터 기반 추정치, false면 실측치.
};

// ---- 대시보드 (GET /b2b/insight/dashboard/*) ----
// 기간·지역 파라미터 규약은 트렌드 API와 동일해서, 같은 기간을 보면 totalVisits가
// trendsSummary.totalVisits와 항상 일치한다 (같은 집계 쿼리를 재사용).

export type DashboardSummary = {
  totalVisits: number;          // 총 방문 핑 (스팟 체크인 건수)
  changeRate: number;
  activeTravelers: number;      // 기간 내 여행 기록을 남긴 서로 다른 사용자 수
  travelerChangeRate: number;
  routeCount: number;           // 기간 내 기록된 실제 여행 건수
  routeChangeRate: number;
  // 여행당 평균 방문 관광지 수. 핑 시각(visit_time)은 사용자가 임의로 찍는 값이라
  // 체류 시간을 계산할 수 없어서, 시간에 의존하지 않는 이 지표로 대체했다.
  avgSpotsPerRoute: number;
  avgSpotsChangeRate: number;
  averageRating: number | null; // 평점이 하나도 없으면 null (지어내지 않음)
  ratingCount: number;
};

// 지역별 인기 한 줄. 정렬은 백엔드가 regionVisitors(관광공사) 기준으로 이미 해서 준다.
export type RegionRank = {
  regionName: string;
  visitPings: number;            // Trip Ping 자체 방문 핑 (아직 희소할 수 있음)
  regionVisitors: number | null; // 관광공사 DataLab 기준 방문자수. 조회 실패 시 null
};

// 이동 네트워크 지도용. 좌표는 핑 시점의 실제 위치 평균(없으면 관광지 등록 좌표)이라
// 그대로 투영하면 된다. 좌표가 없는 관광지는 백엔드가 이미 빼고 준다.
export type RouteNetwork = {
  nodes: {
    spotId: number;
    name: string;
    latitude: number;
    longitude: number;
    visitCount: number;
  }[];
  edges: {
    fromSpotId: number;
    toSpotId: number;
    weight: number; // 이 이동이 관측된 횟수 (선 굵기용)
  }[];
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
  // 상품 기획안 유형일 때만 값이 있다. PDF 생성 시 이 id로 상품 상세를 다시 조회한다.
  productId: number | null;
};

export type ReportDetail = ReportSummary & {
  content: string;
};

export type ReportCreateRequest = {
  title: string;
  type: string;
  period: string;
  region: string;
  // type이 "상품 기획안"일 때만 채운다. 있으면 백엔드가 period/region 대신 이 상품 기준으로 생성한다.
  productId?: number;
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
  spotEvidence: (spotIds: number[]) =>
    api.get<SpotEvidence>("/b2b/insight/spots/evidence", { params: { spotIds: spotIds.join(",") } }),
  regionalVisitors: (period: string, region: string) =>
    api.get<RegionalVisitor[]>("/b2b/insight/trends/regional-visitors", { params: { period, region } }),
  dashboardSummary: (period: string, region: string, endDate?: string, startDate?: string) =>
    api.get<DashboardSummary>("/b2b/insight/dashboard/summary", { params: { period, region, endDate, startDate } }),
  // 지역끼리 비교하는 게 목적이라 region 파라미터를 받지 않는다.
  dashboardRegions: (period: string, endDate?: string, startDate?: string) =>
    api.get<RegionRank[]>("/b2b/insight/dashboard/regions", { params: { period, endDate, startDate } }),
  dashboardNetwork: (period: string, region: string, endDate?: string, startDate?: string) =>
    api.get<RouteNetwork>("/b2b/insight/dashboard/network", { params: { period, region, endDate, startDate } }),
  reports: () => api.get<ReportSummary[]>("/b2b/insight/reports"),
  createReport: (data: ReportCreateRequest) =>
    api.post<ReportDetail>("/b2b/insight/reports", data),
  reportDetail: (reportId: number) =>
    api.get<ReportDetail>(`/b2b/insight/reports/${reportId}`),
  deleteReport: (reportId: number) => api.delete(`/b2b/insight/reports/${reportId}`),
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