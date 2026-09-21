import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const plugins = [react(), tailwindcss()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: ["localhost", "127.0.0.1"],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  // 배포(Railway 등)에서 `vite preview`로 빌드 결과를 서빙할 때 쓰는 설정.
  // Vite는 등록되지 않은 호스트의 요청을 막는데, 배포 도메인은 미리 알 수 없고
  // 바뀔 수도 있어서 여기서는 호스트 검사를 끈다. 정적으로 빌드된 파일만
  // 내려주는 서버라 개발 서버(위 server 설정)와 달리 노출되는 것이 없다.
  preview: {
    host: true,
    allowedHosts: true,
  },
});
