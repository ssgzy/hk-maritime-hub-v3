这些文件是可编辑参考源代码。

- `readers_v2.js` / `readers_v2.css`：V2 数据读取器参考；运行版已内嵌在主 HTML。
- `smart_map.js` / `smart_map.css` / `stations_geo.json`：V3 智能地图。主 HTML 通过 `<link>` / `<script src>` 加载；本地 `server.py` 已加入静态白名单。

修改读取逻辑时请同步更新 HTML 中对应内嵌代码并重新测试。常规目录/接口配置请使用根目录 JSON 与 `sync_registry.py`。
