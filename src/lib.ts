/**
 * Library API for twspace-crawler
 *
 * This module provides a programmatic interface to download Twitter Spaces
 * without using the CLI interface.
 */

import { tokenManager } from "./modules/TokenManager";
import { mainManager } from "./modules/MainManager";
import { SpaceDownloader } from "./modules/SpaceDownloader";
import { SpaceWatcher } from "./modules/SpaceWatcher";
import { TwitterUtil } from "./utils/TwitterUtil";
import { Util } from "./utils/Util";
import { configManager } from "./modules/ConfigManager";
import { logger } from "./logger";

export interface TwspaceCrawlerConfig {
  authToken?: string;
  csrfToken?: string;
  tokensPath?: string;
  skipDownload?: boolean;
  skipDownloadAudio?: boolean;
  skipDownloadCaption?: boolean;
}

export interface SpaceDownloadOptions {
  spaceUrl?: string;
  spaceId?: string;
  playlistUrl?: string;
  filename?: string;
  subDir?: string;
  onComplete?: (spaceId: string) => void;
  metadata?: Record<string, any>;
}

export interface SpaceDownloadResult {
  success: boolean;
  filename?: string;
  filePath?: string;
  error?: string;
  watcher?: SpaceWatcher; // SpaceWatcher instance for event listening
}

/**
 * Main TwspaceCrawler class for programmatic usage
 */
export class TwspaceCrawler {
  private initialized = false;

  /**
   * Initialize the crawler with authentication tokens and configuration
   */
  public init(config: TwspaceCrawlerConfig = {}): void {
    // Initialize token manager
    tokenManager.init({
      authToken: config.authToken,
      csrfToken: config.csrfToken,
      tokensPath: config.tokensPath,
    });

    // Load and update configuration
    configManager.load();
    configManager.update({
      skipDownload: config.skipDownload ?? configManager.config.skipDownload,
      skipDownloadAudio:
        config.skipDownloadAudio ?? configManager.config.skipDownloadAudio,
      skipDownloadCaption:
        config.skipDownloadCaption ?? configManager.config.skipDownloadCaption,
    });

    this.initialized = true;
    logger.info("TwspaceCrawler initialized");
  }

  /**
   * Set authentication tokens
   */
  public setTokens(authToken: string, csrfToken: string): void {
    tokenManager.setAuthToken(authToken);
    tokenManager.setCsrfToken(csrfToken);
    logger.info("Authentication tokens updated");
  }

  /**
   * Download a Space by URL
   */
  public async downloadByUrl(
    spaceUrl: string,
    options: Omit<SpaceDownloadOptions, "spaceUrl" | "spaceId"> = {}
  ): Promise<SpaceDownloadResult> {
    this.ensureInitialized();

    try {
      const spaceId = TwitterUtil.getSpaceId(spaceUrl);
      if (!spaceId) {
        return {
          success: false,
          error: `Invalid Space URL: ${spaceUrl}`,
        };
      }

      return await this.downloadBySpaceId(spaceId, options);
    } catch (error) {
      logger.error("downloadByUrl error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Download a Space by Space ID
   */
  public async downloadBySpaceId(
    spaceId: string,
    options: Omit<SpaceDownloadOptions, "spaceUrl" | "spaceId"> = {}
  ): Promise<SpaceDownloadResult> {
    this.ensureInitialized();

    try {
      // Start the space watcher
      const watcher = mainManager.addSpaceWatcher(spaceId);

      // Set up event listener for download completion
      if (watcher && options.onComplete) {
        logger.info(
          `Setting up complete event listener for Space ID: ${spaceId}`
        );
        watcher.on("complete", () => {
          logger.info(`🎉 Download completed for Space ID: ${spaceId}`);
          console.log(`🎉 下载完成！Space ID: ${spaceId}`);
          options.onComplete?.(spaceId);
        });
      }

      // Also set up error event listener for debugging
      if (watcher) {
        watcher.on("error", (error) => {
          logger.error(`Download error for Space ID ${spaceId}:`, error);
          console.log(`❌ 下载出错！Space ID: ${spaceId}, Error:`, error);
        });
      }

      logger.info(`Started Space watcher for ID: ${spaceId}`);

      return {
        success: true,
        filename: `Space_${spaceId}`,
        watcher: watcher, // Return watcher for manual event listening
      };
    } catch (error) {
      logger.error("downloadBySpaceId error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Download a Space directly from playlist URL (most reliable method)
   */
  public async downloadByPlaylistUrl(
    playlistUrl: string,
    options: Omit<
      SpaceDownloadOptions,
      "spaceUrl" | "spaceId" | "playlistUrl"
    > = {}
  ): Promise<SpaceDownloadResult> {
    this.ensureInitialized();

    try {
      const filename = options.filename || `Space_${Util.getDateTimeString()}`;
      const subDir = options.subDir || "";
      const metadata = options.metadata || {};

      const downloader = new SpaceDownloader(
        playlistUrl,
        filename,
        subDir,
        metadata
      );

      await downloader.download();

      const filePath = Util.getMediaDir(subDir);

      logger.info(`Space downloaded successfully: ${filename}`);

      return {
        success: true,
        filename,
        filePath: `${filePath}/${filename}.m4a`,
      };
    } catch (error) {
      logger.error("downloadByPlaylistUrl error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get current authentication status
   */
  public getAuthStatus(): { hasAuthToken: boolean; hasCsrfToken: boolean } {
    return {
      hasAuthToken: !!tokenManager.getAuthToken(),
      hasCsrfToken: !!tokenManager.getCsrfToken(),
    };
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error("TwspaceCrawler not initialized. Call init() first.");
    }
  }
}

// Export singleton instance for convenience
export const twspaceCrawler = new TwspaceCrawler();

// Export individual modules for advanced usage
export {
  tokenManager,
  mainManager,
  SpaceDownloader,
  TwitterUtil,
  Util,
  configManager,
  logger,
};

// Export types
export * from "./interfaces/Twitter.interface";
export * from "./interfaces/Periscope.interface";
