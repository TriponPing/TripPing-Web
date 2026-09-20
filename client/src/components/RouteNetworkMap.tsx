import { useEffect, useRef } from "react";
import { useNaverMaps } from "@/hooks/useNaverMaps";
import type { RouteNetwork } from "@/lib/api";

// 네이버 지도 SDK 타입 패키지를 따로 받지 않으므로 쓰는 만큼만 적어둔다.
// (ProductRouteMap.tsx와 같은 방식 — 거기서 쓰는 것 + Polyline 다중 생성만 추가)
type LatLng = { lat: () => number; lng: () => number };
type NaverMaps = {
  LatLng: new (lat: number, lng: number) => LatLng;
  LatLngBounds: new () => { extend: (point: LatLng) => void };
  Map: new (
    el: HTMLElement,
    options: Record<string, unknown>
  ) => {
    fitBounds: (bounds: unknown, padding?: Record<string, number>) => void;
    setCenter: (point: LatLng) => void;
    setZoom: (level: number) => void;
    destroy?: () => void;
  };
  Marker: new (options: Record<string, unknown>) => {
    setMap: (map: unknown) => void;
  };
  Polyline: new (options: Record<string, unknown>) => {
    setMap: (map: unknown) => void;
  };
};

function naverMaps(): NaverMaps | null {
  const naver = (window as unknown as { naver?: { maps?: NaverMaps } }).naver;
  return naver?.maps ?? null;
}

// 방문 핑이 많은 관광지일수록 큰 원. 숫자는 그 관광지에 찍힌 핑 수.
function markerIcon(name: string, visitCount: number, ratio: number) {
  const size = Math.round(22 + ratio * 14); // 22~36px
  const label = visitCount > 99 ? "99+" : String(visitCount);
  return {
    content:
      `<div style="position:relative;display:flex;flex-direction:column;align-items:center">` +
      `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#5db4e9;color:#fff;` +
      `font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;` +
      `border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.25)">${label}</div>` +
      `<div style="margin-top:3px;padding:1px 5px;border-radius:4px;background:rgba(255,255,255,.92);` +
      `border:1px solid rgba(219,229,223,.9);font-size:9px;color:#516862;white-space:nowrap">${name}</div>` +
      `</div>`,
    anchor: { x: size / 2, y: size / 2 },
  };
}

// 대시보드 "여행 루트 네트워크"를 실제 네이버 지도 위에 그린다.
//
// 키(VITE_NAVER_MAP_CLIENT_ID)가 없거나 인증에 실패하면, 또는 그릴 노드가 없으면
// fallback(좌표 산점도 / 로딩 / 빈 상태)을 그대로 보여준다 — ProductRouteMap과 같은 규칙.
export default function RouteNetworkMap({
  network,
  fallback,
}: {
  network: RouteNetwork | undefined;
  fallback: React.ReactNode;
}) {
  const status = useNaverMaps();
  const container = useRef<HTMLDivElement>(null);
  const nodes = network?.nodes ?? [];
  const edges = network?.edges ?? [];

  useEffect(() => {
    if (status !== "ready" || !container.current || nodes.length === 0) return;
    const maps = naverMaps();
    if (!maps) return;

    const pointBySpotId: Record<number, LatLng> = {};
    nodes.forEach((node) => {
      pointBySpotId[node.spotId] = new maps.LatLng(node.latitude, node.longitude);
    });

    const map = new maps.Map(container.current, {
      center: pointBySpotId[nodes[0].spotId],
      zoom: 11,
      mapDataControl: false,
      scaleControl: false,
      logoControl: true,
    });

    let maxVisits = 1;
    let maxWeight = 1;
    nodes.forEach((n) => {
      if (n.visitCount > maxVisits) maxVisits = n.visitCount;
    });
    edges.forEach((e) => {
      if (e.weight > maxWeight) maxWeight = e.weight;
    });

    // 같은 여행에서 이어서 방문한 구간. 자주 이어진 구간일수록 굵고 진하게.
    const lines = edges
      .filter((edge) => pointBySpotId[edge.fromSpotId] && pointBySpotId[edge.toSpotId])
      .map((edge) => {
        const ratio = edge.weight / maxWeight;
        return new maps.Polyline({
          map,
          path: [pointBySpotId[edge.fromSpotId], pointBySpotId[edge.toSpotId]],
          strokeColor: "#0074CE",
          strokeWeight: Math.round(2 + ratio * 4),
          strokeOpacity: 0.35 + ratio * 0.45,
        });
      });

    const markers = nodes.map(
      (node) =>
        new maps.Marker({
          position: pointBySpotId[node.spotId],
          map,
          title: `${node.name} · 방문 핑 ${node.visitCount.toLocaleString()}건`,
          icon: markerIcon(node.name, node.visitCount, node.visitCount / maxVisits),
        })
    );

    if (nodes.length > 1) {
      const bounds = new maps.LatLngBounds();
      nodes.forEach((node) => bounds.extend(pointBySpotId[node.spotId]));
      map.fitBounds(bounds, { top: 56, right: 56, bottom: 56, left: 56 });
    } else {
      map.setCenter(pointBySpotId[nodes[0].spotId]);
      map.setZoom(13);
    }

    return () => {
      markers.forEach((marker) => marker.setMap(null));
      lines.forEach((line) => line.setMap(null));
      map.destroy?.();
    };
  }, [status, nodes, edges]);

  if (status !== "ready" || nodes.length === 0) return <>{fallback}</>;

  return (
    <div className="route-map network-map">
      <div ref={container} className="network-map-canvas" aria-label="여행 루트 네트워크 지도" />
      <div className="map-legend">
        <span>
          <i className="legend-dot blue" /> 실제 이동 경로
        </span>
        <span>원 크기는 방문 핑 수 · 선 굵기는 이어진 횟수</span>
      </div>
    </div>
  );
}
