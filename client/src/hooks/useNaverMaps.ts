import { useEffect, useState } from "react";

// 네이버 지도 SDK를 필요한 화면에서만 불러온다.
//
// index.html에 <script>로 박으면 공통 파일을 건드려야 하고, 지도를 쓰지 않는
// 화면에서도 매번 받아온다. 그래서 여기서 한 번만 주입하고 재사용한다.
const SDK_URL = "https://oapi.map.naver.com/openapi/v3/maps.js";
const SCRIPT_ID = "naver-maps-sdk";

export type NaverMapsStatus = "disabled" | "loading" | "ready" | "failed";

let loader: Promise<void> | null = null;

function loadSdk(clientId: string) {
  if (loader) return loader;

  loader = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      resolve();
      return;
    }
    // 키가 이 도메인에 등록돼 있지 않으면 SDK가 이 콜백으로 알려준다.
    // 스크립트 자체는 정상적으로 받아지므로 onload만으로는 알 수 없다.
    (window as unknown as Record<string, unknown>).navermap_authFailure = () =>
      reject(new Error("네이버 지도 인증에 실패했습니다."));

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `${SDK_URL}?ncpKeyId=${encodeURIComponent(clientId)}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("네이버 지도를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });

  return loader;
}

export function useNaverMaps(): NaverMapsStatus {
  const clientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID as
    string | undefined;
  const [status, setStatus] = useState<NaverMapsStatus>(
    clientId ? "loading" : "disabled"
  );

  useEffect(() => {
    if (!clientId) return;
    let alive = true;
    loadSdk(clientId)
      .then(() => alive && setStatus("ready"))
      .catch(() => alive && setStatus("failed"));
    return () => {
      alive = false;
    };
  }, [clientId]);

  return status;
}
