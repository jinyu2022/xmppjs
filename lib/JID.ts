export class JID {
  readonly node: string;
  readonly domain: string;
  readonly resource?: string;
  readonly full: string;
  readonly bare: string;

  constructor(jid: string) {
    const { node, domain, resource } = JID.parse(jid);

    this.node = node;
    this.domain = domain;
    this.resource = resource;
    this.full = `${this.node}@${this.domain}/${this.resource ?? ""}`;
    this.bare = `${this.node}@${this.domain}`;
  }

  static parse(jid: string): {
    node: string;
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
    const node = match[1];
    const domain = match[2];
    if (!node || !domain) {
      throw new Error(`无效的 JID 格式: ${jid}`);
    }
    const resource = match[4];

    return { node, domain, resource };
  }

  equals(other: any): boolean {
    if (!(other instanceof JID)) {
      return false;
    }
    return this.full === other.full;
  }

  toString(): string {
    return this.full;
  }

}
