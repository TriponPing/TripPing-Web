import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import PortalChrome from "@/components/PortalChrome";
import {
  formatPrice,
  formatUpdatedAt,
  productStatuses,
  type ProductStatus,
} from "@/lib/productsData";
import { createProduct, useProducts } from "@/lib/productsStore";

const statusFilters = ["전체 상태", ...productStatuses] as const;
const sortOptions = ["최근 수정순", "루트 점수순", "가격 낮은순"] as const;

type StatusFilter = (typeof statusFilters)[number];
type SortOption = (typeof sortOptions)[number];

export default function Products() {
  const products = useProducts();
  const [, navigate] = useLocation();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<StatusFilter>("전체 상태");
  const [sort, setSort] = useState<SortOption>("최근 수정순");

  const query = keyword.trim().toLowerCase();
  const visible = products
    .filter(
      product =>
        status === "전체 상태" || product.status === (status as ProductStatus)
    )
    .filter(
      product =>
        !query ||
        product.title.toLowerCase().includes(query) ||
        product.area.toLowerCase().includes(query) ||
        product.tags.some(tag => tag.toLowerCase().includes(query))
    )
    .sort((a, b) => {
      if (sort === "루트 점수순") return b.score - a.score;
      if (sort === "가격 낮은순") return a.price - b.price;
      return b.updatedAt.localeCompare(a.updatedAt);
    });

  const cycle = <T,>(options: readonly T[], current: T) =>
    options[(options.indexOf(current) + 1) % options.length];

  return (
    <PortalChrome title="관광상품 기획" eyebrow="PRODUCT LAB">
      <div className="products-intro">
        <div>
          <h2>
            트렌드를 <em>상품으로</em> 연결하세요.
          </h2>
          <p>
            실제 이동량이 검증한 루트를 바탕으로 새로운 여행상품 초안을 빠르게
            만들 수 있습니다.
          </p>
        </div>
        <button
          className="product-create"
          onClick={() => navigate(`/products/${createProduct().id}`)}
        >
          <Plus size={16} />새 상품 초안
        </button>
      </div>

      <div className="product-toolbar">
        <div className="product-search">
          <Search size={15} />
          <input
            placeholder="상품명, 지역, 태그 검색"
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
          />
        </div>
        <button onClick={() => setStatus(cycle(statusFilters, status))}>
          <Filter size={14} />
          {status}
        </button>
        <button onClick={() => setSort(cycle(sortOptions, sort))}>
          <CalendarDays size={14} />
          {sort}
        </button>
      </div>

      <div className="product-grid">
        {visible.map(product => (
          <Link
            href={`/products/${product.id}`}
            className="product-card"
            key={product.id}
          >
            <div className={`product-cover ${product.color}`}>
              <div className="cover-orbit" />
              <Sparkles size={19} />
              <span>{product.area}</span>
            </div>
            <div className="product-card-body">
              <div className="product-status">
                <span>{product.status}</span>
                <MoreHorizontal size={16} />
              </div>
              <h3>{product.title}</h3>
              <div className="product-meta">
                <span>
                  <Clock3 size={13} />
                  {formatUpdatedAt(product.updatedAt)}
                </span>
                <span>
                  <Users size={13} />
                  루트 점수 {product.score}
                </span>
              </div>
              <div className="product-card-footer">
                <b>
                  {product.price > 0 ? formatPrice(product.price) : "가격 미정"}
                </b>
                <ChevronRight size={16} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="product-tip">
          <div>
            <Search size={20} />
          </div>
          <span>
            <b>조건에 맞는 상품이 없습니다.</b>
            <small>
              검색어를 지우거나 상태 필터를 전체로 바꿔보세요. 등록된 상품은 총{" "}
              {products.length}건입니다.
            </small>
          </span>
        </div>
      )}

      <div className="product-tip">
        <div>
          <Sparkles size={20} />
        </div>
        <span>
          <b>새로운 루트 기회를 발견했나요?</b>
          <small>
            트렌드 분석에서 급상승 루트를 선택하면 상품 초안으로 바로 가져올 수
            있습니다.
          </small>
        </span>
        <Link href="/trends">
          트렌드 분석 보기 <ArrowRight size={15} />
        </Link>
      </div>
    </PortalChrome>
  );
}
