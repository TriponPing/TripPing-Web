export const productStatuses = ["초안", "검토 중", "완료", "게시"] as const;

export type ProductStatus = (typeof productStatuses)[number];

export const congestionLevels = ["여유", "보통", "혼잡"] as const;

export type Congestion = (typeof congestionLevels)[number];

export type RouteStop = {
  id: string;
  name: string;
  desc: string;
  score: string;
  congestion?: Congestion;
};

export type Spot = {
  id: string;
  name: string;
  region: string;
  desc: string;
  score: string;
  congestion: Congestion;
};

// 실제로는 /map/places · /regions/search 응답으로 대체될 후보 목록이다.
export const spotCatalog: Spot[] = [
  {
    id: "sc-seongsan",
    name: "성산일출봉",
    region: "제주",
    desc: "일출 명소 · 평균 체류 1.4시간",
    score: "4.8",
    congestion: "혼잡",
  },
  {
    id: "sc-seopjikoji",
    name: "섭지코지",
    region: "제주",
    desc: "해안 산책 · 평균 체류 1.2시간",
    score: "4.7",
    congestion: "보통",
  },
  {
    id: "sc-udo",
    name: "우도",
    region: "제주",
    desc: "섬 여행 · 평균 체류 3.1시간",
    score: "4.6",
    congestion: "보통",
  },
  {
    id: "sc-hamdeok",
    name: "함덕해수욕장",
    region: "제주",
    desc: "해변 휴식 · 평균 체류 2.0시간",
    score: "4.7",
    congestion: "여유",
  },
  {
    id: "sc-gimnyeong",
    name: "김녕성세기해변",
    region: "제주",
    desc: "한적한 해변 · 평균 체류 1.5시간",
    score: "4.6",
    congestion: "여유",
  },
  {
    id: "sc-bijarim",
    name: "비자림",
    region: "제주",
    desc: "숲길 산책 · 평균 체류 1.3시간",
    score: "4.5",
    congestion: "여유",
  },
  {
    id: "sc-haeundae",
    name: "해운대",
    region: "부산",
    desc: "해변 산책 · 평균 체류 2.1시간",
    score: "4.7",
    congestion: "혼잡",
  },
  {
    id: "sc-gwangalli",
    name: "광안리",
    region: "부산",
    desc: "야경 명소 · 평균 체류 1.8시간",
    score: "4.6",
    congestion: "보통",
  },
  {
    id: "sc-gamcheon",
    name: "감천문화마을",
    region: "부산",
    desc: "골목 탐방 · 평균 체류 1.5시간",
    score: "4.4",
    congestion: "혼잡",
  },
  {
    id: "sc-huinnyeoul",
    name: "흰여울문화마을",
    region: "부산",
    desc: "해안 절벽길 · 평균 체류 1.4시간",
    score: "4.6",
    congestion: "여유",
  },
  {
    id: "sc-dalmaji",
    name: "달맞이길",
    region: "부산",
    desc: "산책·카페 · 평균 체류 1.6시간",
    score: "4.5",
    congestion: "여유",
  },
  {
    id: "sc-bukchon",
    name: "북촌",
    region: "서울",
    desc: "한옥 골목 · 평균 체류 1.3시간",
    score: "4.5",
    congestion: "혼잡",
  },
  {
    id: "sc-seochon",
    name: "서촌",
    region: "서울",
    desc: "로컬 식당 · 평균 체류 1.7시간",
    score: "4.4",
    congestion: "보통",
  },
  {
    id: "sc-ikseon",
    name: "익선동",
    region: "서울",
    desc: "카페 거리 · 평균 체류 2.0시간",
    score: "4.6",
    congestion: "보통",
  },
  {
    id: "sc-euljiro",
    name: "을지로",
    region: "서울",
    desc: "노포·바 · 평균 체류 1.9시간",
    score: "4.6",
    congestion: "여유",
  },
  {
    id: "sc-seongsu",
    name: "성수동",
    region: "서울",
    desc: "편집숍·카페 · 평균 체류 2.2시간",
    score: "4.7",
    congestion: "보통",
  },
];

