# 香港海事数据枢纽 V4

三维海事可视化站点：官方航道 / 分道通航制 / 限速区 + LandsD 非卫星地形底图与 3D 建筑，以及基于 aisstream.io 的船舶航迹回放、交通密度图与关键统计。

**研究展示用途，不能作为航行或安全决策依据。**

## 快速开始（Mac）

```bash
# 1. 前端
cd web && npm install && npm run dev
# → http://127.0.0.1:5174

# 2. 拉取官方图层
cd ../pipeline
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python fetch_csdi.py

# 3. AIS 采集（需 pipeline/.env 中的 AISSTREAM_API_KEY）
python ais_collector.py &
# 有数据后：
python build_traffic.py
```

## 部署到树莓派（经 GitHub）

仓库：`https://github.com/ssgzy/hk-maritime-hub-v3`（本项目位于子目录 `HK_Maritime_Hub_V4/`）。Pi 上一条命令：

```bash
curl -fsSL https://raw.githubusercontent.com/ssgzy/hk-maritime-hub-v3/main/HK_Maritime_Hub_V4/deploy/pi_bootstrap.sh -o /tmp/pi_bootstrap.sh
AISSTREAM_API_KEY='<your key>' bash /tmp/pi_bootstrap.sh
```

站点监听宿主机 `127.0.0.1:8091`（8090 已被 PocketBase 占用），再在 Cloudflare Zero Trust 为现有 Tunnel 添加 Public Hostname `marine.sammier.com → http://localhost:8091`。详见 `deploy/HERMES_PI.md` 与 `deploy/CLOUDFLARED.md`。

## 目录

| 路径 | 说明 |
|------|------|
| `web/` | Vite + TypeScript + Cesium 1.145（自托管，无 Ion） |
| `pipeline/` | CSDI 拉取、AIS 采集、航迹/密度/统计生成 |
| `data/` | 预生成 GeoJSON / 航迹 / 密度图 / manifest |
| `deploy/` | Docker Compose + nginx + Pi 安装脚本 |
| `docs/DATA_SOURCES.md` | 全部接口清单与核实日期 |

## 地图模式（顶栏一键切换）

- **2D 平面图** — Cesium `SCENE2D`，官方航道/限速叠在地政总署地形图上（非卫星）
- **3D 视图** — Cesium `SCENE3D` + LandsD 建筑白模 / 可选实景网格与 DTM 地形

两种模式共用同一套图层与船舶回放数据。

## 三个视图

1. **航道与限速** — CSDI 海事处官方多边形 + 辅助图层 + LandsD 3D
2. **船舶交通** — 24h 航迹回放动画、7 日密度热力、关键统计
3. **数据源与更新** — 各图层来源、接口、拉取时间、署名

## 环境变量

- `pipeline/.env`：`AISSTREAM_API_KEY=…`
- `web/.env`：`VITE_LANDSD_3D_KEY=…`（地政总署 3D API，文档示例 key 可用；正式 key 向 3dmap@landsd.gov.hk 免费申请）
