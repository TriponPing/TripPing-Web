import type { Region, SpotSearchResult } from "./api";

export const productStatuses = ["초안", "검토 중", "완료", "게시"] as const;

export type ProductStatus = (typeof productStatuses)[number];

export type RouteStop = {
  id: string;
  name: string;
  desc: string;
  score: string;
  congestion?: Congestion;
  region?: string;
  // 백엔드 관광지를 가리킨다. 저장할 때 tour_product_spot.spot_id로 넘어간다.
  spotId?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
};

// tourist_spot.category에 실제로 들어 있는 값. 앱과 같은 분류를 쓴다.
export const spotCategories = [
  { code: "attraction", label: "관광지" },
  { code: "restaurant", label: "식당" },
  { code: "cafe", label: "카페" },
] as const;

export function categoryLabel(code?: string | null) {
  if (!code) return "";
  return spotCategories.find(item => item.code === code)?.label ?? code;
}

export const durationOptions = ["당일", "1박 2일", "2박 3일"];
export const targetOptions = ["20–30대 커플", "가족 여행객", "외국인 관광객"];

// 등록까지 끝난 관광지를 일정 항목으로 옮긴다. 후기·혼잡도가 아직 쌓이지
// 않아 평점 자리는 비워두고, 분류와 주소로 설명을 만든다.
export function stopFromPlace(place: SpotSearchResult, region: string) {
  const stop: RouteStop = {
    id: `spot-${place.spotId}-${Math.random().toString(36).slice(2, 7)}`,
    name: place.name,
    desc: categoryLabel(place.category) || place.address || "",
    score: "-",
    congestion: spotMeta(place.name)?.congestion,
    region,
    spotId: place.spotId ?? undefined,
    address: place.address ?? undefined,
    latitude: place.latitude ?? undefined,
    longitude: place.longitude ?? undefined,
  };
  return stop;
}

// 주소 앞부분으로 지역을 찾는다. /places/search 응답에는 지역 코드가 없고
// "부산 해운대구 ..." 처럼 지역명으로 시작하는 주소만 들어 있다.
export function regionFromAddress(address: string, regions: Region[]) {
  const hit = regions.find(region => address.startsWith(region.regionName));
  return hit?.regionName ?? "";
}

export function formatUpdatedAt(iso: string) {
  const date = new Date(iso);
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round(
    (startOfDay(new Date()) - startOfDay(date)) / 86400000
  );
  if (dayDiff === 0) return `오늘 ${time}`;
  if (dayDiff === 1) return `어제 ${time}`;
  return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} ${time}`;
}

export function formatPrice(price: number) {
  return `${price.toLocaleString("ko-KR")}원`;
}

export const congestionLevels = ["여유", "보통", "혼잡"] as const;

export type Congestion = (typeof congestionLevels)[number];

export type Spot = {
  name: string;
  region: string;
  congestion: Congestion;
};

// 혼잡도 보조 데이터.
//
// ⚠️ 평점(score)은 의도적으로 제거했다. 아직 아무도 평가하지 않은 관광지에
// "4.8" 같은 숫자를 보여주면 그 근거를 설명할 수 없기 때문이다. 실제 평점은
// 여행객 앱에 후기가 쌓이면 /places/{id}/detail의 averageRating에서 그대로
// 가져온다 — 대체 관광지 목록은 이미 그 실제 값을 쓰고 있고, 값이 없으면
// 아예 표시하지 않는다.
//
// 혼잡도는 "대체 관광지 추천을 언제 띄울지" 판단하는 용도로만 남겨둔 보조
// 데이터다. 대표 관광지에 한해 들고 있으며 이름은 실제 DB의 관광지명과 같다.
export const spotCatalog: Spot[] = [
  { name: "성산일출봉", region: "제주", congestion: "혼잡" },
  { name: "섭지코지", region: "제주", congestion: "보통" },
  { name: "우도", region: "제주", congestion: "보통" },
  { name: "함덕해수욕장", region: "제주", congestion: "여유" },
  { name: "비자림", region: "제주", congestion: "여유" },
  { name: "해운대해수욕장", region: "부산", congestion: "혼잡" },
  { name: "광안리해수욕장", region: "부산", congestion: "보통" },
  { name: "감천문화마을", region: "부산", congestion: "혼잡" },
  { name: "흰여울문화마을", region: "부산", congestion: "여유" },
  { name: "북촌한옥마을", region: "서울", congestion: "혼잡" },
  { name: "익선동", region: "서울", congestion: "보통" },
  { name: "을지로", region: "서울", congestion: "여유" },
];

export function spotMeta(name: string) {
  return spotCatalog.find(spot => spot.name === name);
}

// 혼잡한 구간을 "대체 관광지 추천" 대상으로 본다.
// 혼잡도 정보가 없는 관광지는 판단 근거가 없으므로 대상에서 제외한다.
// (예전에는 평점이 낮은 경우도 대상에 넣었지만, 그 평점이 실제 데이터가
//  아니어서 판단 근거로 쓸 수 없었다.)
export function needsAlternative(stop: RouteStop) {
  return stop.congestion === "혼잡";
}

// 일정에서 가장 많이 등장하는 지역.
export function regionOfRoute(route: RouteStop[]) {
  const counts: Record<string, number> = {};
  for (const stop of route) {
    if (stop.region) counts[stop.region] = (counts[stop.region] ?? 0) + 1;
  }
  let best = "";
  for (const region of Object.keys(counts)) {
    if (!best || counts[region] > counts[best]) best = region;
  }
  return best;
}

// 대체 후보는 교체 대상 구간과 같은 지역에서 고른다. 여러 지역이 섞인
// 일정에서 일정 전체의 대표 지역을 쓰면 엉뚱한 지역을 추천하게 된다.
export function suggestAlternatives(route: RouteStop[], forRegion?: string) {
  const used = new Set(route.map(stop => stop.name));
  const region = forRegion || regionOfRoute(route);
  if (!region) return [];
  return spotCatalog.filter(
    spot =>
      spot.region === region &&
      !used.has(spot.name) &&
      spot.congestion !== "혼잡"
  );
}
