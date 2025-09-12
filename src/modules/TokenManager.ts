import fs from 'fs'
import path from 'path'

class TokenManager {
  private authToken?: string

  private csrfToken?: string

  private tokensPath?: string

  public init(opts?: { authToken?: string; csrfToken?: string; tokensPath?: string }) {
    this.tokensPath = opts?.tokensPath

    // 1) CLI 覆盖（若提供）
    if (opts?.authToken) this.authToken = opts.authToken
    if (opts?.csrfToken) this.csrfToken = opts.csrfToken

    // 2) 文件读取（若配置路径存在）
    this.loadFromFile()

    // 3) .env 兜底
    this.authToken ??= process.env.TWITTER_AUTH_TOKEN
    this.csrfToken ??= process.env.TWITTER_CSRF_TOKEN

    this.watch()
  }

  public getAuthToken() {
    return this.authToken
  }

  public getCsrfToken() {
    return this.csrfToken
  }

  public setAuthToken(token?: string) {
    this.authToken = token
  }

  public setCsrfToken(token?: string) {
    this.csrfToken = token
  }

  public getCookie() {
    const parts: string[] = []
    if (this.authToken) parts.push(`auth_token=${this.authToken}`)
    if (this.csrfToken) parts.push(`ct0=${this.csrfToken}`)
    return parts.join('; ')
  }

  public getHeaderExtras(): Record<string, string> {
    const headers: Record<string, string> = {}
    const cookie = this.getCookie()
    if (cookie) headers.cookie = cookie
    if (this.csrfToken) headers['x-csrf-token'] = this.csrfToken
    return headers
  }

  private loadFromFile() {
    try {
      if (!this.tokensPath) return
      const fp = path.resolve(this.tokensPath)
      if (!fs.existsSync(fp)) return
      const raw = fs.readFileSync(fp, 'utf-8')
      if (!raw?.trim()) return
      const json = JSON.parse(raw)
      if (typeof json?.authToken === 'string') this.authToken = json.authToken
      if (typeof json?.csrfToken === 'string') this.csrfToken = json.csrfToken
    } catch {
      // ignore
    }
  }

  private watch() {
    if (!this.tokensPath) return
    try {
      let timer: NodeJS.Timeout
      const fp = path.resolve(this.tokensPath)
      fs.watchFile(fp, { interval: 500 }, () => {
        clearTimeout(timer)
        timer = setTimeout(() => this.loadFromFile(), 250)
      })
    } catch {
      // ignore
    }
  }
}

export const tokenManager = new TokenManager()

