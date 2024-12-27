import type { Connection } from "../../connection";
import type { JID } from "../../JID";
import { implementation } from "../../shims";
export interface Identity {
  category: string;
  type: string;
  name?: string;
  lang?: string;
}
interface Item {
  jid: string;
  node?: string | null;
  name?: string | null;
}
interface DiscoCache {
  xml: Element;
  timestamp: number;
}

export class Disco {
  static readonly NS = {
    DISCO_INFO: "http://jabber.org/protocol/disco#info",
    DISCO_ITEMS: "http://jabber.org/protocol/disco#items",
  } as const;
  /** 默认300秒 */
  readonly TTL = 300_0000 as const;
  readonly connection: Connection;

  private identities: Identity[] = [];
  private readonly features: Set<string> = new Set();
  private items: Item[] = [];
  /** 查询info缓存, 键为jid */
  private readonly infoCache: Map<string, DiscoCache> = new Map();
  /** 查询items缓存, 键为jid */
  private readonly itemsCache: Map<string, DiscoCache> = new Map();
  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * 添加一个特性
   * @param value <feature/>元素的var属性值
   */
  addFeature(value: string) {
    // 检查有没有重复的
    if (this.features.has(value)) {
      throw new Error("已经存在相同的特性");
    }
    this.features.add(value);
  }

  /**
   * 移除一个特性
   * @param value <feature/>元素的var属性值
   * @returns 是否成功移除
   */
  removeFeature(value: string) {
    return this.features.delete(value);
  }
  /**
   * 添加一个身份标识
   * @param category 身份类别
   * @param type 身份类型
   * @param name 身份的显示名称
   * @param lang 名称使用的语言二字代码
   */
  addIdentity(category: string, type: string, name: string, lang: string) {
    // 检查有没有冲突，四个都一样就冲突
    if (
      this.identities.some(
        (i) =>
          i.category === category &&
          i.type === type &&
          i.name === name &&
          i.lang === lang
      )
    ) {
      throw new Error("已经存在相同的身份标识");
    }
    this.identities.push({ category, type, name, lang });
  }

  /**
   * 移除一个身份标识
   * @param category 身份类别
   * @param type 身份类型
   * @param name 身份的显示名称
   * @param lang 名称使用的语言二字代码
   */
  removeIdentity(category: string, type: string, name: string, lang: string) {
    this.identities = this.identities.filter(
      (i) =>
        i.category !== category ||
        i.type !== type ||
        i.name !== name ||
        i.lang !== lang
    );
  }

  /**
   * 添加一个项目
   * @param jid 项目的JID
   * @param node 项目的节点
   * @param name 项目的显示名称
   */
  addItem(jid: string, node?: string, name?: string) {
    if (
      this.items.some(
        (i) => i.jid === jid && i.name === name && i.node === node
      )
    ) {
      throw new Error("已经存在相同的项目");
    }
    this.items.push({ jid, name, node });
  }

  /**
   * 移除一个项目
   * @param jid 项目的JID
   * @param name 项目的显示名称
   */
  removeItem(jid: string, name: string) {
    this.items = this.items.filter((i) => i.jid !== jid || i.name !== name);
  }

  /**
   * 发起一个disco#info查询
   * @param to 查询的对象
   * @param node 查询的节点
   * @param cache 是否使用缓存, 默认使用
   * @returns 响应的xml
   */
  async getDiscoInfo(to: string | JID, node?: string, cache = true) {
    const iq = this.connection.createIq("get", to, Disco.NS.DISCO_INFO);
    if (node) {
      iq.setAttributeNS(Disco.NS.DISCO_INFO, "node", node);
    }
    if (cache) {
      const cache = this.infoCache.get(to.toString());
      if (cache && Date.now() - cache.timestamp < this.TTL) {
        return cache.xml;
      }
    }
    const response = await this.connection.sendIq(
      "get",
      to,
      Disco.NS.DISCO_INFO
    );
    this.updateCache(to, response);
    return response;
  }

  /**
   * 发起一个disco#info查询
   * @param to 查询的对象
   * @param node 查询的节点
   * @param cache 是否使用缓存, 默认使用
   * @returns 响应的xml
   */
  async getDiscoItems(to: string | JID, node?: string, cache = true) {
    const iq = this.connection.createIq("get", to, Disco.NS.DISCO_ITEMS);
    if (node) {
      iq.setAttributeNS(Disco.NS.DISCO_ITEMS, "node", node);
    }
    if (cache) {
      const cache = this.itemsCache.get(to.toString());
      if (cache && Date.now() - cache.timestamp < this.TTL) {
        return cache.xml;
      }
    }
    const response = await this.connection.sendIq(
      "get",
      to,
      Disco.NS.DISCO_ITEMS
    );
    this.updateCache(to, response);
    return response;
  }

