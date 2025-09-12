# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`twspace-crawler` is a Node.js CLI application that monitors and downloads Twitter Spaces automatically. It can monitor specific users for live Spaces or download Spaces directly by ID/URL.

## Common Development Commands

### Build and Run
- `npm run build` - Compile TypeScript to JavaScript in `dist/` directory
- `npm start` - Run the built application
- `npm run start:config` - Run with specific config file
- `node dist/index.js --user username1,username2` - Monitor specific users
- `node dist/index.js --id SPACE_ID` - Download specific Space

### Development Tools
- `npm run lint` - Run ESLint on TypeScript source files
- `npm run lint:fix` - Run ESLint with automatic fixes
- `npm test` - Run tests using Lab test framework
- `npm run prepare` - Build before publishing (runs automatically)

### PM2 Production
- `pm2 start ecosystem.config.js` - Start with PM2 using ecosystem config
- PM2 config includes production environment and config file path

## Architecture Overview

### Core Components

**Entry Point (`src/index.ts`):**
- CLI argument parsing using Commander.js
- Environment setup and configuration loading
- Route to appropriate execution mode (user monitoring, space download, URL download)

**MainManager (`src/modules/MainManager.ts`):**
- Central coordinator managing all watchers
- Handles SpaceWatcher instances for individual Spaces
- Handles UserWatcher instances for user monitoring
- Manages UserListWatcher for bulk user monitoring with Twitter API

**Watcher Pattern:**
- `UserWatcher` - Monitors individual users for live Spaces
- `UserListWatcher` - Monitors multiple users using Twitter API (requires auth tokens)  
- `SpaceWatcher` - Monitors specific Space for download when it ends

**Download Components:**
- `SpaceDownloader` - Downloads Space audio/video from playlist URLs
- `SpaceCaptionsDownloader` - Downloads Space captions/chat
- `SpaceCaptionsExtractor` - Processes caption files

### API Layer Structure
- `src/api/` - New modular Twitter API implementation
- `src/apis/` - Legacy API classes (TwitterApi, PeriscopeApi)
- API layer handles authentication, rate limiting, and GraphQL queries
- Uses Bottleneck for rate limiting

### Key Directories
- `src/modules/` - Main business logic (managers, watchers, downloaders)
- `src/api/` - Modern Twitter API integration with GraphQL
- `src/apis/` - Legacy API implementations
- `src/utils/` - Utility functions for Twitter, Periscope, Space handling
- `src/commands/` - CLI subcommands (cc for captions)
- `src/constants/` - Application and API constants
- `src/interfaces/` - TypeScript type definitions

## Configuration

**Environment Variables:**
- `TWITTER_AUTH_TOKEN` - Required for authenticated API access
- `TWITTER_CSRF_TOKEN` - Required for authenticated API access  
- `LOG_LEVEL` - Control logging verbosity
- `SKIP_DOWNLOAD*` flags - Control what gets downloaded

**Config Files:**
- Support both JSON and YAML formats
- `config.example.yaml` shows structure for user lists, webhooks, ffmpeg args
- Users can be strings or objects with additional metadata
- Discord webhooks supported with role/user mentions

## Authentication Requirements

Since Twitter API changes (2023-07-01), authentication tokens are required:
- Extract `auth_token` and `ct0` (CSRF token) from browser cookies
- Set as `TWITTER_AUTH_TOKEN` and `TWITTER_CSRF_TOKEN` environment variables
- Without tokens, falls back to less reliable scraping methods

## Testing

Uses `@hapi/lab` test framework with TypeScript transformer:
- Tests located in `test/` directory
- Test data in `test/data/` (spaces.ts, users.ts)
- Run with `npm test`

## Execution Modes

1. **User Monitoring**: `--user username1,username2` - Monitor users for live Spaces
2. **Space ID**: `--id SPACE_ID` - Download specific Space by ID
3. **Space URL**: `--space-url URL` - Download Space from Twitter URL
4. **Playlist URL**: `--url PLAYLIST_URL` - Direct download from media playlist
5. **Caption Commands**: `twspace-crawler cc d/e` - Manual caption download/extract