# 将“下载 Space”改造成 Express API 的改造方案

> 目标：在不破坏现有 CLI 的前提下，把“下载 Space（仅音频）”能力封装为可调用的 HTTP 接口，最大化复用现有模块（SpaceDownloader、PeriscopeApi、TwitterApi 等），最小化入侵修改。

## 范围与目标
- 范围：仅“下载 Space 音频”改为 REST API（不包含用户监听、通知、字幕提取等）。
- 兼容：保留原 CLI 行为与入口（`src/index.ts`、npm `start` 不变）。
- 运行：新增一个独立的 Express 入口（例如 `src/server.ts`），编译到 `dist/server.js`，新增脚本 `npm run start:api`。
- 依赖：继续依赖系统级 FFMPEG；鉴权与 Twitter cookie 与现状一致（`TWITTER_AUTH_TOKEN`、`TWITTER_CSRF_TOKEN`）。

## 总体设计
- 新增轻量 HTTP 服务，暴露“提交下载任务 + 查询任务状态 + 获取产物信息”。
- 核心下载仍用现有 `SpaceDownloader`（`src/modules/SpaceDownloader.ts`），按需拼装 `playlistUrl/metadata/filename` 后调用 `download()`。
- 以“任务管理器（JobManager）”在进程内管理任务生命周期与状态（`queued`/`running`/`success`/`error`），并记录输出文件路径与错误信息。
- 对外接口异步化：创建任务时立即返回 `jobId`，客户端通过状态接口轮询；避免 HTTP 超时与长连接占用。

## 路由设计（建议）
- `POST /api/spaces/download`
  - Body（三选一传入源），并可附加可选项：
    - `spaceId?: string` | `spaceUrl?: string` | `playlistUrl?: string`
    - `force?: boolean`（若 Space 仍在直播，是否强制立即下载；默认 false）
    - `filename?: string`（不传则按规则生成）
    - `subDir?: string`（存储子目录，默认空）
    - `metadata?: Record<string, string>`（覆盖/补充写入 m4a 的 metadata）
  - 返回：`202 Accepted`，`{ jobId, status }`
- `GET /api/jobs/:jobId`
  - 返回：`{ jobId, status, filePath?, error?, createdAt, startedAt?, finishedAt? }`
- `GET /api/jobs`
  - 返回最近 N 个任务的列表（便于排查）。
- 可选：`GET /api/health`（健康检查）。

## 执行流程（服务端）
1. 解析输入：
   - `playlistUrl` 直通流程（最简单、无需 Twitter 鉴权）。
   - `spaceUrl/spaceId`：
     - 解析出 `spaceId`（见 `TwitterUtil.getSpaceId`）。
     - 通过 `api.graphql.AudioSpaceById(spaceId)` 拿到 `audioSpace` 元数据（需要 Cookie 鉴权）。
     - 取 `media_key` 后经 `api.liveVideoStream.status(media_key)` 拿到 `source.location` 动态播放列表 URL。
     - 用 `PeriscopeApi.getFinalPlaylistUrl(location)` 计算最终 m3u8。
2. 生成 `filename` 与 `metadata`：
   - 规则与 CLI 保持一致：`[host][YYMMDDhhmm] title (spaceId)`，
     - host：`audioSpace.metadata.creator_results.result.legacy.screen_name`
     - 时间：`Util.getDateTimeString(started_at || created_at)`
     - title：`Util.getCleanFileName(SpaceUtil.getTitle(audioSpace))`
   - metadata 示例：`title`、`artist`（主持人名）、`date` 等。
3. 创建 Job 并启动下载：
   - `new SpaceDownloader(finalPlaylistUrl, filename, subDir, metadata, jobId).download()`
   - 成功后标注 `success` 并记录 `filePath`（`./download/<subDir>/<filename>.m4a`）。
   - 失败则标注 `error` 并记录 `error.message`。
