import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  GripVertical,
  MapPin,
  Plus,
  Save,
  Search,
  Sparkles,
  RefreshCw,
  Star,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import PortalChrome from "@/components/PortalChrome";
import ProductRouteMap from "@/components/ProductRouteMap";
import {
  placesApi,
  productsApi,
  spotsApi,
  type ProductDetail as ProductDetailDto,
  type Region,
  type SpotSearchResult,
} from "@/lib/api";
import {
  durationLabel,
  durationMinutes,
  statusCode,
  statusLabel,
  toRouteStops,
  toSpotPayload,
} from "@/lib/productMapping";
import {
  durationOptions,
  formatPrice,
  productStatuses,
  regionFromAddress,
  stopFromPlace,
  needsAlternative,
  suggestAlternatives,
  targetOptions,
  type ProductStatus,
  type RouteStop,
} from "@/lib/productsData";

const fieldStyle = {
  display: "block",
  width: "100%",
  border: "1px solid #dfe9ed",
  borderRadius: 5,
  background: "#fff",
  padding: 9,
  marginTop: 5,
  color: "#526a75",
  fontSize: 10,
} as const;

const tagInputStyle = {
  width: 90,
  padding: "7px 9px",
  border: "1px solid #bed4de",
  borderRadius: 5,
  outline: 0,
  color: "#4e88ac",
  background: "#eff8fd",
  fontSize: 9,
} as const;

// 화면에서 편집하는 값. 저장할 때 백엔드 형식으로 옮긴다.
type Draft = {
  title: string;
  description: string;
  status: ProductStatus;
  price: number;
  duration: string;
  target: string;
  regionId: string | null;
  route: RouteStop[];
  tags: string[];
};

function toDraft(detail: ProductDetailDto, regions: Region[] = []): Draft {
  return {
    title: detail.productName,
    description: detail.description ?? "",
    status: statusLabel(detail.status),
    price: detail.price ?? 0,
    duration: durationLabel(detail.expectedDuration),
    target: detail.targetCustomer ?? targetOptions[0],
    regionId: detail.regionId,
    route: toRouteStops(detail, regions),
    tags: detail.hashtags,
  };
}

