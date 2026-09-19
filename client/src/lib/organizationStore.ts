import { useSyncExternalStore } from "react";
import type { OrgMe } from "./api";

const STORAGE_KEY = "tripping.organization";

export const organizationTypes = ["지자체·공공기관", "여행사·관광기업"];

export type ApiKey = {
  id: string;
  label: string;
  createdAt: string;
};

export type Organization = {
  name: string;
  type: string;
  department: string;
  email: string;
  description: string;
  contactName: string;
  contactRole: string;
  logo: string;
  notifyTrend: boolean;
  notifyReport: boolean;
  notifyWeekly: boolean;
  apiKeys: ApiKey[];
};

const seed: Organization = {
  name: "",
  type: "",
  department: "",
  email: "",
  description: "",
  contactName: "",
  contactRole: "",
  logo: "",
  notifyTrend: true,
  notifyReport: true,
  notifyWeekly: false,
  apiKeys: [],
};

let organization: Organization = load();
const listeners = new Set<() => void>();

function load(): Organization {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...seed, ...(JSON.parse(raw) as Partial<Organization>) };
  } catch {
    // 저장소를 못 읽으면 기본값으로 시작한다.
  }
  return seed;
}

function commit(next: Organization) {
  organization = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 저장에 실패해도 화면 상태는 유지한다.
  }
  listeners.forEach(listener => listener());
}

// 백엔드 orgType 코드를 화면에서 고르는 값으로 옮긴다.
function toOrganizationType(orgType: string) {
  return orgType === "travel_company" ? "여행사·관광기업" : "지자체·공공기관";
}

// 로그인한 기관 정보로 빈 칸만 채운다. 사용자가 이미 고쳐서 저장한 값은
// 건드리지 않는다.
export function hydrateFromAccount(me: OrgMe) {
  const filled: Partial<Organization> = {};
  if (!organization.name) filled.name = me.orgName;
  if (!organization.email) filled.email = me.managerEmail;
  if (!organization.contactName) filled.contactName = me.managerName;
  if (!organization.type) filled.type = toOrganizationType(me.orgType);
  if (Object.keys(filled).length === 0) return;
  organization = { ...organization, ...filled };
  listeners.forEach(listener => listener());
}

export function useOrganization() {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => organization
  );
}

export function saveOrganization(patch: Partial<Organization>) {
  commit({ ...organization, ...patch });
}

export function issueApiKey(label: string) {
  const key: ApiKey = {
    id: `tp_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`,
    label,
    createdAt: new Date().toISOString(),
  };
  commit({ ...organization, apiKeys: [...organization.apiKeys, key] });
}

export function revokeApiKey(id: string) {
  commit({
    ...organization,
    apiKeys: organization.apiKeys.filter(key => key.id !== id),
  });
}