4. 返回与轮询：创建任务立即返回 `jobId`，客户端用状态接口查询直至 `success`/`error`。

注：本方案不引入 `SpaceWatcher` 的“动态 playlist 轮询 + 主 playlist 块数校验”复杂逻辑，默认行为：
- Space 已结束或可回放：直接下载（推荐）。
- Space 仍在直播：默认返回 409 或要求 `force=true` 才立即下载（可能不完整）。
- 若确需与 CLI 相同“等待结束再下”的行为，可在第二阶段复用 `SpaceWatcher` 的校验片段，加入一个简化轮询流程（见“后续扩展”）。

## 代码结构与改动点
- 新增文件（建议路径命名）：
  - `src/server.ts`：入口，创建 Express、加载路由、启动 HTTP。
  - `src/http/app.ts`：封装 `createApp()`，挂载中间件与路由（便于测试）。
  - `src/http/routes/spaces.route.ts`：声明 `/api/spaces/download` 与 jobs 查询路由。
  - `src/http/controllers/SpaceController.ts`：参数校验、调用 Service、返回统一响应。
  - `src/services/SpaceDownloadService.ts`：
    - 负责：
      - 基于 `spaceId/spaceUrl` 推导 `finalPlaylistUrl`
      - 生成 `filename/metadata`
      - 调用 `SpaceDownloader`
    - 暴露：`startDownload(input): jobId`、`getJob(jobId)`、`listJobs()`。
  - `src/services/JobManager.ts`：
    - 内存 Map 管理 `{ jobId, status, filePath, error, timestamps }`
    - 简单并发控制（同名文件的去重/复用、全局并发上限可选）。
  - `src/utils/space-filename.util.ts`：抽出 `SpaceWatcher` 里 filename 生成逻辑，供 CLI 与 API 复用。
- 复用：
  - `src/modules/SpaceDownloader.ts`（不改或仅增加极少量可选钩子/事件）。
  - `src/apis/PeriscopeApi.ts`、`src/utils/PeriscopeUtil.ts`、`src/utils/Util.ts`、`src/utils/TwitterUtil.ts`、`src/api/*`。
- `package.json`：
  - 依赖：`express`（可选 `cors`、`morgan`）。
  - 脚本：新增 `"start:api": "node dist/server"`。

## 依赖与配置
- 新增依赖：`express`（类型：TS 输出 CommonJS，不引入 ESM-only 包）。
- 保持现有 `.env` 与 `config.*` 行为（`dotenv` 已存在）。
- 仍依赖系统 FFMPEG（下载时通过 `spawn('ffmpeg')`，Windows 走 `comspec` 分支已兼容）。

## 接口契约与返回
- 统一返回结构：
  - 成功：`{ ok: true, data: {...} }`
  - 失败：`{ ok: false, error: { code, message } }`
- 常见错误码：
  - `400` 参数错误（至少且仅一个：`spaceId|spaceUrl|playlistUrl`）
  - `401` 未配置必须的 Twitter cookie（id/url 模式）
  - `404` 找不到 Space 或不可回放
  - `409` Space 仍在直播且未 `force`
  - `500` 内部错误（会含 `requestId/jobId` 便于排查）

## 并发、健壮性与文件策略
- 任务并发：
  - 全局同时运行下载任务数量可控（可用 `Bottleneck` 或简单计数）。
  - `SpaceDownloader` 已对分片下载并发做了限制（`maxConcurrent: 5`）。
- 幂等与去重：
  - 若已存在同 `filename` 的目标文件，直接返回 `success` 状态并附现有 `filePath`（避免重复下载）。
- 临时文件：沿用 `SpaceDownloader` 的 `.tmp/<jobId>`，任务完成后清理。
- 日志：复用 `winston` 与现有日志目录结构（`logs/`）。

## 示例调用
- 通过最终 m3u8（推荐最小依赖）：
  - `POST /api/spaces/download` Body：`{ "playlistUrl": "https://.../playlist_12345.m3u8", "filename": "[user][2401011230] title (1abc...)" }`
