# AgentDesk演示桥：example.com → 开发机 Demo 套（上线 Checklist）


| 项   | 内容                                                       |
| --- | -------------------------------------------------------- |
| 状态  | **待审核**（未执行线上变更）                                         |
| 日期  | 2026-07-23                                               |
| 目的  | 使用方公网演示：**全新、干净**的一套AgentDesk系统；算力在开发机，与日常开发环境隔离                 |
| 约束  | **不改业务代码**；线上 Traefik **只扩展配置**；**仅 `example.com` 已备案** |


关联：`docs/项目架构-迁移定稿.md` · `deploy/README.md` · `docs/ops/初始化记录.md`

---

## 0. 前提（备案 + 隔离）


| 事实                  | 后果                                                       |
| ------------------- | -------------------------------------------------------- |
| 仅 `example.com` 备案 | 公网只能用 `*.example.com`；`*.example.com` 公网不可达              |
| 开发机日常套已有脏数据         | **不能**把现有 `agentdesk-admin` / `agentdesk-chat` / 库 `agentdesk` 直接给使用方 |
| 用户可见只要 admin + chat | 登录与 API 仍须挂在 `*.example.com`（Auth 子域 + 同源 `/api`）       |
| MinIO / NewAPI 在内网  | 浏览器不直连；由 **Demo 套** api/agent 服务端访问                      |


### 0.1 为何不能「只再起两个前端容器」

只加生产构建的 admin/chat、仍指向现有 `agentdesk-api` / 库 `agentdesk` 时：

- 语料、配额、模型配置、对话 Memory **与开发共用** → 使用方看到开发脏数据  
- 仅换 openauth 用户 **不够**：文档表、向量、线程仍在同一库

故：**使用方演示 = 开发机上的独立 Demo 套（全栈）**；日常开发套继续用现有容器与库，互不共用业务库。

线上反代 **只指向 Demo 套** 的 Host，不指向开发套 Host。

---

## 1. 开发机两套并存


| 套别         | 用途           | 容器（建议名）                                                                        | Postgres                       | MinIO            | Redis        | 内网 Traefik Host（仅 45 可达）                   |
| ---------- | ------------ | ------------------------------------------------------------------------------ | ------------------------------ | ---------------- | ------------ | ------------------------------------------ |
| **开发套**    | 日常联调         | 现有 `agentdesk-api` / `agentdesk-agent` / `agentdesk-admin` / `agentdesk-chat`                  | `agentdesk`                        | `agentdesk`          | DB=2         | `agentdesk-*.example.com`                       |
| **Demo 套** | 使用方演示（生产构建前端） | `agentdesk-demo-api` / `agentdesk-demo-agent` / `agentdesk-demo-admin` / `agentdesk-demo-chat` | `**agentdesk_demo`**（空库 + migrate） | `**agentdesk-demo**` | 独立 DB 号（如 3） | `agentdesk-demo-api|admin|chat.example.com`（内网） |


说明：

- 对外产品入口仍是 **两个** example 域名（admin + chat）；api 走同源 `/api`，auth 走 `auth.example.com`。  
- Demo 套 **admin/chat 必须按生产环境构建**（`VITE_OIDC_ISSUER` / 空 `VITE_API_BASE_URL` 等，见 §4）。  
- openauth-auth **可共用**同一进程，但使用 **新租户 + 新用户 +（建议）新 OIDC client**，与开发租户数据隔离。

```
开发机 127.0.0.1
  ├─ 开发套（脏）──── 内网 agentdesk-*.example.com ──────── 开发人员
  └─ Demo 套（干净）─ 内网 agentdesk-demo-*.example.com ─┐
                                                    │
线上 127.0.0.1 Traefik（只扩展）                  │
  *.example.com ───────────────────────────────────┘ 仅桥 Demo 套
```

---

## 2. 登录跳到哪里？

Demo 套前端生产构建：

- `VITE_OIDC_ISSUER=https://auth.example.com`
- 回调：`window.location.origin/oauth/callback` → `https://agentdesk-demo-{admin|chat}.example.com/oauth/callback`

