import "cesium/Build/Cesium/Widgets/widgets.css";
import "./styles.css";
import { createViewer, MapMode, ViewerBundle } from "./viewer";
import { CAMERA_PRESETS, CameraPresetId } from "./config";
import {
  AUX_LAYER_IDS,
  loadAuxLayer,
  loadFairways,
  loadSrz,
  LayerHandle,
} from "./layers/maritime";
import { createBuildingsController, BuildingsHandle } from "./layers/buildings";
import { loadTraffic, TrafficHandle, TrafficStats } from "./layers/traffic";

type ViewId = "fairways" | "traffic" | "sources";

interface Manifest {
  updated_at?: string | null;
  layers?: Record<
    string,
    {
      title_zh: string;
      provider: string;
      feature_count: number;
      fetched_at: string;
      source_url: string;
      portal_url?: string;
      path: string;
    }
  >;
  traffic?: {
    generated_at?: string;
    window_start?: string | null;
    window_end?: string | null;
    unique_24h?: number;
    unique_7d?: number;
  };
  attribution?: string[];
  disclaimer?: string;
}

const app = document.querySelector("#app")!;

app.innerHTML = `
  <header class="topbar">
    <div class="brand">
      <div class="brand-mark"></div>
      <div>
        香港海事数据枢纽 V4
        <small>官方航道 · 限速 · 2D/3D · 船舶交通</small>
      </div>
    </div>
    <div class="mode-toggle" id="modeToggle" title="平面图 / 三维图切换">
      <button type="button" data-mode="2d">2D 平面</button>
      <button type="button" data-mode="3d" class="active">3D 视图</button>
    </div>
    <div class="toolbar-row" style="margin:0">
      <button type="button" id="btnExport">导出 PNG</button>
    </div>
  </header>
  <nav class="nav">
    <button type="button" data-view="fairways" class="active">航道与限速</button>
    <button type="button" data-view="traffic">船舶交通</button>
    <button type="button" data-view="sources">数据源与更新</button>
    <div class="hint">研究展示用途，不能作为航行或安全决策依据。<br/>底图：地政总署地形图（非卫星）。</div>
  </nav>
  <div id="cesiumContainer">
    <div class="loading-overlay" id="loading">正在加载地图与图层…</div>
  </div>
  <aside class="side" id="side"></aside>
`;

const side = document.querySelector("#side") as HTMLElement;
const loading = document.querySelector("#loading") as HTMLElement;
const modeToggle = document.querySelector("#modeToggle") as HTMLElement;

let bundle: ViewerBundle;
let buildings: BuildingsHandle;
let layers: Record<string, LayerHandle> = {};
let traffic: TrafficHandle | null = null;
let manifest: Manifest | null = null;
let currentView: ViewId = "fairways";
let pickHtml = "点击地图要素查看详情";

function fmtTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("zh-CN", { hour12: false });
  } catch {
    return iso;
  }
}

