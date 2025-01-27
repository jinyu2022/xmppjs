import type xmldom from '@xmldom/xmldom';
import type { WebSocket as NodeWebSocket } from 'ws';

// HACK：xmldom 0.9.* 解析有问题，需要手动指定命名空间
const NS_MAP = {
    'stream': 'http://etherx.jabber.org/streams',
} as const;

async function getDOMParser() {
    if (typeof window !== 'undefined' && window.DOMParser) {
        return new DOMParser({xmlns: NS_MAP});
    }
    try {
        const { DOMParser } = await import('@xmldom/xmldom');
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

async function getImplementation() {
    if (typeof window !== 'undefined' && document.implementation) {
        return document.implementation;
    }
    try {
        const { DOMImplementation } = await import('@xmldom/xmldom');
        return new DOMImplementation();
    } catch (e) {
        throw new Error('DOMImplementation不存在, 请在浏览器环境或者node环境安装xmldom');
    }
}

async function getXmlSerializer() {
    if (typeof window !== 'undefined' && window.XMLSerializer) {
        return new XMLSerializer();
    }
    try {
        const { XMLSerializer } = await import('@xmldom/xmldom');
        return new XMLSerializer();
    } catch (e) {
        throw new Error('XMLSerializer不存在, 请在浏览器环境或者node环境安装xmldom');
    }
}

async function getWebSocket(): Promise<typeof NodeWebSocket> {
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

// XXX:
/** 你必须同时兼容web和node的类型 */
export const domParser: xmldom.DOMParser = await getDOMParser();
/** 你必须同时兼容web和node的类型 */
export const implementation: xmldom.DOMImplementation = await getImplementation();
/** 你必须同时兼容web和node的类型 */
export const xmlSerializer: xmldom.XMLSerializer = await getXmlSerializer();
/** 你必须同时兼容web和node的类型 */
export const WS = await getWebSocket();
