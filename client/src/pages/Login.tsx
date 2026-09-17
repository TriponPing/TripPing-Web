import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Login() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/");
    },
    onError: (error: any) => toast.error(error.message || "로그인에 실패했습니다."),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    login.mutate({ email, password });
  };

  return <div className="login-shell"><div className="login-visual"><Link href="/" className="login-brand"><span className="landing-logo"><i /><i /><i /></span><span><b>trip ping</b><small>INSIGHT PORTAL</small></span></Link><div className="login-visual-copy"><span className="blue-kicker">ROUTE INTELLIGENCE FOR ORGANIZATIONS</span><h1>실제 이동에서<br /><em>다음 여행</em>을 설계하세요.</h1><p>승인된 여행사·지자체 계정으로<br />Trip Ping Insight Portal을 시작합니다.</p><div className="login-route-mini"><div><span>성산일출봉</span><i /><span>섭지코지</span><i /><span>우도</span></div><b>+24.8%</b><small>이번 달 급상승 루트</small></div></div></div><div className="login-card-wrap"><Link href="/" className="back-link"><ArrowLeft size={15} />서비스 소개</Link><div className="login-card"><div className="login-card-icon"><ShieldCheck size={23} /></div><span className="blue-kicker">B2B ACCESS</span><h2>기관 계정 로그인</h2><p>승인된 계정으로 안전하게 로그인하세요.</p><form onSubmit={submit} className="login-form"><label>이메일<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@organization.go.kr" required /></label><label>비밀번호<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" required /></label><button className="oauth-login" type="submit" disabled={login.isPending}>{login.isPending ? "로그인 중..." : "로그인"} <ArrowRight size={16} /></button></form><div className="login-security"><LockKeyhole size={14} /><span>기관 인증이 완료된 계정만<br />관광 데이터와 보고서에 접근할 수 있습니다.</span></div><div className="login-divider"><span>아직 계정이 없나요?</span></div><Link href="/apply" className="apply-link">기업·지자체 접근 신청하기</Link></div><div className="login-footnote"><CheckCircle2 size={14} />재직·소속 증빙 확인 후 운영자가 승인합니다.</div></div></div>;
}
