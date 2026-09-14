# 香港海事数据枢纽 V2：非直连与条件查询资料

**日期：2026-09-13｜底稿：本次上传的新版 HTML。**

本清单包含 22 项本版未直接读取的资料，以及 1 项当年覆盖待核验的 HHOT 条件查询。它不是“技术上永远不能读取”的名单，而是当前展示状态与后续处理要求。SRZ 已有静态地图；常规最新查询另见主文档；9 个 GitHub 仓库是工具，不计入本清单。

## 条件查询（1 项）

需要确认当前年份/日期覆盖。

### HK14 · 潮汐高度预测

**为何本版未常规直连：** 已实现 HHOT 按日期查询，但当年覆盖须在实际接口中验证。  
**后续步骤：** 保留条件查询入口；不把未来潮高预报称为实测或实时观测。  
**原目录限制：** 不等于实测水位；不包含全部气象增水和波浪效应

**全部原始网址：**

- <https://data.gov.hk/en-data/dataset/hk-hko-rss-hourly-heights-of-tides>
- <https://www.hko.gov.hk/en/tide/predtide.htm>

## 下载或具体空间服务端点待接入（7 项）

文件到手后可做独立地图；目前不是实时接入。

### HK02 · CSDI / 政府开放数据目录

**为何本版未常规直连：** 目录不是一个数据 API；不同图层使用不同下载或空间服务端点。  
**后续步骤：** 逐项核验 WFS/WMS/ArcGIS URL、图层名、坐标系及授权。  
**原目录限制：** 逐项检查字段、坐标系、调用限制和使用条款；WMS图片不等于可用于计算的矢量

**全部原始网址：**

- <https://portal.csdi.gov.hk/>
- <https://data.gov.hk/en-datasets/provider/hk-md>

### HK03 · 航道与分道通航区

**为何本版未常规直连：** 可下载空间文件；本轮未取得并验证具体图层服务端点。  
**后续步骤：** 下载 GeoJSON 后加入独立地图预览，或核验公开空间服务。  
**原目录限制：** 图层不能单独表达全部航行规则；规则判断需结合最新通告及正式要求

**全部原始网址：**

- <https://data.gov.hk/en-data/dataset/hk-md-hydro-traffic-separation-schemes-and-principal-fairways>

### HK05 · 水域限高区

**为何本版未常规直连：** 空间文件/服务目录可用，但本版未接入具体数据。  
**后续步骤：** 取得文件或服务端点后独立展示，保留高度单位和适用条件。  
**原目录限制：** 净空计算还涉及高度基准、潮位及船载设备高度；不能只做二维线相交

**全部原始网址：**

- <https://data.gov.hk/en-data/dataset/hk-md-hydro-height-restriction-areas-in-hong-kong-waters>

### HK06 · 机场进场限制区域

**为何本版未常规直连：** 空间文件资料，不是实时飞行/船舶管制流。  
**后续步骤：** 下载边界文件后独立预览，规则以原文为准。  
**原目录限制：** 须按官方现行适用条款判断限制；不以自绘矩形替代官方范围

**全部原始网址：**

- <https://data.gov.hk/en-data/dataset/hk-md-hydro-hong-kong-international-airport-approach-areas>

### HK07 · 避风塘与设施

**为何本版未常规直连：** 有静态位置资料；不能当作实时泊位或避风接纳能力。  
**后续步骤：** 取得空间文件后预览设施及属性，不估算泊位余量。  
**原目录限制：** 不提供实时泊位余量或到访许可；不是自动确认可驶入/停靠

**全部原始网址：**

- <https://data.gov.hk/en-data/dataset/hk-md-hydro-typhoon-shelters>
- <https://www.mardep.gov.hk/en/public-services/port-services/lpf-tshelter/index.html>

### HK08 · 海岸公园与保护区

**为何本版未常规直连：** 保护区边界是静态资料，各区管理要求不能统一简化。  
**后续步骤：** 获取边界文件；同时链接每区正式说明。  
**原目录限制：** 海岸公园不一律等于禁止航行；各区适用限制需核验

**全部原始网址：**

- <https://data.gov.hk/en-data/dataset/hk-afcd-afcdlist-marineparksreserve>

### HK10 · TSPS 香港潮流预测

