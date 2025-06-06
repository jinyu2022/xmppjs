import type { Plugin } from "../types";
import { Connection } from "../../connection";
import { Iq } from "@/stanza";
import { Disco } from "./disco";
import type { JID } from "../../JID";
import type { Identity, Item } from "./disco";
import type { DataForm } from "../xep0004/form";
import logger from "@/log";
import { XMPPError } from "@/errors";

const log = logger.getLogger("XEP0030");

interface DiscoInfoCache {
  identities: Identity[];
  features: Set<string>;
  extensions?: DataForm;
  timestamp: number;
}

interface DiscoItemCache {
  items: Item[];
  timestamp: number;
}
export class XEP0030 extends Disco implements Plugin {
  /** 服务器的功能 */
  private readonly serverFeatures: Set<string> = new Set();
  /** 服务器的身份 */
  private readonly serverIdentities: Array<Identity> = [];

  /** 默认300秒 */
  readonly TTL = 300_0000 as const;

  /** 查询info缓存, 键为jid */
  private readonly infoCache: Map<string, DiscoInfoCache> = new Map();
  /** 查询items缓存, 键为jid */
  private readonly itemsCache: Map<string, DiscoItemCache> = new Map();

  readonly connection: Connection;
  constructor(connection: Connection) {
    super();
    this.connection = connection;
  }

  init() {
    this.addFeature(Disco.NS.DISCO_INFO);
    this.addFeature(Disco.NS.DISCO_ITEMS);

    this.connection.once("session:start", async () => {
      const iq = Iq.createIq(
        "get",
        this.connection.jid.domain,
        Disco.NS.DISCO_INFO
      );
      let identities: Identity[];
      let features: Set<string>;
      try {
        const res = await this.connection.sendAsync(iq.documentElement!);
        const query = Disco.parseDiscoInfo(res);
        identities = query.identities;
        features = query.features;
        log.info("服务器身份特性获取成功");
      } catch {
        identities = [];
        features = new Set();
        log.warn("服务器身份特性获取失败");
      }
      this.serverFeatures.clear();
      this.serverIdentities.length = 0;
      for (const feature of features) {
        this.serverFeatures.add(feature);
      }
      for (const identity of identities) {
        this.serverIdentities.push(identity);
      }
      this.connection.emit("serverDiscovered");
    });

    this.connection.on("iq", (iq) => {
      if (iq.type !== "get") return;
      // TODO: 不应该操作xml，应该操作对象
      const stanza = iq.xml;
      // 如果节是向客户端询问disco信息，则回复
      // 获取命名空间
      const query = stanza.getElementsByTagName("query")[0];
      if (!query) return;

      const from = stanza.getAttribute("from")!;
      const id = stanza.getAttribute("id")!;
      const node = query.getAttribute("node");
      if (query.namespaceURI === Disco.NS.DISCO_INFO) {
        const reply = this.createInfoResult(from, id, node);
        this.connection.send(reply);
      } else if (query.namespaceURI === Disco.NS.DISCO_ITEMS) {
        const reply = this.createItemsResult(from, id, node);
        this.connection.send(reply);
      } else {
        log.warn("无关disco查询", query);
      }
    });
  }

  getServerFeatures(): Promise<Set<string>> {
    if (this.serverFeatures.size > 0) {
      return Promise.resolve(this.serverFeatures);
    } else {
      return new Promise((resolve) => {
        this.connection.once("serverDiscovered", () => {
          resolve(this.serverFeatures);
        });
      });
    }
  }

  getServerIdentities(): Promise<Array<Identity>> {
    if (this.serverIdentities.length > 0) {
      return Promise.resolve(this.serverIdentities);
    } else {
      return new Promise((resolve) => {
        this.connection.once("serverDiscovered", () => {
          resolve(this.serverIdentities);
        });
      });
    }
  }

  /**
   * 发起一个disco#info查询
   * @param to 查询的对象
   * @param node 查询的节点
   * @param cache 是否使用缓存, 默认使用
   */
  async getDiscoInfo(to: string | JID, node?: string, cache = true) {
    const iq = Iq.createIq("get", to, Disco.NS.DISCO_INFO).documentElement!;
    if (node) {
      iq.setAttributeNS(Disco.NS.DISCO_INFO, "node", node);
    }
    if (cache) {
      const cache = this.infoCache.get(to.toString());
      if (cache && Date.now() - cache.timestamp < this.TTL) {
        return { identities: cache.identities, features: cache.features, extensions: cache.extensions };
      }
    }
    const response = await this.connection.sendAsync(iq);
    if (response.getAttribute("type") === "error") {
      throw new XMPPError(response, "disco#info查询失败");
    }
    const discoInfo = Disco.parseDiscoInfo(response);
    this.updateCache(to, "info", discoInfo);
    return discoInfo;
  }

  /**
   * 发起一个disco#info查询
   * @param to 查询的对象
   * @param node 查询的节点
   * @param cache 是否使用缓存, 默认使用
   * @returns 响应的xml
   */
  async getDiscoItems(to: string | JID, node?: string, cache = true): Promise<Item[]> {
    const iq = Iq.createIq("get", to, Disco.NS.DISCO_ITEMS).documentElement!;
    if (node) {
      iq.setAttributeNS(Disco.NS.DISCO_ITEMS, "node", node);
    }
    if (cache) {
      const cache = this.itemsCache.get(to.toString());
      if (cache && Date.now() - cache.timestamp < this.TTL) {
        return cache.items;
      }
    }
    const response = await this.connection.sendAsync(iq);
    if (response.getAttribute("type") === "error") {
      throw new XMPPError(response, "disco#items查询失败");
    }
    const items = Disco.parseDiscoItems(response);
    this.updateCache(to, "item", { items });
    return items;
  }

  /**
   * 更新dico缓存, 并检查
   * @param to 查询的对象
   * @param type 查询的类型
   * @param cache 缓存
   */
  updateCache<T extends "info" | "item">(
    to: string | JID,
    type: T,
    cache: T extends "info"
      ? Omit<DiscoInfoCache, "timestamp">
      : Omit<DiscoItemCache, "timestamp">
  ) {
    if (type === "info") {
      this.infoCache.set(to.toString(), {
        ...cache as Omit<DiscoInfoCache, "timestamp">,
        timestamp: Date.now(),
      });

      
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
    } else if (type === "item") {
      this.itemsCache.set(to.toString(), {
        ...cache as Omit<DiscoItemCache, "timestamp">,
        timestamp: Date.now(),
      });
      // 限制大小为100个, 超过删除最早的
      if (this.itemsCache.size > 100) {
        // 转换为数组并按时间戳排序
        const sortedEntries = Array.from(this.itemsCache.entries()).sort(
          ([, a], [, b]) => a.timestamp - b.timestamp
        );
        // 删除最旧的20%条目
        const deleteCount = Math.ceil(this.itemsCache.size * 0.2);
        sortedEntries.slice(0, deleteCount).forEach(([key]) => {
          this.itemsCache.delete(key);
        });
      }
    } else {
      throw new Error("未知的disco类型");
    }

  }
}
export default XEP0030;

declare module "../../connection" {
  interface SocketEventMap {
    /**@internal 你不应该使用这个*/
    serverDiscovered: void;
  }
}
