import { domParser } from "../../shims";
interface ConnectionMethods {
  websocket?: string;
  httppoll?: string;
  xbosh?: string;
}

export class XMPPDiscoverer {
  static async discoverAltXMPP(
    domain: string,
    timeout = 5000
  ): Promise<ConnectionMethods> {
    const url = `https://${domain}/.well-known/host-meta`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = (await Promise.race([
        fetch(url, { signal: controller.signal }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("请求超时")), timeout)
        ),
      ])) as Response;

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status}`);
      }

      const text = await response.text();
      const doc = domParser.parseFromString(text, "text/xml");
      const elements = doc.getElementsByTagName("Link");
      const result: ConnectionMethods = {};

      const REL_TO_KEY = {
        "urn:xmpp:alt-connections:websocket": "websocket",
        "urn:xmpp:alt-connections:httppoll": "httppoll",
        "urn:xmpp:alt-connections:xbosh": "xbosh",
      } as const;

      for (const element of elements) {
        const rel = element.getAttribute("rel");
        const href = element.getAttribute("href");
        if (rel && href) {
          if (rel in REL_TO_KEY) {
            const key = REL_TO_KEY[rel as keyof typeof REL_TO_KEY];
            result[key] = href;
          } else {
            console.warn(`发现未知的连接类型: ${rel}`);
          }
        }
      }

      return result;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("请求超时");
        }
        throw error;
      }
      throw new Error("未知错误");
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
