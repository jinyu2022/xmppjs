export class JID {
  readonly local: string;
  readonly domain: string;
  readonly resource?: string;
  readonly full: string;
  readonly bare: string;

  constructor(jid: string) {
    const { local, domain, resource } = JID.parse(jid);

    this.local = local;
    this.domain = domain;
    this.resource = resource;
    /** 如果没有resource，末尾会有个/号 */
    this.full = `${this.local}@${this.domain}/${this.resource ?? ""}`;
    this.bare = `${this.local}@${this.domain}`;
  }

  static parse(jid: string): {
    local: string;
    domain: string;
    resource?: string;
  } {
    // 正则表达式解析 JID
    const jidRegex = /^([^@/]+)@([^/@\s]+)(\/(.+))?$/;
    const match = jidRegex.exec(jid);
    if (!match) {
      throw new Error(`无效的 JID 格式: ${jid}`);
    }
    // TODO: XEP-0106：JID 转义
    const local = match[1];
    const domain = match[2];
    if (!local || !domain) {
      throw new Error(`无效的 JID 格式: ${jid}`);
    }
    const resource = match[4];

    return { local, domain, resource };
  }

  equals(other: unknown): boolean {
    if (!(other instanceof JID)) {
      return false;
    }
    return this.full === other.full;
  }

  toString(): string {
    // 避免结尾有无效的 '/'
    return this.resource ? this.full : this.bare;
  }

}
