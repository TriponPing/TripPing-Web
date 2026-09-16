import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// TripPing 앱 데이터를 여행사에게 보여주는 B2B 대시보드
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
})
