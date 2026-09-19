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
