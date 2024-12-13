import { domParser } from '../../shims';
interface ConnectionMethods {
    websocket?: string;
    httppoll?: string;
    xbosh?: string;
}

export const discoverAltXMPP = (domain: string) => {
    const url = `https://${domain}/.well-known/host-meta`;
    return fetch(url)
        .then((response: any) => response.text())
        .then((text: string) => {
            const doc = domParser.parseFromString(text, 'text/xml');
            const elements = doc.getElementsByTagName('Link');
            const result: ConnectionMethods = {};
            // 定义 rel 到键名的映射
            const REL_TO_KEY = {
                'urn:xmpp:alt-connections:websocket': 'websocket',
                'urn:xmpp:alt-connections:httppoll': 'httppoll',
                'urn:xmpp:alt-connections:xbosh': 'xbosh'
            } as const;
            // 使用 for-of 循环替代传统 for 循环
            for (const element of elements) {
                const rel = element.getAttribute('rel');
                const href = element.getAttribute('href');
                if (rel && href) {
                    if (rel in REL_TO_KEY) {
                        const key = REL_TO_KEY[rel as keyof typeof REL_TO_KEY];
                        result[key] = href;
                    } else {
                        // 记录未知的 rel 类型
                        console.warn(`发现未知的连接类型: ${rel}`);
                    }
                }
            }
            return result;
        });
}