function renderFairwaysSide(): void {
  const fetched =
    manifest?.layers?.fairways?.fetched_at ||
    manifest?.layers?.srz?.fetched_at ||
    manifest?.updated_at;
  side.innerHTML = `
    <div class="badge">航道/限速：CSDI 海事处 · 拉取于 ${fmtTime(fetched)}</div>
    <h2>图层</h2>
    <div class="layer-list" id="layerList"></div>
    <h3>限速图例</h3>
    <div class="legend">
      <span><i class="swatch" style="background:#06d6a0"></i>5 节 (08:00–24:00)</span>
      <span><i class="swatch" style="background:#ff9f1c"></i>15 节 Zone C</span>
      <span><i class="swatch" style="background:#ef476f"></i>按船长 Zone A/B</span>
      <span><i class="swatch" style="background:#7c5cff"></i>避风塘</span>
      <span><i class="swatch" style="background:#48a9ff"></i>主航道</span>
      <span><i class="swatch" style="background:#f4a261"></i>分道通航制 TSS</span>
    </div>
    <h3>相机预设</h3>
    <div class="preset-row" id="presets"></div>
    <h3>3D 模型</h3>
    <div class="layer-list">
      <label><input type="checkbox" id="chkBuilding" checked /> LandsD 建筑白模</label>
      <label><input type="checkbox" id="chkInfra" /> 基础设施</label>
      <label><input type="checkbox" id="chkPhoto" /> 实景网格（较重）</label>
    </div>
    <h3>选中要素</h3>
    <div class="pick-box" id="pickBox">${pickHtml}</div>
  `;

  const list = side.querySelector("#layerList")!;
  const order = ["fairways", "srz", ...AUX_LAYER_IDS.filter((id) => layers[id])];
  for (const id of order) {
    const layer = layers[id];
    if (!layer) continue;
    const lab = document.createElement("label");
    lab.innerHTML = `<input type="checkbox" data-layer="${id}" ${
      layer.dataSource.show ? "checked" : ""
    }/> ${layer.title}`;
    list.appendChild(lab);
  }
  list.querySelectorAll("input[data-layer]").forEach((el) => {
    el.addEventListener("change", (ev) => {
      const t = ev.target as HTMLInputElement;
      layers[t.dataset.layer!]?.setVisible(t.checked);
    });
  });

  const presets = side.querySelector("#presets")!;
  (Object.keys(CAMERA_PRESETS) as CameraPresetId[]).forEach((id) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = CAMERA_PRESETS[id].label;
    b.onclick = () => bundle.flyToPreset(id);
    presets.appendChild(b);
  });

  const chkBuilding = side.querySelector("#chkBuilding") as HTMLInputElement;
  const chkInfra = side.querySelector("#chkInfra") as HTMLInputElement;
  const chkPhoto = side.querySelector("#chkPhoto") as HTMLInputElement;
  chkBuilding.onchange = () => buildings.setBuilding(chkBuilding.checked);
  chkInfra.onchange = () => buildings.setInfrastructure(chkInfra.checked);
  chkPhoto.onchange = () => buildings.setPhotomesh(chkPhoto.checked);
}

function typeLabel(k: string): string {
  return (
    {
      cargo_tanker: "货轮/油轮",
      passenger: "客船/渡轮",
      hsc: "高速船",
      other: "其他",
    } as Record<string, string>
  )[k] || k;
}

