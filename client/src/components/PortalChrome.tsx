import { BarChart3, FileText, Gauge, Globe2, Map, Network, Settings2, Sparkles, TrendingUp } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

const items = [
  { href: "/dashboard", label: "대시보드", icon: Gauge },
  { href: "/trends", label: "관광 트렌드", icon: TrendingUp },
  { href: "/products", label: "관광상품 기획", icon: Sparkles },
  { href: "/reports", label: "보고서 만들기", icon: FileText },
];

export default function PortalChrome({ children, title, eyebrow }: { children: React.ReactNode; title: string; eyebrow: string }) {
  const [location] = useLocation();
  const { user } = useAuth();
  return <div className="portal-shell"><aside className="portal-sidebar"><Link href="/" className="portal-brand"><span className="portal-logo"><i /><i /><i /></span><span><b>trip ping</b><small>INSIGHT PORTAL</small></span></Link><div className="portal-org"><div> K </div><span><b>한국관광공사</b><small>{user?.name || "B2B 분석 계정"}</small></span></div><div className="portal-side-label">ANALYTICS</div><nav className="portal-nav">{items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={location === href || (href === "/products" && location.startsWith("/products/")) ? "active" : ""}><Icon size={17} /><span>{label}</span></Link>)}</nav><div className="portal-side-label workspace">WORKSPACE</div><nav className="portal-nav"><Link href="/settings" className={location === "/settings" ? "active" : ""}><Settings2 size={17} /><span>조직 설정</span></Link></nav><div className="portal-side-bottom"><div className="portal-help"><Map size={15} /><span>실제 동선에서<br /><b>다음 루트</b>를 발견하세요.</span></div><div className="portal-user"><div>{user?.name?.slice(0, 1) || "김"}</div><span><b>{user?.name || "김지훈 님"}</b><small>기관 계정</small></span></div></div></aside><main className="portal-main"><header className="portal-topbar"><div><span>한국관광공사</span><b>/</b><strong>{title}</strong></div><div className="portal-top-actions"><span className="portal-status"><i />데이터 동기화됨</span><Link href="/settings"><Settings2 size={17} /></Link></div></header><div className="portal-content"><div className="portal-heading"><div><span className="blue-kicker">{eyebrow}</span><h1>{title}</h1></div><div className="portal-heading-actions"><span>Trip Ping 익명화 이동 데이터</span></div></div>{children}</div></main></div>;
}
