import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../services/api.js'

// TODO: 로그인 성공 후 토큰 저장 방식(localStorage vs httpOnly 쿠키)은
// 백엔드 인증 방식이 정해지면 다시 검토. 지금은 localStorage에 임시 저장.
export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const { token } = await login({ email, password })
      localStorage.setItem('tripping_b2b_token', token)
      navigate('/')
    } catch (err) {
      setError('로그인에 실패했어요. 이메일/비밀번호를 확인해주세요.')
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="sidebar-logo" style={{ marginBottom: 24 }}>
          TripPing <span>for Business</span>
        </div>
        <label className="field-label">
          이메일
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="agency@example.com"
            required
          />
        </label>
        <label className="field-label">
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary">로그인</button>
      </form>
    </div>
  )
}
