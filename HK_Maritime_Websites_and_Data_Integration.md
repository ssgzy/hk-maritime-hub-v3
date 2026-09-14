# 香港海事数据枢纽 V2：全部网站分类目录与数据接入说明

**整理日期：2026-09-13｜底稿：用户本次上传的新版 `HK_Maritime_Hub_V1.html`｜用途：香港 ASV 研究资料展示**

## 1. 范围与交付内容

本清单覆盖新版网页内的全部 **40 个目录条目**：31 项海事资料入口、9 项开源工具。原目录共 **53 个不重复网址、17 个域名**，另外保留原页面中 2 个支持/条款网址；因此原页面相关网址清单共 55 个不重复 URL。多种格式、同一网站的不同产品、同一产品的不同语言不计为独立数据源。这不是“互联网上所有香港海事网站”的穷尽清单。

本版没有把独立资料强行融合到一个航行情境模型中：每个来源可以单独打开、读取和查看。保留原网页的分类、标题、来源与 URL；新增最新数据观测站和非直连资料页面。

**原文件与外部核验的区别：** 第 4 章的“原目录说明”忠实保留用户网页中的描述；“本版判定/后续处理”是本轮根据官方资料与可用实现路径作出的接入判断。原网页里的旧核验标记、更新年份和公开入口，不被自动当成这一次已成功连接的证据。重要变化在第 8 章单独说明。

| 文件 | 内容 |
|---|---|
| `HK_Maritime_Hub_V2.html` | 基于新版网页更新的单文件站点，包含全部目录、SRZ 预览、19 个数据查询连接器。 |
| 本文档 | 完整分类网址、接入矩阵、使用条件和验收边界。 |
| `HK_Maritime_NonDirect_Sources.md` | 非直连与条件查询资料的独立清单。 |
| `server.py` | 可选 Python 本地只读服务，解决允许获取数据的浏览器跨域问题。 |
| `feeds.json` / `catalog.json` | 接口配置和完整机器可读资源注册表。 |
| `README.md` | 本地启动、常见问题与后续部署边界。 |

## 2. 接入状态总览

| 类别 | 数量 | 状态含义 |
|---|---:|---|
| 常规最新数据/报告来源 | 7 项原目录来源 | 配置了独立连接器；需在用户联网环境实际验收，不等于已持续在线。 |
| 常规最新数据/报告查询 | 17 个产品查询 | 观测、天气警告、天气/海洋预报以及 6 类 VTMS 日报。 |
| 条件查询 | 1 个产品 / 1 项来源 | HHOT 逐小时潮高预测，当年覆盖尚未通过实际请求验收。 |
| 静态地点字典查询 | 1 个产品，属于 HK22 | `LOCATION.XML`，与 6 类船舶日报分开，非实时位置。 |
| 内嵌静态数据 | 1 项来源 | HK04 SRZ：47 个区域的现有地图/属性表。 |
| 其余本版未直接读取的资料 | 22 项来源 | 文件、空间服务端点、账户授权、网页或历史数据等。 |
| 开源工具 | 9 项 | 软件仓库，不是数据馈送。 |

因此，网页中的 **19 个查询连接器 = 17 个常规最新产品 + 1 个条件预测查询 + 1 个参考字典**。它们对应 8 项原目录资源，其中 HK15 和 HK22 各包含多个产品。

### 2.1 “实时”标签的使用规则

**实测/观测报告**显示各站或各字段的观测时间；**天气警告**显示发布、更新、解除及有效期；**模型预报**显示预报有效时间，不能当作传感器观测；**VTMS 日报**是进出港等船舶报告，不是连续 AIS；**静态/历史资料**显示资料版本或采样时间。页面的“取得时刻”仅指本机收到响应的时间。

自动检查频率属于本平台的请求策略，不是源站更新频率承诺。只有当前正在查看的产品会定时检查；网页切走或浏览器标签隐藏后暂停自动检查。没有批量背景抓取全部接口，也没有无人值守持续采集服务。

## 3. 已实现的站内查询连接器

下表中的“实现”指 URL 构建、读取、解析、页面显示与错误分支已写入代码；不代表所有外部请求均已在本执行环境通过。浏览器端能否直连，还取决于源站 CORS、网络和访问条件。推荐用随包本地服务读取。

| ID | 原目录来源 | 页面产品 | 数据性质 | 官方节奏 / 检查策略 |
|---|---|---|---|---|
| `wind` | HK11 | 各站风向、风速与阵风 | 站点实测 | 源站每 10 分钟更新；本平台 10 分钟检查一次。 |
| `visibility` | HK12 | 十分钟平均能见度 | 站点实测 | 源站每 10 分钟更新；本平台 10 分钟检查一次。 |
| `tide` | HK13 | 各站最新实测潮位 | 站点实测 | 源站每 5 分钟更新；本平台 5 分钟检查一次。 |
| `rhrread` | HK15 | 本港当前天气报告 | 观测报告 | 源站按产品更新；当前天气报告通常每小时；本平台 10 分钟检查一次。 |
| `warnsum` | HK15 | 天气警告摘要 | 警告通报 | 有变化时更新；本平台 5 分钟检查一次。 |
| `warningInfo` | HK15 | 天气警告详细内容 | 警告通报 | 有变化时更新；本平台 5 分钟检查一次。 |
| `swt` | HK15 | 特别天气提示 | 提示通报 | 有变化时更新；本平台 5 分钟检查一次。 |
| `flw` | HK15 | 本港地区天气预报 | 天气预报 | 源站发布或修订时更新；本平台 30 分钟检查一次。 |
| `fnd` | HK15 | 九天天气预报 | 天气预报 | 源站发布或修订时更新；本平台 30 分钟检查一次。 |
| `sccw` | HK16 | 华南沿岸海域天气报告 | 海事预报与报告 | 源站每日 7 次；有需要时加发；本平台 30 分钟检查一次。 |
| `marine` | INT04 | 香港附近海洋模型预报 | 海洋模型预报 | 随上游模型周期更新；输出逐小时时间序列；本平台 60 分钟检查一次。 |
| `vtms_due` | HK22 | VTMS · 预计抵港 | 港口日报 | 官方目录标注 Daily；本平台可每小时检查；本平台 60 分钟检查一次。 |
| `vtms_intend` | HK22 | VTMS · 计划离港 | 港口日报 | 官方目录标注 Daily；本平台可每小时检查；本平台 60 分钟检查一次。 |
| `vtms_entered` | HK22 | VTMS · 已进入香港水域 | 港口日报 | 官方目录标注 Daily；本平台可每小时检查；本平台 60 分钟检查一次。 |
| `vtms_departed` | HK22 | VTMS · 已离开香港水域 | 港口日报 | 官方目录标注 Daily；本平台可每小时检查；本平台 60 分钟检查一次。 |
| `vtms_inport` | HK22 | VTMS · 在港船舶 | 港口日报 | 官方目录标注 Daily；本平台可每小时检查；本平台 60 分钟检查一次。 |
| `vtms_transit` | HK22 | VTMS · 过境船舶 | 港口日报 | 官方目录标注 Daily；本平台可每小时检查；本平台 60 分钟检查一次。 |
| `hhot` | HK14 | 指定日期的逐小时潮高预测 | 潮汐预测 · 条件查询 | 按年度发布预测；逐小时是数据间隔，不是更新周期；本平台 1440 分钟检查一次。 |
| `location` | HK22 | VTMS 地点代码对照 | 静态参考表 | 参考字典；非实时位置数据；本平台 1440 分钟检查一次。 |

### 3.1 对应原始接口（全部列出）

**`wind` — 各站风向、风速与阵风**  
原始入口：<https://data.weather.gov.hk/weatherAPI/hko_data/regional-weather/latest_10min_wind_sc.csv>  
来源目录：<https://data.gov.hk/en-data/dataset/hk-hko-rss-latest-ten-minute-wind-info>  
处理说明：风速、阵风原单位为公里/小时；岸站值不等于航迹处风场。

