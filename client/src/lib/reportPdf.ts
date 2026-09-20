import { GState, jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { insightApi, placesApi, productsApi, spotsApi, type AlternativeSpot, type DailyVisit, type ReportDetail, type RouteRanking, type SpotEvidence } from "@/lib/api";
import { durationLabel, statusLabel } from "@/lib/productMapping";
import regularFontUrl from "@/assets/fonts/NanumGothic-Regular.ttf?url";
import boldFontUrl from "@/assets/fonts/NanumGothic-Bold.ttf?url";

const FONT = "NanumGothic";

const BRAND_BLUE: [number, number, number] = [0, 116, 206];
const INK: [number, number, number] = [21, 33, 45];
const MUTED: [number, number, number] = [123, 135, 147];
const LINE: [number, number, number] = [230, 235, 239];
const PANEL: [number, number, number] = [246, 248, 250];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 16;
const CONTENT_TOP = 26;

const PRODUCT_PLAN_TYPE = "상품 기획안";
const NETWORK_TYPE = "루트 네트워크";

// jsPDF는 Uint8Array를 바로 못 받고 base64 문자열로 폰트를 등록해야 해서 변환한다.
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

// jsPDF 기본 내장 폰트(Helvetica 등)는 한글 글리프가 아예 없어서 한글이 깨지거나 빈칸으로
// 나온다 — NanumGothic 폰트 파일(Regular/Bold)을 통째로 PDF에 임베딩해서 이 문제를 막는다.
async function registerKoreanFont(doc: jsPDF) {
  const [regularBuf, boldBuf] = await Promise.all([
    fetch(regularFontUrl).then((res) => res.arrayBuffer()),
    fetch(boldFontUrl).then((res) => res.arrayBuffer()),
  ]);
  doc.addFileToVFS("NanumGothic-Regular.ttf", arrayBufferToBase64(regularBuf));
  doc.addFont("NanumGothic-Regular.ttf", FONT, "normal");
  doc.addFileToVFS("NanumGothic-Bold.ttf", arrayBufferToBase64(boldBuf));
  doc.addFont("NanumGothic-Bold.ttf", FONT, "bold");
  doc.setFont(FONT, "normal");
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtMonthDay(isoDate: string) {
  const [, m, d] = isoDate.split("-");
  return `${Number(m)}/${Number(d)}`;
}

// 헤더(로고·제목·보고서 ID)와 워터마크는 모든 페이지에, 페이지 번호·푸터(출처·생성 시각)는
// 전체 페이지 수를 알아야 정확히 찍을 수 있어서 본문을 다 그린 뒤 마지막에 전체 페이지를
// 한 번씩 순회하며 그린다. 유형이 달라도 이 부분은 절대 바뀌지 않는다.
function paintHeaderFooterOnAllPages(doc: jsPDF, report: ReportDetail, generatedAt: string) {
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);

    // 워터마크: 옅은 회색 대각선 "TRIP PING"
    doc.saveGraphicsState();
    doc.setGState(new GState({ opacity: 0.05 }));
    doc.setFont(FONT, "bold");
    doc.setFontSize(70);
    doc.setTextColor(...INK);
    doc.text("TRIP PING", PAGE_W / 2, PAGE_H / 2, { angle: 35, align: "center" });
    doc.restoreGraphicsState();

    // 헤더
    doc.setFont(FONT, "bold");
    doc.setFontSize(12);
    doc.setTextColor(...BRAND_BLUE);
    doc.text("trip ping", MARGIN_X, 14);
    doc.setFont(FONT, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(report.title, MARGIN_X + 24, 14);

    doc.setFontSize(8.5);
    doc.text(`보고서 ID ${report.reportId}`, PAGE_W - MARGIN_X, 11, { align: "right" });
    doc.text(`${page} / ${totalPages}`, PAGE_W - MARGIN_X, 15.5, { align: "right" });

    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_X, 18, PAGE_W - MARGIN_X, 18);

    // 푸터
    doc.setDrawColor(...LINE);
    doc.line(MARGIN_X, 284, PAGE_W - MARGIN_X, 284);
    doc.setFont(FONT, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    const source = report.type === PRODUCT_PLAN_TYPE ? "데이터 출처: Trip Ping 상품 기획 데이터" : "데이터 출처: Trip Ping 익명화 이동 데이터 · 한국관광공사 DataLab";
    doc.text(source, MARGIN_X, 289);
    doc.text(`생성 시각: ${generatedAt}`, PAGE_W - MARGIN_X, 289, { align: "right" });
  }
}

function sectionTitle(doc: jsPDF, label: string, title: string, y: number) {
  doc.setFont(FONT, "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND_BLUE);
  doc.text(label, MARGIN_X, y);
  doc.setFont(FONT, "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text(title, MARGIN_X, y + 6);
  return y + 12;
}

// 표지 틀(로고·유형 배지·제목·정보 박스)은 모든 유형이 공유한다. 정보 박스에 어떤 항목을
// 보여줄지(infoRows)만 유형별로 달라진다.
function drawCoverPage(doc: jsPDF, report: ReportDetail, infoRows: [string, string][]) {
  doc.setFont(FONT, "bold");
  doc.setFontSize(22);
  doc.setTextColor(...BRAND_BLUE);
  doc.text("trip ping", PAGE_W / 2, 95, { align: "center" });

  doc.setFont(FONT, "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text("B2B INSIGHT REPORT", PAGE_W / 2, 104, { align: "center" });

  doc.setDrawColor(...BRAND_BLUE);
  doc.setFillColor(...BRAND_BLUE);
  doc.roundedRect(PAGE_W / 2 - 18, 114, 36, 9, 4.5, 4.5, "F");
  doc.setFont(FONT, "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(report.type, PAGE_W / 2, 119.8, { align: "center" });

  doc.setFont(FONT, "bold");
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text(report.title, PAGE_W / 2, 140, { align: "center" });

  const boxY = 160;
  const boxW = 130;
  const boxX = (PAGE_W - boxW) / 2;
  doc.setDrawColor(...LINE);
  doc.setFillColor(...PANEL);
  doc.roundedRect(boxX, boxY, boxW, infoRows.length * 12 + 8, 3, 3, "FD");
  infoRows.forEach(([label, value], i) => {
    const rowY = boxY + 12 + i * 12;
    doc.setFont(FONT, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    doc.text(label, boxX + 10, rowY);
    doc.setFont(FONT, "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    doc.text(value, boxX + boxW - 10, rowY, { align: "right" });
  });
}

function drawStatCard(doc: jsPDF, x: number, y: number, w: number, label: string, value: string, sub: string, subColor: [number, number, number]) {
  const h = 30;
  doc.setDrawColor(...LINE);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 2.5, 2.5, "FD");
  doc.setFont(FONT, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(label, x + 6, y + 9);
  doc.setFont(FONT, "bold");
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.text(value, x + 6, y + 19);
  doc.setFont(FONT, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...subColor);
  doc.text(sub, x + 6, y + 26);
}

function drawThreeStatCards(doc: jsPDF, y: number, cards: { label: string; value: string; sub: string; subColor?: [number, number, number] }[]) {
  const cardW = (PAGE_W - MARGIN_X * 2 - 12) / 3;
  cards.forEach((c, i) => {
    drawStatCard(doc, MARGIN_X + (cardW + 6) * i, y, cardW, c.label, c.value, c.sub, c.subColor ?? BRAND_BLUE);
  });
  return y + 38;
}

function drawParagraphs(doc: jsPDF, lines: string[], y: number) {
  doc.setFont(FONT, "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  lines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, PAGE_W - MARGIN_X * 2);
    doc.text(wrapped, MARGIN_X, y);
    y += wrapped.length * 5 + 2;
  });
  return y;
}

function drawLineChart(doc: jsPDF, daily: DailyVisit[], x: number, y: number, w: number, h: number) {
  if (daily.length === 0) {
    doc.setFont(FONT, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("표시할 이동량 데이터가 없습니다.", x + w / 2, y + h / 2, { align: "center" });
    return;
  }
  const maxVal = Math.max(1, ...daily.map((d) => d.visitCount));

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  for (let g = 0; g <= 4; g++) {
    const gy = y + h - (h * g) / 4;
    doc.line(x, gy, x + w, gy);
    doc.setFont(FONT, "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(String(Math.round((maxVal * g) / 4)), x - 2, gy + 1, { align: "right" });
  }

  const stepX = w / Math.max(1, daily.length - 1);
  const points: [number, number][] = daily.map((d, i) => [x + i * stepX, y + h - (d.visitCount / maxVal) * h]);
  doc.setDrawColor(...BRAND_BLUE);
  doc.setLineWidth(0.7);
  for (let i = 0; i < points.length - 1; i++) {
    doc.line(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
  }

  const labelCount = Math.min(6, daily.length);
  const labelStep = Math.max(1, Math.floor((daily.length - 1) / Math.max(1, labelCount - 1)));
  doc.setFont(FONT, "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  for (let i = 0; i < daily.length; i += labelStep) {
    doc.text(fmtMonthDay(daily[i].date), points[i][0], y + h + 6, { align: "center" });
  }
  doc.text(fmtMonthDay(daily[daily.length - 1].date), points[points.length - 1][0], y + h + 6, { align: "center" });
}

async function collectAlternatives(routes: RouteRanking[]): Promise<AlternativeSpot[]> {
  const topSpotIds = routes
    .slice(0, 2)
    .flatMap((route) => route.spotIds.slice(0, 1))
    .filter((id, i, arr) => arr.indexOf(id) === i);

  if (topSpotIds.length === 0) return [];

  const results = await Promise.all(topSpotIds.map((spotId) => spotsApi.alternatives(spotId, undefined, 3).then((res) => res.data).catch(() => [])));
  const merged = results.flat();
  const deduped = merged.filter((spot, i, arr) => arr.findIndex((s) => s.spotId === spot.spotId) === i);
  return deduped.slice(0, 6);
}

function getAutoTableFinalY(doc: jsPDF, fallback: number): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = (doc as any).lastAutoTable;
  return table ? table.finalY + 14 : fallback;
}

// ============================================================
// ① 트렌드 분석
// ============================================================
async function buildTrendReport(doc: jsPDF, report: ReportDetail, generatedAt: string) {
  const [summary, routes, daily] = await Promise.all([
    insightApi.trendsSummary(report.period, report.region).then((res) => res.data),
    insightApi.risingRoutes(report.period, report.region).then((res) => res.data),
    insightApi.dailyVisits(report.period, report.region).then((res) => res.data),
  ]);
  const alternatives = await collectAlternatives(routes);

  drawCoverPage(doc, report, [
    ["분석 지역", report.region],
    ["분석 기간", report.period],
    ["생성 일시", generatedAt],
  ]);

  // --- Executive Summary ---
  doc.addPage();
  let y = sectionTitle(doc, "EXECUTIVE SUMMARY", "핵심 인사이트", CONTENT_TOP);

  const changeUp = summary.changeRate >= 0;
  const peak = daily.length > 0 ? daily.reduce((a, b) => (b.visitCount > a.visitCount ? b : a), daily[0]) : null;
  y = drawThreeStatCards(doc, y, [
    { label: "총 방문 핑", value: `${summary.totalVisits.toLocaleString()}건`, sub: `이전 기간 대비 ${changeUp ? "+" : ""}${summary.changeRate.toFixed(1)}%`, subColor: changeUp ? [22, 163, 74] : [220, 38, 38] },
    { label: "최다 방문 루트", value: routes[0] ? routes[0].routeName.slice(0, 12) + (routes[0].routeName.length > 12 ? "…" : "") : "데이터 없음", sub: routes[0] ? `${routes[0].visitCount.toLocaleString()}회 방문` : "-" },
    { label: "최다 방문일", value: peak ? fmtMonthDay(peak.date) : "데이터 없음", sub: peak ? `${peak.visitCount.toLocaleString()}건 방문` : "-" },
  ]);

  y = drawParagraphs(doc, [
    `· 선택 기간(${report.period}, ${report.region}) 동안 총 ${summary.totalVisits.toLocaleString()}건의 방문 핑이 기록되었고, 이전 동일 기간 대비 ${changeUp ? "+" : ""}${summary.changeRate.toFixed(1)}% ${changeUp ? "증가" : "감소"}했습니다.`,
    routes[0]
      ? `· 가장 많이 방문된 루트는 "${routes[0].routeName}"이며, 이전 기간 대비 ${routes[0].changeRate >= 0 ? "+" : ""}${routes[0].changeRate.toFixed(1)}% 변화한 ${routes[0].visitCount.toLocaleString()}회의 방문을 기록했습니다.`
      : "· 선택한 기간·지역에는 급상승 루트로 집계된 데이터가 없습니다.",
    peak
      ? `· 일자별 방문량 중 가장 높았던 날은 ${fmtMonthDay(peak.date)}로, ${peak.visitCount.toLocaleString()}건의 방문 핑이 기록됐습니다.`
      : "· 일자별 방문량 데이터가 없습니다.",
  ], y);
  y += 6;

  // --- 지역별 이동량 변화 ---
  y = sectionTitle(doc, "VISITOR MOMENTUM", "지역별 이동량 변화", y);
  drawLineChart(doc, daily, MARGIN_X + 8, y, PAGE_W - MARGIN_X * 2 - 8, 55);
  y += 66;
  const chartNote = peak
    ? `단위: 방문 핑(건). ${report.period} 동안의 일자별 추이이며, ${fmtMonthDay(peak.date)}에 방문이 가장 집중됐습니다.`
    : `단위: 방문 핑(건). ${report.period} 동안 집계된 일자별 방문 기록이 없습니다.`;
  drawParagraphs(doc, [chartNote], y);

  // --- 급상승 루트 / 인기 관광지 조합 ---
  doc.addPage();
  y = sectionTitle(doc, "RISING ROUTES", "급상승 루트 / 인기 관광지 조합", CONTENT_TOP);

  if (routes.length === 0) {
    y = drawParagraphs(doc, ["선택한 기간·지역에 집계된 급상승 루트가 없습니다."], y + 4);
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN_X, right: MARGIN_X },
      head: [["순위", "루트(관광지 조합)", "방문 수", "증감률"]],
      body: routes.map((r, i) => [`${i + 1}`, r.routeName, `${r.visitCount.toLocaleString()}회`, `${r.changeRate >= 0 ? "+" : ""}${r.changeRate.toFixed(1)}%`]),
      styles: { font: FONT, fontSize: 9, textColor: INK, lineColor: LINE, lineWidth: 0.2 },
      headStyles: { font: FONT, fontStyle: "bold", fillColor: BRAND_BLUE, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: PANEL },
      columnStyles: { 0: { cellWidth: 14, halign: "center" }, 2: { cellWidth: 24, halign: "right" }, 3: { cellWidth: 22, halign: "right" } },
    });
    y = getAutoTableFinalY(doc, y);
  }

  // --- 대체 관광지 추천 ---
  if (y > 250) {
    doc.addPage();
    y = CONTENT_TOP;
  }
  y = sectionTitle(doc, "ALTERNATIVE SPOTS", "대체 관광지 추천", y);
  drawAlternativesTable(doc, alternatives, y);
}

// ============================================================
// ② 루트 네트워크
// ============================================================
type NetworkNode = { spotId: number; name: string; weight: number };
type NetworkEdge = { fromId: number; toId: number; fromName: string; toName: string; weight: number };

function buildNetworkGraph(routes: RouteRanking[]): { nodes: NetworkNode[]; edges: NetworkEdge[] } {
  const nodeWeight = new Map<number, NetworkNode>();
  const edgeWeight = new Map<string, NetworkEdge>();

  routes.forEach((route) => {
    const names = route.routeName.split(" → ");
    const ids = route.spotIds;
    if (ids.length === 0 || names.length !== ids.length) return;

    ids.forEach((id, i) => {
      const cur = nodeWeight.get(id) ?? { spotId: id, name: names[i], weight: 0 };
      cur.weight += route.visitCount;
      nodeWeight.set(id, cur);
    });
    for (let i = 0; i < ids.length - 1; i++) {
      const key = `${ids[i]}->${ids[i + 1]}`;
      const cur = edgeWeight.get(key) ?? { fromId: ids[i], toId: ids[i + 1], fromName: names[i], toName: names[i + 1], weight: 0 };
      cur.weight += route.visitCount;
      edgeWeight.set(key, cur);
    }
  });

  return {
    nodes: Array.from(nodeWeight.values()).sort((a, b) => b.weight - a.weight),
    edges: Array.from(edgeWeight.values()).sort((a, b) => b.weight - a.weight),
  };
}

function drawNetworkDiagram(doc: jsPDF, nodes: NetworkNode[], edges: NetworkEdge[], x: number, y: number, w: number, h: number) {
  const topNodes = nodes.slice(0, 8);
  if (topNodes.length === 0) {
    doc.setFont(FONT, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("표시할 연결 데이터가 없습니다.", x + w / 2, y + h / 2, { align: "center" });
    return;
  }

  const centerX = x + w / 2;
  const centerY = y + h / 2;
  const radius = Math.min(w, h) / 2 - 16;
  const positions = new Map<number, [number, number]>();
  topNodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / topNodes.length - Math.PI / 2;
    positions.set(n.spotId, [centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle)]);
  });

  const visibleEdges = edges.filter((e) => positions.has(e.fromId) && positions.has(e.toId));
  const maxEdgeWeight = Math.max(1, ...visibleEdges.map((e) => e.weight));
  visibleEdges.forEach((e) => {
    const [x1, y1] = positions.get(e.fromId)!;
    const [x2, y2] = positions.get(e.toId)!;
    doc.setDrawColor(...BRAND_BLUE);
    doc.setLineWidth(0.3 + (e.weight / maxEdgeWeight) * 1.5);
    doc.line(x1, y1, x2, y2);
  });

  const maxNodeWeight = Math.max(1, ...topNodes.map((n) => n.weight));
  topNodes.forEach((n) => {
    const [nx, ny] = positions.get(n.spotId)!;
    const r = 3 + (n.weight / maxNodeWeight) * 4;
    doc.setFillColor(...BRAND_BLUE);
    doc.circle(nx, ny, r, "F");
    doc.setFont(FONT, "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...INK);
    const label = n.name.length > 8 ? n.name.slice(0, 8) + "…" : n.name;
    doc.text(label, nx, ny + r + 4, { align: "center" });
  });
}

async function buildNetworkReport(doc: jsPDF, report: ReportDetail, generatedAt: string) {
  const routes = await insightApi.risingRoutes(report.period, report.region).then((res) => res.data);
  const alternatives = await collectAlternatives(routes);
  const { nodes, edges } = buildNetworkGraph(routes);
  const totalEdgeWeight = edges.reduce((s, e) => s + e.weight, 0);

  drawCoverPage(doc, report, [
    ["분석 지역", report.region],
    ["분석 기간", report.period],
    ["생성 일시", generatedAt],
  ]);

  // --- Executive Summary ---
  doc.addPage();
  let y = sectionTitle(doc, "EXECUTIVE SUMMARY", "핵심 인사이트", CONTENT_TOP);
  y = drawThreeStatCards(doc, y, [
    { label: "허브 관광지", value: nodes[0] ? nodes[0].name.slice(0, 10) : "데이터 없음", sub: nodes[0] ? `연결 비중 ${nodes[0].weight.toLocaleString()}회` : "-" },
    { label: "최빈 연결 구간", value: edges[0] ? `${edges[0].fromName.slice(0, 6)}→${edges[0].toName.slice(0, 6)}` : "데이터 없음", sub: edges[0] ? `${edges[0].weight.toLocaleString()}회 연결` : "-" },
    { label: "고유 루트 조합", value: `${routes.length}개`, sub: "선택 기간 내 집계" },
  ]);

  y = drawParagraphs(doc, [
    nodes[0]
      ? `· 가장 많은 동선이 거쳐가는 허브 관광지는 "${nodes[0].name}"이며, 연결된 이동이 총 ${nodes[0].weight.toLocaleString()}회 기록되었습니다.`
      : "· 선택한 기간·지역에 집계된 연결 데이터가 없습니다.",
    edges[0]
      ? `· 가장 빈번한 연결 구간은 "${edges[0].fromName} → ${edges[0].toName}"로, ${edges[0].weight.toLocaleString()}회 이동이 확인됐습니다.`
      : "· 구간별 연결 데이터가 없습니다.",
    `· 이 기간·지역에서 확인된 고유 루트 조합은 총 ${routes.length}개입니다.`,
  ], y);
  y += 6;

  // --- 관광지 연결 네트워크 ---
  y = sectionTitle(doc, "SPOT NETWORK", "관광지 연결 네트워크", y);
  drawNetworkDiagram(doc, nodes, edges, MARGIN_X, y, PAGE_W - MARGIN_X * 2, 90);
  y += 96;
  drawParagraphs(doc, ["원의 크기는 연결 빈도, 선의 굵기는 두 관광지 사이 이동 빈도를 나타냅니다."], y);

  // --- 핵심 연결 구간 ---
  doc.addPage();
  y = sectionTitle(doc, "TOP CONNECTIONS", "핵심 연결 구간", CONTENT_TOP);

  if (edges.length === 0) {
    y = drawParagraphs(doc, ["선택한 기간·지역에 집계된 연결 구간이 없습니다."], y + 4);
  } else {
    const topEdges = edges.slice(0, 10);
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN_X, right: MARGIN_X },
      head: [["출발지", "도착지", "연결 빈도", "비중"]],
      body: topEdges.map((e) => [e.fromName, e.toName, `${e.weight.toLocaleString()}회`, `${totalEdgeWeight > 0 ? ((e.weight / totalEdgeWeight) * 100).toFixed(1) : "0.0"}%`]),
      styles: { font: FONT, fontSize: 9, textColor: INK, lineColor: LINE, lineWidth: 0.2 },
      headStyles: { font: FONT, fontStyle: "bold", fillColor: BRAND_BLUE, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: PANEL },
      columnStyles: { 2: { cellWidth: 26, halign: "right" }, 3: { cellWidth: 22, halign: "right" } },
    });
    y = getAutoTableFinalY(doc, y);
  }

  if (y > 250) {
    doc.addPage();
    y = CONTENT_TOP;
  }
  y = sectionTitle(doc, "ALTERNATIVE SPOTS", "대체 관광지 추천", y);
  drawAlternativesTable(doc, alternatives, y);
}

function drawAlternativesTable(doc: jsPDF, alternatives: AlternativeSpot[], y: number) {
  if (alternatives.length === 0) {
    drawParagraphs(doc, ["급상승 루트 주변에서 추천할 대체 관광지를 찾지 못했습니다."], y + 4);
    return;
  }
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN_X, right: MARGIN_X },
    head: [["관광지", "분류", "거리", "평점", "방문 수"]],
    body: alternatives.map((s) => [s.name, s.category ?? "-", `${s.distanceKm.toFixed(1)}km`, s.averageRating !== null ? s.averageRating.toFixed(1) : "-", `${s.visitCount.toLocaleString()}회`]),
    styles: { font: FONT, fontSize: 9, textColor: INK, lineColor: LINE, lineWidth: 0.2 },
    headStyles: { font: FONT, fontStyle: "bold", fillColor: [110, 130, 150], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: PANEL },
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
  });
}