**为何本版未常规直连：** 官方预测网页与下载表单；未验证无需会话的稳定原始 API。  
**后续步骤：** 在原站选择点位和日期下载；做独立潮流预测回放，不标实测。  
**原目录限制：** 天文潮流预测而非实测总海流；官方注明不可用于航海；不是逐秒局部浪流真值

**全部原始网址：**

- <https://current.hydro.gov.hk/main/about.php?lang=en>
- <https://current.hydro.gov.hk/en/download.php>

## 历史 / 静态资料（3 项）

适合下载、统计和回放，不是实时观测。

### HK18 · 香港历史波浪观测

**为何本版未常规直连：** 年度历史文件；不是全港实时波浪传感器流。  
**后续步骤：** 选取年度文件后解析站点和波浪参数，做历史图表。  
**原目录限制：** 不是实时全港波浪流；原文件采样间隔/缺测需下载核查；未确认有逐波相位序列

**全部原始网址：**

- <https://www.cedd.gov.hk/eng/about-us/core-business/port/wave-measurement/index.html>
- <https://data.gov.hk/en-data/dataset/hk-cedd-csu-wave-measurement>

### HK24 · 海水水质监测

**为何本版未常规直连：** 水质历史/定期监测，不是实时 ASV 航行状态。  
**后续步骤：** 按站点和月份下载后预览，注明采样日期。  
**原目录限制：** 不是导航避碰、波浪相位或船体响应数据；不应挤占首版核心工作

**全部原始网址：**

- <https://epic.epd.gov.hk/EPICRIVER/marine/?lang=en>
- <https://data.gov.hk/en-data/dataset/hk-epd-marineteam-marine-water-quality-historical-data-en>

### INT05 · GEBCO 全球海底地形

**为何本版未常规直连：** 静态大体量海底地形栅格，不适合伪装成实时水深。  
**后续步骤：** 下载并裁切香港附近区域；仅做粗尺度背景，非航海水深。  
**原目录限制：** 官方禁止将其用于航海或海上安全用途；不能替代港内精细水深/ENC

**全部原始网址：**

- <https://www.gebco.net/data-products-gridded-bathymetry-data/gebco2026-grid>

## 账户、密钥或后端处理（4 项）

先完成凭证/权限/产品配置，不在网页放密钥。

### INT01 · AISStream 船舶位置服务

**为何本版未常规直连：** 需 API Key，官方要求后端连接；本次没有用户密钥，香港覆盖也未实测。  
**后续步骤：** 配置自有密钥和后端 WebSocket 后再接入；验证覆盖、延迟、授权与存储条件。  
**原目录限制：** 不可保证全港或所有小船可见；服务数据条款另核验；开源示例不等于开放数据许可

**全部原始网址：**

- <https://aisstream.io/>
- <https://aisstream.io/documentation>

### INT02 · Copernicus 全球波浪

**为何本版未常规直连：** 可程序化下载/裁切的海洋产品；不是无需处理即可嵌入的港内实时图层。  
**后续步骤：** 确认账户与产品访问方式，用官方 Toolbox 下载香港区域子集并缓存。  
**原目录限制：** 粗网格不解析小港池、局地反射和船行波；数据访问与条款按产品核实

**全部原始网址：**

- <https://data.marine.copernicus.eu/product/GLOBAL_ANALYSISFORECAST_WAV_001_027/description>

### INT03 · Copernicus 全球海流

**为何本版未常规直连：** 模式海流产品需选择变量、层次、时段及区域；本版未部署裁切后端。  
**后续步骤：** 核验产品访问条件后做服务端裁切与图表；保留流向约定。  
**原目录限制：** 先分清总流、潮流、残余流和Stokes漂移；不得与TSPS随意相加

**全部原始网址：**

- <https://data.marine.copernicus.eu/product/GLOBAL_ANALYSISFORECAST_PHY_001_024/description>

### INT06 · ERA5 历史环境再分析

**为何本版未常规直连：** 历史再分析产品，下载一般需要 CDS 账户/相应 API 配置。  
**后续步骤：** 授权后裁切历史时空范围；不能作为当时可用的预报。  
**原目录限制：** 再分析不是当时可用的预报；训练/评测不得通过事后资料泄漏未来信息

**全部原始网址：**

- <https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels?tab=download>

## 订阅 / 授权（1 项）

取得有效许可后再考虑网页展示。

### HK23 · 官方电子航海图 · HK ENC

