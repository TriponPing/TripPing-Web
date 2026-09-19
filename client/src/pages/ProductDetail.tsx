import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  GripVertical,
  MapPin,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Star,
  Trash2,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import PortalChrome from "@/components/PortalChrome";
import {
  durationOptions,
  formatPrice,
  needsAlternative,
  productStatuses,
  spotCatalog,
  stopFromSpot,
  suggestAlternatives,
  targetOptions,
  UNSET_AREA,
  type Product,
  type ProductStatus,
  type RouteStop,
} from "@/lib/productsData";
import { updateProduct, useProduct } from "@/lib/productsStore";

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

const stopNameStyle = {
  width: "100%",
  border: 0,
  outline: 0,
  padding: 0,
  background: "transparent",
  color: "#193441",
  fontSize: 11,
  fontWeight: 700,
} as const;

const stopDescStyle = {
  width: "100%",
  border: 0,
  outline: 0,
  padding: 0,
  marginTop: 3,
  background: "transparent",
  color: "#99a8ae",
  fontSize: 9,
} as const;

function insightText(product: Product) {
  const visitors = product.monthlyVisitors.toLocaleString("ko-KR");
  const [first, second] = product.route;
  if (!first) {
    return "일정을 추가하면 실제 이동 데이터를 바탕으로 이 조합의 흐름을 분석해 드립니다.";
  }
  if (!second) {
    return `최근 30일 여행객 ${visitors}명이 ${first.name}을(를) 방문했습니다. 다음 관광지를 추가하면 이동 흐름을 분석할 수 있습니다.`;
  }
  return `최근 30일 여행객 ${visitors}명이 선택한 순서입니다. ${first.name}에서 ${second.name}(으)로 이어지는 흐름이 특히 강하게 나타납니다.`;
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
  const path = points.map(point => `${point.x},${point.y}`).join(" ");

  return (
    <div className="route-map" style={{ marginTop: 15 }}>
      <svg viewBox="0 0 620 200" style={{ width: "100%", height: "100%" }}>
        <polyline
          points={path}
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
  const product = useProduct(params?.id);
  const [draft, setDraft] = useState<Product | undefined>(product);
  const [newTag, setNewTag] = useState("");
  const [spotQuery, setSpotQuery] = useState("");
  const [picking, setPicking] = useState(false);
  const dragFrom = useRef<number | null>(null);

  useEffect(() => {
    setDraft(product);
  }, [product?.id]);

  const alternatives = useMemo(
    () => (draft ? suggestAlternatives(draft.area, draft.route) : []),
    [draft?.area, draft?.route]
  );

  if (!product || !draft) {
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

  const patch = (changes: Partial<Product>) =>
    setDraft(current => (current ? { ...current, ...changes } : current));

  const dirty = JSON.stringify(draft) !== JSON.stringify(product);

  const save = () => {
    const { id: _id, updatedAt: _updatedAt, ...changes } = draft;
    updateProduct(product.id, changes);
    toast.success("상품 초안을 저장했습니다.");
  };

  const patchStop = (stopId: string, changes: Partial<RouteStop>) =>
    patch({
      route: draft.route.map(stop =>
        stop.id === stopId ? { ...stop, ...changes } : stop
      ),
    });

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

  const query = spotQuery.trim().toLowerCase();
  const searchResults = spotCatalog
    .filter(spot => !draft.route.some(stop => stop.name === spot.name))
    .filter(
      spot =>
        !query ||
        spot.name.toLowerCase().includes(query) ||
        spot.region.toLowerCase().includes(query)
    )
    .slice(0, 6);

  const problemStops = draft.route.filter(needsAlternative);

  return (
    <PortalChrome title="관광상품 기획" eyebrow="PRODUCT LAB">
      <div className="detail-back">
        <Link href="/products">
          <ArrowLeft size={15} />
          상품 목록으로
        </Link>
        <div>
          <button onClick={save} disabled={!dirty}>
            <Save size={14} />
            {dirty ? "저장" : "저장됨"}
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
                {searchResults.map(spot => (
                  <button
                    key={spot.id}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "9px 4px",
                      background: "transparent",
                      borderBottom: "1px solid #f0f3f4",
                      textAlign: "left",
                    }}
                    onClick={() => {
                      const route = [...draft.route, stopFromSpot(spot.id)];
                      patch({
                        route,
                        // 새 초안은 지역이 비어 있다. 첫 관광지의 지역을
                        // 물려받아야 목록 카드와 대체 추천이 제대로 동작한다.
                        area:
                          draft.area === UNSET_AREA ? spot.region : draft.area,
                      });
                      setSpotQuery("");
                      setPicking(false);
                    }}
                  >
                    <MapPin size={14} color="#0074CE" />
                    <span style={{ flex: 1, fontSize: 10, color: "#4d6570" }}>
                      <b>{spot.name}</b>
                      <small style={{ display: "block", color: "#9eacb2" }}>
                        {spot.region} · {spot.desc}
                      </small>
                    </span>
                    <span className="rating">
                      <Star size={12} />
                      {spot.score}
                    </span>
                  </button>
                ))}
                {searchResults.length === 0 && (
                  <p
                    style={{
                      color: "#99a8ae",
                      fontSize: 10,
                      padding: "12px 4px",
                    }}
                  >
                    검색 결과가 없습니다.
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
                    <input
                      style={stopNameStyle}
                      value={item.name}
                      onChange={event =>
                        patchStop(item.id, { name: event.target.value })
                      }
                      placeholder="관광지 이름"
                    />
                    <input
                      style={stopDescStyle}
                      value={item.desc}
                      onChange={event =>
                        patchStop(item.id, { desc: event.target.value })
                      }
                      placeholder="설명"
                    />
                  </div>
                  <span className="rating">
                    <Star size={12} />
                    {item.score}
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
              <span
                className="panel-note"
                style={{ fontSize: 9, color: "#8799a0" }}
              >
                주황색 = 혼잡 구간
              </span>
            </div>
            <RouteLine route={draft.route} />
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
            <p>{insightText(draft)}</p>
            <div className="ai-metric">
              <span>루트 신뢰도</span>
              <b>
                {draft.confidence}
                <span>/100</span>
              </b>
            </div>
            <button
              onClick={() => {
                patch({
                  description: `${draft.description}${draft.description ? "\n\n" : ""}${insightText(draft)} (추정치이며 확정된 수치는 아닙니다.)`,
                });
                toast.success("추천 문구를 상품 설명에 넣었습니다.");
              }}
            >
              추천 문구 반영 <Check size={14} />
            </button>
          </section>

          {problemStops.length > 0 && (
            <section className="portal-panel detail-info">
              <span>ALTERNATIVE SPOTS</span>
              <h3>대체 관광지 추천</h3>
              {problemStops.map(stop => (
                <div key={stop.id} style={{ marginTop: 14 }}>
                  <p
                    style={{ color: "#76909d", fontSize: 10, lineHeight: 1.6 }}
                  >
                    <TriangleAlert
                      size={12}
                      color="#d7903d"
                      style={{ verticalAlign: "-2px", marginRight: 4 }}
                    />
                    <b>{stop.name}</b>
                    {stop.congestion === "혼잡"
                      ? "은(는) 혼잡 구간입니다."
                      : `은(는) 만족도가 ${stop.score}로 낮습니다.`}
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
                        key={spot.id}
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
                        onClick={() => {
                          patch({
                            route: draft.route.map(item =>
                              item.id === stop.id ? stopFromSpot(spot.id) : item
                            ),
                          });
                          toast.success(
                            `${stop.name}을(를) ${spot.name}(으)로 교체했습니다.`
                          );
                        }}
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
              ))}
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
                <Users size={14} />
                예상 방문객
              </span>
              <b>월 {draft.monthlyVisitors.toLocaleString("ko-KR")}명</b>
            </div>
          </section>
        </aside>
      </div>
    </PortalChrome>
  );
}