// ============================================================
// ③ 상품 기획안 — "관리자가 입력한 스펙"이 아니라 "실제 방문·평점·후기 데이터"를
// 근거로 삼는 보고서. 이미 만들어둔 상품 초안이 있으면 그 동선을, 없으면 그 지역·기간의
// 1위 급상승 루트를 데이터가 직접 추천해서 채운다 — 어느 경우든 매칭 실패로 끝나지 않는다.
// ============================================================

type PlanSpot = {
  spotId: number;
  name: string;
  address: string | null;
  description: string | null;
  visitOrder: number;
  stayDuration: number | null;
};

type PlanContext = {
  title: string;
  regionName: string;
  spots: PlanSpot[];
  // 실제 상품 초안을 기반으로 만든 경우에만 있다 — 판매가 등 관리자 입력 필드용.
  product?: Awaited<ReturnType<typeof productsApi.detail>>["data"];
  // 실제 급상승 루트와 매칭된 경우에만 있다 — 방문 수·증감률 근거용.
  trendStat?: { routeName: string; visitCount: number; changeRate: number };
};

// 관광지 이름·주소만으로는 근거가 빈약해서, 관광지 상세(한국관광공사 데이터로 보강된
// 실제 설명)까지 채워 넣는다. 개별 조회가 실패해도(비공개 처리 등) 전체가 죽지 않게
// spot마다 독립적으로 실패를 흡수한다.
async function enrichSpots(spots: PlanSpot[]): Promise<PlanSpot[]> {
  return Promise.all(
    spots.map(async (spot) => {
      try {
        const detail = await placesApi.detail(spot.spotId).then((res) => res.data);
        return { ...spot, name: detail.name || spot.name, address: detail.address ?? spot.address, description: detail.description };
      } catch {
        return spot;
      }
    })
  );
}