function renderTrafficSide(stats: TrafficStats | null): void {
  const hourly = stats?.hourly_24h || [];
  const maxH = Math.max(1, ...hourly);
  const bars = hourly.map((v) => `<i style="height:${(v / maxH) * 100}%"></i>`).join("");
  const types = Object.entries(stats?.by_type_24h || {})
    .map(([k, v]) => `<div class="card"><div class="k">${typeLabel(k)}</div><div class="v">${v}</div></div>`)
    .join("");
  const fairways = (stats?.fairway_top || [])
    .map((f) => `<tr><td>${f.name}</td><td>${f.vessels}</td></tr>`)
    .join("");

  side.innerHTML = `
    <div class="badge">AIS 窗口 ${fmtTime(stats?.window_start)} → ${fmtTime(
      stats?.window_end,
    )} · 生成于 ${fmtTime(stats?.generated_at)}</div>
    <div class="card"><div class="k">24h 唯一船舶</div><div class="v">${
      stats?.unique_24h ?? "—"
    }</div></div>
    <div class="card"><div class="k">7 日唯一船舶</div><div class="v">${
      stats?.unique_7d ?? "—"
    }</div></div>
    <div class="card"><div class="k">移动航迹 / 停泊</div><div class="v">${
      stats?.moving_tracks ?? 0
    } / ${stats?.moored ?? 0}</div></div>
    <h3>类型分布 (24h)</h3>
    ${types || "<div class='card'>尚无数据（采集器启动后约数分钟可见）</div>"}
    <h3>逐小时流量</h3>
    <div class="bar-chart">${bars}</div>
    <h3>航道通行 Top</h3>
    <table class="sources-table"><thead><tr><th>航道</th><th>船次</th></tr></thead><tbody>${
      fairways || "<tr><td colspan=2>暂无</td></tr>"
    }</tbody></table>
    <h3>限速区观测超速比</h3>
    <div class="card"><div class="v">${
      stats?.srz_speeding_ratio == null
        ? "—"
        : `${(stats.srz_speeding_ratio * 100).toFixed(1)}%`
    }</div><div class="k">${stats?.srz_note || "AIS 观测值，非执法数据"} · 样本 ${
      stats?.srz_samples ?? 0
    }</div></div>
    <h3>回放 / 密度</h3>
    <div class="toolbar-row">
      <label style="font-size:12px;display:flex;align-items:center;gap:6px">
        <input type="checkbox" id="chkReplay" checked /> 航迹回放动画
      </label>
      <select id="selDensity">
        <option value="all">密度：全部</option>
        <option value="cargo_tanker">密度：货轮油轮</option>
        <option value="passenger">密度：客船渡轮</option>
        <option value="other">密度：其他</option>
        <option value="off">关闭密度</option>
      </select>
      <select id="selSpeed">
        <option value="60">60×</option>
        <option value="120" selected>120×</option>
        <option value="300">300×</option>
      </select>
    </div>
    <p style="font-size:11px;color:var(--muted);line-height:1.45">
      船只在 2D 平面图与 3D 视图均可回放。密度为 7 日位置热力（约 18 m/像素）。
    </p>
  `;

  (side.querySelector("#chkReplay") as HTMLInputElement).onchange = (e) => {
    traffic?.setReplayVisible((e.target as HTMLInputElement).checked);
  };
  (side.querySelector("#selDensity") as HTMLSelectElement).onchange = (e) => {
    const v = (e.target as HTMLSelectElement).value as
      | "all"
      | "cargo_tanker"
      | "passenger"
      | "other"
      | "off";
    void traffic?.setDensity(v);
  };
  (side.querySelector("#selSpeed") as HTMLSelectElement).onchange = (e) => {
    traffic?.setSpeedMultiplier(Number((e.target as HTMLSelectElement).value));
  };
}

function renderSourcesSide(): void {
  const rows = Object.values(manifest?.layers || {})
    .map(
      (l) => `
      <tr>
        <td><b>${l.title_zh}</b><br/><span style="color:var(--muted)">${l.provider}</span></td>
        <td>${l.feature_count}</td>
        <td>${fmtTime(l.fetched_at)}</td>
      </tr>`,
    )
    .join("");
  side.innerHTML = `
    <div class="badge">清单更新于 ${fmtTime(manifest?.updated_at)}</div>
    <h2>数据源</h2>
    <table class="sources-table">
      <thead><tr><th>图层</th><th>要素</th><th>拉取时间</th></tr></thead>
      <tbody>${rows || "<tr><td colspan=3>请先运行 pipeline/fetch_csdi.py</td></tr>"}</tbody>
    </table>
    <h3>船舶交通</h3>
    <div class="card">
      <div class="k">AIS 采集窗口</div>
      <div>${fmtTime(manifest?.traffic?.window_start)} → ${fmtTime(
        manifest?.traffic?.window_end,
      )}</div>
      <div class="k" style="margin-top:6px">24h / 7d 唯一船</div>
      <div class="v" style="font-size:16px">${manifest?.traffic?.unique_24h ?? "—"} / ${
        manifest?.traffic?.unique_7d ?? "—"
      }</div>
    </div>
    <h3>署名</h3>
    <ul style="font-size:12px;color:var(--muted);padding-left:18px;line-height:1.6">
      ${(manifest?.attribution || []).map((a) => `<li>${a}</li>`).join("")}
    </ul>
    <p style="font-size:12px;color:var(--warn)">${manifest?.disclaimer || ""}</p>
  `;
}