  createInfoResult(to: string | JID, id: string, queryNode?: string | null) {
    const discoInfo = this.connection.createIq(
      "result",
      to,
      Disco.NS.DISCO_INFO
    );
    discoInfo.setAttribute("id", id);
    const query = discoInfo.getElementsByTagNameNS(
      Disco.NS.DISCO_INFO,
      "query"
    )[0];
    let identities = this.identities;
    if (queryNode) {
      query.setAttribute("node", queryNode);
      // TODO: 到底要根据node返回什么？
    }
    for (const identity of identities) {
      const identityElement = implementation.createDocument(
        null,
        "identity",
        null
      ).documentElement!;
      identityElement.setAttribute("category", identity.category);
      identityElement.setAttribute("type", identity.type);
      if (identity.name) {
        identityElement.setAttribute("name", identity.name);
      }
      if (identity.lang) {
        identityElement.setAttribute("xml:lang", identity.lang);
      }
      query.appendChild(identityElement);
    }
    for (const feature of this.features) {
      const featureElement = implementation.createDocument(
        null,
        "feature",
        null
      ).documentElement!;
      featureElement.setAttribute("var", feature);
      query.appendChild(featureElement);
    }
    return discoInfo;
  }

  createItemsResult(to: string | JID, id: string, queryNode?: string | null) {
    const discoItems = this.connection.createIq(
      "result",
      to,
      Disco.NS.DISCO_ITEMS
    );
    discoItems.setAttribute("id", id);
    const query = discoItems.getElementsByTagNameNS(
      Disco.NS.DISCO_ITEMS,
      "query"
    )[0];
    let items = this.items;
    if (queryNode) {
      query.setAttribute("node", queryNode);
      // items要和queryNode一样
      items = items.filter((i) => i.node === queryNode);
    }
    for (const item of items) {
      const itemElement = implementation.createDocument(null, "item", null)
        .documentElement!;
      itemElement.setAttribute("jid", item.jid);
      if (item.name) {
        itemElement.setAttribute("name", item.name);
      }
      if (item.node) {
        itemElement.setAttribute("node", item.node);
      }
      query.appendChild(itemElement);
    }
    return discoItems;
  }

  /**
   * 更新dico缓存, 并检查
   * @param to 查询的对象
   * @param xml 响应的xml
   */
  updateCache(to: string | JID, xml: Element) {
    const queryNS = xml.getElementsByTagName("query")[0].namespaceURI;
    if (queryNS === Disco.NS.DISCO_INFO) {
      this.infoCache.set(to.toString(), { xml, timestamp: Date.now() });
    } else if (queryNS === Disco.NS.DISCO_ITEMS) {
      this.itemsCache.set(to.toString(), { xml, timestamp: Date.now() });
    } else {
      throw new Error("未知的查询类型");
    }
    // 限制大小为100个, 超过删除最早的
    if (this.infoCache.size > 100) {
      // 转换为数组并按时间戳排序
      const sortedEntries = Array.from(this.infoCache.entries()).sort(
        ([, a], [, b]) => a.timestamp - b.timestamp
      );
      // 删除最旧的20%条目
      const deleteCount = Math.ceil(this.infoCache.size * 0.2);
      sortedEntries.slice(0, deleteCount).forEach(([key]) => {
        this.infoCache.delete(key);
      });
    }
  }

  static parseDiscoInfo(xml: Element) {
    let query: Element;
    if (xml.namespaceURI !== Disco.NS.DISCO_INFO) {
      query = xml.getElementsByTagNameNS(Disco.NS.DISCO_INFO, "query")[0];
    } else {
      query = xml;
    }
    const identities = Array.from(query.getElementsByTagName("identity")).map(
      (identity) => {
        return {
          category: identity.getAttribute("category")!,
          type: identity.getAttribute("type")!,
          name: identity.getAttribute("name") ?? void 0,
          lang: identity.getAttribute("xml:lang") ?? void 0,
        };
      }
    );
    const features = Array.from(query.getElementsByTagName("feature")).map(
      (feature) => {
        return feature.getAttribute("var")!;
      }
    );
    return { identities, features };
  }
}