// 상품의 방문 순서(관광지 이름 조합)가 실제 급상승 루트 데이터와 정확히 일치하는지 찾는다.
// 백엔드가 루트 이름을 만드는 방식(STRING_AGG(ts.name, ' → ' ORDER BY visit_order))과 똑같이
// 조합해야 비교가 성립한다 — 다르면 그냥 다른 문자열이라 항상 매칭 실패함.
async function findMatchingRoute(spotNames: string[], region: string): Promise<RouteRanking | null> {
  if (spotNames.length === 0) return null;
  const routeName = spotNames.join(" → ");
  const routes = await insightApi
    .risingRoutes("최근 30일", region)
    .then((res) => res.data)
    .catch(() => [] as RouteRanking[]);
  return routes.find((r) => r.routeName === routeName) ?? null;
}

// 지정된 상품이 있으면 그 동선을, 없으면 report.period/region 기준 1위 급상승 루트를
// 데이터가 직접 골라서 보고서의 뼈대로 쓴다.
async function resolvePlanContext(report: ReportDetail): Promise<PlanContext> {
  if (report.productId != null) {
    const product = await productsApi.detail(report.productId).then((res) => res.data);
    const region = product.regionName ?? "전체 지역";
    const spotNames = [...product.spots].sort((a, b) => a.visitOrder - b.visitOrder).map((s) => s.name ?? "");
    const matched = await findMatchingRoute(spotNames, region);
    const rawSpots: PlanSpot[] = [...product.spots]
      .sort((a, b) => a.visitOrder - b.visitOrder)
      .map((s) => ({ spotId: s.spotId, name: s.name ?? "이름 없음", address: s.address, description: null, visitOrder: s.visitOrder, stayDuration: s.stayDuration }));
    return {
      title: product.productName,
      regionName: region,
      spots: await enrichSpots(rawSpots),
      product,
      trendStat: matched ? { routeName: matched.routeName, visitCount: matched.visitCount, changeRate: matched.changeRate } : undefined,
    };
  }

  const routes = await insightApi.risingRoutes(report.period, report.region).then((res) => res.data).catch(() => [] as RouteRanking[]);
  const top = routes[0];
  if (!top) {
    return { title: report.title, regionName: report.region, spots: [] };
  }
  const names = top.routeName.split(" → ");
  const rawSpots: PlanSpot[] = top.spotIds.map((spotId, i) => ({ spotId, name: names[i] ?? "이름 없음", address: null, description: null, visitOrder: i + 1, stayDuration: null }));
  return {
    title: top.routeName,
    regionName: report.region,
    spots: await enrichSpots(rawSpots),
    trendStat: { routeName: top.routeName, visitCount: top.visitCount, changeRate: top.changeRate },
  };
}

