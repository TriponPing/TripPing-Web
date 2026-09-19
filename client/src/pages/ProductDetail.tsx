import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  GripVertical,
  MapPin,
  Plus,
  Save,
  Sparkles,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import PortalChrome from "@/components/PortalChrome";
import {
  durationOptions,
  formatPrice,
  productStatuses,
  targetOptions,
  type Product,
  type ProductStatus,
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

export default function ProductDetail() {
  const [, params] = useRoute("/products/:id");
  const [, navigate] = useLocation();
  const product = useProduct(params?.id);
  const [draft, setDraft] = useState<Product | undefined>(product);
  const [newTag, setNewTag] = useState("");
  const dragFrom = useRef<number | null>(null);

  useEffect(() => {
    setDraft(product);
  }, [product?.id]);

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
          <Link href="/products">상품 목록으로 {<ArrowRight size={15} />}</Link>
        </div>
      </PortalChrome>
    );
  }

  const patch = (changes: Partial<Product>) =>
    setDraft(current => (current ? { ...current, ...changes } : current));

  const dirty = JSON.stringify(draft) !== JSON.stringify(product);

  const save = () => {
    const { id, updatedAt, ...changes } = draft;
    void id;
    void updatedAt;
    updateProduct(product.id, changes);
    toast.success("상품 초안을 저장했습니다.");
  };

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
              <button
                onClick={() =>
                  patch({
                    route: [
                      ...draft.route,
                      {
                        id: `stop-${Date.now()}`,
                        name: "새 관광지",
                        desc: "설명을 입력하세요",
                        score: "-",
                      },
                    ],
                  })
                }
              >
                <Plus size={14} />
                관광지 추가
              </button>
            </div>
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
            <p>
              최근 30일 여행객 {draft.monthlyVisitors.toLocaleString("ko-KR")}
              명이 선택한 순서입니다. 오전 성산일출봉 방문 후 섭지코지로
              이동하는 흐름이 특히 강하게 나타납니다.
            </p>
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
                  description: `${draft.description}${draft.description ? "\n\n" : ""}실제 이동 데이터 기준으로 최근 30일 방문이 늘어난 동선입니다. (추정치이며 확정된 수치는 아닙니다.)`,
                });
                toast.success("추천 문구를 상품 설명에 넣었습니다.");
              }}
            >
              추천 문구 반영 <Check size={14} />
            </button>
          </section>

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
