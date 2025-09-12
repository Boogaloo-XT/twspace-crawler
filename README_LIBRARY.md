# TwspaceCrawler 库集成指南

本指南说明如何将 `twspace-crawler` 作为 npm 包集成到其他 Node.js 程序中。

## 🚀 快速开始

### 1. 安装

如果这是一个本地项目，你可以直接引用：

```bash
# 在你的项目中安装
npm install /path/to/twspace-crawler
```

或者如果已发布到 npm：

```bash
npm install twspace-crawler
```

### 2. 基本使用

```javascript
const { twspaceCrawler } = require('twspace-crawler');

async function downloadSpace() {
  // 初始化并设置 Twitter 认证 tokens
  twspaceCrawler.init({
    authToken: 'your_twitter_auth_token',
    csrfToken: 'your_twitter_csrf_token'
  });

  // 通过 Space URL 下载
  const result = await twspaceCrawler.downloadByUrl(
    'https://x.com/i/spaces/1OyKAjPPAPbGb'
  );

  if (result.success) {
    console.log('✅ 下载开始成功!');
    console.log('📁 文件名:', result.filename);
  } else {
    console.error('❌ 下载失败:', result.error);
  }
}

downloadSpace();
```

## 📋 API 参考

### TwspaceCrawler 类

#### `init(config)`

初始化爬虫并设置配置。

**参数:**
- `config.authToken` (string): Twitter 认证 token
- `config.csrfToken` (string): Twitter CSRF token  
- `config.tokensPath` (string, 可选): tokens.json 文件路径
- `config.skipDownload` (boolean, 可选): 跳过下载
- `config.skipDownloadAudio` (boolean, 可选): 跳过音频下载
- `config.skipDownloadCaption` (boolean, 可选): 跳过字幕下载

#### `setTokens(authToken, csrfToken)`

动态设置认证 tokens。

#### `downloadByUrl(spaceUrl, options)`

通过 Space URL 下载。

**参数:**
- `spaceUrl` (string): Space URL
- `options` (object, 可选): 下载选项

**返回:** `Promise<SpaceDownloadResult>`

#### `downloadBySpaceId(spaceId, options)`

通过 Space ID 下载。

#### `downloadByPlaylistUrl(playlistUrl, options)`

直接通过播放列表 URL 下载（最可靠的方法）。

#### `getAuthStatus()`

获取当前认证状态。

**返回:** `{ hasAuthToken: boolean, hasCsrfToken: boolean }`

## 🔧 完整示例

```javascript
const { twspaceCrawler } = require('twspace-crawler');

async function main() {
  try {
    // 1. 初始化
    twspaceCrawler.init({
      authToken: process.env.TWITTER_AUTH_TOKEN,
      csrfToken: process.env.TWITTER_CSRF_TOKEN
    });

    // 2. 检查认证状态
    const authStatus = twspaceCrawler.getAuthStatus();
    if (!authStatus.hasAuthToken || !authStatus.hasCsrfToken) {
      throw new Error('缺少认证 tokens');
    }

    console.log('🔐 认证状态:', authStatus);

    // 3. 下载 Space
    const spaceUrl = 'https://x.com/i/spaces/1OyKAjPPAPbGb';
    console.log('📡 开始下载:', spaceUrl);
    
    const result = await twspaceCrawler.downloadByUrl(spaceUrl);
    
    if (result.success) {
      console.log('✅ 下载开始成功!');
      console.log('📁 文件名:', result.filename);
      if (result.filePath) {
        console.log('📍 文件路径:', result.filePath);
      }
    } else {
      console.error('❌ 下载失败:', result.error);
    }
  } catch (error) {
    console.error('💥 错误:', error.message);
  }
}

main();
```

## 🔑 获取 Twitter Tokens

你需要从 Twitter 网站获取以下两个 tokens：

1. **auth_token**: Twitter 认证 cookie
2. **ct0 (CSRF token)**: Twitter CSRF cookie

### 获取方法：

1. 在浏览器中登录 Twitter/X
2. 打开开发者工具 (F12)
3. 转到 Application/Storage → Cookies → https://x.com
4. 找到并复制：
   - `auth_token` 的值
   - `ct0` 的值

## 🌍 环境变量支持

你也可以使用环境变量：

```bash
export TWITTER_AUTH_TOKEN="your_auth_token"
export TWITTER_CSRF_TOKEN="your_csrf_token"
```

```javascript
// tokens 将从环境变量自动加载
twspaceCrawler.init();
```

## 📁 Token 文件支持

创建 `tokens.json` 文件：

```json
{
  "authToken": "your_twitter_auth_token",
  "csrfToken": "your_twitter_csrf_token"
}
```

```javascript
twspaceCrawler.init({
  tokensPath: './tokens.json'
});
```

## 🎯 高级用法

### 使用个别模块

```javascript
const { 
  tokenManager, 
  SpaceDownloader, 
  TwitterUtil 
} = require('twspace-crawler');

// 手动设置 tokens
tokenManager.setAuthToken('your_auth_token');
tokenManager.setCsrfToken('your_csrf_token');

// 从 URL 提取 Space ID
const spaceId = TwitterUtil.getSpaceId('https://x.com/i/spaces/1OyKAjPPAPbGb');

// 直接使用下载器
const downloader = new SpaceDownloader(
  'playlist_url',
  'filename',
  'subdirectory',
  { title: 'Space Title' }
);

await downloader.download();
```

### TypeScript 支持

```typescript
import { 
  TwspaceCrawler, 
  TwspaceCrawlerConfig, 
  SpaceDownloadResult 
} from 'twspace-crawler';

const crawler = new TwspaceCrawler();

const config: TwspaceCrawlerConfig = {
  authToken: process.env.TWITTER_AUTH_TOKEN,
  csrfToken: process.env.TWITTER_CSRF_TOKEN
};

crawler.init(config);

const result: SpaceDownloadResult = await crawler.downloadByUrl(
  'https://x.com/i/spaces/1OyKAjPPAPbGb'
);
```

## ⚠️ 注意事项

1. **认证 Tokens**: 需要有效的 Twitter 认证 tokens 才能下载 Spaces
2. **文件保存**: 下载的文件默认保存到 `download/` 目录
3. **依赖要求**: 需要系统安装 FFMPEG
4. **网络要求**: 需要稳定的网络连接来下载音频文件

## 🔍 错误处理

```javascript
try {
  const result = await twspaceCrawler.downloadByUrl(spaceUrl);
  
  if (!result.success) {
    console.error('下载失败:', result.error);
    
    // 处理特定错误
    if (result.error.includes('Invalid Space URL')) {
      // 处理无效 URL
    } else if (result.error.includes('401')) {
      // 处理认证错误
    }
  }
} catch (error) {
  console.error('意外错误:', error);
}
```

## 📝 测试

运行测试示例：

```bash
node example.js
```

这将测试库的基本功能并下载一个示例 Space。
