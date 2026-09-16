import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchProductDetail, updateProduct } from '../services/api.js'

// TODO: 지도 위에 recommendedRoute를 순서대로 그려주는 SDK 연동
// (카카오맵/네이버 지도 JS SDK). 지금은 순서 목록만 표로 보여줌.
export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchProductDetail(id).then(setProduct)
  }, [id])

  if (!product) return <p className="page-desc">불러오는 중...</p>

  async function handleSave() {
    setSaving(true)
    await updateProduct(id, product)
    setSaving(false)
  }

  return (
    <div>
      <button className="btn-link" type="button" onClick={() => navigate('/products')}>
        ← 목록으로
      </button>

      <div className="card">
        <label className="field-label">
          상품명
          <input
            value={product.name}
            onChange={(e) => setProduct({ ...product, name: e.target.value })}
          />
        </label>
        <label className="field-label">
          설명
          <textarea
            rows={3}
            value={product.description}
            onChange={(e) => setProduct({ ...product, description: e.target.value })}
          />
        </label>
        <div className="field-row">
          <span><strong>지역:</strong> {product.region}</span>
          <span><strong>상태:</strong> {product.status}</span>
          <span><strong>생성일:</strong> {product.createdAt}</span>
        </div>
      </div>

      <div className="card">
        <h3>AI 추천 루트</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>순서</th>
              <th>장소</th>
              <th>위도</th>
              <th>경도</th>
            </tr>
          </thead>
          <tbody>
            {product.recommendedRoute.map((stop) => (
              <tr key={stop.order}>
                <td>{stop.order}</td>
                <td>{stop.name}</td>
                <td>{stop.lat}</td>
                <td>{stop.lng}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="btn-primary" type="button" onClick={handleSave} disabled={saving}>
        {saving ? '저장 중...' : '저장'}
      </button>
    </div>
  )
}
