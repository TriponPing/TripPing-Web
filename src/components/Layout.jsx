import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'

// TODO: 로그인 안 한 상태로 접근하면 /login으로 리다이렉트하는 가드 추가
// (localStorage의 'tripping_b2b_token' 유무로 판단하면 될 듯)
export default function Layout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
