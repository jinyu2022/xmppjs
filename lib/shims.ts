// @ts-nocheck
import type xmldom from '@xmldom/xmldom';

function getDOMParser()  {
    if (typeof window !== 'undefined' && window.DOMParser) {
        return new DOMParser();
    }
    try {
        const { DOMParser } = require('@xmldom/xmldom');
        return new DOMParser();
    } catch (e) {
        throw new Error('DOMParser不存在, 请在浏览器环境或者node环境安装xmldom');
    }
}

function getImplementation() {
    if (typeof window !== 'undefined' && document.implementation) {
        return document.implementation;
    }
    try {
        const { DOMImplementation } = require('@xmldom/xmldom');
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
        const { XMLSerializer } = require('@xmldom/xmldom');
        return new XMLSerializer();
    } catch (e) {
        throw new Error('XMLSerializer不存在, 请在浏览器环境或者node环境安装xmldom');
    }
}

function getWebSocket() {
    if (typeof window !== 'undefined' && window.WebSocket) {
        return WebSocket;
    }
    try {
        const { WebSocket } = require('ws');
        return WebSocket;
    } catch (e) {
        throw new Error('WebSocket不存在, 请在浏览器环境或者node环境安装ws');
    }
}

// XXX:
/** 你必须同时兼容web和node的类型 */
export const domParser: xmldom.DOMParser = getDOMParser();
/** 你必须同时兼容web和node的类型 */
export const implementation: xmldom.DOMImplementation = getImplementation();
/** 你必须同时兼容web和node的类型 */
export const xmlSerializer: xmldom.XMLSerializer = getXmlSerializer();
/** 你必须同时兼容web和node的类型 */
export const WebSocket: typeof window.WebSocket = getWebSocket();
