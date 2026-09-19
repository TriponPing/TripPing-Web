import { useSyncExternalStore } from "react";

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
  name: "한국관광공사",
  type: "지자체·공공기관",
  department: "관광데이터전략팀",
  email: "tourism@kto.or.kr",
  description:
    "실제 여행객의 이동 경로를 기반으로 지역 관광 트렌드를 분석합니다.",
  contactName: "이지호",
  contactRole: "관광데이터 분석",
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