function drawRouteFlow(doc: jsPDF, spots: PlanSpot[], x: number, y: number, w: number) {
  if (spots.length === 0) {
    doc.setFont(FONT, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("등록된 일정이 없습니다.", x, y + 6);
    return y + 16;
  }

  const perRow = 5;
  const cellW = w / perRow;
  const r = 5;
  let curY = y + r + 4;

  spots.forEach((spot, i) => {
    const col = i % perRow;
    if (col === 0 && i > 0) curY += 22;
    const cx = x + cellW * col + cellW / 2;

    if (col > 0) {
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.5);
      doc.line(x + cellW * col - cellW / 2 + r + 2, curY, cx - r - 2, curY);
    }

    doc.setFillColor(...BRAND_BLUE);
    doc.circle(cx, curY, r, "F");
    doc.setFont(FONT, "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(String(spot.visitOrder), cx, curY + 2.7, { align: "center" });

    doc.setFont(FONT, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    const label = spot.name.length > 9 ? spot.name.slice(0, 9) + "…" : spot.name;
    doc.text(label, cx, curY + 10, { align: "center" });
  });

  return curY + 16;
}

function drawEvidenceBanner(doc: jsPDF, y: number, lines: string[]) {
  doc.setFont(FONT, "normal");
  doc.setFontSize(9.5);
  const wrappedLines = lines.flatMap((line) => doc.splitTextToSize(line, PAGE_W - MARGIN_X * 2 - 16) as string[]);
  const h = 16 + wrappedLines.length * 5.2;

  doc.setDrawColor(...BRAND_BLUE);
  doc.setFillColor(235, 244, 253);
  doc.roundedRect(MARGIN_X, y, PAGE_W - MARGIN_X * 2, h, 2.5, 2.5, "FD");

  doc.setFont(FONT, "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND_BLUE);
  doc.text("TREND EVIDENCE · 데이터 근거", MARGIN_X + 8, y + 9);

  doc.setFont(FONT, "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(wrappedLines, MARGIN_X + 8, y + 17);

  return y + h + 8;
}

async function buildProductReport(doc: jsPDF, report: ReportDetail, generatedAt: string) {
  const context = await resolvePlanContext(report);
  const spotIds = context.spots.map((s) => s.spotId);
  const evidence: SpotEvidence | null = spotIds.length > 0 ? await insightApi.spotEvidence(spotIds).then((res) => res.data).catch(() => null) : null;

  const status = context.product ? statusLabel(context.product.status) : null;
  const duration = context.product ? durationLabel(context.product.expectedDuration) : null;

  drawCoverPage(
    doc,
    report,
    context.product
      ? [
          ["대상 상품", context.title],
          ["진행 상태", status!],
          ["생성 일시", generatedAt],
        ]
      : [
          ["추천 동선", context.title],
          ["분석 지역", context.regionName],
          ["생성 일시", generatedAt],
        ]
  );

  // --- Executive Summary ---
  doc.addPage();
  let y = sectionTitle(doc, "EXECUTIVE SUMMARY", context.product ? "상품 개요" : "추천 상품 기회", CONTENT_TOP);

  // "왜 이 동선인가"를 스펙(가격·기간)보다 먼저 보여준다 — 관리자가 입력한 값이 아니라
  // 실제 방문·평점 데이터가 근거라는 점이 기관 제출용 문서의 핵심이라서 맨 위에 강조한다.
  const evidenceLines: string[] = [];
  if (context.trendStat) {
    const t = context.trendStat;
    evidenceLines.push(
      `이 동선("${t.routeName}")은 최근 30일 실제 방문 데이터에서 ${t.visitCount.toLocaleString()}회 방문, 이전 기간 대비 ${t.changeRate >= 0 ? "+" : ""}${t.changeRate.toFixed(1)}% ${t.changeRate >= 0 ? "증가" : "감소"}한 루트입니다.`
    );
  } else if (context.spots.length > 0) {
    evidenceLines.push("이 동선은 최근 30일 급상승 루트 데이터와 정확히 일치하지 않지만, 아래 관광지별 실제 평점·후기를 근거로 제시합니다.");
  } else {
    evidenceLines.push("현재 이 지역·기간에는 추천할 만한 방문 데이터가 없습니다.");
  }
  if (evidence && evidence.ratingCount > 0) {
    evidenceLines.push(`실제 방문자 평균 평점은 ${evidence.averageRating?.toFixed(1)}점(${evidence.ratingCount.toLocaleString()}건의 평가 기준)입니다.`);
  } else if (context.spots.length > 0) {
    evidenceLines.push("아직 축적된 평점 데이터가 없습니다.");
  }
  y = drawEvidenceBanner(doc, y, evidenceLines);

  y = context.product
    ? drawThreeStatCards(doc, y, [
        { label: "판매가", value: context.product.price != null ? `${context.product.price.toLocaleString()}원` : "미정", sub: `진행 상태 · ${status}` },
        { label: "여행 기간", value: duration!, sub: context.product.transport ?? "이동수단 미정" },
        { label: "예상 대상", value: context.product.targetCustomer ?? "미정", sub: `관광지 ${context.spots.length}곳` },
      ])
    : drawThreeStatCards(doc, y, [
        { label: "총 방문", value: context.trendStat ? `${context.trendStat.visitCount.toLocaleString()}회` : "데이터 없음", sub: "최근 30일 기준" },
        { label: "평균 평점", value: evidence && evidence.ratingCount > 0 ? `${evidence.averageRating?.toFixed(1)}점` : "데이터 없음", sub: evidence ? `${evidence.ratingCount.toLocaleString()}건 평가` : "-" },
        { label: "관광지 수", value: `${context.spots.length}곳`, sub: context.regionName },
      ]);

  // --- 실제 후기 ---
  if (evidence && evidence.sampleComments.length > 0) {
    y = sectionTitle(doc, "REAL REVIEWS", "실제 방문자 후기", y + 4);
    y = drawParagraphs(
      doc,
      evidence.sampleComments.map((c) => `"${c}"`),
      y
    );
  }

  // --- 추천 동선 ---
  doc.addPage();
  y = sectionTitle(doc, "ITINERARY", context.product ? "여행 일정" : "추천 동선", CONTENT_TOP);
  if (context.spots.length === 0) {
    y = drawParagraphs(doc, ["등록된 일정이 없습니다."], y + 4);
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN_X, right: MARGIN_X },
      head: [["순번", "관광지", "주소", "체류 시간"]],
      body: context.spots.map((s) => [String(s.visitOrder), s.name, s.address ?? "-", s.stayDuration != null ? `${s.stayDuration}분` : "-"]),
      styles: { font: FONT, fontSize: 9, textColor: INK, lineColor: LINE, lineWidth: 0.2 },
      headStyles: { font: FONT, fontStyle: "bold", fillColor: BRAND_BLUE, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: PANEL },
      columnStyles: { 0: { cellWidth: 14, halign: "center" }, 3: { cellWidth: 26, halign: "right" } },
    });
    y = getAutoTableFinalY(doc, y);
  }

  // --- 동선 미리보기 ---
  if (y > 220) {
    doc.addPage();
    y = CONTENT_TOP;
  }
  y = sectionTitle(doc, "ROUTE PREVIEW", "동선 미리보기", y);
  y = drawRouteFlow(doc, context.spots, MARGIN_X, y, PAGE_W - MARGIN_X * 2);

  // --- 관광지 설명 ---
  const described = context.spots.filter((s) => s.description);
  if (described.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = CONTENT_TOP;
    }
    y = sectionTitle(doc, "SPOT INFO", "관광지 설명", y);
    y = drawParagraphs(
      doc,
      described.map((s) => `· ${s.name}: ${s.description}`),
      y
    );
  }

  // --- 상품 소개 (실제 상품 기반일 때만) ---
  if (context.product) {
    if (y > 250) {
      doc.addPage();
      y = CONTENT_TOP;
    }
    y = sectionTitle(doc, "PRODUCT INTRO", "상품 메모", y);
    y = drawParagraphs(doc, [context.product.description ?? "등록된 상품 설명이 없습니다."], y);
    if (context.product.hashtags.length > 0) {
      y += 4;
      drawParagraphs(doc, [context.product.hashtags.map((tag) => `#${tag}`).join("  ")], y);
    }
  }
}

