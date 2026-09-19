import { Check, Clock3, FileCheck2, FileText, Search, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, type OrgReviewStatus } from "@/lib/api";

const ORG_TYPE_LABEL: Record<string, string> = {
  local_government: "지자체·공공기관",
  travel_company: "여행사·관광기업",
};

export default function AdminApprovals() {
  const [query, setQuery] = useState("");
  const queryClient = useQueryClient();
  const requests = useQuery({
    queryKey: ["admin", "organizations"],
    queryFn: async () => (await adminApi.pendingOrganizations()).data,
  });
  const review = useMutation({
    mutationFn: ({ orgId, status }: { orgId: number; status: OrgReviewStatus }) => adminApi.review(orgId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
      toast.success("신청 상태를 업데이트했습니다.");
    },
    onError: () => toast.error("처리하지 못했습니다."),
  });
  const filtered = (requests.data ?? []).filter((item) =>
    `${item.managerName} ${item.orgName} ${item.managerEmail}`.toLowerCase().includes(query.toLowerCase())
  );
  return <div className="admin-shell"><div className="admin-heading"><div><span className="blue-kicker">ACCESS CONTROL</span><h1>기관 접근 승인</h1><p>검증된 기관 담당자만 Trip Ping Insight Portal을 이용할 수 있습니다.</p></div><div className="admin-stat"><Clock3 size={17} /><span>검토 대기 <b>{requests.data?.length ?? 0}</b>건</span></div></div><div className="admin-toolbar"><div className="admin-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름, 기관명, 이메일 검색" /></div><div className="admin-trust"><ShieldCheck size={15} />운영자 전용 화면</div></div><div className="approval-table"><div className="approval-thead"><span>신청자</span><span>기관 / 유형</span><span>증빙파일</span><span>신청일</span><span>처리</span></div>{filtered.length === 0 ? <div className="empty-requests"><FileCheck2 size={27} /><b>현재 대기 중인 신청이 없습니다.</b><span>새로운 기관 신청이 들어오면 이곳에서 확인할 수 있습니다.</span></div> : filtered.map((item) => <div className="approval-row" key={item.orgId}><div className="request-person"><div className="request-avatar">{item.managerName.slice(0, 1)}</div><div><b>{item.managerName}</b><span>{item.managerEmail}</span></div></div><div><b>{item.orgName}</b><span>{ORG_TYPE_LABEL[item.orgType] ?? "기타 기관"}</span></div><button className="document-button" onClick={() => item.documentUrl ? window.open(item.documentUrl, "_blank") : toast.info("첨부된 증빙파일이 없습니다.")}><FileText size={14} />증빙파일 확인</button><span className="request-date">{new Date(item.createdAt).toLocaleDateString("ko-KR")}</span><div className="review-actions"><button className="approve-button" onClick={() => review.mutate({ orgId: item.orgId, status: "APPROVED" })}><Check size={14} />승인</button><button className="reject-button" onClick={() => review.mutate({ orgId: item.orgId, status: "REJECTED" })}><X size={14} />반려</button></div></div>)}</div></div>;
}
