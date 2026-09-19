import { useSyncExternalStore } from "react";
import { seedProducts, UNSET_AREA, type Product } from "./productsData";

const STORAGE_KEY = "tripping.products";

// App.tsx는 팀 공통 파일이라 Provider를 끼우지 않고 모듈 스토어로 상태를 공유한다.
let products: Product[] = load();
const listeners = new Set<() => void>();

function load(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Product[];
  } catch {
    // 시크릿 모드·저장소 차단 환경에서는 시드 데이터로 시작한다.
  }
  return seedProducts;
}

function commit(next: Product[]) {
  products = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 저장에 실패해도 화면 상태는 유지한다.
  }
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProducts() {
  return useSyncExternalStore(subscribe, () => products);
}

export function useProduct(id: string | undefined) {
  const list = useProducts();
  return list.find(product => product.id === id);
}

export function createProduct() {
  const now = new Date().toISOString();
  const product: Product = {
    id: `draft-${Date.now()}`,
    title: "새 관광상품 초안",
    status: "초안",
    area: UNSET_AREA,
    updatedAt: now,
    score: 0,
    color: "blue",
    description: "",
    route: [],
    tags: [],
    price: 0,
    duration: "당일",
    target: "20–30대 커플",
    monthlyVisitors: 0,
    confidence: 0,
  };
  commit([product, ...products]);
  return product;
}

export function updateProduct(id: string, patch: Partial<Product>) {
  commit(
    products.map(product =>
      product.id === id
        ? { ...product, ...patch, updatedAt: new Date().toISOString() }
        : product
    )
  );
}
