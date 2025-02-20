import { DOMParser, XMLSerializer, DOMImplementation } from '@xmldom/xmldom';
import type { WebSocket as NodeWebSocket } from 'ws';
// HACK：xmldom 0.9.* 解析有问题，需要手动指定命名空间
const NS_MAP = {
    stream: 'http://etherx.jabber.org/streams',
} as const;

function getDOMParser() {
    if (typeof window !== 'undefined' && window.DOMParser) {
        return new DOMParser({ xmlns: NS_MAP });
    }
    try {
        return new DOMParser({
            xmlns: NS_MAP,
            onError: (level, message) => {
                console.error('解析错误:', {
                    level,
                    message,
                });
            }
        });
    } catch (e) {
        throw new Error('DOMParser不存在, 请在浏览器环境或者node环境安装xmldom');
    }
}

function getImplementation() {
    if (typeof window !== 'undefined' && window.document.implementation) {
        return window.document.implementation;
    }
    try {
        return new DOMImplementation();
    } catch (e) {
        throw new Error('DOMImplementation不存在, 请在浏览器环境或者node环境安装xmldom');
    }
}

function getXmlSerializer() {
    if (typeof window !== 'undefined' && window.XMLSerializer) {
        return new XMLSerializer();
    }
    try {
        return new XMLSerializer();
    } catch (e) {
        throw new Error('XMLSerializer不存在, 请在浏览器环境或者node环境安装xmldom');
    }
}

export async function getWebSocket() {
    if (typeof window !== 'undefined' && window.WebSocket) {
        return window.WebSocket;
    }
    try {
        const { WebSocket } = await import('ws');
        return WebSocket;
    } catch (e) {
        throw new Error('WebSocket不存在, 请在浏览器环境或者node环境安装ws');
    }
}

/** 初始化方法，必须在使用这些变量之前调用 */
export const domParser = getDOMParser();
export const implementation = getImplementation();
export const xmlSerializer = getXmlSerializer();
// export const WS = getWebSocket();


declare global {
    interface Window {
        
        document: {
            implementation: DOMImplementation
        },
        DOMParser: unknown;
        domParser: DOMParser;
        implementation: DOMImplementation;
        xmlSerializer: XMLSerializer;
        XMLSerializer: unknown;
        WebSocket: typeof NodeWebSocket;
    }
    // eslint-disable-next-line no-var
    var window: Window;
}
