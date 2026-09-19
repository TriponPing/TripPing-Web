import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  Filter,
  MapPin,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import PortalChrome from "@/components/PortalChrome";
import { productsApi } from "@/lib/api";
import { areaOf, coverColor, statusLabel } from "@/lib/productMapping";
import {
  formatPrice,
  formatUpdatedAt,
  productStatuses,
} from "@/lib/productsData";

const statusFilters = ["전체 상태", ...productStatuses] as const;
const sortOptions = ["최근 수정순", "일정 많은순", "가격 낮은순"] as const;

type StatusFilter = (typeof statusFilters)[number];
type SortOption = (typeof sortOptions)[number];

export default function Products() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<StatusFilter>("전체 상태");
  const [sort, setSort] = useState<SortOption>("최근 수정순");

  const products = useQuery({
    queryKey: ["products"],
    queryFn: () => productsApi.list().then(res => res.data),
  });

  const create = useMutation({
    mutationFn: () => productsApi.create().then(res => res.data),
    onSuccess: created => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      navigate(`/products/${created.productId}`);
    },
    onError: () => toast.error("상품 초안을 만들지 못했습니다."),
  });

  const query = keyword.trim().toLowerCase();
  const visible = (products.data ?? [])
    .filter(
      product =>
        status === "전체 상태" || statusLabel(product.status) === status
    )
    .filter(
      product =>
        !query ||
        product.productName.toLowerCase().includes(query) ||
        (product.regionName ?? "").toLowerCase().includes(query)
    )
    .sort((a, b) => {
      if (sort === "일정 많은순") return b.spotCount - a.spotCount;
      if (sort === "가격 낮은순") return (a.price ?? 0) - (b.price ?? 0);
      return (b.updatedAt ?? b.createdAt).localeCompare(
        a.updatedAt ?? a.createdAt
      );
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
          onClick={() => create.mutate()}
          disabled={create.isPending}
        >
          <Plus size={16} />
          {create.isPending ? "만드는 중…" : "새 상품 초안"}
        </button>
      </div>

      <div className="product-toolbar">
        <div className="product-search">
          <Search size={15} />
          <input
            placeholder="상품명, 지역 검색"
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
            href={`/products/${product.productId}`}
            className="product-card"
            key={product.productId}
          >
            <div className={`product-cover ${coverColor(product.productId)}`}>
              <div className="cover-orbit" />
              <Sparkles size={19} />
              <span>{areaOf(product)}</span>
            </div>
            <div className="product-card-body">
              <div className="product-status">
                <span>{statusLabel(product.status)}</span>
              </div>
              <h3>{product.productName}</h3>
              <div className="product-meta">
                <span>
                  <Clock3 size={13} />
                  {formatUpdatedAt(product.updatedAt ?? product.createdAt)}
                </span>
                <span>
                  <MapPin size={13} />
                  일정 {product.spotCount}곳
                </span>
              </div>
              <div className="product-card-footer">
                <b>
                  {product.price ? formatPrice(product.price) : "가격 미정"}
                </b>
                <ChevronRight size={16} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {products.isLoading && (
        <div className="product-tip">
          <div>
            <Sparkles size={20} />
          </div>
          <span>
            <b>상품을 불러오는 중입니다.</b>
          </span>
        </div>
      )}

      {products.isError && (
        <div className="product-tip">
          <div>
            <Sparkles size={20} />
          </div>
          <span>
            <b>상품을 불러오지 못했습니다.</b>
            <small>백엔드 서버가 켜져 있는지 확인해주세요.</small>
          </span>
          <button onClick={() => products.refetch()}>다시 시도</button>
        </div>
      )}

      {products.isSuccess && visible.length === 0 && (
        <div className="product-tip">
          <div>
            <Search size={20} />
          </div>
          <span>
            <b>
              {products.data.length === 0
                ? "아직 만든 상품이 없습니다."
                : "조건에 맞는 상품이 없습니다."}
            </b>
            <small>
              {products.data.length === 0
                ? "새 상품 초안을 눌러 첫 상품을 만들어보세요."
                : `검색어를 지우거나 상태 필터를 전체로 바꿔보세요. 등록된 상품은 총 ${products.data.length}건입니다.`}
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
