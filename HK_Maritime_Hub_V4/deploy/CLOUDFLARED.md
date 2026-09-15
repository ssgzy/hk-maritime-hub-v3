# Cloudflare Tunnel 绑定 marine.sammier.com

Pi 上的 `cloudflared` 是 **Token 托管**（`tunnel run --token …`，无本地 `config.yml`），因此 ingress 规则只能在 Zero Trust Dashboard（或 Cloudflare API）里加。

## Dashboard

1. https://one.dash.cloudflare.com/ → Zero Trust → Networks → Tunnels
2. 选中现有 Tunnel → Public Hostname → Add
3. Subdomain `marine` · Domain `sammier.com` · Type **HTTP** · URL **`localhost:8091`**
4. Save，约 1 分钟后生效

## API（可选，给 Hermes 用）

需要一个具备 `Cloudflare Tunnel: Edit` + `DNS: Edit` 权限的 API Token。用 `GET /accounts/{account_id}/cfd_tunnel/{tunnel_id}/configurations` 读取现有 ingress，追加

```json
{ "hostname": "marine.sammier.com", "service": "http://localhost:8091" }
```

到 `http_status:404` 之前，再 `PUT` 回去，并为 `marine` 创建指向 `<tunnel_id>.cfargotunnel.com` 的 CNAME。

## 验证

```bash
curl -I https://marine.sammier.com
curl -I https://marine.sammier.com/data/manifest.json
```

期望 `200`；`/assets/`、`/cesium/` 长缓存，`/data/` 约 5 分钟缓存。
