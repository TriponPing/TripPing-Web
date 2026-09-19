import {
  Bell,
  Building2,
  Check,
  KeyRound,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import PortalChrome from "@/components/PortalChrome";
import {
  issueApiKey,
  organizationTypes,
  revokeApiKey,
  saveOrganization,
  useOrganization,
  type Organization,
} from "@/lib/organizationStore";

const tabs = ["조직 정보", "계정 관리", "알림 설정", "API 관리"] as const;

type Tab = (typeof tabs)[number];

export default function Settings() {
  const organization = useOrganization();
  const [tab, setTab] = useState<Tab>("조직 정보");
  const [form, setForm] = useState(organization);
  const [saved, setSaved] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);

  useEffect(() => setForm(organization), [organization]);

  const patch = (changes: Partial<Organization>) => {
    setForm(current => ({ ...current, ...changes }));
    setSaved(false);
  };

  const save = () => {
    saveOrganization(form);
    setSaved(true);
    toast.success("변경사항을 저장했습니다.");
  };

  // 로고는 data URL로 브라우저에 저장하므로 용량을 제한한다.
  const readLogo = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 300 * 1024) {
      toast.error("로고 이미지는 300KB 이하로 올려주세요.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => patch({ logo: String(reader.result) });
    reader.onerror = () => toast.error("이미지를 읽지 못했습니다.");
    reader.readAsDataURL(file);
  };

  return (
    <PortalChrome title="조직 설정" eyebrow="ORGANIZATION SETTINGS">
      <div className="settings-tabs">
        {tabs.map(item => (
          <button
            key={item}
            className={tab === item ? "selected" : ""}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="settings-layout">
        <section className="portal-panel settings-panel">
          <div className="panel-title">
            <div>
              <span>ORGANIZATION PROFILE</span>
              <h2>{tab}</h2>
              <p>{descriptionFor(tab)}</p>
            </div>
            {tab !== "API 관리" && (
              <button className="settings-save" onClick={save}>
                <Save size={14} />
                저장하기
              </button>
            )}
          </div>

          {tab === "조직 정보" && (
            <>
              <div className="settings-avatar">
                <div>
                  {form.logo ? (
                    <img
                      src={form.logo}
                      alt="기관 로고"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: 10,
                      }}
                    />
                  ) : (
                    <Building2 size={23} />
                  )}
                </div>
                <span>
                  <b>{form.name || "조직명을 입력하세요"}</b>
                  <small>기관 로고를 등록하면 보고서에 함께 표시됩니다.</small>
                </span>
                <input
                  ref={logoInput}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  hidden
                  onChange={event => readLogo(event.target.files?.[0])}
                />
                <button onClick={() => logoInput.current?.click()}>
                  {form.logo ? "로고 교체" : "로고 변경"}
                </button>
                {form.logo && (
                  <button onClick={() => patch({ logo: "" })}>삭제</button>
                )}
              </div>
              <div className="settings-fields">
                <label>
                  조직명
                  <input
                    value={form.name}
                    onChange={event => patch({ name: event.target.value })}
                  />
                </label>
                <label>
                  기관 유형
                  <select
                    value={form.type}
                    onChange={event => patch({ type: event.target.value })}
                  >
                    {organizationTypes.map(type => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <label>
                  담당 부서
                  <input
                    value={form.department}
                    onChange={event =>
                      patch({ department: event.target.value })
                    }
                  />
                </label>
                <label>
                  업무용 이메일
                  <input
                    type="email"
                    value={form.email}
                    onChange={event => patch({ email: event.target.value })}
                  />
                </label>
                <label className="full">
                  조직 소개
                  <textarea
                    value={form.description}
                    onChange={event =>
                      patch({ description: event.target.value })
                    }
                  />
                </label>
              </div>
            </>
          )}

          {tab === "계정 관리" && (
            <div className="settings-fields">
              <label>
                이름
                <input
                  value={form.contactName}
                  onChange={event => patch({ contactName: event.target.value })}
                />
              </label>
              <label>
                직무
                <input
                  value={form.contactRole}
                  onChange={event => patch({ contactRole: event.target.value })}
                />
              </label>
              <label className="full">
                업무용 이메일
                <input
                  type="email"
                  value={form.email}
                  onChange={event => patch({ email: event.target.value })}
                />
              </label>
            </div>
          )}

          {tab === "알림 설정" && (
            <div className="settings-fields">
              <ToggleField
                label="급상승 트렌드 알림"
                hint="담당 지역에서 급상승 루트가 발견되면 알립니다."
                checked={form.notifyTrend}
                onChange={value => patch({ notifyTrend: value })}
              />
              <ToggleField
                label="보고서 완료 알림"
                hint="보고서 생성이 끝나면 알립니다."
                checked={form.notifyReport}
                onChange={value => patch({ notifyReport: value })}
              />
              <ToggleField
                label="주간 요약 메일"
                hint="매주 월요일 지난주 방문 추이를 메일로 받습니다."
                checked={form.notifyWeekly}
                onChange={value => patch({ notifyWeekly: value })}
              />
            </div>
          )}

          {tab === "API 관리" && (
            <div style={{ marginTop: 18 }}>
              {form.apiKeys.map(key => (
                <div className="info-line" key={key.id}>
                  <span>
                    <KeyRound size={14} />
                    {key.label}
                  </span>
                  <b style={{ fontFamily: "monospace" }}>
                    {key.id.slice(0, 6)}••••{key.id.slice(-4)}
                  </b>
                  <button
                    style={{ background: "transparent", color: "#b2bec2" }}
                    onClick={() => {
                      revokeApiKey(key.id);
                      toast.success("API 키를 폐기했습니다.");
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {form.apiKeys.length === 0 && (
                <p style={{ color: "#9aa9af", fontSize: 10 }}>
                  발급된 API 키가 없습니다. 데이터 연동이 필요할 때 발급하세요.
                </p>
              )}
              <button
                className="settings-save"
                style={{ marginTop: 18 }}
                onClick={() => {
                  issueApiKey(`${form.department} 연동 키`);
                  toast.success("새 API 키를 발급했습니다.");
                }}
              >
                <Plus size={14} />새 API 키 발급
              </button>
            </div>
          )}

          {saved && (
            <div className="saved-note">
              <Check size={14} />
              변경사항이 저장되었습니다.
            </div>
          )}
        </section>

        <aside>
          <section className="portal-panel setting-mini">
            <div className="mini-icon blue">
              <ShieldCheck size={18} />
            </div>
            <b>기관 계정 인증 완료</b>
            <p>
              운영자 승인일
              <br />
              2026. 08. 12
            </p>
            <span>검증된 계정</span>
          </section>
          <section className="portal-panel setting-menu">
            <button onClick={() => setTab("계정 관리")}>
              <UserRound size={15} />
              <span>
                <b>내 프로필</b>
                <small>
                  {form.contactName} · {form.contactRole}
                </small>
              </span>
            </button>
            <button onClick={() => setTab("알림 설정")}>
              <Bell size={15} />
              <span>
                <b>알림 설정</b>
                <small>
                  {
                    [
                      form.notifyTrend,
                      form.notifyReport,
                      form.notifyWeekly,
                    ].filter(Boolean).length
                  }
                  개 켜짐
                </small>
              </span>
            </button>
            <button onClick={() => setTab("API 관리")}>
              <KeyRound size={15} />
              <span>
                <b>API 키 관리</b>
                <small>{form.apiKeys.length}개 발급됨</small>
              </span>
            </button>
          </section>
        </aside>
      </div>
    </PortalChrome>
  );
}

function descriptionFor(tab: Tab) {
  if (tab === "조직 정보")
    return "보고서와 상품 기획에 표시될 조직 정보를 관리합니다.";
  if (tab === "계정 관리") return "보고서 작성자로 표시될 담당자 정보입니다.";
  if (tab === "알림 설정") return "받아볼 알림 종류를 선택합니다.";
  return "외부 시스템에서 트립핑 데이터를 불러올 때 쓰는 키입니다.";
}

function ToggleField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="full" style={{ display: "flex", gap: 10 }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        style={{ width: 16, marginTop: 2, flex: "0 0 auto" }}
      />
      <span>
        <b style={{ display: "block", color: "#4d6570", fontSize: 10 }}>
          {label}
        </b>
        <small style={{ color: "#9eacb2", fontSize: 9 }}>{hint}</small>
      </span>
    </label>
  );
}