使用方路径：

1. 打开 `https://agentdesk-demo-chat.example.com`（或 admin）
2. 跳转 `**https://auth.example.com/...**`（已备案；线上桥 → 开发机 openauth-auth）
3. 使用 **Demo 租户账号** 登录（不是 `admin@agentdesk.example` 开发号）
4. 回跳对应 example 产品域

若 Issuer 仍指向 `auth.example.com` → 公网不可达，登录失败。

---

## 3. 公网 DNS（全部 `*.example.com`）


| Host                            | 作用                        |
| ------------------------------- | ------------------------- |
| `agentdesk-demo-admin.example.com` | 使用方运营后台 → Demo 套 admin     |
| `agentdesk-demo-chat.example.com`  | 使用方对话 → Demo 套 chat        |
| `auth.example.com`             | OIDC Hosted → openauth-auth |


API：**同源** `PathPrefix(/api)` → Demo 套 `agentdesk-demo-api`（不单独给使用方一个「第四个产品域名」；可选另挂 `agentdesk-demo-api.example.com`）。

不挂公网：MinIO、NewAPI、agentdesk-demo-agent、开发套任何 Host。

---

## 4. Demo 套前端生产构建（不改源码）


| 变量                    | `agentdesk-demo-admin`                  | `agentdesk-demo-chat`     |
| --------------------- | ----------------------------------- | --------------------- |
| `VITE_OIDC_ISSUER`    | `https://auth.example.com`         | 同左                    |
| `VITE_OIDC_CLIENT_ID` | `agentdesk_demo_admin_spa`（建议独立 client） | `agentdesk_demo_chat_spa` |
| `VITE_API_BASE_URL`   | **空字符串**（同源 `/api`）                 | 同左                    |


镜像名建议与开发套区分：`agentdesk-admin:demo` / `agentdesk-chat:demo`，避免覆盖 `:local`。

---

## 5. 身份与数据：全新租户（须跑初始化脚本）

### 5.1 交付清单（脚本落地后执行）


| 脚本（建议路径）                                                                         | 作用                                                                                                               |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `deploy/scripts/seed-agentdesk-demo-tenant.sql`                                      | openauth：**新租户** + 运营/C 端用户 + 密码 + **独立** OIDC client（仅 Demo 回调 URL）                                               |
| `deploy/scripts/seed-agentdesk-demo-tenant.sh`                                       | 对 openauth DB 执行上述 SQL；打 ops 日志；打印验收账号                                                                             |
| `deploy/scripts/init-agentdesk-demo-db.sh`                                           | `CREATE DATABASE agentdesk_demo`；Demo api migrate up                                                                 |
| `deploy/scripts/init-minio-agentdesk-demo.sh`                                        | MinIO bucket `agentdesk-demo`（private）                                                                               |
| `deploy/docker-compose.demo.yml` + `agentdesk-demo-api.env` / `agentdesk-demo-agent.env` | Demo 全栈；`DB_NAME=agentdesk_demo`；`S3_BUCKET=agentdesk-demo`；`AGENT_BASE_URL=http://agentdesk-demo-agent:4111`；Redis DB 与开发错开 |
| `deploy/scripts/smoke-agentdesk-demo.sh`                                             | 内网 health + 登录探测（不经公网）                                                                                           |


> 审核通过后 **先补齐上述脚本/compose 再执行**；现有 `seed-agentdesk-oidc-clients.sql` **只服务开发租户「AgentDesk」**，禁止拿来当使用方演示账号源。

### 5.2 Demo 租户建议值（可改，写入 SQL 后冻结）


| 项          | 建议                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------- |
| 租户名 / slug | `AgentDesk演示` / `agentdesk-demo`                                                                     |
| 运营         | `admin@agentdesk-demo.com` / 角色 `admin`（密码首次由 seed 写入，交付时当面更换）                                |
| C 端        | `demo1@agentdesk-demo.com` …（`user`）                                                          |
| OIDC       | `agentdesk_demo_admin_spa` / `agentdesk_demo_chat_spa`；redirect 仅 example Demo 域名 + 可选 localhost |
| 与开发隔离      | **新 UUID**；SQL 带 `WHERE`/固定 id 前缀，**禁止 UPDATE 开发租户 `agentdesk` 行**                            |


