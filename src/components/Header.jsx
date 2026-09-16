// TODO: 실제 여행사 계정 로그인/인증 붙으면 여기서 사용자명, 로그아웃 등 표시
export default function Header() {
  return (
    <header className="app-header">
      <h1>여행사 대시보드</h1>
      <div className="app-header-right">
        <span className="agency-name">여행사명 (예정)</span>
      </div>
    </header>
  )
}
