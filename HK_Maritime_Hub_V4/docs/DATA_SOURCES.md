# V4 数据源与接口清单（核实日期：2026-09-15）

研究展示用途，**不能作为航行或安全决策依据**。

## 1. CSDI / 海事处 / 渔护署空间图层（WFS GeoJSON）

模板：

```text
https://portal.csdi.gov.hk/server/services/common/{serviceId}/MapServer/WFSServer
  ?service=WFS&version=2.0.0&request=GetFeature
  &typeNames=csdi:{layer}&outputFormat=GeoJSON&srsName=EPSG:4326&count=10000
```

| id | 中文名 | serviceId | layer |
|----|--------|-----------|-------|
| fairways | 航道与分道通航制 | mardep_rcd_1730971895632_84763 | FairywayTSS |
| srz | 限速区 | mardep_rcd_1730972516934_759 | SRZ |
| harbour_limit | 港口界限 | mardep_rcd_1730972646896_40009 | HarbourLimit |
| calling_in | 报告点 | mardep_rcd_1730971600539_26240 | CallingInPoint |
| pilot_boarding | 引航员登船站 | mardep_rcd_1730971727146_16190 | PilotBoardingStn |
| typhoon_shelter | 避风塘 | mardep_rcd_1730971403590_9667 | TyphoonShelter |
| hkia_approach | 机场进近限制区 | mardep_rcd_1730966846483_6820 | HKIAApproachArea |
| bridge_areas | 桥区高度限制 | mardep_rcd_1671158138988_60545 | BridgeAreas |
| private_mooring | 私人系泊区 | mardep_rcd_1671157613279_73180 | Private_Mooring_Areas |
| pcwa_berth | 公众货物装卸区泊位 | mardep_rcd_1638859086572_29125 | PCWA_BerthVacancy |
| bright_light_fishing | 光诱捕鱼许可区 | mardep_rcd_1730952503222_38811 | BrightLightFishing |
| tide_stations | 海事处潮汐站 | mardep_rcd_1638860616268_1438 | geodatastore |
| marine_park | 海岸公园与保护区 | afcd_rcd_1635130855075_76661 | MAR_PARK |

门户：https://portal.csdi.gov.hk/

## 2. 地政总署底图 / 3D / 地形（非卫星）

| 用途 | URL |
|------|-----|
| 地形图 XYZ | `https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/basemap/WGS84/{z}/{x}/{y}.png` |
| 简体标注 | `https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/label/hk/sc/WGS84/{z}/{x}/{y}.png` |
| 3D 建筑 | `https://data.map.gov.hk/api/3d-data/3dsd/WGS84/building/tileset.json?key=…` |
| 3D 基础设施 | `https://data.map.gov.hk/api/3d-data/3dsd/WGS84/infrastructure/tileset.json?key=…` |
| 实景网格 | `https://data.map.gov.hk/api/3d-data/3dtiles/f2/tileset.json?key=…` |
| 5m DTM | `https://tiles.arcgis.com/tiles/6j1KwZfY2fZrfNMR/arcgis/rest/services/HK_DTM/ImageServer` |

3D API Key：免费向 `3dmap@landsd.gov.hk` 申请。文档示例 key 可用于开发。

## 3. 船舶 AIS

- 海事处**不提供**公开实时 AIS；VTMS XML 仅为进出港名单（无坐标）。
- V4 使用 [aisstream.io](https://aisstream.io/) WebSocket：`wss://stream.aisstream.io/v0/stream`
- 香港 bbox：`[[22.15,113.80],[22.58,114.50]]`
- 本地采集 → SQLite → 预生成 `tracks_24h.json` / 密度 PNG / `stats.json`，界面标注采集窗口与生成时间。

## 4. 地图模式

- **2D 平面图**：Cesium `SceneMode.SCENE2D`（顶栏切换）
- **3D 视图**：Cesium `SceneMode.SCENE3D` + LandsD 建筑白模 / 可选实景网格

## 5. 署名

地政总署 Lands Department · 海事处 Marine Department · 渔农自然护理署 AFCD · CSDI Portal · aisstream.io