### 5.3 Demo 业务库初始状态

- 空库 + migrate → **无语料、无对话、无配额脏数据**  
- 模型配置：演示前由运营在 **Demo admin** 填写（或提供 **仅写入 `agentdesk_demo.runtime_ai_settings`** 的可选 seed，与开发库分离）  
- 向量 / Mastra Memory：跟 Demo agent 的 `DATABASE_URL`（`agentdesk_demo`）走，不写开发库

---

## 6. 流量拓扑

```
使用方浏览器（仅 *.example.com）
  ├─ agentdesk-demo-admin.example.com
  │     PathPrefix(/api) → 开发机 agentdesk-demo-api
  │     其它 → 开发机 agentdesk-demo-admin
  ├─ agentdesk-demo-chat.example.com
  │     PathPrefix(/api) → 开发机 agentdesk-demo-api
  │     其它 → 开发机 agentdesk-demo-chat
  └─ auth.example.com → 开发机 openauth-auth

开发机内网
  开发套 agentdesk-* + DB agentdesk          ← 开发用，线上桥不指向
  Demo 套 agentdesk-demo-* + DB agentdesk_demo ← 线上桥唯一后端
  MinIO bucket agentdesk / agentdesk-demo
  NewAPI 等：Demo agent 出网调用（浏览器不直连）
```

线上 → 开发：仅 `127.0.0.1` 访问 `127.0.0.1`；使用方不直连开发机。  
反代 Host 改写为 **`agentdesk-demo-*.example.com`（Demo 套）**，不是开发套 Host。

操作日志：**`agentdesk-bridge.log`**。

---

## 6.1 开发机资源评估（2026-07-23 实测 `127.0.0.1`）

| 项 | 实测 |
|----|------|
| CPU | **4** vCPU |
| 内存 | **3.6 GiB** 总量；当时 **Available ≈ 2.4 GiB**；Swap 1.9 GiB（已用约 0.2 GiB） |
| 磁盘 | 根分区 **40G**，已用 ~18G，**剩余 ~20G** |
| Load | 空闲（约 0.08） |
| 本机 Ollama | **未运行** |

**当前容器 idle 内存约：** `agentdesk-agent` ~166 MiB（最大头）+ minio ~107 + postgres ~64 + 其余合计约 90 → **整机容器约 0.45 GiB**。

**再起 Demo 全栈粗估：**

| 场景 | 额外内存 | 判断 |
|------|----------|------|
| 空闲 / 少人点选 | +0.2～0.3 GiB（第二份 agent 为主） | **可支撑** |
| 1～2 路对话 + 检索 | 两套 agent 并存抬升 | **可支撑，偏紧** |
| 多路压测 / 开发+Demo 同时打满 / 再拉本地 VL | 易挤爆 3.6G、狂用 Swap | **不建议** |

磁盘 20G 剩余对演示期够用。瓶颈是 **内存不是 CPU**。

**结论：** 可以再跑一套 Demo 全栈，限 **轻量演示**；勿同机再起 Ollama；给 `agentdesk-demo-agent` 加 `mem_limit`（如 512～768M）；常驻双套或本地 Vision 建议升配 **≥8 GiB**。

---

## 7. 硬约束

1. 不改业务源码；允许 compose/env/SQL/Traefik 扩展/不改源码的镜像构建参数。
2. 线上 Traefik：只新增可删的 bridge 动态文件；不改既有 TLS/证书核心。
3. 公网入口仅 `*.example.com`。
4. **线上桥禁止指到开发套容器**。
5. Demo 初始化脚本不得修改开发租户「AgentDesk」业务数据。
6. enable/disable 写 **`agentdesk-bridge.log`**。

---

## 8. 上线 Checklist

### 8.0 前置