- 通过 spaceId（需 `TWITTER_AUTH_TOKEN` 与 `TWITTER_CSRF_TOKEN`）：
  - `POST /api/spaces/download` Body：`{ "spaceId": "1yoJMWvbybNKQ" }`
- 查询状态：
  - `GET /api/jobs/<jobId>` 返回 `running/success/error` 与 `filePath`

## 详细实现步骤（建议顺序）
1. 安装依赖：`npm i express`。
2. 新增 `src/http/app.ts`：创建 Express 应用（JSON 解析、错误处理中间件、路由）。
3. 新增 `src/http/routes/spaces.route.ts` 与 `src/http/controllers/SpaceController.ts`：
   - 参数校验（至少且仅一个源字段）。
   - 调用 `SpaceDownloadService.startDownload`，返回 `jobId`。
4. 新增 `src/services/JobManager.ts` 与 `src/services/SpaceDownloadService.ts`：
   - 推导 `finalPlaylistUrl`、生成 `filename/metadata`、调用 `SpaceDownloader`。
   - 在 finally 中设置任务状态并填充 `filePath/error`。
5. 抽出文件名工具 `src/utils/space-filename.util.ts`，将 CLI 与 API 共用逻辑集中。
6. 新增 `src/server.ts`：加载 `.env`、`configManager.load()`，启动 HTTP（端口可用 `PORT` 环境变量）。
7. `package.json` 增加脚本：`"start:api": "node dist/server"`。
8. 更新 `README.md` 增加“API 模式”使用说明（启动方式、示例请求）。

## 测试建议
- 单元：
  - `SpaceDownloadService`：
    - `playlistUrl` 直通成功路径（mock axios、ffmpeg spawn）。
    - `spaceId` 路径：mock `api.graphql.AudioSpaceById`、`liveVideoStream.status`、`PeriscopeApi.getFinalPlaylistUrl`。
    - 错误分支：参数错误、Space 不可回放、ffmpeg 失败。
  - `space-filename.util`：给定 `audioSpace`，校验生成命名。
- 路由：用 `supertest` 走 `createApp()`，覆盖 200/202/4xx/5xx。
- 端到端（可选）：本地提供一个小的 m3u8 与分片目录作为假源，验证写文件成功与 metadata 写入。

## 渐进式增强与后续扩展
- 若要“等 Space 结束再自动下载”，可抽取 `SpaceWatcher` 中以下片段用于服务端轮询：
  - `checkDynamicPlaylist()` 获取最新 chunk 序号
  - `checkMasterPlaylist()` 对比 master chunk 数量，满足阈值再调用下载
  - 通过 `APP_PLAYLIST_REFRESH_INTERVAL` 做重试与 backoff
- 增加 `GET /api/files/:jobId` 或静态目录暴露下载产物（注意鉴权）。
- 任务持久化：把 `JobManager` 的状态增量写入 `logs/jobs.jsonl`，重启可恢复。
- 权限与安全：加入简易的 `X-API-Key` 校验、CORS 白名单、速率限制等。

## 风险与权衡（需知）
- Live 中强制下载的完整性：未引入完整的“结束校验”，可能导致不完整音频；建议仅对已结束/可回放的 Space 下载，或通过后续扩展加入轮询校验。
- Twitter 非公开 API 变动风险：依赖 `TWITTER_AUTH_TOKEN` 与 `TWITTER_CSRF_TOKEN` 的接口随策略可能变化；建议尽量通过 `playlistUrl` 模式减少耦合。
- 并发与资源：下载大量任务时注意磁盘 IO 与网络带宽，必要时限制并发与队列长度。

---

若你希望，我可以基于该方案直接生成骨架代码：新增 `server.ts`、路由与服务、任务管理器、以及必要的包与脚本改动，并保留 CLI 原状。

