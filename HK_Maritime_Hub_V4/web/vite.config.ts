import { defineConfig, Plugin, ViteDevServer } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "node:path";
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";

/** Serve ../data at /data during vite dev (and preview via middleware). */
function serveDataPlugin(): Plugin {
  const dataRoot = path.resolve(__dirname, "../data");
  const attach = (server: ViteDevServer) => {
    server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
      if (!req.url?.startsWith("/data/")) return next();
      const rel = decodeURIComponent(req.url.slice("/data/".length).split("?")[0]);
      const file = path.normalize(path.join(dataRoot, rel));
      if (!file.startsWith(dataRoot) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }
      const ext = path.extname(file).toLowerCase();
      const types: Record<string, string> = {
        ".json": "application/json; charset=utf-8",
        ".geojson": "application/geo+json; charset=utf-8",
        ".png": "image/png",
        ".gz": "application/gzip",
      };
      res.setHeader("Content-Type", types[ext] || "application/octet-stream");
      res.setHeader("Cache-Control", "no-cache");
      fs.createReadStream(file).pipe(res);
    });
  };
  return {
    name: "serve-v4-data",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

export default defineConfig({
  base: "/",
  plugins: [
    serveDataPlugin(),
    viteStaticCopy({
      targets: [
        { src: "node_modules/cesium/Build/Cesium/Workers", dest: "cesium" },
        { src: "node_modules/cesium/Build/Cesium/ThirdParty", dest: "cesium" },
        { src: "node_modules/cesium/Build/Cesium/Assets", dest: "cesium" },
        { src: "node_modules/cesium/Build/Cesium/Widgets", dest: "cesium" },
        { src: "../data", dest: "." },
      ],
    }),
  ],
  define: {
    CESIUM_BASE_URL: JSON.stringify("/cesium/"),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    fs: { allow: [".."] },
  },
  build: {
    target: "es2022",
    sourcemap: false,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks: {
          cesium: ["cesium"],
        },
      },
    },
  },
});