**`visibility` — 十分钟平均能见度**  
原始入口：<https://data.weather.gov.hk/weatherAPI/opendata/opendata.php?dataType=LTMV&lang=sc&rformat=json>  
来源目录：<https://data.gov.hk/en-data/dataset/hk-hko-rss-regional-weather-latest-10-min-mean-visibility>  
处理说明：保留接口原始字段和单位；没有数值的站点显示缺测。

**`tide` — 各站最新实测潮位**  
原始入口：<https://data.weather.gov.hk/weatherAPI/hko_data/tide/ALL_en.csv>  
来源目录：<https://data.gov.hk/en-data/dataset/hk-hko-rss-latest-tidal-info>  
处理说明：这是实测潮位，不是潮流；原文未随响应给出的垂向基准不会由平台猜测。

**`rhrread` — 本港当前天气报告**  
原始入口：<https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=sc>  
来源目录：<https://www.hko.gov.hk/en/abouthko/opendata_intro.htm>  
处理说明：不同字段可以有不同观测时刻；页面保留各字段时间。

**`warnsum` — 天气警告摘要**  
原始入口：<https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warnsum&lang=sc>  
来源目录：<https://www.hko.gov.hk/en/abouthko/opendata_intro.htm>  
处理说明：ISSUE / UPDATE / CANCEL 原样保留；解除记录不会当作生效警告。

**`warningInfo` — 天气警告详细内容**  
原始入口：<https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warningInfo&lang=sc>  
来源目录：<https://www.hko.gov.hk/en/abouthko/opendata_intro.htm>  
处理说明：空响应只表示接口未返回警告内容，不构成安全出航判断。

**`swt` — 特别天气提示**  
原始入口：<https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=swt&lang=sc>  
来源目录：<https://www.hko.gov.hk/en/abouthko/opendata_intro.htm>  
处理说明：不把无提示解释为无风险；显示每条提示的更新时间。

**`flw` — 本港地区天气预报**  
原始入口：<https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=flw&lang=sc>  
来源目录：<https://www.hko.gov.hk/en/abouthko/opendata_intro.htm>  
处理说明：预报文字与观测数据分开呈现。

**`fnd` — 九天天气预报**  
原始入口：<https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=fnd&lang=sc>  
来源目录：<https://www.hko.gov.hk/en/abouthko/opendata_intro.htm>  
处理说明：按日期展示风、天气、温湿度等；不是未来实测记录。

**`sccw` — 华南沿岸海域天气报告**  
原始入口：<https://data.weather.gov.hk/openData/json/gb/sccw_json_datagov_uc.json>  
来源目录：<https://data.gov.hk/en-data/dataset/hk-hko-rss-south-china-coastal-waters-bulletin>  
处理说明：分区风况、海面情况、展望与沿岸站报告；同一产品的预报和观测段落不混淆。

**`marine` — 香港附近海洋模型预报**  
原始入口：<https://marine-api.open-meteo.com/v1/marine>  
来源目录：<https://open-meteo.com/en/docs/marine-weather-api>  
处理说明：区域模型非船载实测、非港内精细导航数据。坐标可调整；返回网格点可能不同于请求点。

**`vtms_due` — VTMS · 预计抵港**  
原始入口：<https://www.mardep.gov.hk/e_files/en/pub_services/RP04005.XML>  
来源目录：<https://data.gov.hk/en-data/dataset/hk-md-mardep-vessel-traffic-management-system-report>  
处理说明：公开船舶报告不是 AIS 位置流；不从报告中的地点代码推算船位。

**`vtms_intend` — VTMS · 计划离港**  
原始入口：<https://www.mardep.gov.hk/e_files/en/pub_services/RP04505.XML>  
来源目录：<https://data.gov.hk/en-data/dataset/hk-md-mardep-vessel-traffic-management-system-report>  
处理说明：公开船舶报告不是 AIS 位置流；不从报告中的地点代码推算船位。

**`vtms_entered` — VTMS · 已进入香港水域**  
原始入口：<https://www.mardep.gov.hk/e_files/en/pub_services/RP05005.XML>  
来源目录：<https://data.gov.hk/en-data/dataset/hk-md-mardep-vessel-traffic-management-system-report>  
处理说明：公开船舶报告不是 AIS 位置流；不从报告中的地点代码推算船位。

**`vtms_departed` — VTMS · 已离开香港水域**  
原始入口：<https://www.mardep.gov.hk/e_files/en/pub_services/RP05505.XML>  
来源目录：<https://data.gov.hk/en-data/dataset/hk-md-mardep-vessel-traffic-management-system-report>  
处理说明：公开船舶报告不是 AIS 位置流；不从报告中的地点代码推算船位。

**`vtms_inport` — VTMS · 在港船舶**  
原始入口：<https://www.mardep.gov.hk/e_files/en/pub_services/RP06005.XML>  
来源目录：<https://data.gov.hk/en-data/dataset/hk-md-mardep-vessel-traffic-management-system-report>  
处理说明：公开船舶报告不是 AIS 位置流；不从报告中的地点代码推算船位。

**`vtms_transit` — VTMS · 过境船舶**  
原始入口：<https://www.mardep.gov.hk/e_files/en/pub_services/RP11501.XML>  
来源目录：<https://data.gov.hk/en-data/dataset/hk-md-mardep-vessel-traffic-management-system-report>  
处理说明：公开船舶报告不是 AIS 位置流；不从报告中的地点代码推算船位。

**`hhot` — 指定日期的逐小时潮高预测**  
原始入口：<https://data.weather.gov.hk/weatherAPI/opendata/opendata.php?dataType=HHOT>  
来源目录：<https://data.gov.hk/en-data/dataset/hk-hko-rss-hourly-heights-of-tides>  
处理说明：官方文档的可查询年份说明存在滞后；本版不承诺当年覆盖。无数据或报错时请到官方预测页核对，不退回旧年份冒充。

**`location` — VTMS 地点代码对照**  
原始入口：<https://www.mardep.gov.hk/e_files/en/pub_services/LOCATION.XML>  
来源目录：<https://data.gov.hk/en-data/dataset/hk-md-mardep-vessel-traffic-management-system-report>  
处理说明：用于解释报告字段，代码描述不等于船舶实时经纬度。

### 3.2 参数型接口

**Open-Meteo 海洋预报**：基础地址为 `https://marine-api.open-meteo.com/v1/marine`。网页使用香港南面海域的示例坐标 `latitude=22.10&longitude=114.20`，并允许在本应用的香港附近范围（20–24°N，112–116°E）内修改。不是默认测站位置。请求 `timezone=Asia/Hong_Kong&forecast_days=3`。

本版请求的变量：`wave_height`、`wave_direction`、`wave_period`、`wind_wave_height`、`wind_wave_direction`、`wind_wave_period`、`swell_wave_height`、`swell_wave_direction`、`swell_wave_period`、`ocean_current_velocity`、`ocean_current_direction`、`sea_surface_temperature`、`sea_level_height_msl`。单位读取返回的 `hourly_units`，不擅自把海流速度改标为 m/s。曲线支持切换变量，缺测点不连线。模型未提供的字段显示缺测，不填充观测值。

预报的请求坐标与返回网格坐标都应查看；响应中的 `generationtime_ms` 是接口处理耗时，不是模型起报时刻。源站未明确给出的起报时刻显示“未提供”。风浪/涌浪的方向和海流方向约定并不相同，不能互换。

**HHOT 潮高预测**：向基础接口添加 `station`、`year`、`month`、`day`、`rformat=json`。默认查询日期使用香港本地日期，默认站码 `QUB`；可更换 `CCH/CLK/CMW/KCT/KLW/LOP/MWC/QUB/SPW/TAO/TBT/TMW/TPK/WAG` 等文档站码。本轮所见官方文档仍有滞后的年份范围说明，因此不能保证 2026 或其他选择年份一定返回数据。请求失败/空数据要保留提示，不悄悄取 2024 数据替代。

