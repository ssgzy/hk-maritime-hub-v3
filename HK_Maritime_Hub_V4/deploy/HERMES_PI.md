# Hermes 在树莓派上执行：部署 HK Maritime Hub V4

目标：Pi 从 GitHub 拉代码，用 Docker 跑起站点（宿主机端口 **8091**），并经现有 Cloudflare Tunnel 暴露为 `https://marine.sammier.com`。

已知环境（Hermes 检查结果）：
- 8090 被 PocketBase 占用 → 本项目用 **8091**
- cloudflared 为 **Token 托管**（无 `/etc/cloudflared/config.yml`）→ 域名必须在 Zero Trust Dashboard 加
- Docker + compose 可用

研究展示用途，不能作为航行依据。

---

## 一键方式（推荐）

```bash
curl -fsSL https://raw.githubusercontent.com/ssgzy/hk-maritime-hub-v3/main/HK_Maritime_Hub_V4/deploy/pi_bootstrap.sh -o /tmp/pi_bootstrap.sh
AISSTREAM_API_KEY='<用户提供的 aisstream key>' bash /tmp/pi_bootstrap.sh
```

脚本会：clone/pull 仓库到 `~/apps/hk-maritime-hub-v3` → 写 `pipeline/.env` → 检查 8091 空闲 → `docker compose up -d --build` → 健康检查。

---

## 手动方式（等价步骤）

### 1. 拉代码

```bash
mkdir -p ~/apps && cd ~/apps
git clone --depth 1 https://github.com/ssgzy/hk-maritime-hub-v3.git
cd hk-maritime-hub-v3/HK_Maritime_Hub_V4
```

已存在则更新：`git -C ~/apps/hk-maritime-hub-v3 pull --ff-only`

### 2. 写密钥（不在仓库里，必须手工创建）

```bash
printf 'AISSTREAM_API_KEY=%s\n' '<用户提供的 aisstream key>' > pipeline/.env
chmod 600 pipeline/.env
```

### 3. 构建并启动

```bash
cd deploy
docker compose up -d --build
docker compose ps
docker compose logs --tail=40 web
docker compose logs --tail=40 pipeline
```

期望：`hk-maritime-v4-web` Up（`127.0.0.1:8091->8090`），`hk-maritime-v4-pipeline` Up。

```bash
curl -sI http://127.0.0.1:8091/ | head -5
curl -s  http://127.0.0.1:8091/data/manifest.json | head -c 200; echo
```

### 4. Cloudflare Tunnel（Dashboard，Token 托管无法本地改）

https://one.dash.cloudflare.com/ → Zero Trust → Networks → Tunnels → 现有 Tunnel → **Public Hostname → Add**

| 字段 | 值 |
|------|----|
| Subdomain | `marine` |
| Domain | `sammier.com` |
| Type | HTTP |
| URL | `localhost:8091` |

（若用户给了 Cloudflare API Token，也可用 API 创建同样的 ingress 规则；服务地址同样是 `http://localhost:8091`。）

### 5. 公网验证

```bash
sleep 20
curl -sI https://marine.sammier.com/ | head -5
curl -sI https://marine.sammier.com/data/manifest.json | head -5
```

浏览器打开 https://marine.sammier.com ，顶栏可切 **2D 平面 / 3D 视图**。

---

## 运维

```bash
cd ~/apps/hk-maritime-hub-v3/HK_Maritime_Hub_V4/deploy
docker compose ps
docker compose logs -f pipeline      # AIS 采集 / 定时任务
docker compose logs -f web
docker compose restart
docker compose down
# 更新到最新代码：
git -C ~/apps/hk-maritime-hub-v3 pull --ff-only && docker compose up -d --build
```

数据落在宿主机 `HK_Maritime_Hub_V4/data/`（`ais/ais.sqlite` 为 AIS 库，保留 14 天）。

## 排查

| 现象 | 处理 |
|------|------|
| `docker compose` 报 env_file 不存在 | 先做第 2 步写 `pipeline/.env` |
| web 构建 OOM / 很慢 | Pi 内存小：`docker compose build web` 单独建；已设 `NODE_OPTIONS=--max-old-space-size=2048` |
| 8091 无响应 | `docker compose logs web`；确认端口映射 `127.0.0.1:8091:8090` |
| pipeline 反复重启 | `docker compose logs pipeline`，多为 key 错误 |
| 域名 502/530 | Dashboard 未加 hostname 或指错端口（应为 8091） |
| 地图空白 | 浏览器需能访问 `mapapi.geodata.gov.hk` / `data.map.gov.hk` / `portal.csdi.gov.hk` |

## 完成后回报

```bash
docker compose -f ~/apps/hk-maritime-hub-v3/HK_Maritime_Hub_V4/deploy/docker-compose.yml ps
curl -sI http://127.0.0.1:8091/ | head -3
curl -sI https://marine.sammier.com/ | head -3
systemctl is-active cloudflared
```
