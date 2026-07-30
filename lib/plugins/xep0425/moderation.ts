
import type { JID } from "@/JID";
import { XMPPError } from "@/errors";
import { XMPPElement } from "@/ltx/Element";
import { Retraction } from "../xep0424/retraction";

/**
 * XEP-0425: Moderated Message Retraction
 * 
 * 实现 XMPP 消息审核和撤回扩展协议，允许 MUC 审核员撤回其他用户发送的消息。
 * 审核者可以提供撤回的原因，并标记消息是由哪个审核员撤回的。
 * @link https://xmpp.org/extensions/xep-0425.html
 */
export class Moderation {
    static readonly NS = "urn:xmpp:message-moderate:1" as const;

    /**
     * 解析消息审核元素
     * 
     * 从 XML 元素中解析审核请求或审核标记信息。
     * 支持两种元素类型：
     * - "moderate": 审核请求元素
     * - "moderated": 审核标记元素
     * 
     * @param moderationEl - 要解析的审核 XML 元素
     * @throws {XMPPError} 当元素命名空间不合法或缺少必要属性时抛出错误
     */
    static parseModeration(moderationEl: XMPPElement) {
        if (moderationEl.namespaceURI !== Moderation.NS) {
            throw new XMPPError(moderationEl, "非法命名空间的消息审核元素");
        }

        // 处理 moderate 元素：审核请求
        if (moderationEl.tagName === "moderate") {
            const id = moderationEl.getAttribute("id");
            if (!id) {
                throw new XMPPError(moderationEl, "消息审核元素缺少 id");
            }

            // 验证必须包含 retract 元素
            const retractEl = moderationEl.getElementsByTagNameNS(
                Retraction.NS,
                "retract"
            )[0];
            if (!retractEl) {
                throw new XMPPError(moderationEl, "消息审核元素缺少必需的 retract 子元素");
            }

            // 获取可选的 reason 元素
            const reasonEl = moderationEl.getElementsByTagName("reason")[0];
            const reason = reasonEl?.textContent ?? void 0;

            return {
                moderate: {
                    id,
                    reason,
                },
            };
        }

        // 处理 moderated 元素：审核标记
        if (moderationEl.tagName === "moderated") {
            const by = moderationEl.getAttribute("by");
            const reasonEl = moderationEl.getElementsByTagName("reason")[0];
            const reason = reasonEl?.textContent ?? void 0;

            return {
                moderated: {
                    by,
                    reason,
                },
            };
        }

        throw new XMPPError(moderationEl, "未知的消息审核元素标签");
    }

    /**
     * 创建消息审核请求元素
     * 
     * 根据指定的消息 ID 创建一个审核请求元素，该元素应被附加到 IQ 消息中。
     * 该元素包含对指定消息的撤回请求和可选的原因说明。
     * 
     * @param id - 要撤回的消息的唯一标识符
     * @param reason - 撤回原因的可选描述
     * @returns 返回创建的审核请求 XML 元素
     */
    static createModerationEl(id: string, reason?: string) {
        const moderate = XMPPElement.createElementNS(Moderation.NS, "moderate");
        moderate.setAttribute("id", id);

        // 复用 XEP0424 的 retract 元素创建方法
        moderate.appendChild(Retraction.createRetractionEl(id));

        // 添加可选的 reason 元素
        if (reason) {
            const reasonEl = XMPPElement.createElement("reason");
            reasonEl.textContent = reason;
            moderate.appendChild(reasonEl);
        }

        return moderate;
    }

    /**
     * 创建包含审核标记的消息（用于 tombstone）
     * 
     * 创建一个 moderated 元素，用于标记消息已被审核。
     * 通常由 archiving 服务使用来标记已撤回的消息。
     * 
     * @param by - 执行审核的实体的 JID（可选）
     * @param reason - 审核原因的可选描述
     * @returns 返回创建的审核标记 XML 元素
     */
    static createModeratedEl(by?: string | JID, reason?: string) {
        const moderated = XMPPElement.createElementNS(Moderation.NS, "moderated");

        if (by) {
            moderated.setAttribute("by", by.toString());
        }

        if (reason) {
            const reasonEl = XMPPElement.createElement("reason");
            reasonEl.textContent = reason;
            moderated.appendChild(reasonEl);
        }

        return moderated;
    }
}

/**
 * {@link Moderation} 的默认导出
 */
export default Moderation;