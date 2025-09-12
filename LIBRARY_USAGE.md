# TwspaceCrawler Library Usage

This document explains how to use `twspace-crawler` as a library in your Node.js applications.

## Installation

```bash
npm install twspace-crawler
```

## Basic Usage

### 1. Simple Space Download by URL

```javascript
const { twspaceCrawler } = require('twspace-crawler');

async function downloadSpace() {
  // Initialize with your Twitter tokens
  twspaceCrawler.init({
    authToken: 'your_twitter_auth_token',
    csrfToken: 'your_twitter_csrf_token'
  });

  // Download a space by URL
  const result = await twspaceCrawler.downloadByUrl(
    'https://x.com/i/spaces/1OyKAjPPAPbGb'
  );

  if (result.success) {
    console.log('Download started successfully!');
    console.log('Filename:', result.filename);
  } else {
    console.error('Download failed:', result.error);
  }
}

downloadSpace();
```

### 2. Download by Space ID

```javascript
const { twspaceCrawler } = require('twspace-crawler');

async function downloadBySpaceId() {
  twspaceCrawler.init({
    authToken: 'your_twitter_auth_token',
    csrfToken: 'your_twitter_csrf_token'
  });

  const result = await twspaceCrawler.downloadBySpaceId('1OyKAjPPAPbGb');
  
  console.log('Result:', result);
}
```

### 3. Download from Playlist URL (Most Reliable)

```javascript
const { twspaceCrawler } = require('twspace-crawler');

async function downloadFromPlaylist() {
  twspaceCrawler.init();

  const result = await twspaceCrawler.downloadByPlaylistUrl(
    'https://prod-fastly-us-west-2.video.pscp.tv/Transcoding/v1/hls/playlist.m3u8',
    {
      filename: 'my-space-recording',
      subDir: 'downloads',
      metadata: {
        title: 'My Space Recording',
        author: 'username'
      }
    }
  );

  if (result.success) {
    console.log('Downloaded to:', result.filePath);
  }
}
```

## Advanced Usage

### Using Individual Modules

```javascript
const { 
  tokenManager, 
  SpaceDownloader, 
  TwitterUtil 
} = require('twspace-crawler');

// Set tokens manually
tokenManager.setAuthToken('your_auth_token');
tokenManager.setCsrfToken('your_csrf_token');

// Extract space ID from URL
const spaceId = TwitterUtil.getSpaceId('https://x.com/i/spaces/1OyKAjPPAPbGb');

// Direct downloader usage
const downloader = new SpaceDownloader(
  'playlist_url',
  'filename',
  'subdirectory',
  { title: 'Space Title' }
);

await downloader.download();
```

### Configuration Options

```javascript
twspaceCrawler.init({
  authToken: 'your_twitter_auth_token',
  csrfToken: 'your_twitter_csrf_token',
  tokensPath: './tokens.json', // Optional: path to tokens file
  skipDownload: false,
  skipDownloadAudio: false,
  skipDownloadCaption: true
});
```

### Setting Tokens Dynamically

```javascript
// Set tokens after initialization
twspaceCrawler.setTokens('new_auth_token', 'new_csrf_token');

// Check authentication status
const authStatus = twspaceCrawler.getAuthStatus();
console.log('Has auth token:', authStatus.hasAuthToken);
console.log('Has CSRF token:', authStatus.hasCsrfToken);
```

## TypeScript Usage

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

## Environment Variables

You can also use environment variables instead of passing tokens directly:

```bash
export TWITTER_AUTH_TOKEN="your_auth_token"
export TWITTER_CSRF_TOKEN="your_csrf_token"
```

```javascript
// Tokens will be loaded from environment variables
twspaceCrawler.init();
```

## Token File Support

Create a `tokens.json` file:

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

## Error Handling

```javascript
try {
  const result = await twspaceCrawler.downloadByUrl(spaceUrl);
  
  if (!result.success) {
    console.error('Download failed:', result.error);
    // Handle specific errors
    if (result.error.includes('Invalid Space URL')) {
      // Handle invalid URL
    } else if (result.error.includes('401')) {
      // Handle authentication error
    }
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

## Complete Example

```javascript
const { twspaceCrawler } = require('twspace-crawler');

async function main() {
  try {
    // Initialize
    twspaceCrawler.init({
      authToken: process.env.TWITTER_AUTH_TOKEN,
      csrfToken: process.env.TWITTER_CSRF_TOKEN
    });

    // Check authentication
    const authStatus = twspaceCrawler.getAuthStatus();
    if (!authStatus.hasAuthToken || !authStatus.hasCsrfToken) {
      throw new Error('Missing authentication tokens');
    }

    // Download space
    const spaceUrl = 'https://x.com/i/spaces/1OyKAjPPAPbGb';
    console.log('Starting download for:', spaceUrl);
    
    const result = await twspaceCrawler.downloadByUrl(spaceUrl);
    
    if (result.success) {
      console.log('✅ Download started successfully!');
      console.log('📁 Filename:', result.filename);
      if (result.filePath) {
        console.log('📍 File path:', result.filePath);
      }
    } else {
      console.error('❌ Download failed:', result.error);
    }
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

main();
```

## Notes

- The library requires valid Twitter authentication tokens to download Spaces
- Downloaded files are saved to the `media/` directory by default
- The library uses the same underlying modules as the CLI version
- For playlist URL downloads, authentication tokens are not required