export function stopFromSpot(spotId: string): RouteStop {
  const spot = spotCatalog.find(item => item.id === spotId);
  if (!spot) throw new Error(`알 수 없는 관광지: ${spotId}`);
  return {
    id: `${spot.id}-${Math.random().toString(36).slice(2, 7)}`,
    name: spot.name,
    desc: spot.desc,
    score: spot.score,
    congestion: spot.congestion,
  };
}

// 만족도가 낮거나 혼잡한 구간을 "대체 관광지 추천" 대상으로 본다.
export function needsAlternative(stop: RouteStop) {
  return Number(stop.score) < 4.5 || stop.congestion === "혼잡";
}

export function suggestAlternatives(area: string, route: RouteStop[]) {
  const used = new Set(route.map(stop => stop.name));
  return spotCatalog.filter(
    spot =>
      area.includes(spot.region) &&
      !used.has(spot.name) &&
      spot.congestion !== "혼잡" &&
      Number(spot.score) >= 4.5
  );
}

export type Product = {
  id: string;
  title: string;
  status: ProductStatus;
  area: string;
  updatedAt: string;
  score: number;
  color: "blue" | "mint" | "orange";
  description: string;
  route: RouteStop[];
  tags: string[];
  price: number;
  duration: string;
  target: string;
  monthlyVisitors: number;
  confidence: number;
};

export const durationOptions = ["당일", "1박 2일", "2박 3일"];
export const targetOptions = ["20–30대 커플", "가족 여행객", "외국인 관광객"];

export const seedProducts: Product[] = [
  {
    id: "jeju-east",
    title: "제주 동부, 바다를 따라 걷는 1박 2일",
    status: "초안",
    area: "제주 동부",
    updatedAt: "2026-09-19T14:20:00",
    score: 86,
    color: "blue",
    description:
      "실제 여행객이 가장 많이 이어서 방문한 동선을 바탕으로, 바다와 지역의 이야기를 천천히 경험하는 여행상품입니다.",
    route: ["sc-seongsan", "sc-seopjikoji", "sc-udo"].map(stopFromSpot),
    tags: ["제주동부", "바다산책", "실제인기루트"],
    price: 289000,
    duration: "1박 2일",
    target: "20–30대 커플",
    monthlyVisitors: 1200,
    confidence: 86,
  },
  {
    id: "busan-coast",
    title: "부산의 밤과 골목, 해안 감성 코스",
    status: "검토 중",
    area: "부산",
    updatedAt: "2026-09-18T09:12:00",
    score: 78,
    color: "mint",
    description:
      "해운대에서 시작해 골목으로 이어지는 야간 동선입니다. 저녁 시간대 이동량이 특히 높은 구간을 묶었습니다.",
    route: ["sc-haeundae", "sc-gwangalli", "sc-gamcheon"].map(stopFromSpot),
    tags: ["부산야경", "해안감성", "골목탐방"],
    price: 214000,
    duration: "1박 2일",
    target: "20–30대 커플",
    monthlyVisitors: 964,
    confidence: 78,
  },
  {
    id: "seoul-food",
    title: "서울 도심에서 만나는 로컬 미식 루트",
    status: "완료",
    area: "서울 종로",
    updatedAt: "2026-08-24T16:40:00",
    score: 74,
    color: "orange",
    description:
      "북촌에서 익선동으로 이어지는 도보 미식 동선입니다. 짧은 이동 거리 대비 방문 순서가 뚜렷하게 나타납니다.",
    route: ["sc-bukchon", "sc-seochon", "sc-ikseon"].map(stopFromSpot),
    tags: ["서울미식", "도보여행", "로컬맛집"],
    price: 98000,
    duration: "당일",
    target: "가족 여행객",
    monthlyVisitors: 788,
    confidence: 74,
  },
];

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
