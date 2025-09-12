// 统一导出文件 - 方便其他模块使用
export { TwspaceCrawler } from './lib';
export { SpaceWatcher } from './SpaceWatcher';
export { SpaceDownloader } from './SpaceDownloader';
export { TokenManager } from './TokenManager';
export { MainManager } from './MainManager';

// 导出接口和类型
export * from './interfaces/Twitter.interface';
export * from './interfaces/SpaceWatcher.interface';

// 导出工具类
export { TwitterUtil } from './TwitterUtil';

// 默认导出主要的爬虫实例
import { TwspaceCrawler } from './lib';
export const twspaceCrawler = new TwspaceCrawler();
export default twspaceCrawler;
