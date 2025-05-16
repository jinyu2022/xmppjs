import { implementation } from "../../shims";
import { XMPPDateTime } from "../xep0082/dateTime";
import { XMPPError } from "../../errors";
export class Delay {
    static readonly NS = "urn:xmpp:delay";

    static parseDelayEl(delay: Element) {
        const delayElement =
            delay.tagName === "delay"
                ? delay
                : delay.getElementsByTagName("delay")[0];
        if (!delayElement) throw new XMPPError(delay, "未找到 delay 标签");
        const delayStamp = delayElement.getAttribute("stamp")!;
        const delayFrom = delayElement.getAttribute("from")!;
        const delayReason = delayElement.textContent ?? void 0;
        return {
            delay: {
                stamp: XMPPDateTime.parseDateTime(delayStamp),
                from: delayFrom,
                reason: delayReason,
            }
        };
    }

    /**
     * 创建一个延迟元素（delay element）。
     *
     * 该方法生成一个包含延迟信息的 XML 元素，通常用于 XMPP 协议中的延迟消息。
     *
     * @param stamp - 表示延迟时间的日期对象，通常是一个 Date 实例。
     * @param from - 表示延迟消息的发送者，通常是一个字符串，包含发送者的标识。
     * @param reason - 表示延迟的原因，通常是一个字符串，描述延迟的具体原因。
     * @returns 返回一个 XML 元素，包含延迟信息，具有 "stamp"、"from" 和文本内容（原因）属性。
     */
    static createDelayEl(stamp: Date, from: string, reason: string) {
        const delayElement = implementation.createDocument(Delay.NS, "delay", null)
            .documentElement!;
        delayElement.setAttribute("stamp", XMPPDateTime.formatDateTime(stamp));
        delayElement.setAttribute("from", from);
        delayElement.textContent = reason;
        return delayElement;
    }
}
