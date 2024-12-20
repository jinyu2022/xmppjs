// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { domParser, xmlSerializer } from '../shims';
import { Message, StanzaBase } from '../stanza';
import { XEP0280, parsePluginsMap } from '../plugins';
import { Element } from '@xmldom/xmldom';


const parseFuncMap = parsePluginsMap.set(
    StanzaBase.NS, StanzaBase.parseBaseStanza
)
// 3. 递归遍历函数
function traverseAndTransform(obj) {
    // HACK：使用 instanceof Element 我无法做到同时兼容浏览器和node环境
    for (const [key, value] of Object.entries(obj)) {
        if (!value || typeof value !== "object" || Array.isArray(obj)) continue;
        // console.log(key);
        if (parseFuncMap.has(value.namespaceURI ?? "")) {
            const handler = parseFuncMap.get(
                value.namespaceURI
            );
            const transformed = handler(value);
            traverseAndTransform(transformed);
            // 重新赋值
            delete obj[key];
            Object.assign(obj, transformed)
        }else if (Object.prototype.toString.call(value) === '[object Object]'){
            traverseAndTransform(value);
        }
    }
    return obj;
}

describe('消息解析器', () => {

    it('应该解析包含主题和正文的消息', () => {
        const message = domParser.parseFromString(`
        <message to="user@example.com" from="admin@example.com" type="chat">
            <subject>你好</subject>
            <body>世界</body>
        </message>
        `, 'text/xml').documentElement;

        const result = Message.parseMessage(message).message;

        expect(result).toEqual({
            to: "user@example.com",
            from: "admin@example.com",
            type: "chat",
            subject: "你好",
            body: "世界"
        });
    });

    it('如果未提供类型，则默认类型为 "normal"', () => {
        const message = domParser.parseFromString(`
        <message to="user@example.com" from="admin@example.com">
            <subject>你好</subject>
            <body>世界</body>
        </message>
        `, 'text/xml').documentElement;

        const result = Message.parseMessage(message).message;

        expect(result.type).toBe("normal");
    });

    it('应该处理没有主题和正文的消息', () => {
        const message = domParser.parseFromString(`
        <message to="user@example.com" from="admin@example.com">
        </message>
        `, 'text/xml').documentElement;

        const result = Message.parseMessage(message).message;

        expect(result).toEqual({
            to: "user@example.com",
            from: "admin@example.com",
            type: "normal",
            subject: undefined,
            body: undefined
        });
    });

    it('应该处理包含多个额外元素的消息', () => {
        const message = domParser.parseFromString(`
        <message to="user@example.com" from="admin@example.com">
            <subject>你好</subject>
            <body>世界</body>
            <extra1>额外内容 1</extra1>
            <extra2>额外内容 2</extra2>
        </message>
        `, 'text/xml').documentElement;

        const result = Message.parseMessage(message).message;

        expect(result).toEqual({
            to: "user@example.com",
            from: "admin@example.com",
            type: "normal",
            subject: "你好",
            body: "世界",
            extra1: message.getElementsByTagName('extra1')[0],
            extra2: message.getElementsByTagName('extra2')[0]
        });
    });

    it("正确解析carbon消息", () => {
        const message = domParser.parseFromString(`
        <message 
            xmlns='jabber:client'
            from='romeo@montague.example'
            to='romeo@montague.example/home'
            type='chat'>
            <received xmlns='urn:xmpp:carbons:2'>
                <forwarded xmlns='urn:xmpp:forward:0'>
                    <delay xmlns='urn:xmpp:delay' stamp='2010-07-10T23:08:25Z'/>
                    <message 
                        xmlns='jabber:client'
                        from='juliet@capulet.example/balcony'
                        to='romeo@montague.example/garden'
                        type='chat'>
                        <body>你好，世界</body>
                    </message>
                </forwarded>
            </received>
        </message>`, 'text/xml').documentElement;
        const msgEl = new Message(message, null);
        const result = traverseAndTransform(msgEl);
        const dateString = "2010-07-10T15:08:25.000Z";  // 修复格式
        const date = new Date(dateString);
        expect(result).toEqual({
            connection: null,
            tagName: 'message',
            id: null,
            to: 'romeo@montague.example/home',
            from: 'romeo@montague.example',
            type: 'chat',
            subject: undefined,
            body: undefined,
            carbon: {
                type: 'received',
                forwarded: {
                    delay: { stamp: date, from: null, reason: '' },
                    message: {
                        to: 'romeo@montague.example/garden',
                        from: 'juliet@capulet.example/balcony',
                        type: 'chat',
                        subject: undefined,
                        body: '你好，世界'
                    }
                }
            }
        })
    }

    )
});