import type { JID } from "@/JID";
import { XMPPError } from "@/errors";
import { XMPPElement } from "@/ltx/Element";
import { Message } from "@/stanza";
import { XMPPDateTime } from "../xep0082/dateTime";

/**
 * XMPP 消息类型定义
 * - "normal": 普通消息
 * - "chat": 一对一聊天消息
 * - "groupchat": 群组聊天消息
 */
export type MessageType = "normal" | "chat" | "groupchat";

/**
 * XEP-0424: 消息撤回
 * 
 * 实现 XMPP 消息撤回扩展协议，用于允许用户撤回已发送的消息。
 * @link https://xmpp.org/extensions/xep-0424.html
 */
export class Retraction {
    static readonly NS = "urn:xmpp:message-retract:1" as const;
    static readonly NS_TOMBSTONE = "urn:xmpp:message-retract:1#tombstone" as const;

    /**
     * 解析消息撤回元素
     * 
     * 从 XML 元素中解析撤回请求或撤回标记信息。
     * 支持两种元素类型：
     * - "retract": 撤回请求元素
     * - "retracted": 撤回标记元素
     * 
     * @param retractEl - 要解析的撤回 XML 元素
     * @throws {XMPPError} 当元素命名空间不合法或缺少必要属性时抛出错误
     */
    static parseRetractionEl(retractEl: XMPPElement) {
        if (retractEl.namespaceURI !== Retraction.NS) {
            throw new XMPPError(retractEl, "非法命名空间的消息撤回元素");
        }

        const id = retractEl.getAttribute("id");
        if (!id) {
            throw new XMPPError(retractEl, "消息撤回元素缺少 id");
        }

        // 处理 retract 元素：撤回请求
        if (retractEl.tagName === "retract") {
            return {
                retract: { id },
            };
        }

        // 处理 retracted 元素：撤回标记
        if (retractEl.tagName === "retracted") {
            const stamp = retractEl.getAttribute("stamp");
            return {
                retracted: {
                    id,
                    stamp: stamp ? XMPPDateTime.parseDateTime(stamp) ?? void 0 : void 0,
                },
            };
        }

        throw new XMPPError(retractEl, "未知的消息撤回元素标签");
    }

    /**
     * 创建消息撤回请求元素
     * 
     * 根据指定的消息 ID 创建一个撤回请求元素，该元素应被附加到消息节中。
     * 
     * @param id - 要撤回的消息的唯一标识符
     * @returns 返回创建的撤回请求 XML 元素
     */
    static createRetractionEl(id: string) {
        const retract = XMPPElement.createElementNS(Retraction.NS, "retract");
        retract.setAttribute("id", id);
        return retract;
    }

    /**
     * 创建包含撤回请求的消息节
     * 
     * 创建一个完整的消息节，包含对指定消息的撤回请求。
     * 该方法是 {@link createRetractionEl} 的高级封装，直接返回可发送的消息节。
     * 
     * @param to - 消息接收者的 JID（裸 JID 或完整 JID）
     * @param id - 要撤回的消息的唯一标识符
     * @param type - 消息类型，默认为 "chat"
     * @param fallbackText - 回退文本，用于不支持撤回的客户端显示
     * @returns 返回包含撤回请求的消息节
     */
    static createRetractionMessage(
        to: string | JID,
        id: string,
        type: MessageType = "chat",
        fallbackText?: string,
    ) {
        const message = Message.createMessage(to, fallbackText, type);
        message.appendChild(Retraction.createRetractionEl(id));
        return message;
    }
}

/**
 * {@link Retraction} 的默认导出
 */
export default Retraction;