### 3.3 显示与解析方式

CSV 去除 BOM、处理引号/换行并检查列数；`N/A`、`----` 和空值不会转成零。JSON 按产品结构分别显示，保留完整原始响应。XML 以官方字段表识别船舶记录；格式不符时显示“无法识别”，不会显示虚假的“0 艘船”。天气警告的 `CANCEL` 不标为生效；接口返回空警告只表示没有返回条目，不等于没有海上风险。

可导出当前完整属性表 CSV，以及含原始响应、来源 URL、查询参数、数据时刻和取得时刻的 JSON。导出 CSV 对潜在公式字符串加保护。页面仅按需读取，并不在后台持续采集长期历史资料。

### 3.4 官方技术依据

- [HKO 开放数据总览](https://www.hko.gov.hk/en/abouthko/opendata_intro.htm)
- [HKO Open Data API Documentation（产品参数/响应结构）](https://data.weather.gov.hk/weatherAPI/doc/HKO_Open_Data_API_Documentation.pdf)
- [华南沿岸海域天气报告数据字典](https://data.weather.gov.hk/weatherAPI/doc/HKO_SCCW_Open_Data_Documentation.pdf)
- [VTMS XML 数据字典](https://www.mardep.gov.hk/datagovhk/Dataspec_Vessel_Traffic_Management_System_Report.pdf)
- [CSDI 门户（逐数据集核验 API/服务说明）](https://portal.csdi.gov.hk/)
- [Open-Meteo 海洋接口文档](https://open-meteo.com/en/docs/marine-weather-api)
- [Open-Meteo 授权与署名](https://open-meteo.com/en/licence)
- [AISStream 后端与认证说明](https://aisstream.io/documentation)

## 4. 全部网站按主题分类

以下 40 项与新版网页的原始目录一一对应；同一项的多个网址全部保留。这里只保留原目录的资料描述，不把它当作本轮对数据内容/版本的重新认证。

### 空间、航道、限制区与海图（10 项）

#### HK01 · MSDI 海事空间地图

**提供方：** 海事处 / 测量处｜**范围：** 香港  
**原目录说明：** 海事设施；限制进入、限高、限速等水域位置；静态/准静态空间规则；2026-01-28上线  
**原目录获取方式：** 公开网页；程序化接入优先追踪对应CSDI数据集  
**原目录格式：** 网页

**全部网址：**

- <https://msdi.hydro.gov.hk/>
- <https://www.hydro.gov.hk/eng/latest_news.php>

**本版处理：原站网页 / 文档。** 门户网页，尚未核实可稳定复用的原始接口；不强行 iframe 嵌入。  
**可读展示 / 后续步骤：** 保留门户入口；从对应 CSDI 数据项获取服务或文件后再接入。  
**限制说明：** 门户可浏览不等于提供开放原始API；不等于完整授权海图

#### HK02 · CSDI / 政府开放数据目录

**提供方：** 香港政府 / CSDI｜**范围：** 香港  
**原目录说明：** 香港政府地理数据目录与空间服务；各数据集分别标记版本、范围与更新周期  
**原目录获取方式：** 数据集详情的GeoSpatial Service；WFS/WMS/ArcGIS等以实际发布为准  
**原目录格式：** 空间数据目录

**全部网址：**

- <https://portal.csdi.gov.hk/>
- <https://data.gov.hk/en-datasets/provider/hk-md>

**本版处理：下载或图层端点待接入。** 目录不是一个数据 API；不同图层使用不同下载或空间服务端点。  
**可读展示 / 后续步骤：** 逐项核验 WFS/WMS/ArcGIS URL、图层名、坐标系及授权。  
**限制说明：** 逐项检查字段、坐标系、调用限制和使用条款；WMS图片不等于可用于计算的矢量

#### HK03 · 航道与分道通航区

**提供方：** 海事处 / 测量处｜**范围：** 香港  
**原目录说明：** Traffic Separation Schemes and Principal Fairways；航道/分道通航空间范围；按修订更新  
**原目录获取方式：** DATA.GOV.HK / CSDI空间API目录  
**原目录格式：** 空间数据目录

**全部网址：**

- <https://data.gov.hk/en-data/dataset/hk-md-hydro-traffic-separation-schemes-and-principal-fairways>

**本版处理：下载或图层端点待接入。** 可下载空间文件；本轮未取得并验证具体图层服务端点。  
**可读展示 / 后续步骤：** 下载 GeoJSON 后加入独立地图预览，或核验公开空间服务。  
**限制说明：** 图层不能单独表达全部航行规则；规则判断需结合最新通告及正式要求

#### HK04 · 香港水域限速区 · SRZ

**提供方：** 海事处 / 测量处｜**范围：** 香港  
**原目录说明：** 香港水域限速区域位置及规则说明；本站提供 47 个区域的地图预览。  
**原目录获取方式：** DATA.GOV.HK / CSDI空间API目录  
**原目录格式：** SHP / GeoJSON

**全部网址：**

- <https://data.gov.hk/en-data/dataset/hk-md-hydro-speed-restricted-zones>
- <https://portal.csdi.gov.hk/geoportal/?datasetId=mardep_rcd_1730972516934_759>

**本版处理：内嵌静态预览。** 已内嵌 47 个 SRZ 区域；文件发布版本未知，非实时法规校验。  
**可读展示 / 后续步骤：** 保留地图、属性表及原文；Zone B 自交问题需在空间计算前复核。  
**限制说明：** 上传文件的官方版本日期未提供。中文说明为辅助译文，不能判断当前限制是否生效。Zone B 有几何自交警告，原始几何已保留，未用于空间决策计算。

#### HK05 · 水域限高区

**提供方：** 海事处 / 测量处｜**范围：** 香港  
**原目录说明：** Height restriction areas in Hong Kong waters；静态空间范围；按修订更新  
**原目录获取方式：** DATA.GOV.HK / CSDI空间API目录  
**原目录格式：** 空间数据目录

**全部网址：**

- <https://data.gov.hk/en-data/dataset/hk-md-hydro-height-restriction-areas-in-hong-kong-waters>

**本版处理：下载或图层端点待接入。** 空间文件/服务目录可用，但本版未接入具体数据。  
**可读展示 / 后续步骤：** 取得文件或服务端点后独立展示，保留高度单位和适用条件。  
**限制说明：** 净空计算还涉及高度基准、潮位及船载设备高度；不能只做二维线相交

#### HK06 · 机场进场限制区域

**提供方：** 海事处 / 测量处｜**范围：** 香港  
**原目录说明：** Hong Kong International Airport Approach Areas；限制区域位置；按修订更新  
**原目录获取方式：** DATA.GOV.HK / CSDI空间API目录  
**原目录格式：** 空间数据目录

**全部网址：**

- <https://data.gov.hk/en-data/dataset/hk-md-hydro-hong-kong-international-airport-approach-areas>

**本版处理：下载或图层端点待接入。** 空间文件资料，不是实时飞行/船舶管制流。  
**可读展示 / 后续步骤：** 下载边界文件后独立预览，规则以原文为准。  
**限制说明：** 须按官方现行适用条款判断限制；不以自绘矩形替代官方范围

#### HK07 · 避风塘与设施

**提供方：** 海事处 / 测量处｜**范围：** 香港  
**原目录说明：** 避风塘位置；官方平面图/设施资料；准静态设施信息  
**原目录获取方式：** CSDI空间目录与海事处网页  
**原目录格式：** 空间数据目录

**全部网址：**

- <https://data.gov.hk/en-data/dataset/hk-md-hydro-typhoon-shelters>
- <https://www.mardep.gov.hk/en/public-services/port-services/lpf-tshelter/index.html>

**本版处理：下载或图层端点待接入。** 有静态位置资料；不能当作实时泊位或避风接纳能力。  
**可读展示 / 后续步骤：** 取得空间文件后预览设施及属性，不估算泊位余量。  
**限制说明：** 不提供实时泊位余量或到访许可；不是自动确认可驶入/停靠

#### HK08 · 海岸公园与保护区

**提供方：** 渔农自然护理署｜**范围：** 香港  
**原目录说明：** Marine Parks and Marine Reserve 边界；保护区域空间信息；按修订更新  
**原目录获取方式：** DATA.GOV.HK / CSDI目录  
**原目录格式：** 空间数据目录

**全部网址：**

- <https://data.gov.hk/en-data/dataset/hk-afcd-afcdlist-marineparksreserve>

**本版处理：下载或图层端点待接入。** 保护区边界是静态资料，各区管理要求不能统一简化。  
**可读展示 / 后续步骤：** 获取边界文件；同时链接每区正式说明。  
**限制说明：** 海岸公园不一律等于禁止航行；各区适用限制需核验

#### HK09 · 灯标、浮标与助航设施

**提供方：** 海事处 / 测量处｜**范围：** 香港  
**原目录说明：** 浮标、灯标等助航设施的官方介绍/参考；设施参考信息  
**原目录获取方式：** 海事处网页；完整图层需追踪MSDI或授权ENC  
**原目录格式：** 网页

**全部网址：**

- <https://www.mardep.gov.hk/en/public-services/port-services/atn/index.html>

**本版处理：原站网页 / 文档。** 助航设施介绍入口；未确认覆盖全部设备的原始位置/故障实时 API。  
**可读展示 / 后续步骤：** 保留官方网页，另行申请或核验适合的设备数据。  
**限制说明：** 概览网页不是完整可用的实时助航设施API；位置/状态需用适合来源

#### HK23 · 官方电子航海图 · HK ENC

**提供方：** 海事处 / 测量处｜**范围：** 香港  
**原目录说明：** 授权电子海图：海底地形/水深、航海对象等；S-57海图；订阅及更新服务  
**原目录获取方式：** 官方购买/许可；不是默认免费开放GIS数据  
**原目录格式：** ENC / 许可

**全部网址：**

- <https://www.hydro.gov.hk/eng/enc.php>
- <https://www.hydro.gov.hk/eng/ENCWeb/www/subscription.php>

**本版处理：订阅 / 授权。** 电子航海图有订阅/许可要求；公开门户不授予完整再发布权。  
**可读展示 / 后续步骤：** 研究采购或授权后，由有许可的软件读取；不内嵌未授权海图。  
**限制说明：** 平台展示、转格式、缓存与再发布权限须核实；公开网页≠海图数据开放许可

### 天气、潮位、潮流、波浪与环境（15 项）

#### HK10 · TSPS 香港潮流预测

**提供方：** 海事处 / 测量处｜**范围：** 香港  
**原目录说明：** 潮流速度、流向；水深平均/表层两种模式；约1200点；预测间隔15分钟；表层指顶部5%水层  
**原目录获取方式：** 官方批量下载；≤5点可下载≤12个月；全部点每次≤1个月  
**原目录格式：** 数据文件 / 网页

**全部网址：**

- <https://current.hydro.gov.hk/main/about.php?lang=en>
- <https://current.hydro.gov.hk/en/download.php>

**本版处理：下载或图层端点待接入。** 官方预测网页与下载表单；未验证无需会话的稳定原始 API。  
**可读展示 / 后续步骤：** 在原站选择点位和日期下载；做独立潮流预测回放，不标实测。  
**限制说明：** 天文潮流预测而非实测总海流；官方注明不可用于航海；不是逐秒局部浪流真值

#### HK11 · 风向、风速与阵风

**提供方：** 香港天文台 HKO｜**范围：** 香港  
**原目录说明：** 平均风向/风速、最大阵风；站点观测；每10分钟更新  
**原目录获取方式：** 官方开放数据CSV/相关空间资源  
**原目录格式：** CSV / 数据目录

**全部网址：**

- <https://data.gov.hk/en-data/dataset/hk-hko-rss-latest-ten-minute-wind-info>

**本版处理：已配置最新数据查询。** 已有正式数据入口，已实现解析、刷新和失败状态；外部联网仍需在用户环境验收。  
**可读展示 / 后续步骤：** 推荐用附带本地服务访问，避免浏览器跨域限制；保持来源时间和原始单位。  
**限制说明：** 陆地/岸边站风不能直接当作航迹处海面风；核验方向编码与km/h单位
  
**站内查询产品：** `wind`。

#### HK12 · 能见度观测

**提供方：** 香港天文台 HKO｜**范围：** 香港  
**原目录说明：** 各指定测站平均能见度；站点观测；每10分钟更新；临时资料  
**原目录获取方式：** DATA.GOV.HK官方开放数据资源  
**原目录格式：** CSV / 数据目录

**全部网址：**

- <https://data.gov.hk/en-data/dataset/hk-hko-rss-regional-weather-latest-10-min-mean-visibility>

**本版处理：已配置最新数据查询。** 已有正式数据入口，已实现解析、刷新和失败状态；外部联网仍需在用户环境验收。  
**可读展示 / 后续步骤：** 推荐用附带本地服务访问，避免浏览器跨域限制；保持来源时间和原始单位。  
**限制说明：** 有限站点不代表全水域；低能见度不应只靠远处测站判定
  
**站内查询产品：** `visibility`。

#### HK13 · 实测潮位

**提供方：** 香港天文台 HKO｜**范围：** 香港  
**原目录说明：** 潮位站水位；站点观测；目录更新周期每5分钟  
**原目录获取方式：** 官方CSV；ALL_en.csv  
**原目录格式：** CSV / 数据目录

**全部网址：**

- <https://data.gov.hk/en-data/dataset/hk-hko-rss-latest-tidal-info>
- <https://data.weather.gov.hk/weatherAPI/hko_data/tide/ALL_en.csv>

**本版处理：已配置最新数据查询。** 已有正式数据入口，已实现解析、刷新和失败状态；外部联网仍需在用户环境验收。  
**可读展示 / 后续步骤：** 推荐用附带本地服务访问，避免浏览器跨域限制；保持来源时间和原始单位。  
**限制说明：** 必须保留垂向基准；潮位≠潮流≠波浪；不得未经基准转换直接叠加海底地形
  
**站内查询产品：** `tide`。

#### HK14 · 潮汐高度预测

**提供方：** 香港天文台 HKO｜**范围：** 香港  
**原目录说明：** 天文潮位预测；逐小时预测值；年度资料不等于每小时重新预报  
**原目录获取方式：** 官方年度CSV/预测网页  
**原目录格式：** CSV / 数据目录

**全部网址：**

- <https://data.gov.hk/en-data/dataset/hk-hko-rss-hourly-heights-of-tides>
- <https://www.hko.gov.hk/en/tide/predtide.htm>

**本版处理：条件查询 / 待覆盖核验。** 已实现 HHOT 按日期查询，但当年覆盖须在实际接口中验证。  
**可读展示 / 后续步骤：** 保留条件查询入口；不把未来潮高预报称为实测或实时观测。  
**限制说明：** 不等于实测水位；不包含全部气象增水和波浪效应
  
**站内查询产品：** `hhot`。

#### HK15 · 天气警告与气象开放资料

**提供方：** 香港天文台 HKO｜**范围：** 香港  
**原目录说明：** 天气警告、降雨及其他相关天气产品；按产品分别发布/更新  
**原目录获取方式：** 官方Open Data / API目录  
**原目录格式：** 数据目录

**全部网址：**

- <https://www.hko.gov.hk/en/abouthko/opendata_intro.htm>

**本版处理：已配置最新数据查询。** 已有正式数据入口，已实现解析、刷新和失败状态；外部联网仍需在用户环境验收。  
**可读展示 / 后续步骤：** 推荐用附带本地服务访问，避免浏览器跨域限制；保持来源时间和原始单位。  
**限制说明：** 预报、警告和观测必须分别保存；不能把全港警告等同航点现场量测
  
**站内查询产品：** `rhrread`、`warnsum`、`warningInfo`、`swt`、`flw`、`fnd`。

#### HK16 · 华南沿岸海域天气报告

**提供方：** 香港天文台 HKO｜**范围：** 香港  
**原目录说明：** South China Coastal Waters bulletin；区域海事天气报告；每日7次及必要更新  
**原目录获取方式：** 官方开放数据目录  
**原目录格式：** 网页

**全部网址：**

- <https://data.gov.hk/en-data/dataset/hk-hko-rss-south-china-coastal-waters-bulletin>

**本版处理：已配置最新数据查询。** 已有正式数据入口，已实现解析、刷新和失败状态；外部联网仍需在用户环境验收。  
**可读展示 / 后续步骤：** 推荐用附带本地服务访问，避免浏览器跨域限制；保持来源时间和原始单位。  
**限制说明：** 属于区域文字报告，不是逐位置高频传感器数据
  
**站内查询产品：** `sccw`。

#### HK17 · 渔民气象与海洋资讯

**提供方：** 香港天文台 HKO｜**范围：** 香港  
**原目录说明：** 波高/周期、涌浪、海流等海洋气象展示；区域数值预报及其他网页气象资讯  
**原目录获取方式：** 公开可浏览网页；本轮未确认稳定公开原始API  
**原目录格式：** 网页

**全部网址：**

- <https://www.hko.gov.hk/en/fishermen/main.htm>

**本版处理：原站网页 / 文档。** 聚合网页/图表入口；未核验可再发布的原始机器接口。  
**可读展示 / 后续步骤：** 原站查看；逐图核对来源与复用许可后再制作预览。  
**限制说明：** 不得将网页可见等同可以批量抓取或再分发；模型预报不是真值

#### HK18 · 香港历史波浪观测

**提供方：** 土木工程拓展署 CEDD｜**范围：** 香港  
**原目录说明：** 有效波高Hmo、Hmax、Tp、Tz、平均波向与水深等；交椅洲/西博寮海峡；网页列有1994—2025年度数据  
**原目录获取方式：** 官方年度数据文件与统计表；CSDI也有目录项  
**原目录格式：** 数据文件 / 网页

**全部网址：**

- <https://www.cedd.gov.hk/eng/about-us/core-business/port/wave-measurement/index.html>
- <https://data.gov.hk/en-data/dataset/hk-cedd-csu-wave-measurement>

**本版处理：历史 / 静态资料。** 年度历史文件；不是全港实时波浪传感器流。  
**可读展示 / 后续步骤：** 选取年度文件后解析站点和波浪参数，做历史图表。  
**限制说明：** 不是实时全港波浪流；原文件采样间隔/缺测需下载核查；未确认有逐波相位序列

#### HK24 · 海水水质监测

**提供方：** 环境保护署 EPD｜**范围：** 香港  
**原目录说明：** 海水水质历史及近期监测数据；水质站点；按各产品发布周期  
**原目录获取方式：** EPIC查询与DATA.GOV.HK资源  
**原目录格式：** 数据文件 / 网页

**全部网址：**

- <https://epic.epd.gov.hk/EPICRIVER/marine/?lang=en>
- <https://data.gov.hk/en-data/dataset/hk-epd-marineteam-marine-water-quality-historical-data-en>

**本版处理：历史 / 静态资料。** 水质历史/定期监测，不是实时 ASV 航行状态。  
**可读展示 / 后续步骤：** 按站点和月份下载后预览，注明采样日期。  
**限制说明：** 不是导航避碰、波浪相位或船体响应数据；不应挤占首版核心工作

#### INT02 · Copernicus 全球波浪

**提供方：** Copernicus Marine｜**范围：** 国际 / 香港周边可参考  
**原目录说明：** 有效波高、周期、方向、风浪/涌浪、Stokes漂移等；GLOBAL_ANALYSISFORECAST_WAV_001_027；1/12°约8–9km；原生3小时场  
**原目录获取方式：** 官方目录；Copernicus Marine Toolbox/数据下载  
**原目录格式：** 数据服务

**全部网址：**

- <https://data.marine.copernicus.eu/product/GLOBAL_ANALYSISFORECAST_WAV_001_027/description>

**本版处理：账户 / 后端配置。** 可程序化下载/裁切的海洋产品；不是无需处理即可嵌入的港内实时图层。  
**可读展示 / 后续步骤：** 确认账户与产品访问方式，用官方 Toolbox 下载香港区域子集并缓存。  
**限制说明：** 粗网格不解析小港池、局地反射和船行波；数据访问与条款按产品核实

#### INT03 · Copernicus 全球海流

**提供方：** Copernicus Marine｜**范围：** 国际 / 香港周边可参考  
**原目录说明：** 流速、海面高度、温盐等海洋状态；GLOBAL_ANALYSISFORECAST_PHY_001_024；1/12°；分变量/层次/时间分辨率  
**原目录获取方式：** 官方目录；Python/CLI下载与空间子集  
**原目录格式：** 数据服务

**全部网址：**

- <https://data.marine.copernicus.eu/product/GLOBAL_ANALYSISFORECAST_PHY_001_024/description>

**本版处理：账户 / 后端配置。** 模式海流产品需选择变量、层次、时段及区域；本版未部署裁切后端。  
**可读展示 / 后续步骤：** 核验产品访问条件后做服务端裁切与图表；保留流向约定。  
**限制说明：** 先分清总流、潮流、残余流和Stokes漂移；不得与TSPS随意相加

#### INT04 · Open-Meteo 海洋气象 API

**提供方：** Open-Meteo｜**范围：** 国际 / 香港周边可参考  
**原目录说明：** 波高/周期/方向、涌浪及部分海流/海面高度字段；取决于上游模型；香港相关全球产品公里级  
**原目录获取方式：** JSON API；公共非商业服务有使用限制；按现行条款  
**原目录格式：** JSON

**全部网址：**

- <https://open-meteo.com/en/docs/marine-weather-api>
- <https://open-meteo.com/en/licence>

**本版处理：已配置最新数据查询。** 已有正式数据入口，已实现解析、刷新和失败状态；外部联网仍需在用户环境验收。  
**可读展示 / 后续步骤：** 推荐用附带本地服务访问，避免浏览器跨域限制；保持来源时间和原始单位。  
**限制说明：** 官方明确不用于近岸航行；小时输出不代表小时观测；与CMEMS可能同源而非独立证据
  
**站内查询产品：** `marine`。

#### INT05 · GEBCO 全球海底地形

**提供方：** GEBCO｜**范围：** 国际 / 香港周边可参考  
**原目录说明：** 全球海底地形网格，供大尺度地形背景与科研资料检索；产品版本以官方页面为准。  
**原目录获取方式：** 公开栅格下载/区域裁切工具  
**原目录格式：** 栅格

**全部网址：**

- <https://www.gebco.net/data-products-gridded-bathymetry-data/gebco2026-grid>

**本版处理：历史 / 静态资料。** 静态大体量海底地形栅格，不适合伪装成实时水深。  
**可读展示 / 后续步骤：** 下载并裁切香港附近区域；仅做粗尺度背景，非航海水深。  
**限制说明：** 官方禁止将其用于航海或海上安全用途；不能替代港内精细水深/ENC

#### INT06 · ERA5 历史环境再分析

**提供方：** Copernicus / ECMWF｜**范围：** 国际 / 香港周边可参考  
**原目录说明：** 历史风场及其他气象/海洋变量；1940年至今的全球再分析；产品/变量网格各异  
**原目录获取方式：** Copernicus CDS账户/条款；下载或CDS API  
**原目录格式：** 数据服务

**全部网址：**

- <https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels?tab=download>

**本版处理：账户 / 后端配置。** 历史再分析产品，下载一般需要 CDS 账户/相应 API 配置。  
**可读展示 / 后续步骤：** 授权后裁切历史时空范围；不能作为当时可用的预报。  
**限制说明：** 再分析不是当时可用的预报；训练/评测不得通过事后资料泄漏未来信息

### 航行通告、工程与规则（4 项）

#### HK19 · 海事处布告

**提供方：** 海事处 / 测量处｜**范围：** 香港  
**原目录说明：** 施工、活动、临时限制、其他航行相关通知；事件驱动；正文含生效条件和期限  
**原目录获取方式：** 官方网页/RSS及PDF原文  
**原目录格式：** 网页 / 文档

**全部网址：**

- <https://www.mardep.gov.hk/en/legislation/notices/md-notices/index.html>

**本版处理：原站网页 / 文档。** 已核实公开网页/PDF；原版所写 RSS 未找到可确认的具体订阅端点。  
**可读展示 / 后续步骤：** 显示布告原文入口；需要自动列表时先核验官方馈送，不绕过访问控制。  
**限制说明：** 保留原文、通告编号、开始/结束/撤销/取代关系；不得由LLM凭空补坐标

#### HK20 · 进行中的海上工程

**提供方：** 海事处 / 测量处｜**范围：** 香港  
**原目录说明：** Marine Works in Progress 项目位置及布告引用；官方工程清单；含预计完成时间  
**原目录获取方式：** 官方网页及对应海事处布告  
**原目录格式：** 网页 / 文档

**全部网址：**

- <https://www.mardep.gov.hk/en/public-services/marine-works-in-progress/index.html>

**本版处理：原站网页 / 文档。** 工程目录及原文，未确认稳定公开机器接口。  
**可读展示 / 后续步骤：** 原站列表查看；人工核验范围、有效期和撤销情况。  
**限制说明：** 预计完成日期不是确认撤销日期；图形与范围需核验原文

#### HK21 · 航海通告与海图改正

**提供方：** 海事处 / 测量处｜**范围：** 香港  
**原目录说明：** 海图改正与临时航行资讯；通常双周海图改正；临时事项按发布  
**原目录获取方式：** 测量处网页、通告文件；配合适用海图  
**原目录格式：** 网页 / 文档

**全部网址：**

- <https://www.hydro.gov.hk/eng/ntm.php>

**本版处理：原站网页 / 文档。** 航海通告/海图改正文件，不等于连续事件 API。  
**可读展示 / 后续步骤：** 按期下载、索引原文；保留版次与生效信息。  
**限制说明：** 海图改正和海事处布告是相关但不同产品；不可互相完全替代

#### INT07 · 国际海上避碰规则 · COLREG

**提供方：** 国际海事组织 IMO｜**范围：** 国际 / 香港周边可参考  
**原目录说明：** 国际海上避碰规则及官方说明；规则文档；须结合适用本地要求  
**原目录获取方式：** IMO官网；完整法规文本/版本需依法取得  
**原目录格式：** 网页 / 文档

**全部网址：**

- <https://www.imo.org/en/about/conventions/pages/colreg.aspx>

**本版处理：原站网页 / 文档。** 规则说明，不是数据流；完整规范的版本、获取和使用条件另核。  
**可读展示 / 后续步骤：** 保留 IMO 原文入口，不自动输出“已符合避碰规则”的结论。  
**限制说明：** 规则不是直接可接入的位置流；不能仅用AIS或静态多边形声称已全面合规

### 船舶与港口交通（2 项）

#### HK22 · 港口船舶交通报告 · VTMS

**提供方：** 海事处 / 测量处｜**范围：** 香港  
**原目录说明：** 预计抵港、离港意向、在港船舶、活动及系泊报告；报告型港口信息；各报告更新时间不同  
**原目录获取方式：** 官方HTML/XML报告  
**原目录格式：** HTML / XML

**全部网址：**

- <https://data.gov.hk/en-data/dataset/hk-md-mardep-vessel-traffic-management-system-report>
- <https://www.mardep.gov.hk/e_files/en/pub_services/arridepa.html>

**本版处理：已配置最新数据查询。** 已有正式数据入口，已实现解析、刷新和失败状态；外部联网仍需在用户环境验收。  
**可读展示 / 后续步骤：** 推荐用附带本地服务访问，避免浏览器跨域限制；保持来源时间和原始单位。  
**限制说明：** 不是实时AIS坐标或航迹；不能用来重建全港实时船位
  
**站内查询产品：** `vtms_due`、`vtms_intend`、`vtms_entered`、`vtms_departed`、`vtms_inport`、`vtms_transit`、`location`。

#### INT01 · AISStream 船舶位置服务

**提供方：** AISStream｜**范围：** 国际 / 香港周边可参考  
**原目录说明：** 船舶AIS位置及静态信息等消息；全球接收网络；香港实际覆盖、延迟和完整性未测试  
**原目录获取方式：** 注册API Key；后端WebSocket订阅；按经纬度边界筛选  
**原目录格式：** WebSocket

**全部网址：**

- <https://aisstream.io/>
- <https://aisstream.io/documentation>

**本版处理：账户 / 后端配置。** 需 API Key，官方要求后端连接；本次没有用户密钥，香港覆盖也未实测。  
**可读展示 / 后续步骤：** 配置自有密钥和后端 WebSocket 后再接入；验证覆盖、延迟、授权与存储条件。  
**限制说明：** 不可保证全港或所有小船可见；服务数据条款另核验；开源示例不等于开放数据许可

### GitHub 开源工具（9 项）

#### GH01 · MapLibre GL JS

**提供方：** maplibre/maplibre-gl-js｜**范围：** 开发组件  
**原目录说明：** Web 地图与交互图层组件。  
**原目录获取方式：** 访问仓库，核对安装文档、许可证及运行要求。  
**原目录格式：** GitHub

**全部网址：**

- <https://github.com/maplibre/maplibre-gl-js>

**本版处理：开源工具，非数据源。** 这是软件组件仓库，不会自动提供香港海事数据；本次未安装或验证部署。  
**可读展示 / 后续步骤：** 按后续开发任务选用；软件许可证与数据许可分别核实。  
**限制说明：** 用于后续搭建地图前端，本身不提供香港海事数据。

#### GH02 · AISStream 接入示例

**提供方：** aisstream/aisstream｜**范围：** 开发组件  
**原目录说明：** 船舶 AIS 服务的示例代码与开发入口。  
**原目录获取方式：** 访问仓库，核对安装文档、许可证及运行要求。  
**原目录格式：** GitHub

**全部网址：**

- <https://github.com/aisstream/aisstream>

**本版处理：开源工具，非数据源。** 这是软件组件仓库，不会自动提供香港海事数据；本次未安装或验证部署。  
**可读展示 / 后续步骤：** 按后续开发任务选用；软件许可证与数据许可分别核实。  
**限制说明：** 示例开源不代表数据无限制开放；需要另核服务条款。

#### GH03 · pyais

**提供方：** M0r13n/pyais｜**范围：** 开发组件  
**原目录说明：** Python AIS 消息解码工具。  
**原目录获取方式：** 访问仓库，核对安装文档、许可证及运行要求。  
**原目录格式：** GitHub

**全部网址：**

- <https://github.com/M0r13n/pyais>

**本版处理：开源工具，非数据源。** 这是软件组件仓库，不会自动提供香港海事数据；本次未安装或验证部署。  
**可读展示 / 后续步骤：** 按后续开发任务选用；软件许可证与数据许可分别核实。  
**限制说明：** 用于解析收到的 AIS 消息；不是 AIS 数据供应方。

#### GH04 · AIS-catcher

**提供方：** jvde-github/AIS-catcher｜**范围：** 开发组件  
**原目录说明：** 配合无线接收设备解码 AIS 的软件。  
**原目录获取方式：** 访问仓库，核对安装文档、许可证及运行要求。  
**原目录格式：** GitHub

**全部网址：**

- <https://github.com/jvde-github/AIS-catcher>

**本版处理：开源工具，非数据源。** 这是软件组件仓库，不会自动提供香港海事数据；本次未安装或验证部署。  
**可读展示 / 后续步骤：** 按后续开发任务选用；软件许可证与数据许可分别核实。  
**限制说明：** 需要接收硬件、合适天线与部署条件；不能据此承诺全港覆盖。

#### GH05 · Signal K Server

**提供方：** SignalK/signalk-server｜**范围：** 开发组件  
**原目录说明：** 船载仪表与遥测数据网关。  
**原目录获取方式：** 访问仓库，核对安装文档、许可证及运行要求。  
**原目录格式：** GitHub

**全部网址：**

- <https://github.com/SignalK/signalk-server>

**本版处理：开源工具，非数据源。** 这是软件组件仓库，不会自动提供香港海事数据；本次未安装或验证部署。  
**可读展示 / 后续步骤：** 按后续开发任务选用；软件许可证与数据许可分别核实。  
**限制说明：** 用于未来汇聚本艇数据，不是香港公共海况服务。

#### GH06 · OpenCPN

**提供方：** OpenCPN/OpenCPN｜**范围：** 开发组件  
**原目录说明：** 桌面海图、航线及 AIS 功能的开源参考。  
**原目录获取方式：** 访问仓库，核对安装文档、许可证及运行要求。  
**原目录格式：** GitHub

**全部网址：**

- <https://github.com/OpenCPN/OpenCPN>

**本版处理：开源工具，非数据源。** 这是软件组件仓库，不会自动提供香港海事数据；本次未安装或验证部署。  
**可读展示 / 后续步骤：** 按后续开发任务选用；软件许可证与数据许可分别核实。  
**限制说明：** 不是现成 Web 平台；海图许可独立于代码许可。

#### GH07 · OpenSeaMap 在线海图

**提供方：** OpenSeaMap/online_chart｜**范围：** 开发组件  
**原目录说明：** 开放海图网页项目与海事图层组织参考。  
**原目录获取方式：** 访问仓库，核对安装文档、许可证及运行要求。  
**原目录格式：** GitHub

**全部网址：**

- <https://github.com/OpenSeaMap/online_chart>

**本版处理：开源工具，非数据源。** 这是软件组件仓库，不会自动提供香港海事数据；本次未安装或验证部署。  
**可读展示 / 后续步骤：** 按后续开发任务选用；软件许可证与数据许可分别核实。  
**限制说明：** 香港内容完整性、维护状态及数据权限需另外检查。

#### GH08 · Copernicus Marine Toolbox

**提供方：** mercator-ocean/copernicus-marine-toolbox｜**范围：** 开发组件  
**原目录说明：** 海洋产品查询、下载及区域裁切工具。  
**原目录获取方式：** 访问仓库，核对安装文档、许可证及运行要求。  
**原目录格式：** GitHub

**全部网址：**

- <https://github.com/mercator-ocean/copernicus-marine-toolbox>

**本版处理：开源工具，非数据源。** 这是软件组件仓库，不会自动提供香港海事数据；本次未安装或验证部署。  
**可读展示 / 后续步骤：** 按后续开发任务选用；软件许可证与数据许可分别核实。  
**限制说明：** 用于获取产品，不是香港局部浪场仿真器。

#### GH09 · VRX 水面艇仿真

**提供方：** osrf/vrx｜**范围：** 开发组件  
**原目录说明：** 无人水面艇任务仿真与评测环境。  
**原目录获取方式：** 访问仓库，核对安装文档、许可证及运行要求。  
**原目录格式：** GitHub

**全部网址：**

- <https://github.com/osrf/vrx>

**本版处理：开源工具，非数据源。** 这是软件组件仓库，不会自动提供香港海事数据；本次未安装或验证部署。  
**可读展示 / 后续步骤：** 按后续开发任务选用；软件许可证与数据许可分别核实。  
**限制说明：** 仿真场景不能直接称为香港真实海域数字孪生。

### 支持数据与条款（非额外实时源）

**离线海岸线背景数据来源 GSHHG**  
<https://www.soest.hawaii.edu/pwessel/gshhg/>  
这是旧版地图海岸线的来源归属，不是香港最新测量海岸线或实时船位图层。

**香港政府开放数据使用条款**  
<https://data.gov.hk/en/terms-and-conditions>  
数据使用和再发布条件入口，不是观测数据接口。

## 5. 不能直接读取的资料：独立分类总表

详细操作和逐项全部 URL 另见 `HK_Maritime_NonDirect_Sources.md`。这里列出原目录 ID，便于与网站及开发配置对照。

| 原因 | 原目录 ID | 下一步 |
|---|---|---|
| 当年覆盖待核验 | HK14 | HHOT 有连接器，但先确认选定年份有数据。 |
| 需下载/具体空间服务端点 | HK02, HK03, HK05, HK06, HK07, HK08, HK10 | 获取 GeoJSON 或 WFS/WMS/ArcGIS 具体地址，校验坐标与字段后单独预览。 |
| 历史/静态文件 | HK18, HK24, INT05 | 下载并解析，不标实时。 |
| 账户、密钥或服务端处理 | INT01, INT02, INT03, INT06 | 配置自有凭证或裁切流程；先核验权限。 |
| 订阅/授权 | HK23 | 取得订阅与再展示许可。 |
| 网页/PDF为主 | HK01, HK09, HK17, HK19, HK20, HK21, INT07 | 原站阅读；有正式馈送再接入，不凭网页可访问假定可嵌入/抓取。 |

**SRZ 已经放进网站**：继续保留内嵌静态地图和原始属性。其他空间数据不能因为“本版没接入”就断言没有 API；当前欠缺的是具体且已核验的数据文件/端点。**9 项 GitHub 是工具**，不应塞入“无法联网的数据源”名单。

## 6. 本地打开与数据读取

### 6.1 推荐：带只读后端启动

```bash
cd /你的解压目录/HK_Maritime_Hub_V2
python3 server.py
```

保持终端开启，浏览器访问 `http://127.0.0.1:8765`。进入“最新数据”，选择产品。风/潮位/天气等读取公开资料，不需要在网页输入密钥。Windows 可用 `py -3 server.py`。端口占用时用 `python3 server.py --port 8766`。需要 Python 3.10 或以上；程序运行不需要安装额外 Python 库。

服务器只允许预设的 `data.weather.gov.hk`、`www.mardep.gov.hk`、`marine-api.open-meteo.com` HTTPS 端点；不接受任意 URL，不发送账户 Cookie，不获取登录后的私有资料。上游重定向也受域名白名单限制。每个接口有缓存周期，失败会短暂退避；缓存命中显示首次取得时刻。

### 6.2 直接双击 HTML

目录、非直连清单和 SRZ 地图不依赖网络。最新数据页面会尝试浏览器直连公开接口，但源站跨域政策可能使部分 XML/CSV 无法读取。出现错误不等于该数据不存在；请用上面的本地服务。纯静态托管也不能自动消除 CORS。`fetch(..., mode="no-cors")` 无法解决数据读取问题，本版没有这样做。

### 6.3 后续公网部署

本包默认仅监听 `127.0.0.1`，并校验 localhost Host/Origin，避免被用作开放代理。尚未绑定域名、创建隧道或部署到你的树莓派/云服务器。若以后部署为公网网站，需要正式配置反向代理、允许的站点域名、TLS、访问控制与限流；不能简单把本地网关暴露成任意 URL 代理。

## 7. 数据质量、许可与展示约束

提供方、原始入口、数据性质、源站时刻、取得时刻和原始单位都需要保留。没有源站时刻时明确写“未提供”，不以未来 ETA、预报有效时间或 HTTP 获取时间替代。旧成功结果只在刷新失败时作为“上次成功结果”展示；不会伪装成当前在线数据。

站点风、潮位、能见度不代表船只位置的局部场；潮位、潮流、波浪是不同变量，垂向基准、方向约定与空间分辨率不能混用。Open-Meteo 与 Copernicus 某些产品可能共享上游模型，不应被当作两份独立证据。没有获取/验证 AIS 时，不绘制假船点作为实时交通。

天气/海洋模型预报不用于近岸航行决策。Open-Meteo 数据展示附署名和许可链接；数据许可证与免费服务的商业使用限制是不同事项。香港政府资料、海图、仓库代码和海岸线数据各自适用相应条款；门户可见不自动授予批量抓取、嵌入或再发布权。

SRZ 原始 47 个区域、名称与 INFORM 属性保留；原文件官方发布日期/版本未提供。内置中文摘要属于辅助解释。Zone B 有 `Ring Self-intersection[114.2337104 22.2842305]` 警告，未自动修复；用于判断航线相交等空间运算前必须复核。

## 8. 相比上传版本新增或纠正的地方

**HK16 华南沿岸海域报告：** 原来主要作为入口，现在根据官方目录添加 JSON 读取，分开显示区域预报、沿岸站报告和天气展望。

**HK22 VTMS：** 添加官方目录列出的 6 类 XML 船舶日报及地点字典，不把它等同于 AIS。代码未预设一定为空或一定包含经纬度。

**HK19 海事处布告：** 原目录获取方式曾提及 RSS；本轮未核实到可确认的具体海事处布告 RSS 地址，因此没有编造订阅端点。DATA.GOV.HK 页脚的全站数据更新 RSS，也不是该布告的事件馈送。

**HK14 HHOT：** 提供条件式查询，但保留当年覆盖未核验提示，不用过去年份替代当前年份。**空间文件/图层服务：** 未凭空构造 CSDI 图层名或 URL；只有已上传的 SRZ 被保留为实际地图预览。

## 9. 核验状态与尚未完成的部分

本轮通过在线浏览核对了主要官方数据目录、API 文档、参数和部分原始响应文本。原生代码运行环境无法解析外部域名，因此没有完成全部接口的端到端外网连接、CORS、覆盖率及长时间稳定性验收。部分在线工具所返回原始响应存在缓存/旧时间，不打包为“实时数据”。

本包进行了本地脚本语法、页面导航、响应式布局、解析器分支和网关输入限制测试。解析器测试使用独立合成夹具，明确不作为真实数据保存进网站，也不作为外网成功证据；详细结果见 `TEST_REPORT.md`。

交付状态是“可在用户正常网络环境尝试读取的 V2 网站 + 已整理的完整资源目录”，不是已经公开部署、持续采集并验证全部来源在线的生产服务。AIS 密钥配置、受许可 ENC、其他尚未取得的空间文件、Copernicus/ERA5 裁切下载与长期历史数据库均未冒充完成。

## 附录 A：原网页网址索引（去重）

1. <https://aisstream.io/>
2. <https://aisstream.io/documentation>
3. <https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels?tab=download>
4. <https://current.hydro.gov.hk/en/download.php>
5. <https://current.hydro.gov.hk/main/about.php?lang=en>
6. <https://data.gov.hk/en-data/dataset/hk-afcd-afcdlist-marineparksreserve>
7. <https://data.gov.hk/en-data/dataset/hk-cedd-csu-wave-measurement>
8. <https://data.gov.hk/en-data/dataset/hk-epd-marineteam-marine-water-quality-historical-data-en>
9. <https://data.gov.hk/en-data/dataset/hk-hko-rss-hourly-heights-of-tides>
10. <https://data.gov.hk/en-data/dataset/hk-hko-rss-latest-ten-minute-wind-info>
11. <https://data.gov.hk/en-data/dataset/hk-hko-rss-latest-tidal-info>
12. <https://data.gov.hk/en-data/dataset/hk-hko-rss-regional-weather-latest-10-min-mean-visibility>
13. <https://data.gov.hk/en-data/dataset/hk-hko-rss-south-china-coastal-waters-bulletin>
14. <https://data.gov.hk/en-data/dataset/hk-md-hydro-height-restriction-areas-in-hong-kong-waters>
15. <https://data.gov.hk/en-data/dataset/hk-md-hydro-hong-kong-international-airport-approach-areas>
16. <https://data.gov.hk/en-data/dataset/hk-md-hydro-speed-restricted-zones>
17. <https://data.gov.hk/en-data/dataset/hk-md-hydro-traffic-separation-schemes-and-principal-fairways>
18. <https://data.gov.hk/en-data/dataset/hk-md-hydro-typhoon-shelters>
19. <https://data.gov.hk/en-data/dataset/hk-md-mardep-vessel-traffic-management-system-report>
20. <https://data.gov.hk/en-datasets/provider/hk-md>
21. <https://data.marine.copernicus.eu/product/GLOBAL_ANALYSISFORECAST_PHY_001_024/description>
22. <https://data.marine.copernicus.eu/product/GLOBAL_ANALYSISFORECAST_WAV_001_027/description>
23. <https://data.weather.gov.hk/weatherAPI/hko_data/tide/ALL_en.csv>
24. <https://epic.epd.gov.hk/EPICRIVER/marine/?lang=en>
25. <https://github.com/M0r13n/pyais>
26. <https://github.com/OpenCPN/OpenCPN>
27. <https://github.com/OpenSeaMap/online_chart>
28. <https://github.com/SignalK/signalk-server>
29. <https://github.com/aisstream/aisstream>
30. <https://github.com/jvde-github/AIS-catcher>
31. <https://github.com/maplibre/maplibre-gl-js>
32. <https://github.com/mercator-ocean/copernicus-marine-toolbox>
33. <https://github.com/osrf/vrx>
34. <https://msdi.hydro.gov.hk/>
35. <https://open-meteo.com/en/docs/marine-weather-api>
36. <https://open-meteo.com/en/licence>
37. <https://portal.csdi.gov.hk/>
38. <https://portal.csdi.gov.hk/geoportal/?datasetId=mardep_rcd_1730972516934_759>
39. <https://www.cedd.gov.hk/eng/about-us/core-business/port/wave-measurement/index.html>
40. <https://www.gebco.net/data-products-gridded-bathymetry-data/gebco2026-grid>
41. <https://www.hko.gov.hk/en/abouthko/opendata_intro.htm>
42. <https://www.hko.gov.hk/en/fishermen/main.htm>
43. <https://www.hko.gov.hk/en/tide/predtide.htm>
44. <https://www.hydro.gov.hk/eng/ENCWeb/www/subscription.php>
45. <https://www.hydro.gov.hk/eng/enc.php>
46. <https://www.hydro.gov.hk/eng/latest_news.php>
47. <https://www.hydro.gov.hk/eng/ntm.php>
48. <https://www.imo.org/en/about/conventions/pages/colreg.aspx>
49. <https://www.mardep.gov.hk/e_files/en/pub_services/arridepa.html>
50. <https://www.mardep.gov.hk/en/legislation/notices/md-notices/index.html>
51. <https://www.mardep.gov.hk/en/public-services/marine-works-in-progress/index.html>
52. <https://www.mardep.gov.hk/en/public-services/port-services/atn/index.html>
53. <https://www.mardep.gov.hk/en/public-services/port-services/lpf-tshelter/index.html>
54. <https://www.soest.hawaii.edu/pwessel/gshhg/> — 离线海岸线背景数据来源 GSHHG
55. <https://data.gov.hk/en/terms-and-conditions> — 香港政府开放数据使用条款

## 附录 B：输入文件与可追溯性

输入文件：`HK_Maritime_Hub_V1.html`  
SHA-256：`93679f0e0163283a60a5ee62dc88e68da26999ccb38cfae8f0bf2f9b44ec94a7`  
原始 40 项目录另存 `catalog_original.json`，新增分类和接口说明另存 `catalog.json` / `feeds.json`。所有原始 URL 均保留。
