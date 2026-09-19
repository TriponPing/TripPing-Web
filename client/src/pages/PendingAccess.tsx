import { Clock3, LogOut, Mail, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

export default function PendingAccess() {
  const { user, logout } = useAuth();
  const applicantName = user?.type === "org" ? user.managerName : "신청자";
  return <div className="pending-shell"><div className="pending-card"><div className="pending-icon"><Clock3 size={30} /></div><span className="blue-kicker">ACCESS REVIEW IN PROGRESS</span><h1>승인 확인 중입니다.</h1><p>{applicantName}님, 제출해주신 기관 정보를 운영자가 검토하고 있습니다.<br />승인이 완료되면 이 계정으로 분석 포털에 로그인할 수 있어요.</p><div className="pending-timeline"><div className="done"><span>✓</span><div><b>접근 신청 접수</b><small>기관 정보와 증빙파일이 안전하게 접수되었습니다.</small></div></div><div className="current"><span>2</span><div><b>운영자 검토</b><small>영업일 기준 1–2일 안에 확인합니다.</small></div></div><div><span>3</span><div><b>분석 포털 이용</b><small>승인 후 실시간 루트 분석을 시작합니다.</small></div></div></div><div className="pending-email"><Mail size={16} /><span>승인 결과는 신청 이메일로 안내됩니다.</span></div><div className="pending-actions"><Link href="/" className="pending-home">서비스 소개로 돌아가기</Link><button onClick={() => logout()}><LogOut size={15} />로그아웃</button></div></div><div className="pending-footer"><ShieldCheck size={14} />Trip Ping은 검증된 기관 계정만 관광 데이터를 열람할 수 있도록 운영합니다.</div></div>;
}
