import { implementation } from "@/shims";
import type { JID } from "@/JID";
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

export class Disco {
  static readonly NS = {
    DISCO_INFO: "http://jabber.org/protocol/disco#info",
    DISCO_ITEMS: "http://jabber.org/protocol/disco#items",
  } as const;

  
  identities: Identity[] = [];
  readonly features: Set<string> = new Set();
  items: Item[] = [];

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
  
    createInfoResult(to: string | JID, id: string, queryNode?: string | null) {
      const doc = implementation.createDocument("jabber:client", "iq", null)
      const iq = doc.documentElement!;
      iq.setAttribute("type", "result");
      iq.setAttribute("to", to.toString());
      iq.setAttribute("id", id);
      const query = doc.createElementNS(Disco.NS.DISCO_INFO, "query");

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
      iq.appendChild(query);
      return iq;
    }
  
    createItemsResult(to: string | JID, id: string, queryNode?: string | null) {
      const doc = implementation.createDocument("jabber:client", "iq", null);
      const iq = doc.documentElement!;
      const query = doc.createElementNS(Disco.NS.DISCO_ITEMS, "query");
      iq.setAttribute("type", "result");
      iq.setAttribute("to", to.toString());
      iq.setAttribute("id", id);
      iq.setAttribute("id", id);
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
      iq.appendChild(query);
      return iq;
    }
}