// ============================================================
// 진입점
// ============================================================

// 보고서 상세를 기관 제출용 PDF로 만들어 바로 다운로드한다. 유형(트렌드 분석/루트
// 네트워크/상품 기획안)에 따라 본문 구성만 다르고, 헤더·워터마크·표지 틀·푸터·폰트는
// buildXxxReport 밖(공통 함수)에서 그대로 재사용한다. 실제 수치는 다운로드 시점에 API를
// 다시 호출해 최신 데이터로 채운다 — content 텍스트처럼 생성 시점에 얼려두지 않는다.
export async function downloadReportPdf(report: ReportDetail) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await registerKoreanFont(doc);
  const generatedAt = fmtDateTime(new Date().toISOString());

  if (report.type === PRODUCT_PLAN_TYPE) {
    await buildProductReport(doc, report, generatedAt);
  } else if (report.type === NETWORK_TYPE) {
    await buildNetworkReport(doc, report, generatedAt);
  } else {
    await buildTrendReport(doc, report, generatedAt);
  }

  paintHeaderFooterOnAllPages(doc, report, generatedAt);

  // doc.save()는 내부적으로 Blob을 application/pdf 타입으로 만드는데, 이러면 브라우저가
  // 저장 대신 내장 PDF 뷰어로 열어버려서 다운로드가 아예 안 되는 경우가 있다(Chrome에서
  // 실제로 재현됨). Blob 타입을 application/octet-stream으로 바꿔서 무조건 다운로드되게
  // 강제한다 — 저장되는 파일의 확장자는 어차피 <a download="...pdf">가 정하므로 문제없다.
  const blob = new Blob([doc.output("arraybuffer")], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${report.title}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}