- [ ] 备案 / DNS / `66→45` 可达性确认（同前）  
- [ ] 仓库已具备 §5.1 所列 **demo compose + seed/init/smoke 脚本**（审核通过后实现）  
- [ ] **`agentdesk-bridge.log`** 路径可写  

### 8.1 开发机：初始化 Demo 数据面

- [ ] 执行 `init-agentdesk-demo-db.sh`（库 `agentdesk_demo` + migrate）  
- [ ] 执行 `init-minio-agentdesk-demo.sh`（bucket `agentdesk-demo`）  
- [ ] 执行 `seed-agentdesk-demo-tenant.sh`（新租户/用户/client）  
- [ ] 填写 `agentdesk-demo-*.env`（DB/Redis/S3/JWKS/加密钥与 Demo 一致；**CORS** 若独立 api 子域再配）  
- [ ] 记录账号到交付单（勿与开发 `*@agentdesk.example` 混用）  

### 8.2 开发机：拉起 Demo 套

- [ ] 生产参数构建 `agentdesk-admin:demo` / `agentdesk-chat:demo`  
- [ ] `docker compose -f docker-compose.demo.yml up -d`（api/agent/admin/chat）  
- [ ] 内网访问 `agentdesk-demo-admin|chat|api.example.com` smoke 通过  
- [ ] 确认开发套容器与库 **仍在**、未被改指  

### 8.3 openauth / Auth 公网面

- [ ] openauth 对外 Issuer 与 `https://auth.example.com` 对齐（演示期配置）  
- [ ] Demo client 回调仅 example Demo 域  
- [ ] Demo api 的 `OIDC_ISSUER` / JWKS 与 token `iss` 一致  

### 8.4 线上 Traefik（只扩展）

- [ ] 新增 bridge：两产品 Host + `/api` → **agentdesk-demo-api**；静态 → **agentdesk-demo-admin|chat**  
- [ ] `auth.example.com` → openauth-auth  
- [ ] TLS 用现有 certresolver  
- [ ] `append` **`agentdesk-bridge.log`**：`ENABLE … targets=agentdesk-demo-*`  

### 8.5 使用方验收（公网）

- [ ] 登录跳转 **auth.example.com**，账号为 **Demo 租户**  
- [ ] Admin 语料列表 **为空**（或仅演示期新传）；不见开发套文档  
- [ ] Chat 历史 **为空**；新对话正常；引用/上传不碰公网 MinIO  
- [ ] Network 无 `*.example.com` 失败请求  

### 8.6 下线

- [ ] 删除线上 bridge 动态文件 → log `DISABLE`  
- [ ] （可选）`compose.demo down`；保留或 drop `agentdesk_demo`（交付策略二选一写 log）  
- [ ] 开发套不受影响  

---

## 9. 明确不做

- 不把开发套 Host / 库 `agentdesk` / bucket `agentdesk` 暴露给使用方  
- 不公网暴露 MinIO / NewAPI / agent  
- 不在 `127.0.0.1` 跑 agentdesk 业务容器  
- 不用现有 `seed-agentdesk-oidc-clients.sql` 冒充使用方演示租户  
- 不改线上 Traefik 既有 TLS 核心配置

---

## 10. 审核确认栏


| 项          | 选项                                       | 审核人填写 |
| ---------- | ---------------------------------------- | ----- |
| 隔离级别       | 同意 Demo **全栈**（api+agent+admin+chat+独立库） |       |
| 资源         | 同意在 **3.6G** 机上轻量双套（见 §6.1）             |       |
| 产品域名       | `agentdesk-demo-admin` / `agentdesk-demo-chat`   |       |
| Auth       | `auth.example.com`                      |       |
| API        | 同源 `/api` → demo-api                     |       |
| 租户/账号      | 按 §5.2 或自定义：______                       |       |
| 演示后 Demo 库 | 保留 / 销毁                                  |       |
| 执行窗口       |                                          |       |


**审核通过前：不在线上写入 bridge；不在开发机执行 Demo seed（脚本合并进仓库后按 Checklist 执行）。**