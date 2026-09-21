import { productsApi, type RouteRanking } from "@/lib/api";

// 트렌드/대시보드에서 발견한 루트를 그대로 상품 초안으로 옮긴다.
//
// 급상승 루트 응답(RouteRanking)에는 routeName과 함께 방문 순서대로 정렬된 spotIds가
// 들어있다. 그래서 초안을 만들고 그 spotIds를 그대로 넣어주면 방문 순서가 보존된 채로
// 상품 상세 화면에서 이어서 편집할 수 있다.
//
// 상품 생성(POST)과 스팟 지정(PATCH)이 분리되어 있는 건 기존 상품 API 구조를 그대로
// 따른 것이다 — 생성은 빈 초안만 만들고, 내용은 항상 수정으로 채운다.
export async function createDraftFromRoute(route: RouteRanking, regionId?: string) {
  const created = await productsApi.create({
    productName: route.routeName,
    ...(regionId ? { regionId } : {}),
  });
  const productId = created.data.productId;

  if (route.spotIds.length > 0) {
    await productsApi.update(productId, {
      spots: route.spotIds.map((spotId) => ({ spotId })),
    });
  }

  return productId;
}