function RouteLine({ route }: { route: RouteStop[] }) {
  if (route.length === 0) return null;
  const width = 620;
  const points = route.map((stop, index) => ({
    stop,
    x:
      route.length === 1
        ? width / 2
        : 60 + index * ((width - 120) / (route.length - 1)),
    y: 110 + 38 * Math.sin(index * 1.15),
  }));

  return (
    <div className="route-map" style={{ marginTop: 15 }}>
      <svg viewBox="0 0 620 200" style={{ width: "100%", height: "100%" }}>
        <polyline
          points={points.map(point => `${point.x},${point.y}`).join(" ")}
          fill="none"
          stroke="#0074CE"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="7 6"
        />
        {points.map(({ stop, x, y }, index) => (
          <g key={stop.id}>
            <circle
              cx={x}
              cy={y}
              r="15"
              fill={stop.congestion === "혼잡" ? "#d7903d" : "#0074CE"}
            />
            <text
              x={x}
              y={y + 4}
              textAnchor="middle"
              fill="#fff"
              fontSize="11"
              fontWeight="700"
            >
              {index + 1}
            </text>
            <text
              x={x}
              y={y + 32}
              textAnchor="middle"
              fill="#48616c"
              fontSize="11"
            >
              {stop.name}
            </text>
            {stop.congestion && (
              <text
                x={x}
                y={y + 46}
                textAnchor="middle"
                fill="#8799a0"
                fontSize="9"
              >
                {stop.congestion}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function ProductDetail() {
  const [, params] = useRoute("/products/:id");
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const productId = Number(params?.id);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [newTag, setNewTag] = useState("");
  const [spotQuery, setSpotQuery] = useState("");
  const [picking, setPicking] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [results, setResults] = useState<SpotSearchResult[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const dragFrom = useRef<number | null>(null);

  const product = useQuery({
    queryKey: ["product", productId],
    queryFn: () => productsApi.detail(productId).then(res => res.data),
    enabled: Number.isFinite(productId),
  });

  const save = useMutation({
    mutationFn: (next: Draft) =>
      productsApi
        .update(productId, {
          productName: next.title,
          description: next.description,
          status: statusCode(next.status),
          price: next.price,
          expectedDuration: durationMinutes(next.duration),
          targetCustomer: next.target,
          regionId: next.regionId,
          spots: toSpotPayload(next.route),
          hashtags: next.tags,
        })
        .then(res => res.data),
    onSuccess: saved => {
      queryClient.setQueryData(["product", productId], saved);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("상품을 저장했습니다.");
    },
    onError: () => toast.error("저장하지 못했습니다."),
  });

  useEffect(() => {
    if (product.data) setDraft(toDraft(product.data, regions));
  }, [product.data, regions]);

  useEffect(() => {
    placesApi
      .regions()
      .then(({ data }) => setRegions(data))
      .catch(() => setRegions([]));
  }, []);

  // 타이핑마다 호출하지 않도록 잠깐 기다렸다가 검색한다.
  useEffect(() => {
    const query = spotQuery.trim();
    if (!picking || query.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      spotsApi
        .search(query)
        .then(({ data }) => setResults(data))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [spotQuery, picking]);

  if (product.isLoading || (product.isSuccess && !draft)) {
    return (
      <PortalChrome title="관광상품 기획" eyebrow="PRODUCT LAB">
        <div className="product-tip">
          <div>
            <Sparkles size={20} />
          </div>
          <span>
            <b>상품을 불러오는 중입니다.</b>
          </span>
        </div>
      </PortalChrome>
    );
  }

  if (product.isError || !draft) {
    return (
      <PortalChrome title="관광상품 기획" eyebrow="PRODUCT LAB">
        <div className="product-tip">
          <div>
            <Sparkles size={20} />
          </div>
          <span>
            <b>상품을 찾을 수 없습니다.</b>
            <small>삭제되었거나 주소가 잘못되었을 수 있습니다.</small>
          </span>
          <Link href="/products">
            상품 목록으로 <ArrowRight size={15} />
          </Link>
        </div>
      </PortalChrome>
    );
  }

  const patch = (changes: Partial<Draft>) =>
    setDraft(current => (current ? { ...current, ...changes } : current));

  const dirty =
    product.data != null &&
    JSON.stringify(draft) !== JSON.stringify(toDraft(product.data, regions));

  const dropAt = (to: number) => {
    const from = dragFrom.current;
    dragFrom.current = null;
    if (from === null || from === to) return;
    const route = [...draft.route];
    const [moved] = route.splice(from, 1);
    route.splice(to, 0, moved);
    patch({ route });
  };

  const addTag = () => {
    const tag = newTag.trim().replace(/^#/, "");
    if (!tag || draft.tags.includes(tag)) return setNewTag("");
    patch({ tags: [...draft.tags, tag] });
    setNewTag("");
  };

  const searchResults = results
    .filter(
      place =>
        !draft.route.some(
          stop => stop.spotId != null && stop.spotId === place.spotId
        )
    )
    .slice(0, 8);

  const problemStops = draft.route.filter(needsAlternative);

  // 일정은 spotId로 저장되므로, 아직 등록되지 않은 관광공사 후보는 먼저
  // 등록해서 spotId를 받아야 한다.
  const ensureRegistered = async (place: SpotSearchResult) => {
    if (place.registered && place.spotId != null) return place;
    if (!place.contentId) return null;
    const { data } = await spotsApi.register(place.contentId);
    return data;
  };

  const addStop = async (place: SpotSearchResult) => {
    setAdding(place.contentId ?? place.name);
    try {
      const ready = await ensureRegistered(place);
      if (!ready?.spotId) {
        toast.error("이 관광지는 일정에 담을 수 없습니다.");
        return;
      }
      const region = regionFromAddress(ready.address ?? "", regions);
      const code = regions.find(item => item.regionName === region)?.regionId;
      patch({
        route: [...draft.route, stopFromPlace(ready, region)],
        regionId: draft.regionId ?? code ?? null,
      });
      setSpotQuery("");
      setPicking(false);
    } catch {
      toast.error("관광지를 등록하지 못했습니다.");
    } finally {
      setAdding(null);
    }
  };

  // 추천 목록은 보조 데이터에만 있으므로, 교체할 때 실제 관광지를 찾아
  // spotId를 받아온다. 그래야 저장이 된다.
  const replaceStop = async (targetId: string, spotName: string) => {
    try {
      const { data } = await spotsApi.search(spotName);
      const found = data.find(place => place.name === spotName) ?? data[0];
      const ready = found ? await ensureRegistered(found) : null;
      if (!ready?.spotId) {
        toast.error(`${spotName}을(를) 관광지 목록에서 찾지 못했습니다.`);
        return;
      }
      const region = regionFromAddress(ready.address ?? "", regions);
      patch({
        route: draft.route.map(item =>
          item.id === targetId ? stopFromPlace(ready, region) : item
        ),
      });
      toast.success(`${ready.name}(으)로 교체했습니다.`);
    } catch {
      toast.error("관광지를 불러오지 못했습니다.");
    }
  };

  const insight =
    draft.route.length >= 2
      ? `${draft.route[0].name}에서 ${draft.route[1].name}(으)로 이어지는 일정입니다. 실제 방문 데이터가 쌓이면 이동 흐름 분석이 여기에 표시됩니다.`
      : "일정을 두 곳 이상 추가하면 이동 흐름을 분석해 드립니다.";

  return (
    <PortalChrome title="관광상품 기획" eyebrow="PRODUCT LAB">
      <div className="detail-back">
        <Link href="/products">
          <ArrowLeft size={15} />
          상품 목록으로
        </Link>
        <div>
          <button
            onClick={() => save.mutate(draft)}
            disabled={!dirty || save.isPending}
          >
            <Save size={14} />
            {save.isPending ? "저장 중…" : dirty ? "저장" : "저장됨"}
          </button>
          <button
            className="detail-primary"
            onClick={() => navigate("/reports")}
          >
            보고서 만들기 <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <section className="portal-panel detail-editor">
          <div className="editor-title">
            <span className="draft-pill">AI ROUTE DRAFT</span>
            <span style={{ fontSize: 9, color: "#9aa8ae" }}>
              {dirty ? "저장하지 않은 변경사항" : "모든 변경사항 저장됨"}
            </span>
          </div>
          <input
            className="product-title-input"
            value={draft.title}
            onChange={event => patch({ title: event.target.value })}
            placeholder="상품 이름을 입력하세요"
          />
          <textarea
            className="product-description"
            value={draft.description}
            onChange={event => patch({ description: event.target.value })}
            placeholder="이 상품이 어떤 경험을 담고 있는지 설명해주세요."
          />

          <div className="editor-section">
            <div className="editor-section-head">
              <div>
                <span>ROUTE ITINERARY</span>
                <h3>방문 일정과 순서</h3>
              </div>
              <button onClick={() => setPicking(value => !value)}>
                <Plus size={14} />
                관광지 추가
              </button>
            </div>

            {picking && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  border: "1px solid #e1eaee",
                  borderRadius: 6,
                  background: "#fbfdfe",
                }}
              >
                <div className="product-search" style={{ width: "100%" }}>
                  <Search size={15} />
                  <input
                    autoFocus
                    placeholder="관광지 또는 지역 검색"
                    value={spotQuery}
                    onChange={event => setSpotQuery(event.target.value)}
                  />
                </div>
                {searchResults.map(place => {
                  const busy = adding === (place.contentId ?? place.name);
                  return (
                    <button
                      key={place.contentId ?? `spot-${place.spotId}`}
                      disabled={adding !== null}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "9px 4px",
                        background: "transparent",
                        borderBottom: "1px solid #f0f3f4",
                        textAlign: "left",
                        opacity: adding !== null && !busy ? 0.5 : 1,
                      }}
                      onClick={() => addStop(place)}
                    >
                      <MapPin size={14} color="#0074CE" />
                      <span style={{ flex: 1, fontSize: 10, color: "#4d6570" }}>
                        <b>{place.name}</b>
                        <small style={{ display: "block", color: "#9eacb2" }}>
                          {[place.category, place.address]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      </span>
                      {busy && (
                        <small style={{ color: "#9eacb2", fontSize: 9 }}>
                          담는 중…
                        </small>
                      )}
                    </button>
                  );
                })}
                {searchResults.length === 0 && (
                  <p
                    style={{
                      color: "#99a8ae",
                      fontSize: 10,
                      padding: "12px 4px",
                    }}
                  >
                    {searching
                      ? "검색 중…"
                      : spotQuery.trim().length < 2
                        ? "관광지 이름을 두 글자 이상 입력하세요."
                        : "검색 결과가 없습니다."}
                  </p>
                )}
              </div>
            )}

            <div className="itinerary-list">
              {draft.route.map((item, index) => (
                <div
                  className="itinerary-row"
                  key={item.id}
                  draggable
                  onDragStart={() => (dragFrom.current = index)}
                  onDragOver={event => event.preventDefault()}
                  onDrop={() => dropAt(index)}
                >
                  <GripVertical size={16} className="drag" />
                  <span className="itinerary-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="itinerary-icon">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <b>{item.name}</b>
                    <small>{item.desc}</small>
                  </div>
                  <span className="rating">
                    {item.score !== "-" && (
                      <>
                        <Star size={12} />
                        {item.score}
                      </>
                    )}
                  </span>
                  <button
                    onClick={() =>
                      patch({
                        route: draft.route.filter(stop => stop.id !== item.id),
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {draft.route.length === 0 && (
                <p
                  style={{ color: "#99a8ae", fontSize: 10, padding: "14px 0" }}
                >
                  아직 일정이 없습니다. 관광지를 추가해 순서를 만들어보세요.
                </p>
              )}
            </div>
          </div>

          <div className="editor-section">
            <div className="editor-section-head">
              <div>
                <span>ROUTE PREVIEW</span>
                <h3>동선 미리보기</h3>
              </div>
              <span style={{ fontSize: 9, color: "#8799a0" }}>
                주황색 = 혼잡 구간
              </span>
            </div>
            <ProductRouteMap
              route={draft.route}
              fallback={<RouteLine route={draft.route} />}
            />
          </div>

          <div className="editor-section">
            <div className="editor-section-head">
              <div>
                <span>PRODUCT TAGS</span>
                <h3>상품 해시태그</h3>
              </div>
            </div>
            <div className="tag-input">
              {draft.tags.map(tag => (
                <span key={tag}>
                  #{tag}
                  <button
                    style={{
                      width: 12,
                      height: 12,
                      border: 0,
                      background: "transparent",
                      marginLeft: 4,
                      verticalAlign: "middle",
                    }}
                    onClick={() =>
                      patch({ tags: draft.tags.filter(item => item !== tag) })
                    }
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                style={tagInputStyle}
                value={newTag}
                placeholder="태그 추가"
                onChange={event => setNewTag(event.target.value)}
                onKeyDown={event => event.key === "Enter" && addTag()}
              />
              <button onClick={addTag}>
                <Plus size={13} />
              </button>
            </div>
          </div>
        </section>

        <aside className="detail-side">
          <section className="portal-panel ai-panel">
            <div className="ai-panel-icon">
              <Sparkles size={19} />
            </div>
            <span>AI ROUTE INSIGHT</span>
            <h3>이 조합이 뜨는 이유</h3>
            <p>{insight}</p>
            <button
              onClick={() => {
                patch({
                  description: `${draft.description}${draft.description ? "\n\n" : ""}${insight}`,
                });
                toast.success("문구를 상품 설명에 넣었습니다.");
              }}
            >
              추천 문구 반영 <Check size={14} />
            </button>
          </section>

          {problemStops.length > 0 && (
            <section className="portal-panel detail-info">
              <span>ALTERNATIVE SPOTS</span>
              <h3>대체 관광지 추천</h3>
              {problemStops.map(stop => {
                const alternatives = suggestAlternatives(
                  draft.route,
                  stop.region
                );
                return (
                  <div key={stop.id} style={{ marginTop: 14 }}>
                    <p
                      style={{
                        color: "#76909d",
                        fontSize: 10,
                        lineHeight: 1.6,
                      }}
                    >
                      <TriangleAlert
                        size={12}
                        color="#d7903d"
                        style={{ verticalAlign: "-2px", marginRight: 4 }}
                      />
                      <b>{stop.name}</b>
                      {stop.congestion === "혼잡"
                        ? "은(는) 혼잡 구간입니다."
                        : "은(는) 만족도가 " + stop.score + "로 낮습니다."}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        marginTop: 7,
                      }}
                    >
                      {alternatives.slice(0, 3).map(spot => (
                        <button
                          key={spot.name}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "6px 8px",
                            border: "1px dashed #bed4de",
                            borderRadius: 5,
                            background: "#fff",
                            color: "#4e88ac",
                            fontSize: 9,
                          }}
                          onClick={() => replaceStop(stop.id, spot.name)}
                        >
                          <RefreshCw size={11} />
                          {spot.name} {spot.score}
                        </button>
                      ))}
                      {alternatives.length === 0 && (
                        <small style={{ color: "#9eacb2", fontSize: 9 }}>
                          이 지역에 추천할 대체 관광지가 없습니다.
                        </small>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          <section className="portal-panel detail-info">
            <span>PRODUCT SETTINGS</span>
            <h3>상품 기본 정보</h3>
            <label>
              진행 상태
              <select
                value={draft.status}
                onChange={event =>
                  patch({ status: event.target.value as ProductStatus })
                }
              >
                {productStatuses.map(status => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              판매 가격 (원)
              <input
                style={fieldStyle}
                type="number"
                min={0}
                step={1000}
                value={draft.price}
                onChange={event =>
                  patch({ price: Number(event.target.value) || 0 })
                }
              />
            </label>
            <label>
              여행 기간
              <select
                value={draft.duration}
                onChange={event => patch({ duration: event.target.value })}
              >
                {durationOptions.map(option => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label>
              예상 대상
              <select
                value={draft.target}
                onChange={event => patch({ target: event.target.value })}
              >
                {targetOptions.map(option => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <div className="info-line">
              <span>
                <Clock3 size={14} />
                판매가
              </span>
              <b>{draft.price > 0 ? formatPrice(draft.price) : "미정"}</b>
            </div>
            <div className="info-line">
              <span>
                <MapPin size={14} />
                일정
              </span>
              <b>{draft.route.length}곳</b>
            </div>
          </section>
        </aside>
      </div>
    </PortalChrome>
  );
}
