import {
  PRODUCT_STATUS,
  type ProductDetail,
  type ProductStatusCode,
  type ProductSummary,
  type Region,
} from "./api";
import {
  regionFromAddress,
  spotMeta,
  type ProductStatus,
  type RouteStop,
} from "./productsData";

// 백엔드는 진행 상태를 코드로, 화면은 한글로 다룬다.
const STATUS_TO_CODE = Object.fromEntries(
  Object.entries(PRODUCT_STATUS).map(([code, label]) => [label, code])
) as Record<ProductStatus, ProductStatusCode>;

export function statusLabel(code: ProductStatusCode | null): ProductStatus {
  return (code && PRODUCT_STATUS[code]) || "초안";
}

export function statusCode(label: ProductStatus): ProductStatusCode {
  return STATUS_TO_CODE[label] ?? "DRAFT";
}

// 여행 기간은 화면에서 고르는 값이고 DB는 분 단위 정수다.
const DURATION_MINUTES: Record<string, number> = {
  당일: 480,
  "1박 2일": 1440,
  "2박 3일": 2880,
};

export function durationLabel(minutes: number | null) {
  if (minutes == null) return "당일";
  const hit = Object.entries(DURATION_MINUTES).find(
    ([, value]) => value === minutes
  );
  return hit ? hit[0] : "당일";
}

export function durationMinutes(label: string) {
  return DURATION_MINUTES[label] ?? DURATION_MINUTES["당일"];
}

// 카드 표지 색은 저장하지 않는다. 같은 상품이 늘 같은 색으로 보이도록
// productId에서 뽑는다.
const COVER_COLORS = ["blue", "mint", "orange"] as const;

export function coverColor(productId: number) {
  return COVER_COLORS[productId % COVER_COLORS.length];
}

// 일정은 spot_id만 저장되고 이름·주소는 조회 때 채워져 온다.
export function toRouteStops(
  detail: ProductDetail,
  regions: Region[] = []
): RouteStop[] {
  return detail.spots.map(spot => {
    const name = spot.name ?? "이름 없는 관광지";
    const meta = spotMeta(name);
    return {
      id: `spot-${spot.spotId}-${spot.visitOrder}`,
      name,
      desc: spot.address ?? "",
      // 평점은 실제 데이터가 쌓이기 전까지 비워둔다. 화면은 "-"일 때
      // 평점 배지를 아예 그리지 않는다(ProductDetail 참고).
      score: "-",
      congestion: meta?.congestion,
      region:
        meta?.region ??
        (spot.address ? regionFromAddress(spot.address, regions) : undefined),
      spotId: spot.spotId,
      address: spot.address ?? undefined,
      latitude: spot.latitude ?? undefined,
      longitude: spot.longitude ?? undefined,
    };
  });
}

export function toSpotPayload(route: RouteStop[]) {
  return route
    .filter(stop => stop.spotId != null)
    .map(stop => ({ spotId: stop.spotId as number }));
}

export function areaOf(product: ProductSummary) {
  return product.regionName ?? "지역 미정";
}
