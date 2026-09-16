import { useEffect, useState } from 'react'
import { fetchOrgInfo, updateOrgInfo } from '../services/api.js'

export default function Settings() {
  const [org, setOrg] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchOrgInfo().then(setOrg)
  }, [])

  if (!org) return <p className="page-desc">불러오는 중...</p>

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    await updateOrgInfo(org)
    setSaving(false)
    setSaved(true)
  }

  return (
    <div>
      <p className="page-desc">계정/조직 정보를 관리하는 페이지예요.</p>

      <div className="card" style={{ maxWidth: 480 }}>
        <label className="field-label">
          조직명
          <input value={org.orgName} onChange={(e) => setOrg({ ...org, orgName: e.target.value })} />
        </label>
        <label className="field-label">
          담당자
          <input value={org.manager} onChange={(e) => setOrg({ ...org, manager: e.target.value })} />
        </label>
        <label className="field-label">
          이메일
          <input value={org.email} onChange={(e) => setOrg({ ...org, email: e.target.value })} />
        </label>
        <label className="field-label">
          전화번호
          <input value={org.phone} onChange={(e) => setOrg({ ...org, phone: e.target.value })} />
        </label>

        <button className="btn-primary" type="button" onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </button>
        {saved && <span className="form-saved">저장됐어요</span>}
      </div>
    </div>
  )
}
