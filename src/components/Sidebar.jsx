import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: '대시보드 홈', end: true },
  { to: '/trends', label: '트렌드 분석' },
  { to: '/products', label: '관광상품 기획' },
  { to: '/settings', label: '조직 설정' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">TripPing <span>for Business</span></div>
      <nav>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