function renderSide(): void {
  if (currentView === "fairways") renderFairwaysSide();
  else if (currentView === "traffic") renderTrafficSide(traffic?.stats || null);
  else renderSourcesSide();
}

async function switchView(view: ViewId): Promise<void> {
  currentView = view;
  document.querySelectorAll(".nav button").forEach((b) => {
    b.classList.toggle("active", (b as HTMLElement).dataset.view === view);
  });

  // Layer visibility policy
  if (view === "fairways") {
    traffic?.setReplayVisible(false);
    await traffic?.setDensity("off");
    layers.fairways?.setVisible(true);
    layers.srz?.setVisible(true);
  } else if (view === "traffic") {
    if (!traffic) {
      loading.classList.remove("hidden");
      loading.textContent = "正在加载船舶航迹…";
      try {
        traffic = await loadTraffic(bundle.viewer);
        await traffic.setDensity("all");
      } catch (err) {
        console.error(err);
        side.innerHTML = `<div class="card">航迹数据尚未生成。请运行 <code>ais_collector.py</code> 与 <code>build_traffic.py</code>。</div>`;
        loading.classList.add("hidden");
        return;
      }
      loading.classList.add("hidden");
    } else {
      traffic.setReplayVisible(true);
      await traffic.setDensity("all");
    }
  }
  renderSide();
}

async function boot(): Promise<void> {
  bundle = await createViewer(document.querySelector("#cesiumContainer") as HTMLElement);
  buildings = createBuildingsController(bundle.viewer);

  try {
    const res = await fetch("/data/manifest.json");
    if (res.ok) manifest = await res.json();
  } catch {
    manifest = null;
  }

  // Core layers
  layers.fairways = await loadFairways(bundle.viewer);
  layers.srz = await loadSrz(bundle.viewer);

  const auxDefaults: Record<string, boolean> = {
    harbour_limit: true,
    calling_in: true,
    typhoon_shelter: true,
    pilot_boarding: false,
    hkia_approach: false,
    bridge_areas: false,
    private_mooring: false,
    marine_park: false,
    pcwa_berth: false,
    bright_light_fishing: false,
    tide_stations: false,
  };
  for (const id of AUX_LAYER_IDS) {
    const h = await loadAuxLayer(bundle.viewer, id, auxDefaults[id] ?? false);
    if (h) layers[id] = h;
  }

  // Default 3D buildings on
  try {
    await buildings.setBuilding(true);
  } catch (err) {
    console.warn("3D buildings failed", err);
  }

  bundle.onPick((entity) => {
    if (!entity) {
      pickHtml = "点击地图要素查看详情";
    } else {
      const desc = entity.description?.getValue?.(bundle.viewer.clock.currentTime);
      pickHtml = `<b>${entity.name || "要素"}</b><div>${desc || ""}</div>`;
    }
    if (currentView === "fairways") {
      const box = document.querySelector("#pickBox");
      if (box) box.innerHTML = pickHtml;
    }
  });

  modeToggle.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = (btn as HTMLElement).dataset.mode as MapMode;
      modeToggle.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      bundle.setMode(mode);
      // In 2D, hide heavy photomesh automatically for clarity/perf
      if (mode === "2d") {
        void buildings.setPhotomesh(false);
        const chk = document.querySelector("#chkPhoto") as HTMLInputElement | null;
        if (chk) chk.checked = false;
      }
    });
  });

  document.querySelectorAll(".nav button").forEach((btn) => {
    btn.addEventListener("click", () => {
      void switchView((btn as HTMLElement).dataset.view as ViewId);
    });
  });

  document.querySelector("#btnExport")?.addEventListener("click", () => {
    bundle.viewer.render();
    const canvas = bundle.viewer.scene.canvas;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `hk-maritime-v4-${currentView}-${bundle.getMode()}.png`;
    a.click();
  });

  renderSide();
  loading.classList.add("hidden");
}

boot().catch((err) => {
  console.error(err);
  loading.textContent = `启动失败：${err}`;
});
