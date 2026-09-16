import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchProducts } from '../services/api.js'

const STATUS_CLASS = {
  기획중: 'badge-planning',
  검토중: 'badge-review',
  완료: 'badge-done',
}

export default function Products() {
  const [products, setProducts] = useState([])

  useEffect(() => {
    fetchProducts().then(setProducts)
  }, [])

  return (
    <div>
      <div className="page-header-row">
        <p className="page-desc" style={{ margin: 0 }}>
          TripPing 데이터를 기반으로 기획한 관광상품 목록이에요.
        </p>
        {/* TODO: 새 상품 기획 플로우(POST /products) 연결 */}
        <button className="btn-primary" type="button">+ 새 상품 기획</button>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>상품명</th>
              <th>지역</th>
              <th>루트 수</th>
              <th>상태</th>
              <th>생성일</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td><Link to={`/products/${p.id}`}>{p.name}</Link></td>
                <td>{p.region}</td>
                <td>{p.routeCount}개</td>
                <td>
                  <span className={`badge ${STATUS_CLASS[p.status] || ''}`}>{p.status}</span>
                </td>
                <td>{p.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
