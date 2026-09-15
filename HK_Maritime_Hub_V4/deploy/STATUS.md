# Deploy status（2026-09-15）

## 路线
GitHub `ssgzy/hk-maritime-hub-v3`（子目录 `HK_Maritime_Hub_V4/`）→ Pi `git clone` → `docker compose up -d --build` → 宿主机 `127.0.0.1:8091` → Cloudflare Tunnel（Dashboard 加 Public Hostname）→ `https://marine.sammier.com`

## 已确认的 Pi 环境（Hermes）
- 8090 被 PocketBase 占用 → 本项目用 8091
- cloudflared Token 托管，无本地 config.yml → 域名在 Dashboard 加
- Docker / compose 可用

## Hermes 执行入口
`deploy/HERMES_PI.md`（一键：`deploy/pi_bootstrap.sh`）

## 密钥
`pipeline/.env` 不在仓库中，需在 Pi 上手工创建（`AISSTREAM_API_KEY=…`）。
