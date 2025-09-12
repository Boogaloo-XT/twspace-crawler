# Repository Guidelines（仓库指南）

## 项目结构与模块组织
- `src/`：TypeScript 源码。重点：`api/`（Twitter API 客户端/常量/枚举/接口）、`apis/`（旧封装）、`modules/`（下载/监听/管理）、`commands/`（子命令）、`utils/`、`constants/`、`model/`。
- `test/`：@hapi/lab 测试（如 `Space.test.ts`），数据在 `test/data/`。
- `example/`：可运行示例与配置（`docker-compose.yaml`、`config.yaml`）。
- `dist/`：编译输出（已忽略）。运行期目录 `logs/` 与 `download/` 也被忽略。
- 配置模板：`.env.example`、`config.example.json`、`config.example.yaml`。

## 构建、测试与本地开发
- `npm ci`/`npm install`：安装依赖（需 Node ≥14）。运行时需 FFMPEG。
- `npm run build`：编译到 `dist/`。
- `npm start`：从 `dist/` 运行 CLI（等同 `node dist/index`）。
- `npm run start:config`：预置 `--config ./config.json` 启动。
- `npm test`：运行 Lab 测试（TS transform）。注意：部分用例依赖 `logs/spaces.jsonl`。
- `npm run lint` / `npm run lint:fix`：ESLint 检查与修复。

## 代码风格与命名
- 语言：TypeScript（输出 CommonJS），遵循 `.eslintrc.json`。
- 风格：单引号、无分号、多行尾随逗号；Airbnb base + TS 规则；推荐 2 空格缩进。
- 命名：类/文件 PascalCase（如 `SpaceDownloader.ts`），变量/函数 camelCase，常量 UPPER_SNAKE_CASE；各目录保持既有模式（如 `api/` 中 `twitter-*.util.ts`）。

## 测试规范
- 框架：`@hapi/lab` + `@hapi/code`，文件放于 `test/`，命名 `*.test.ts`。
- 运行：`npm test`。涉及外网的集成用例尽量使用稳定夹具或明确标注。
- 倾向小而确定的单元；必要时 mock 网络（axios）。

## 提交与 Pull Request
- 提交：精炼祈使句（“Add X”“Fix Y”），需要时引用问题编号（`#123`）。历史显示不强制 Conventional Commits。
- PR：说明动机、改动摘要、验证步骤/测试覆盖，以及配置/环境影响。涉及用户可见改动请更新 `README.md`/`INSTALLATION.md` 与 `CHANGELOG.md`。
- 不要提交生成物（`dist/`、`logs/`、`download/`）。保持变更聚焦。

## 安全与配置提示
- 切勿提交密钥。使用本地 `.env`（通过 `--env` 指定），示例留在 `*.example` 文件中。
- 非官方 API 需要令牌：`TWITTER_AUTH_TOKEN`、`TWITTER_CSRF_TOKEN`。
