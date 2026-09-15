/**
 * Lightweight smoke checks for built HTML presence of key UI markers.
 * Run after `npm run build`: npx --yes tsx ../pipeline/tests/smoke_web.mjs
 * or: node --experimental-strip-types (fallback uses plain mjs)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, "../../web/dist/index.html");
const srcMain = path.resolve(__dirname, "../../web/src/main.ts");

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("OK:", msg);
  }
}

const main = fs.readFileSync(srcMain, "utf8");
assert(main.includes('data-mode="2d"'), "2D mode toggle present");
assert(main.includes('data-mode="3d"'), "3D mode toggle present");
assert(main.includes("航道与限速"), "fairways view present");
assert(main.includes("船舶交通"), "traffic view present");
assert(main.includes("数据源与更新"), "sources view present");
assert(main.includes("morphTo2D") || fs.readFileSync(path.resolve(__dirname, "../../web/src/viewer.ts"), "utf8").includes("morphTo2D"), "2D morph in viewer");

if (fs.existsSync(dist)) {
  const html = fs.readFileSync(dist, "utf8");
  assert(html.includes("script"), "built index has script");
} else {
  console.log("SKIP: dist not built yet");
}
