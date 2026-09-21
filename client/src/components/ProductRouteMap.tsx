import { useEffect, useRef } from "react";
import { useNaverMaps } from "@/hooks/useNaverMaps";
import type { RouteStop } from "@/lib/productsData";

// 네이버 지도 SDK 타입 패키지를 따로 받지 않으므로 쓰는 만큼만 적어둔다.
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
  Position: { TOP_RIGHT: unknown };
};

function naverMaps(): NaverMaps | null {
  const naver = (window as unknown as { naver?: { maps?: NaverMaps } }).naver;
  return naver?.maps ?? null;
}

function hasCoords(stop: RouteStop) {
  return stop.latitude != null && stop.longitude != null;
}

// 순서를 알아볼 수 있게 번호를 박은 마커. 혼잡 구간은 색을 달리한다.
function markerIcon(index: number, congested: boolean) {
  const color = congested ? "#d7903d" : "#0074CE";
  return {
    content: `<div style="width:26px;height:26px;border-radius:50%;background:${color};color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.25)">${index + 1}</div>`,
    anchor: { x: 13, y: 13 },
  };
}

export default function ProductRouteMap({
  route,
  fallback,
}: {
  route: RouteStop[];
  fallback: React.ReactNode;
}) {
  const status = useNaverMaps();
  const container = useRef<HTMLDivElement>(null);
  const plotted = route.filter(hasCoords);

  useEffect(() => {
    if (status !== "ready" || !container.current || plotted.length === 0)
      return;
    const maps = naverMaps();
    if (!maps) return;

    const points = plotted.map(
      stop => new maps.LatLng(Number(stop.latitude), Number(stop.longitude))
    );

    const map = new maps.Map(container.current, {
      center: points[0],
      zoom: 11,
      mapDataControl: false,
      scaleControl: false,
      logoControl: true,
    });

    const markers = plotted.map(
      (stop, index) =>
        new maps.Marker({
          position: points[index],
          map,
          title: stop.name,
          icon: markerIcon(index, stop.congestion === "혼잡"),
        })
    );

    const line =
      points.length > 1
        ? new maps.Polyline({
            map,
            path: points,
            strokeColor: "#0074CE",
            strokeWeight: 3,
            strokeOpacity: 0.9,
            strokeStyle: "shortdash",
          })
        : null;

    if (points.length > 1) {
      const bounds = new maps.LatLngBounds();
      points.forEach(point => bounds.extend(point));
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    } else {
      map.setCenter(points[0]);
      map.setZoom(14);
    }

    return () => {
      markers.forEach(marker => marker.setMap(null));
      line?.setMap(null);
      map.destroy?.();
    };
  }, [status, plotted]);

  // 키가 없거나 인증에 실패하면, 그리고 좌표가 아직 없는 일정이면
  // 기존 순서 도식으로 돌아간다. 화면이 비어 보이지 않게 하기 위함.
  if (status !== "ready" || plotted.length === 0) return <>{fallback}</>;

  return (
    <div
      className="route-map"
      style={{ marginTop: 15 }}
      ref={container}
      aria-label="상품 일정 지도"
    />
  );
}