**为何本版未常规直连：** 电子航海图有订阅/许可要求；公开门户不授予完整再发布权。  
**后续步骤：** 研究采购或授权后，由有许可的软件读取；不内嵌未授权海图。  
**原目录限制：** 平台展示、转格式、缓存与再发布权限须核实；公开网页≠海图数据开放许可

**全部原始网址：**

- <https://www.hydro.gov.hk/eng/enc.php>
- <https://www.hydro.gov.hk/eng/ENCWeb/www/subscription.php>

## 原站网页 / 文档（7 项）

没有核验原始馈送，先保留可点击原文。

### HK01 · MSDI 海事空间地图

**为何本版未常规直连：** 门户网页，尚未核实可稳定复用的原始接口；不强行 iframe 嵌入。  
**后续步骤：** 保留门户入口；从对应 CSDI 数据项获取服务或文件后再接入。  
**原目录限制：** 门户可浏览不等于提供开放原始API；不等于完整授权海图

**全部原始网址：**

- <https://msdi.hydro.gov.hk/>
- <https://www.hydro.gov.hk/eng/latest_news.php>

### HK09 · 灯标、浮标与助航设施

**为何本版未常规直连：** 助航设施介绍入口；未确认覆盖全部设备的原始位置/故障实时 API。  
**后续步骤：** 保留官方网页，另行申请或核验适合的设备数据。  
**原目录限制：** 概览网页不是完整可用的实时助航设施API；位置/状态需用适合来源

**全部原始网址：**

- <https://www.mardep.gov.hk/en/public-services/port-services/atn/index.html>

### HK17 · 渔民气象与海洋资讯

**为何本版未常规直连：** 聚合网页/图表入口；未核验可再发布的原始机器接口。  
**后续步骤：** 原站查看；逐图核对来源与复用许可后再制作预览。  
**原目录限制：** 不得将网页可见等同可以批量抓取或再分发；模型预报不是真值

**全部原始网址：**

- <https://www.hko.gov.hk/en/fishermen/main.htm>

### HK19 · 海事处布告

**为何本版未常规直连：** 已核实公开网页/PDF；原版所写 RSS 未找到可确认的具体订阅端点。  
**后续步骤：** 显示布告原文入口；需要自动列表时先核验官方馈送，不绕过访问控制。  
**原目录限制：** 保留原文、通告编号、开始/结束/撤销/取代关系；不得由LLM凭空补坐标

**全部原始网址：**

- <https://www.mardep.gov.hk/en/legislation/notices/md-notices/index.html>

### HK20 · 进行中的海上工程

**为何本版未常规直连：** 工程目录及原文，未确认稳定公开机器接口。  
**后续步骤：** 原站列表查看；人工核验范围、有效期和撤销情况。  
**原目录限制：** 预计完成日期不是确认撤销日期；图形与范围需核验原文

**全部原始网址：**

- <https://www.mardep.gov.hk/en/public-services/marine-works-in-progress/index.html>

### HK21 · 航海通告与海图改正

**为何本版未常规直连：** 航海通告/海图改正文件，不等于连续事件 API。  
**后续步骤：** 按期下载、索引原文；保留版次与生效信息。  
**原目录限制：** 海图改正和海事处布告是相关但不同产品；不可互相完全替代

**全部原始网址：**

- <https://www.hydro.gov.hk/eng/ntm.php>

### INT07 · 国际海上避碰规则 · COLREG

**为何本版未常规直连：** 规则说明，不是数据流；完整规范的版本、获取和使用条件另核。  
**后续步骤：** 保留 IMO 原文入口，不自动输出“已符合避碰规则”的结论。  
**原目录限制：** 规则不是直接可接入的位置流；不能仅用AIS或静态多边形声称已全面合规

**全部原始网址：**

- <https://www.imo.org/en/about/conventions/pages/colreg.aspx>

## 不应混在这张清单里的内容

SRZ：已取得的静态数据，不需要重新下载才能演示。GitHub：代码工具，不提供自动存在的海事资料。HKO/Open-Meteo/VTMS 已配置的公开连接器：即使某次网络失败，也应显示失败状态，不能把它们归为“没有 API”。

## 核验边界

本执行环境未完成外部接口联网验收；没有提供 AIS Key，也没有取得订阅海图。网页嵌入限制、下载条款和程序接口覆盖需分别核验。本清单不建议绕过登录、源站 iframe 限制或付费授权。
