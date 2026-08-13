import { defineConfig } from "vite";

// O build sai direto para dentro do backend, que serve a aplicacao inteira
// (API + interface) em um unico processo/porta. Assim rodar o projeto nao
// exige Node nem um segundo servidor: basta subir o uvicorn.
//
// `base: "/app/"` mantem os assets do build sob /app/, sem colidir com o
// mount /assets do backend (usado pelos .glb dos ambientes 3D).
export default defineConfig({
  base: "/app/",
  build: {
    outDir: "../backend/app/static/web",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8040",
      "/assets": "http://127.0.0.1:8040",
    },
  },
});
