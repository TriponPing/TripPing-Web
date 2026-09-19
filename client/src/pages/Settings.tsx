import {
  Bell,
  Building2,
  Check,
  Copy,
  KeyRound,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import PortalChrome from "@/components/PortalChrome";
import {
  organizationApi,
  type NotificationSetting,
  type OrgProfile,
} from "@/lib/api";

const tabs = ["조직 정보", "계정 관리", "알림 설정", "API 관리"] as const;

type Tab = (typeof tabs)[number];

// 백엔드 orgType 코드와 화면에서 고르는 값의 대응.
const ORG_TYPES = [
  { code: "public_institution", label: "지자체·공공기관" },
  { code: "travel_company", label: "여행사·관광기업" },
];

type ProfileDraft = Pick<
  OrgProfile,
  "orgName" | "orgType" | "managerName" | "department" | "description"
>;

export default function Settings() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("조직 정보");
  const [form, setForm] = useState<ProfileDraft | null>(null);
  const [saved, setSaved] = useState(false);
  // 발급 직후 한 번만 볼 수 있는 키. 목록에서는 다시 확인할 수 없다.
  const [issuedKey, setIssuedKey] = useState<string | null>(null);

  const profile = useQuery({
    queryKey: ["organization"],
    queryFn: () => organizationApi.profile().then(res => res.data),
  });

  const notifications = useQuery({
    queryKey: ["organization", "notifications"],
    queryFn: () => organizationApi.notifications().then(res => res.data),
  });

  const apiKeys = useQuery({
    queryKey: ["organization", "api-keys"],
    queryFn: () => organizationApi.apiKeys().then(res => res.data),
  });

  useEffect(() => {
    if (!profile.data) return;
    const { orgName, orgType, managerName, department, description } =
      profile.data;
    setForm({ orgName, orgType, managerName, department, description });
  }, [profile.data]);

  const saveProfile = useMutation({
    mutationFn: (next: ProfileDraft) =>
      organizationApi.updateProfile(next).then(res => res.data),
    onSuccess: next => {
      queryClient.setQueryData(["organization"], next);
      setSaved(true);
      toast.success("조직 정보를 저장했습니다.");
    },
    onError: () => toast.error("저장하지 못했습니다."),
  });

  const saveNotifications = useMutation({
    mutationFn: (next: Partial<NotificationSetting>) =>
      organizationApi.updateNotifications(next).then(res => res.data),
    onSuccess: next => {
      queryClient.setQueryData(["organization", "notifications"], next);
      toast.success("알림 설정을 저장했습니다.");
    },
    onError: () => toast.error("저장하지 못했습니다."),
  });

  const issueKey = useMutation({
    mutationFn: (label: string) =>
      organizationApi.issueApiKey(label).then(res => res.data),
    onSuccess: key => {
      setIssuedKey(key.plainKey);
      queryClient.invalidateQueries({ queryKey: ["organization", "api-keys"] });
    },
    onError: () => toast.error("API 키를 발급하지 못했습니다."),
  });

  const revokeKey = useMutation({
    mutationFn: (keyId: number) => organizationApi.revokeApiKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization", "api-keys"] });
      toast.success("API 키를 폐기했습니다.");
    },
    onError: () => toast.error("폐기하지 못했습니다."),
  });

  const patch = (changes: Partial<ProfileDraft>) => {
    setForm(current => (current ? { ...current, ...changes } : current));
    setSaved(false);
  };

  if (!form) {
    return (
      <PortalChrome title="조직 설정" eyebrow="ORGANIZATION SETTINGS">
        <div className="product-tip">
          <div>
            <Building2 size={20} />
          </div>
          <span>
            <b>
              {profile.isError
                ? "조직 정보를 불러오지 못했습니다."
                : "조직 정보를 불러오는 중입니다."}
            </b>
          </span>
        </div>
      </PortalChrome>
    );
  }

  const notify = notifications.data;

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
            {(tab === "조직 정보" || tab === "계정 관리") && (
              <button
                className="settings-save"
                onClick={() => saveProfile.mutate(form)}
                disabled={saveProfile.isPending}
              >
                <Save size={14} />
                {saveProfile.isPending ? "저장 중…" : "저장하기"}
              </button>
            )}
          </div>

          {tab === "조직 정보" && (
            <>
              <div className="settings-avatar">
                <div>
                  <Building2 size={23} />
                </div>
                <span>
                  <b>{form.orgName || "조직명을 입력하세요"}</b>
                  <small>
                    기관 로고 업로드는 파일 저장소 연동 후에 붙일 예정입니다.
                  </small>
                </span>
              </div>
              <div className="settings-fields">
                <label>
                  조직명
                  <input
                    value={form.orgName}
                    onChange={event => patch({ orgName: event.target.value })}
                  />
                </label>
                <label>
                  기관 유형
                  <select
                    value={form.orgType}
                    onChange={event => patch({ orgType: event.target.value })}
                  >
                    {ORG_TYPES.map(type => (
                      <option key={type.code} value={type.code}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  담당 부서
                  <input
                    placeholder="예: 관광데이터전략팀"
                    value={form.department ?? ""}
                    onChange={event =>
                      patch({ department: event.target.value })
                    }
                  />
                </label>
                <label>
                  업무용 이메일
                  <input value={profile.data?.managerEmail ?? ""} readOnly />
                </label>
                <label className="full">
                  조직 소개
                  <textarea
                    placeholder="어떤 일을 하는 기관인지 적어주세요. 보고서에 함께 표시됩니다."
                    value={form.description ?? ""}
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
                담당자 이름
                <input
                  value={form.managerName}
                  onChange={event => patch({ managerName: event.target.value })}
                />
              </label>
              <label>
                로그인 이메일
                <input value={profile.data?.managerEmail ?? ""} readOnly />
              </label>
              <label className="full">
                <small style={{ color: "#9eacb2", fontSize: 9 }}>
                  로그인 이메일은 계정 아이디라 이 화면에서 바꿀 수 없습니다.
                </small>
              </label>
            </div>
          )}

          {tab === "알림 설정" && (
            <div className="settings-fields">
              {notify ? (
                <>
                  <ToggleField
                    label="급상승 트렌드 알림"
                    hint="담당 지역에서 급상승 루트가 발견되면 알립니다."
                    checked={notify.notifyTrend}
                    onChange={value =>
                      saveNotifications.mutate({ notifyTrend: value })
                    }
                  />
                  <ToggleField
                    label="보고서 완료 알림"
                    hint="보고서 생성이 끝나면 알립니다."
                    checked={notify.notifyReport}
                    onChange={value =>
                      saveNotifications.mutate({ notifyReport: value })
                    }
                  />
                  <p
                    className="full"
                    style={{ color: "#9eacb2", fontSize: 9, marginTop: 4 }}
                  >
                    설정은 바로 저장됩니다. 실제 발송은 메일·푸시 연동 후에
                    동작합니다.
                  </p>
                </>
              ) : (
                <p style={{ color: "#9aa9af", fontSize: 10 }}>
                  알림 설정을 불러오는 중입니다.
                </p>
              )}
            </div>
          )}

          {tab === "API 관리" && (
            <div style={{ marginTop: 18 }}>
              {issuedKey && (
                <div className="saved-note" style={{ marginBottom: 14 }}>
                  <Check size={14} />
                  <span style={{ flex: 1 }}>
                    <b style={{ display: "block" }}>
                      이 키는 지금만 볼 수 있습니다. 복사해두세요.
                    </b>
                    <code style={{ fontSize: 10 }}>{issuedKey}</code>
                  </span>
                  <button
                    style={{ background: "transparent", color: "#379a73" }}
                    onClick={() => {
                      navigator.clipboard
                        ?.writeText(issuedKey)
                        .then(() => toast.success("복사했습니다."))
                        .catch(() => toast.error("복사하지 못했습니다."));
                    }}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              )}

              {(apiKeys.data ?? []).map(key => (
                <div className="info-line" key={key.keyId}>
                  <span>
                    <KeyRound size={14} />
                    {key.label}
                  </span>
                  <b style={{ fontFamily: "monospace" }}>{key.keyPrefix}••••</b>
                  <button
                    style={{ background: "transparent", color: "#b2bec2" }}
                    onClick={() => revokeKey.mutate(key.keyId)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {apiKeys.isSuccess && apiKeys.data.length === 0 && (
                <p style={{ color: "#9aa9af", fontSize: 10 }}>
                  발급된 API 키가 없습니다. 데이터 연동이 필요할 때 발급하세요.
                </p>
              )}

              <button
                className="settings-save"
                style={{ marginTop: 18 }}
                disabled={issueKey.isPending}
                onClick={() =>
                  issueKey.mutate(`${form.department || form.orgName} 연동 키`)
                }
              >
                <Plus size={14} />
                {issueKey.isPending ? "발급 중…" : "새 API 키 발급"}
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
            <b>
              {profile.data?.status === "APPROVED"
                ? "기관 계정 인증 완료"
                : "승인 대기 중"}
            </b>
            <p>{profile.data?.orgName}</p>
            <span>
              {profile.data?.status === "APPROVED" ? "검증된 계정" : "대기"}
            </span>
          </section>
          <section className="portal-panel setting-menu">
            <button onClick={() => setTab("계정 관리")}>
              <UserRound size={15} />
              <span>
                <b>내 프로필</b>
                <small>{form.managerName}</small>
              </span>
            </button>
            <button onClick={() => setTab("알림 설정")}>
              <Bell size={15} />
              <span>
                <b>알림 설정</b>
                <small>
                  {notify
                    ? `${[notify.notifyTrend, notify.notifyReport].filter(Boolean).length}개 켜짐`
                    : "불러오는 중"}
                </small>
              </span>
            </button>
            <button onClick={() => setTab("API 관리")}>
              <KeyRound size={15} />
              <span>
                <b>API 키 관리</b>
                <small>{apiKeys.data?.length ?? 0}개 발급됨</small>
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
