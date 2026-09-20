import { BarChart3, CalendarDays, CheckCircle2, Download, FileText, Filter, Plus, Sparkles, Trash2, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";
import PortalChrome from "@/components/PortalChrome";
import { insightApi, placesApi, type ReportCreateRequest } from "@/lib/api";
import { ALL_REGIONS_LABEL, insightPeriods } from "@/lib/dashboardData";
import { downloadReportPdf } from "@/lib/reportPdf";

const reportTypes = ["트렌드 분석", "상품 기획안", "루트 네트워크"] as const;
const ALL_REPORTS_FILTER = "전체 보고서";
const reportFilters = [ALL_REPORTS_FILTER, ...reportTypes] as const;

const emptyDraft: ReportCreateRequest = {
  title: "",
  type: reportTypes[0],
  period: insightPeriods[1],
  region: ALL_REGIONS_LABEL,
};

export default function Reports() {
  const [showModal, setShowModal] = useState(false);
  const [draft, setDraft] = useState<ReportCreateRequest>(emptyDraft);
  const [filterType, setFilterType] = useState<string>(ALL_REPORTS_FILTER);
  const queryClient = useQueryClient();

  const reportsQuery = useQuery({
    queryKey: ["insight", "reports"],
    queryFn: () => insightApi.reports().then((res) => res.data),
  });

  const filteredReports = reportsQuery.data?.filter((r) => filterType === ALL_REPORTS_FILTER || r.type === filterType);

  // Trends.tsx와 같은 이유 — 백엔드 region 테이블의 실제 region_name을 그대로 써야
  // 보고서 생성 시 region 필터가 정확히 집계된다.
  const regionsQuery = useQuery({
    queryKey: ["regions"],
    queryFn: () => placesApi.regions().then((res) => res.data),
  });

  const createReport = useMutation({
    mutationFn: () => insightApi.createReport(draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insight", "reports"] });
      setShowModal(false);
      setDraft(emptyDraft);
      toast.success("보고서 초안을 생성했습니다.");
    },
    onError: (error: unknown) => {
      const message = error instanceof AxiosError ? (error.response?.data as string) : undefined;
      toast.error(message || "보고서를 생성하지 못했습니다.");
    },
  });

  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  async function downloadReport(reportId: number) {
    setDownloadingId(reportId);
    try {
      const detail = await insightApi.reportDetail(reportId).then((res) => res.data);
      await downloadReportPdf(detail);
      toast.success("PDF 보고서를 다운로드했습니다.");
    } catch {
      toast.error("보고서를 생성하지 못했습니다.");
    } finally {
      setDownloadingId(null);
    }
  }

  const deleteReport = useMutation({
    mutationFn: (reportId: number) => insightApi.deleteReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insight", "reports"] });
      toast.success("보고서를 삭제했습니다.");
    },
    onError: () => toast.error("보고서를 삭제하지 못했습니다."),
  });

  function handleDelete(reportId: number, title: string) {
    toast(`"${title}" 보고서를 삭제할까요?`, {
      description: "삭제하면 되돌릴 수 없습니다.",
      duration: 15000,
      action: { label: "삭제", onClick: () => deleteReport.mutate(reportId) },
      cancel: { label: "취소", onClick: () => {} },
    });
  }

  return (
    <PortalChrome title="보고서" eyebrow="REPORT CENTER">
      <div className="report-hero">
        <div>
          <span className="blue-kicker">TURN INSIGHT INTO ACTION</span>
          <h2>
            분석 결과를
            <br />
            <em>설득력 있는 보고서</em>로
          </h2>
          <p>
            실제 이동 데이터와 트렌드 근거를 포함한 기관용 보고서를
            <br />
            필요한 기간과 지역에 맞춰 만들어보세요.
          </p>
        </div>
        <div className="report-hero-icon">
          <FileText size={46} />
        </div>
      </div>

      <div className="report-toolbar">
        <div className="period-pills">
          {reportFilters.map((f) => (
            <button key={f} className={filterType === f ? "selected" : ""} onClick={() => setFilterType(f)}>
              {f}
            </button>
          ))}
        </div>
        <button className="report-create" onClick={() => setShowModal(true)}>
          <Plus size={15} />새 보고서 만들기
        </button>
      </div>

      <div className="report-grid">
        {reportsQuery.isLoading && <p className="report-grid-empty">불러오는 중...</p>}
        {reportsQuery.isError && <p className="report-grid-empty">보고서 목록을 불러오지 못했습니다.</p>}
        {reportsQuery.data?.length === 0 && <p className="report-grid-empty">아직 만든 보고서가 없습니다.</p>}
        {reportsQuery.data && reportsQuery.data.length > 0 && filteredReports?.length === 0 && (
          <p className="report-grid-empty">{filterType} 보고서가 없습니다.</p>
        )}
        {filteredReports?.map((report) => (
          <div className="report-card" key={report.reportId}>
            <div className="report-card-icon blue">
              <FileText size={21} />
            </div>
            <div className="report-card-top">
              <span>{report.type}</span>
              <button onClick={() => handleDelete(report.reportId, report.title)} disabled={deleteReport.isPending} title="보고서 삭제">
                <Trash2 size={15} />
              </button>
            </div>
            <h3>{report.title}</h3>
            <p>
              {report.period} · {report.region}
            </p>
            <div className="report-card-bottom">
              <span className={report.status === "COMPLETED" ? "completed" : "writing"}>
                {report.status === "COMPLETED" ? <CheckCircle2 size={13} /> : <Sparkles size={13} />}
                {report.status === "COMPLETED" ? "완료" : "작성 중"}
              </span>
              {report.status === "COMPLETED" ? (
                <button onClick={() => downloadReport(report.reportId)} disabled={downloadingId === report.reportId}>
                  <Download size={14} />
                  {downloadingId === report.reportId ? "생성 중..." : "PDF"}
                </button>
              ) : (
                <button onClick={() => toast.info("보고서 이어 작성 화면을 준비 중입니다.")}>
                  계속 작성 <TrendingUp size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="report-insight-strip">
        <BarChart3 size={19} />
        <span>
          <b>보고서에 포함되는 데이터</b>
          <small>방문 추이 · 급상승 루트 · 인기 관광지 조합 · 대체 관광지 추천</small>
        </span>
        <Filter size={15} />
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="report-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>
              ×
            </button>
            <Sparkles size={22} />
            <h2>새 보고서 만들기</h2>
            <p>보고서에 담을 분석 범위를 선택해주세요.</p>
            <label>
              보고서 제목
              <input
                placeholder="예: 9월 제주 관광 트렌드 분석"
                value={draft.title}
                onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
              />
            </label>
            <label>
              보고서 유형
              <select value={draft.type} onChange={(e) => setDraft((prev) => ({ ...prev, type: e.target.value }))}>
                {reportTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <CalendarDays size={14} style={{ marginRight: 6 }} />
              분석 기간
              <select value={draft.period} onChange={(e) => setDraft((prev) => ({ ...prev, period: e.target.value }))}>
                {insightPeriods.map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>
            </label>
            <label>
              대상 지역
              <select value={draft.region} onChange={(e) => setDraft((prev) => ({ ...prev, region: e.target.value }))}>
                <option value={ALL_REGIONS_LABEL}>{ALL_REGIONS_LABEL}</option>
                {regionsQuery.data?.map((region) => (
                  <option key={region.regionId} value={region.regionName}>
                    {region.regionName}
                  </option>
                ))}
              </select>
            </label>
            <button className="report-submit" disabled={!draft.title || createReport.isPending} onClick={() => createReport.mutate()}>
              {createReport.isPending ? "생성 중..." : "분석 시작하기"} <TrendingUp size={15} />
            </button>
          </div>
        </div>
      )}
    </PortalChrome>
  );
}
