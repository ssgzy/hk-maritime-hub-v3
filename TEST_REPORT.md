# V2 本地测试与外部连接验收记录

日期：2026-09-13。

## 已完成

| 项目 | 结果 |
|---|---|
| JavaScript / Python 语法检查 | 通过。 |
| 原目录保留 | 40 条原记录的 ID 和全部原始 URL 与新版底稿一致。 |
| SRZ 数据保留 | 内嵌 47 条原始区域、属性与 GeoJSON 未改变。 |
| 连接器注册表 | 19 个，8 项原目录来源。 |
| Python 标准库单元测试 | 6 项通过：注册表、白名单、参数/日期、任意代理拒绝、文档 URL 完整性等。 |
| 本地 HTTP 服务检查 | 11 组通过，包含健康检查、无效参数、文件访问、Host/Origin 和跨站请求拒绝。 |
| 浏览器 JavaScript | 页内执行未发现未捕获 JavaScript 错误。 |
| 独立合成解析夹具 | 19 个产品解析路径通过。仅用于测试，未写入网站数据。 |
| UI 状态 | 目录、实时读取页、23 张非直连/条件卡片、工具、SRZ、MD 导出控件的导航通过。 |
| 异常分支 | 缺测不补零、CANCEL 解除标记、未知 XML 不冒充 0 艘、失败刷新保留旧值并警告、异常 JSON/CSV 拒绝。 |
| 图表 | 合成海洋预报的缺测处断线；返回 km/h 单位被保留。 |
| 手机视口 | 390px 下 6 个页面路由未出现页面级横向溢出；表格可在自身容器横向滚动。 |

## 外部网络未通过，不等于源站无数据

程序实际请求 HKO 风资料时，本执行环境无法解析外部域名。本地网关正确返回 HTTP 502 和 `Temporary failure in name resolution`，没有生成假数据。

本执行环境的 Chromium 还限制直接 URL 导航，因此 UI 测试以 Playwright `set_content` 装载本地 HTML 字符串进行。这里验证的是同一份 HTML 的 DOM、脚本、布局、交互与解析逻辑，**不是浏览器经 localhost 到全部外部源的端到端成功连接**。未替换网络响应的新浏览器会话显示了实际请求超时；截图没有伪造观测值。

部分交互测试使用显式合成数据和隔离的 fetch 测试替身；测试替身没有进入发布版。合成记录名称含 TEST ONLY，时间设为 2000 年，以验证陈旧数据提示。

尚待在用户正常联网环境验收：每个接口的真实响应结构/CORS、HHOT 当年覆盖、XML 实际信封结构、香港 AIS 覆盖、长期稳定性、公开部署及最终用途下的再发布授权。

## 已记录的原生网络尝试

```json
{
  "http": 502,
  "body": "{\"ok\": false, \"error\": \"URLError: <urlopen error [Errno -3] Temporary failure in name resolution>\", \"note\": \"No fresh data was obtained. Existing browser results are not replaced.\"}"
}
```

这些结果不保证上游服务持续可用，也不构成航行系统认证。
