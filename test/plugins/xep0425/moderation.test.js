import { describe, expect, it } from "vitest";
import { XMPPElement } from "../../../lib/ltx/Element";
import Moderation from "../../../lib/plugins/xep0425/moderation";
import { Retraction } from "../../../lib/plugins/xep0424/retraction";

describe("Moderation", () => {
    /**
     * 测试 createModerationEl 创建审核请求元素
     */
    describe("createModerationEl", () => {
        it("creates a moderate element with id and retract child", () => {
            const modEl = Moderation.createModerationEl("stanza-1");
            
            expect(modEl.tagName).toBe("moderate");
            expect(modEl.namespaceURI).toBe(Moderation.NS);
            expect(modEl.getAttribute("id")).toBe("stanza-1");
            
             // 验证包含 retract 子元素
            const retractEl = modEl.getElementsByTagNameNS(Retraction.NS, "retract")[0];
            expect(retractEl).toBeDefined();
            expect(retractEl.getAttribute("id")).toBe("stanza-1");
        });

        it("creates moderate element with reason", () => {
            const modEl = Moderation.createModerationEl("stanza-2", "This message is spam");
            
            expect(modEl.getAttribute("id")).toBe("stanza-2");
            
            // 验证包含 reason 元素
            const reasonEl = modEl.getElementsByTagName("reason")[0];
            expect(reasonEl).toBeDefined();
            expect(reasonEl?.textContent).toBe("This message is spam");
        });

        it("creates moderate element without reason when not provided", () => {
            const modEl = Moderation.createModerationEl("stanza-3");
            
            const reasonEl = modEl.getElementsByTagName("reason")[0];
            expect(reasonEl).toBeUndefined();
        });
    });

    /**
     * 测试 parseModeration 解析 moderate 元素
     */
    describe("parseModeration with moderate element", () => {
        it("parses moderate element with id and retract", () => {
            const moderate = XMPPElement.createElementNS(Moderation.NS, "moderate");
            moderate.setAttribute("id", "stanza-1");
            
            // 添加 retract 子元素
            const retract = XMPPElement.createElementNS(Retraction.NS, "retract");
            retract.setAttribute("id", "stanza-1");
            moderate.appendChild(retract);
            
            const result = Moderation.parseModeration(moderate);
            expect(result.moderate).toBeDefined();
            expect(result.moderate.id).toBe("stanza-1");
            expect(result.moderate.reason).toBeUndefined();
        });

        it("parses moderate element with reason", () => {
            const moderate = XMPPElement.createElementNS(Moderation.NS, "moderate");
            moderate.setAttribute("id", "stanza-2");
            
            // 添加 retract 子元素
            const retract = XMPPElement.createElementNS(Retraction.NS, "retract");
            retract.setAttribute("id", "stanza-2");
            moderate.appendChild(retract);
            
            // 添加 reason 子元素
            const reason = XMPPElement.createElement("reason");
            reason.textContent = "Inappropriate content";
            moderate.appendChild(reason);
            
            const result = Moderation.parseModeration(moderate);
            expect(result.moderate.id).toBe("stanza-2");
            expect(result.moderate.reason).toBe("Inappropriate content");
        });

        it("throws error when moderate element lacks id attribute", () => {
            const moderate = XMPPElement.createElementNS(Moderation.NS, "moderate");
            
            const retract = XMPPElement.createElementNS(Retraction.NS, "retract");
            moderate.appendChild(retract);
            
            expect(() => Moderation.parseModeration(moderate)).toThrow();
        });

        it("throws error when moderate element lacks retract child", () => {
            const moderate = XMPPElement.createElementNS(Moderation.NS, "moderate");
            moderate.setAttribute("id", "stanza-3");
            
            expect(() => Moderation.parseModeration(moderate)).toThrow();
        });
    });

    /**
     * 测试 createModeratedEl 创建审核标记元素
     */
    describe("createModeratedEl", () => {
        it("creates a moderated element with by attribute", () => {
            const modEl = Moderation.createModeratedEl("room@example.com/moderator");
            
            expect(modEl.tagName).toBe("moderated");
            expect(modEl.namespaceURI).toBe(Moderation.NS);
            expect(modEl.getAttribute("by")).toBe("room@example.com/moderator");
        });

        it("creates moderated element with reason", () => {
            const modEl = Moderation.createModeratedEl(
                "room@example.com/moderator",
                "Spam detected"
            );
            
            expect(modEl.getAttribute("by")).toBe("room@example.com/moderator");
            
            const reasonEl = modEl.getElementsByTagName("reason")[0];
            expect(reasonEl).toBeDefined();
            expect(reasonEl?.textContent).toBe("Spam detected");
        });

        it("creates moderated element without by attribute when not provided", () => {
            const modEl = Moderation.createModeratedEl();
            
            expect(modEl.getAttribute("by")).toBeNull();
        });

        it("creates moderated element with reason but no by attribute", () => {
            const modEl = Moderation.createModeratedEl(undefined, "Auto-moderated");
            
            expect(modEl.getAttribute("by")).toBeNull();
            
            const reasonEl = modEl.getElementsByTagName("reason")[0];
            expect(reasonEl).toBeDefined();
            expect(reasonEl?.textContent).toBe("Auto-moderated");
        });
    });

    /**
     * 测试 parseModeration 解析 moderated 元素（tombstone）
     */
    describe("parseModeration with moderated element", () => {
        it("parses moderated element with by attribute", () => {
            const moderated = XMPPElement.createElementNS(Moderation.NS, "moderated");
            moderated.setAttribute("by", "room@example.com/moderator");
            
            const result = Moderation.parseModeration(moderated);
            expect(result.moderated).toBeDefined();
            expect(result.moderated.by).toBe("room@example.com/moderator");
            expect(result.moderated.reason).toBeUndefined();
        });

        it("parses moderated element with both by and reason", () => {
            const moderated = XMPPElement.createElementNS(Moderation.NS, "moderated");
            moderated.setAttribute("by", "room@example.com/moderator");
            
            const reason = XMPPElement.createElement("reason");
            reason.textContent = "Violates community guidelines";
            moderated.appendChild(reason);
            
            const result = Moderation.parseModeration(moderated);
            expect(result.moderated.by).toBe("room@example.com/moderator");
            expect(result.moderated.reason).toBe("Violates community guidelines");
        });

        it("parses moderated element without by attribute", () => {
            const moderated = XMPPElement.createElementNS(Moderation.NS, "moderated");
            
            const reason = XMPPElement.createElement("reason");
            reason.textContent = "Auto-moderated";
            moderated.appendChild(reason);
            
            const result = Moderation.parseModeration(moderated);
            expect(result.moderated.by).toBeNull();
            expect(result.moderated.reason).toBe("Auto-moderated");
        });
    });

    /**
     * 测试错误处理
     */
    describe("error handling", () => {
        it("throws error with invalid namespace", () => {
            const element = XMPPElement.createElementNS("invalid-ns", "moderate");
            
            expect(() => Moderation.parseModeration(element)).toThrow("非法命名空间的消息审核元素");
        });

        it("throws error with unknown tag name", () => {
            const element = XMPPElement.createElementNS(Moderation.NS, "unknown");
            
            expect(() => Moderation.parseModeration(element)).toThrow("未知的消息审核元素标签");
        });
    });

    /**
     * 集成测试：生成和解析的往返一致性
     */
    describe("round-trip consistency", () => {
        it("created moderate element parses correctly", () => {
            // 生成元素
            const created = Moderation.createModerationEl("msg-1", "Test reason");
            
            // 解析元素
            const parsed = Moderation.parseModeration(created);
            
            expect(parsed.moderate.id).toBe("msg-1");
            expect(parsed.moderate.reason).toBe("Test reason");
        });

        it("created moderated element parses correctly", () => {
            // 生成元素
            const created = Moderation.createModeratedEl("user@example.com/res", "Spam");
            
            // 解析元素
            const parsed = Moderation.parseModeration(created);
            
            expect(parsed.moderated.by).toBe("user@example.com/res");
            expect(parsed.moderated.reason).toBe("Spam");
        });
    });
});
