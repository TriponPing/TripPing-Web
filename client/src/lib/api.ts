import axios from "axios";

// Base URL of the real Spring Boot backend (TripPing-Backend), e.g.
// https://api.tripping.example.com. Leave VITE_API_URL empty to call
// same-origin (useful if you proxy the backend through Vite in dev).
const API_URL = import.meta.env.VITE_API_URL ?? "";

// `withCredentials: true` sends/receives the session cookie (JSESSIONID)
// Spring Security issues on login. The backend's auth DTOs have no "token"
// field, which is why this assumes cookie/session auth rather than JWT.
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export type LoginRequest = {
  email: string;
  password: string;
};

// Matches OrgJoinRequestDto on the backend. `documentUrl` is left optional —
// there's no confirmed file-upload endpoint yet (FileUploadController's
// exact contract hasn't been verified), so callers currently submit without
// it until that's wired up.
export type JoinRequest = {
  orgName: string;
  orgType: string;
  managerName: string;
  managerEmail: string;
  password: string;
  documentUrl?: string;
};

export type OrgReviewStatus = "APPROVED" | "REJECTED";

// This is the WEB PORTAL's own auth (Organization / Admin), completely
// separate from the mobile app's AppUser login. Matches B2bAuthController's
// GET /b2b/auth/me exactly: an Admin principal returns {type:"admin", ...},
// an Organization principal returns {type:"org", ...}. Always branch on
// `type` before reading the rest of the fields.
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

// Matches B2bAdminController's org listing shape (OrgResponse.java) — note
// this has documentUrl/createdAt that OrgMe (the /me response) doesn't.
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

// Auth endpoints for the B2B web portal — paths match B2bAuthController
// exactly. join/login/logout return a plain string body, not JSON.
export const authApi = {
  join: (data: JoinRequest) => api.post<string>("/b2b/auth/join", data),
  login: (data: LoginRequest) => api.post<string>("/b2b/auth/login", data),
  logout: () => api.post<string>("/b2b/auth/logout"),
  me: () => api.get<MeResponse>("/b2b/auth/me"),
};

// Operator-only endpoints — backend restricts /b2b/admin/** to ROLE_ADMIN,
// so these will 403 for an org-type user.
export const adminApi = {
  pendingOrganizations: () => api.get<OrgSummary[]>("/b2b/admin/organizations"),
  review: (orgId: number, status: OrgReviewStatus) =>
    api.patch<OrgSummary>(`/b2b/admin/organizations/${orgId}`, { status }),
};

// 관광지·지역 조회. 여행객 앱과 공유하는 데이터라 /b2b 아래가 아니고,
// 로그인 없이도 읽을 수 있다 (PlaceController / RegionController).
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

// averageRating·reviewCount는 여행객 앱에 후기가 쌓여야 값이 생긴다.
// 아직 데이터가 없어 null/0으로 내려오므로 호출부에서 없는 경우를 처리해야 한다.
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

// 기관 전용 - 관광상품 기획 (B2bProductController).
// 백엔드는 진행 상태를 코드로 다루고 화면은 한글로 보여주므로 여기서 옮긴다.
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
  expectedDuration: number | null; // 분 단위
  transport: string | null;
  mealIncluded: boolean | null;
  trendBasis: string | null;
  description: string | null;
  spots: ProductSpot[];
  hashtags: string[];
};

// null인 항목은 "바꾸지 않음"으로 처리된다. spots·hashtags는 예외로,
// 보낸 배열이 통째로 현재 상태가 된다.
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

// 기관 전용 - 조직 설정 (B2bOrganizationController).
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

// plainKey는 발급 응답에만 한 번 담겨 온다. 목록에서는 항상 null이라
// 사용자가 그 자리에서 복사하도록 안내해야 한다.
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

// 기관 전용 - 트렌드/보고서 (InsightController / ReportController).
// period/region은 프론트가 쓰는 한글 문자열("최근 30일", "전체 지역" 등)을
// 그대로 쿼리 파라미터로 받는다 — 별도 코드 변환 없음.
export type TrendsSummary = {
  totalVisits: number;
  changeRate: number;
};

export type RouteRanking = {
  routeName: string;
  visitCount: number;
  changeRate: number;
};

// 일자별 이동량(방문 핑) 추이. date는 LocalDate가 JSON으로 내려온 "2026-08-01" 형식 문자열.
// 선택한 기간 안의 모든 날짜가 다 들어있다 - 방문 기록이 없는 날짜도 visitCount: 0으로 채워져서 온다.
export type DailyVisit = {
  date: string;
  visitCount: number;
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

// content(본문)는 상세/생성 응답에만 포함되고 목록에는 없다.
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
  reports: () => api.get<ReportSummary[]>("/b2b/insight/reports"),
  createReport: (data: ReportCreateRequest) =>
    api.post<ReportDetail>("/b2b/insight/reports", data),
  reportDetail: (reportId: number) =>
    api.get<ReportDetail>(`/b2b/insight/reports/${reportId}`),
};

// 상품 일정에 넣을 관광지 검색 (B2bSpotController).
//
// 우리 DB(tourist_spot)와 한국관광공사를 함께 찾는다. registered가 false면
// 아직 DB에 없는 관광공사 후보라, 일정에 담기 전에 register로 등록해서
// spotId를 받아야 한다. 일정은 spotId로 저장되기 때문이다.
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
