import { authApi, type MeResponse } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

const AUTH_ME_KEY = ["auth", "me"] as const;

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } = options ?? {};
  const queryClient = useQueryClient();

  const meQuery = useQuery<MeResponse | null>({
    queryKey: AUTH_ME_KEY,
    queryFn: async () => {
      try {
        const { data } = await authApi.me();
        return data;
      } catch (error) {
        // 401/403 = 로그인 안 된 상태. 에러로 던지지 않고 null 사용자로 처리.
        if (error instanceof AxiosError && (error.response?.status === 401 || error.response?.status === 403)) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // 이미 세션이 끊긴 상태여도 로그아웃 처리는 그대로 진행
    } finally {
      queryClient.setQueryData(AUTH_ME_KEY, null);
      await queryClient.invalidateQueries({ queryKey: AUTH_ME_KEY });
    }
  }, [queryClient]);

  const state = useMemo(() => {
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading,
      error: meQuery.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [meQuery.data, meQuery.error, meQuery.isLoading]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [redirectOnUnauthenticated, redirectPath, meQuery.isLoading, state.user]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
