/* V3 Cesium smart map — blank HK waters + progressive layer checkboxes.
   Depends on window.HubBridge from the main HTML page. */
(function (global) {
  'use strict';

  const CESIUM_VERSION = '1.125';
  const CESIUM_BASE = `https://cesium.com/downloads/cesiumjs/releases/${CESIUM_VERSION}/Build/Cesium/`;
  const HK_DESTINATION = {
    destination: null, // filled after Cesium loads
    orientation: null,
    duration: 1.6
  };

  const LAYER_DEFS = [
    { id: 'basemap', group: '底图', title: '岸线 / 影像底图', desc: 'OpenStreetMap 瓦片，从空白海域切到真实岸线', feed: null },
    { id: 'srz', group: '空间规则', title: '限速区 SRZ', desc: '47 个海事处公开限速区域', feed: null },
    { id: 'tide', group: '观测站点', title: '潮位站', desc: '潮位测站位置 + 最新实测潮位', feed: 'tide' },
    { id: 'wind', group: '观测站点', title: '风测站', desc: '主要风测站 + 十分钟平均风', feed: 'wind' },
    { id: 'visibility', group: '观测站点', title: '能见度站', desc: '能见度测站 + 最新读数', feed: 'visibility' },
    { id: 'marine', group: '模型预报', title: '海洋预报点', desc: '香港南面示例点的波浪/海流预报', feed: 'marine' }
  ];

  const GROUP_COLORS = {
    timed: '#2a9d8f',
    harbour: '#e9c46a',
    shelter: '#457b9d'
  };

  const state = {
    enabled: Object.fromEntries(LAYER_DEFS.map(l => [l.id, false])),
    layerStatus: Object.fromEntries(LAYER_DEFS.map(l => [l.id, 'off'])),
    viewer: null,
    cesiumReady: null,
    stations: null,
    osmLayer: null,
    srzSource: null,
    pointSources: {},
    fillToken: 0,
    selected: null
  };

  function $(id) { return document.getElementById(id); }
  function bridge() { return global.HubBridge || {}; }
  function esc(s) { return bridge().esc ? bridge().esc(s) : String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function setLayerStatus(id, status) {
    state.layerStatus[id] = status;
    const el = document.querySelector(`[data-layer-state="${id}"]`);
    if (!el) return;
    const labels = { off: '关闭', on: '已叠加', loading: '读取中', error: '未取得', fading: '渐显中' };
    el.textContent = labels[status] || status;
    el.className = 'layer-state ' + (status === 'on' || status === 'fading' ? 'on' : status);
  }

  function updateHud() {
    const on = LAYER_DEFS.filter(l => state.enabled[l.id]).length;
    const hud = $('smartmap-hud-count');
    if (hud) hud.textContent = on ? `已叠加 ${on} / ${LAYER_DEFS.length} 层信息` : '空白海域 · 勾选右侧图层开始填充';
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        if (global.Cesium) return resolve();
        const t = setInterval(() => { if (global.Cesium) { clearInterval(t); resolve(); } }, 50);
        setTimeout(() => { clearInterval(t); reject(new Error('Cesium 加载超时')); }, 30000);
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('无法加载 Cesium（需要联网）'));
      document.head.appendChild(s);
    });
  }

  function loadCss(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  }

  async function ensureCesium() {
    if (state.cesiumReady) return state.cesiumReady;
    state.cesiumReady = (async () => {
      loadCss(CESIUM_BASE + 'Widgets/widgets.css');
      global.CESIUM_BASE_URL = CESIUM_BASE;
      await loadScript(CESIUM_BASE + 'Cesium.js');
      if (!global.Cesium) throw new Error('Cesium 全局对象未出现');
      // No Ion token — blank ocean + optional OSM only.
      if (Cesium.Ion) Cesium.Ion.defaultAccessToken = undefined;
    })();
    return state.cesiumReady;
  }

  async function loadStations() {
    if (state.stations) return state.stations;
    const urls = ['/source/stations_geo.json', 'source/stations_geo.json'];
    let lastErr;
    for (const u of urls) {
      try {
        const r = await fetch(u, { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        state.stations = await r.json();
        return state.stations;
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('无法加载测站坐标');
  }

  function flyToHongKong(viewer) {
    const C = Cesium;
    viewer.camera.flyTo({
      destination: C.Cartesian3.fromDegrees(114.15, 21.75, 185000),
      orientation: {
        heading: C.Math.toRadians(0),
        pitch: C.Math.toRadians(-48),
        roll: 0
      },
      duration: 1.8
    });
  }

  async function createViewer() {
    const C = Cesium;
    const container = $('cesium-container');
    if (!container) throw new Error('缺少 cesium-container');

    if (state.viewer) {
      try { state.viewer.resize(); } catch (_) {}
      return state.viewer;
    }

    const viewerOpts = {
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      vrButton: false,
      infoBox: false,
      selectionIndicator: false,
      terrain: false,
      requestRenderMode: true,
      maximumRenderTimeChange: Infinity
    };
    // Prefer baseLayer:false (Cesium ≥1.104); fall back for older CDN builds.
    try {
      viewerOpts.baseLayer = false;
    } catch (_) {}
    let viewer;
    try {
      viewer = new C.Viewer(container, viewerOpts);
    } catch (_) {
      delete viewerOpts.baseLayer;
      viewerOpts.imageryProvider = false;
      viewer = new C.Viewer(container, viewerOpts);
    }

    viewer.imageryLayers.removeAll();
    viewer.terrainProvider = new C.EllipsoidTerrainProvider();
    viewer.scene.globe.baseColor = C.Color.fromCssColorString('#073445');
    viewer.scene.globe.enableLighting = false;
    viewer.scene.fog.enabled = true;
    viewer.scene.backgroundColor = C.Color.fromCssColorString('#041820');
    viewer.scene.skyAtmosphere.show = true;
    if (viewer.scene.sun) viewer.scene.sun.show = true;
    if (viewer.scene.moon) viewer.scene.moon.show = false;
    viewer.scene.screenSpaceCameraController.minimumZoomDistance = 800;
    viewer.scene.screenSpaceCameraController.maximumZoomDistance = 2500000;

    viewer.cesiumWidget.creditContainer.style.display = 'none';

    viewer.selectedEntityChanged.addEventListener(() => {
      const ent = viewer.selectedEntity;
      if (ent) showDetailFromEntity(ent);
    });

    const handler = new C.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((movement) => {
      const picked = viewer.scene.pick(movement.position);
      if (C.defined(picked) && picked.id) {
        viewer.selectedEntity = picked.id;
        showDetailFromEntity(picked.id);
      }
    }, C.ScreenSpaceEventType.LEFT_CLICK);

    state.viewer = viewer;
    flyToHongKong(viewer);
    viewer.scene.requestRender();
    return viewer;
  }

  function destroyViewer() {
    state.fillToken++;
    if (state.viewer && !state.viewer.isDestroyed()) {
      try { state.viewer.destroy(); } catch (_) {}
    }
    state.viewer = null;
    state.osmLayer = null;
    state.srzSource = null;
    state.pointSources = {};
  }

  async function setBasemap(on) {
    const viewer = state.viewer;
    const C = Cesium;
    if (!viewer) return;
    setLayerStatus('basemap', on ? 'fading' : 'off');
    if (on) {
      if (!state.osmLayer) {
        const provider = new C.UrlTemplateImageryProvider({
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          credit: '© OpenStreetMap contributors',
          maximumLevel: 18
        });
        state.osmLayer = viewer.imageryLayers.addImageryProvider(provider);
        state.osmLayer.alpha = 0;
      }
      await fadeImagery(state.osmLayer, 0, 0.92, 700);
      setLayerStatus('basemap', 'on');
    } else if (state.osmLayer) {
      await fadeImagery(state.osmLayer, state.osmLayer.alpha, 0, 450);
      viewer.imageryLayers.remove(state.osmLayer, false);
      state.osmLayer = null;
      setLayerStatus('basemap', 'off');
    }
    viewer.scene.requestRender();
  }

  function fadeImagery(layer, from, to, ms) {
    return new Promise(resolve => {
      const start = performance.now();
      function step(now) {
        if (!state.viewer || state.viewer.isDestroyed() || !layer) return resolve();
        const t = Math.min(1, (now - start) / ms);
        layer.alpha = from + (to - from) * t;
        state.viewer.scene.requestRender();
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      }
      requestAnimationFrame(step);
    });
  }

  function enrichSrzGeoJson() {
    const DATA = bridge().DATA || global.DATA;
    if (!DATA || !DATA.features) throw new Error('缺少 SRZ GeoJSON');
    const byName = Object.fromEntries((DATA.rows || []).map(r => [r.name, r]));
    const fc = JSON.parse(JSON.stringify(DATA.features));
    for (const f of fc.features) {
      const row = byName[f.properties.OBJNAM];
      if (row) {
        Object.assign(f.properties, {
          id: row.id,
          name: row.name,
          group: row.group,
          group_zh: row.group_zh,
          speed: row.speed,
          summary: row.summary,
          original: row.original,
          geometry_valid: row.geometry_valid,
          geometry_check: row.geometry_check
        });
      }
    }
    return fc;
  }

  async function setSrz(on) {
    const viewer = state.viewer;
    const C = Cesium;
    if (!viewer) return;
    if (!on) {
      if (state.srzSource) {
        await fadeDataSource(state.srzSource, 1, 0, 400);
        viewer.dataSources.remove(state.srzSource, true);
        state.srzSource = null;
      }
      setLayerStatus('srz', 'off');
      viewer.scene.requestRender();
      return;
    }
    setLayerStatus('srz', 'fading');
    const geo = enrichSrzGeoJson();
    const ds = await C.GeoJsonDataSource.load(geo, { clampToGround: true });
    ds.name = 'srz';
    for (const e of ds.entities.values) {
      const g = e.properties?.group?.getValue?.() || e.properties?.group;
      const color = C.Color.fromCssColorString(GROUP_COLORS[g] || '#2a9d8f').withAlpha(0);
      if (e.polygon) {
        e.polygon.material = color;
        e.polygon.outline = true;
        e.polygon.outlineColor = C.Color.fromCssColorString(GROUP_COLORS[g] || '#2a9d8f').withAlpha(0);
        e.polygon.height = undefined;
        e.polygon.classificationType = C.ClassificationType.BOTH;
      }
      e.description = undefined;
      e._hubKind = 'srz';
    }
    await viewer.dataSources.add(ds);
    state.srzSource = ds;
    await fadeDataSource(ds, 0, 0.55, 800);
    setLayerStatus('srz', 'on');
    viewer.scene.requestRender();
  }

  function fadeDataSource(ds, fromAlpha, toAlpha, ms) {
    return new Promise(resolve => {
      const ents = ds.entities.values;
      const start = performance.now();
      function apply(a) {
        for (const e of ents) {
          if (e.polygon) {
            const base = e.properties?.group?.getValue?.() || e.properties?.group;
            const c = Cesium.Color.fromCssColorString(GROUP_COLORS[base] || '#2a9d8f');
            e.polygon.material = c.withAlpha(a);
            e.polygon.outlineColor = c.withAlpha(Math.min(1, a + 0.25));
          }
          if (e.point) {
            const c = e._hubColor || Cesium.Color.fromCssColorString('#4ab6c0');
            e.point.color = c.withAlpha(a);
            e.point.outlineColor = Cesium.Color.WHITE.withAlpha(a);
          }
          if (e.label) e.label.fillColor = Cesium.Color.WHITE.withAlpha(a);
          if (e.billboard) e.billboard.color = Cesium.Color.WHITE.withAlpha(a);
        }
        if (state.viewer) state.viewer.scene.requestRender();
      }
      function step(now) {
        if (!state.viewer || state.viewer.isDestroyed()) return resolve();
        const t = Math.min(1, (now - start) / ms);
        apply(fromAlpha + (toAlpha - fromAlpha) * t);
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      }
      requestAnimationFrame(step);
    });
  }

  function matchStationRow(table, station, kind) {
    if (!table || !table.rows) return null;
    const keys = [station.id, station.name, station.name_zh].filter(Boolean).map(s => String(s).toLowerCase());
    for (const row of table.rows) {
      const cells = row.map(c => String(c ?? '').toLowerCase());
      if (keys.some(k => cells.some(c => c === k || c.includes(k) || k.includes(c)))) return row;
    }
    return null;
  }

  function summarizeFeed(kind, station, rec) {
    const b = bridge();
    if (!rec || rec.status === 'loading') return '读取中…';
    if (!rec.model) return rec.status === 'error' ? ('未取得：' + (rec.error || '连接失败')) : '尚未连接';
    const table = rec.model.tables?.[0];
    if (!table) return '已取得响应（无可表字段）';
    const row = matchStationRow(table, station, kind);
    if (!row) return '站点未出现在本次响应中';
    if (kind === 'tide') {
      const idx = table.columns.findIndex(c => /Height|潮|水位/i.test(c));
      const v = idx >= 0 ? row[idx] : row[row.length - 1];
      return `潮位 ${b.showValue ? b.showValue(v) : v}`;
    }
    if (kind === 'wind') {
      const windIdx = table.columns.findIndex(c => /风|wind/i.test(c) && !/阵|gust|向|dir/i.test(c));
      const dirIdx = table.columns.findIndex(c => /向|dir/i.test(c));
      const w = windIdx >= 0 ? row[windIdx] : '—';
      const d = dirIdx >= 0 ? row[dirIdx] : '';
      return `风 ${b.showValue ? b.showValue(w) : w}${d ? ' · ' + d : ''}`;
    }
    if (kind === 'visibility') {
      const idx = table.columns.findIndex(c => /vis|能见/i.test(c));
      const v = idx >= 0 ? row[idx] : row[row.length - 1];
      return `能见度 ${b.showValue ? b.showValue(v) : v}`;
    }
    if (kind === 'marine') {
      const keys = table.keys || [];
      const hi = keys.indexOf('wave_height');
      const ci = keys.indexOf('ocean_current_velocity');
      const wh = hi >= 0 ? row[hi] : null;
      const cv = ci >= 0 ? row[ci] : null;
      const parts = [];
      if (wh != null) parts.push('波高 ' + (b.showValue ? b.showValue(wh) : wh));
      if (cv != null) parts.push('海流 ' + (b.showValue ? b.showValue(cv) : cv));
      return parts.join(' · ') || '已取得预报序列';
    }
    return '已取得';
  }

  async function ensureFeed(feedId) {
    const b = bridge();
    if (!feedId || !b.loadFeed || !b.feedRecord || !b.liveFeed) return null;
    const f = b.liveFeed(feedId);
    if (!f) return null;
    let rec = b.feedRecord(f);
    if (rec.status === 'ok' && rec.model) return rec;
    if (rec.status === 'loading') {
      for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 250));
        rec = b.feedRecord(f);
        if (rec.status !== 'loading') break;
      }
      return rec;
    }
    await b.loadFeed(feedId);
    return b.feedRecord(f);
  }

  async function setPointLayer(kind, on) {
    const viewer = state.viewer;
    const C = Cesium;
    if (!viewer) return;
    const existing = state.pointSources[kind];
    if (!on) {
      if (existing) {
        await fadeDataSource(existing, 1, 0, 350);
        viewer.dataSources.remove(existing, true);
        state.pointSources[kind] = null;
      }
      setLayerStatus(kind, 'off');
      viewer.scene.requestRender();
      return;
    }

    setLayerStatus(kind, 'loading');
    const stationsDoc = await loadStations();
    const list = kind === 'marine' ? [stationsDoc.marine] : (stationsDoc[kind] || []);
    const feedId = LAYER_DEFS.find(l => l.id === kind)?.feed;
    const rec = await ensureFeed(feedId);
    if (rec && rec.status === 'error') setLayerStatus(kind, 'error');

    const colors = {
      tide: '#3d8bfd',
      wind: '#f4a261',
      visibility: '#9b5de5',
      marine: '#00bbf9'
    };
    const ds = new C.CustomDataSource(kind);
    for (const st of list) {
      const label = summarizeFeed(kind, st, rec);
      const ent = ds.entities.add({
        id: `${kind}:${st.id}`,
        name: st.name_zh || st.name,
        position: C.Cartesian3.fromDegrees(st.lon, st.lat),
        point: {
          pixelSize: kind === 'marine' ? 14 : 10,
          color: C.Color.fromCssColorString(colors[kind] || '#4ab6c0').withAlpha(0),
          outlineColor: C.Color.WHITE.withAlpha(0),
          outlineWidth: 2,
          heightReference: C.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        label: {
          text: `${st.name_zh || st.name}\n${label}`,
          font: '11px sans-serif',
          fillColor: C.Color.WHITE.withAlpha(0),
          outlineColor: C.Color.BLACK.withAlpha(0.8),
          outlineWidth: 3,
          style: C.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: C.VerticalOrigin.BOTTOM,
          pixelOffset: new C.Cartesian2(0, -14),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          showBackground: true,
          backgroundColor: C.Color.fromCssColorString('#073445').withAlpha(0.55)
        }
      });
      ent._hubKind = kind;
      ent._hubStation = st;
      ent._hubFeed = feedId;
      ent._hubColor = C.Color.fromCssColorString(colors[kind] || '#4ab6c0');
      ent._hubSummary = label;
    }
    await viewer.dataSources.add(ds);
    state.pointSources[kind] = ds;
    await fadeDataSource(ds, 0, 1, 700);
    if (!(rec && rec.status === 'error')) setLayerStatus(kind, 'on');
    viewer.scene.requestRender();
  }

  async function setLayer(id, on, { skipUi } = {}) {
    state.enabled[id] = !!on;
    if (!skipUi) {
      const input = document.querySelector(`input[data-layer="${id}"]`);
      if (input) input.checked = !!on;
    }
    updateHud();
    if (!state.viewer) return;
    try {
      if (id === 'basemap') await setBasemap(on);
      else if (id === 'srz') await setSrz(on);
      else await setPointLayer(id, on);
    } catch (err) {
      setLayerStatus(id, 'error');
      const detail = $('smartmap-detail');
      if (detail) detail.innerHTML = `<p class="quiet">图层「${esc(id)}」失败：${esc(err.message || err)}</p>`;
    }
  }

  function showDetailFromEntity(ent) {
    const box = $('smartmap-detail');
    if (!box || !ent) return;
    state.selected = ent;
    const kind = ent._hubKind;
    if (kind === 'srz') {
      const p = ent.properties;
      const get = (k) => {
        try { return p[k]?.getValue ? p[k].getValue() : p[k]; } catch (_) { return ''; }
      };
      const name = get('name') || get('OBJNAM') || ent.name || '限速区';
      const speed = get('speed') || '—';
      const summary = get('summary') || get('INFORM') || '';
      const group = get('group_zh') || get('group') || '';
      const original = get('original') || get('INFORM') || '';
      const valid = get('geometry_valid');
      const check = get('geometry_check');
      box.innerHTML = `
        <span class="pill green">${esc(group)} · SRZ</span>
        <h2>${esc(name)}</h2>
        <div class="speed">${esc(speed)}</div>
        <p>${esc(summary)}</p>
        <details><summary class="quiet">英文原文</summary><p class="quiet">${esc(original)}</p></details>
        ${valid === false || valid === 'false' ? `<p class="quiet">几何质量提示：${esc(check)}</p>` : ''}
        <div class="modal-links" style="margin-top:10px">
          <button class="btn small" data-go="sample">打开 SVG 限速区预览 →</button>
        </div>`;
      return;
    }
    if (['tide', 'wind', 'visibility', 'marine'].includes(kind)) {
      const st = ent._hubStation || {};
      const feed = ent._hubFeed;
      box.innerHTML = `
        <span class="pill">${esc(kind)} · 测点</span>
        <h2>${esc(st.name_zh || st.name || ent.name)}</h2>
        <p>${esc(ent._hubSummary || '')}</p>
        <p class="quiet">${esc(st.lat)}, ${esc(st.lon)} · 坐标为研究用近似位置</p>
        ${feed ? `<div class="modal-links" style="margin-top:10px"><button class="btn small primary" data-feed="${esc(feed)}">在最新数据中打开 →</button></div>` : ''}`;
      return;
    }
    box.innerHTML = `<p class="quiet">点击地图上的要素查看详情。</p>`;
  }

  function renderPanel() {
    const host = $('smartmap-layers');
    if (!host) return;
    const groups = [];
    for (const layer of LAYER_DEFS) {
      let g = groups.find(x => x.name === layer.group);
      if (!g) { g = { name: layer.group, items: [] }; groups.push(g); }
      g.items.push(layer);
    }
    host.innerHTML = groups.map(g => `
      <div class="layer-group">
        <h3>${esc(g.name)}</h3>
        ${g.items.map(l => `
          <div class="layer-item">
            <input type="checkbox" id="layer-${l.id}" data-layer="${l.id}" ${state.enabled[l.id] ? 'checked' : ''}>
            <label for="layer-${l.id}"><b>${esc(l.title)}</b><span>${esc(l.desc)}</span></label>
            <span class="layer-state" data-layer-state="${l.id}">关闭</span>
          </div>`).join('')}
      </div>`).join('');
  }

  async function fillAll() {
    const token = ++state.fillToken;
    const order = LAYER_DEFS.map(l => l.id);
    for (const id of order) {
      if (token !== state.fillToken) return;
      if (!state.enabled[id]) await setLayer(id, true);
      await new Promise(r => setTimeout(r, 280));
    }
  }

  async function clearAll() {
    state.fillToken++;
    const order = [...LAYER_DEFS].reverse().map(l => l.id);
    for (const id of order) {
      if (state.enabled[id]) await setLayer(id, false);
    }
    const box = $('smartmap-detail');
    if (box) box.innerHTML = '<p class="quiet">已清空。海域再次为空白底图，可重新勾选信息层。</p>';
  }

  async function enter() {
    const loading = $('smartmap-loading');
    if (loading) loading.hidden = false;
    renderPanel();
    updateHud();
    try {
      await ensureCesium();
      await createViewer();
      if (loading) loading.hidden = true;
      // Re-apply enabled layers after recreate
      for (const l of LAYER_DEFS) {
        if (state.enabled[l.id]) await setLayer(l.id, true, { skipUi: true });
      }
    } catch (err) {
      if (loading) {
        loading.hidden = false;
        loading.innerHTML = `<div style="text-align:center;padding:24px"><b>三维地图未能启动</b><p style="margin-top:8px;opacity:.85">${esc(err.message || err)}</p><p style="margin-top:8px;opacity:.7;font-size:12px">需要联网加载 Cesium。也可用本地服务：python3 server.py</p></div>`;
      }
    }
  }

  function leave() {
    state.fillToken++;
    // Keep viewer alive but stop render churn when hidden
    if (state.viewer && !state.viewer.isDestroyed()) {
      try {
        state.viewer.useDefaultRenderLoop = false;
      } catch (_) {}
    }
  }

  function resumeLoop() {
    if (state.viewer && !state.viewer.isDestroyed()) {
      try {
        state.viewer.useDefaultRenderLoop = true;
        state.viewer.resize();
        state.viewer.scene.requestRender();
      } catch (_) {}
    }
  }

  function bindUi() {
    document.addEventListener('change', e => {
      const input = e.target.closest('input[data-layer]');
      if (!input) return;
      setLayer(input.dataset.layer, input.checked);
    });
    document.addEventListener('click', e => {
      const fill = e.target.closest('[data-smartmap-fill]');
      if (fill) { fillAll(); return; }
      const clear = e.target.closest('[data-smartmap-clear]');
      if (clear) { clearAll(); return; }
      const home = e.target.closest('[data-smartmap-home]');
      if (home && state.viewer) { flyToHongKong(state.viewer); return; }
    });
  }

  bindUi();

  global.HKSmartMap = {
    enter: async () => { resumeLoop(); await enter(); },
    leave,
    destroy: destroyViewer,
    setLayer,
    fillAll,
    clearAll
  };
})(window);
