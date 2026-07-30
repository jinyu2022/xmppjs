import { describe, expect, it } from "vitest";
import { XMPPElement } from "../../../lib/ltx/Element";
import Retraction from "../../../lib/plugins/xep0424/retraction";

describe("Retraction", () => {
    it("createRetractionEl creates a retract element", () => {
        const retract = Retraction.createRetractionEl("msg-1");
        expect(retract.tagName).toBe("retract");
        expect(retract.namespaceURI).toBe(Retraction.NS);
        expect(retract.getAttribute("id")).toBe("msg-1");
    });

    it("parseRetractionEl parses retract element", () => {
        const retract = XMPPElement.createElementNS(Retraction.NS, "retract");
        retract.setAttribute("id", "msg-1");

        expect(Retraction.parseRetractionEl(retract)).toEqual({
            retract: {
                id: "msg-1",
            },
        });
    });

    it("parseRetractionEl parses retracted element (tombstone)", () => {
        // 根据 XEP-0424 §3.2，撤回标记（tombstone）使用 <retracted/> 元素
        const retracted = XMPPElement.createElementNS(Retraction.NS, "retracted");
        retracted.setAttribute("id", "msg-2");
        retracted.setAttribute("stamp", "2026-04-12T12:34:56Z");

        const result = Retraction.parseRetractionEl(retracted);
        expect(result.retracted).toBeDefined();
        expect(result.retracted.id).toBe("msg-2");
        expect(result.retracted.stamp).toBeInstanceOf(Date);
    });

    it("parseRetractionEl parses retracted element", () => {
        const retracted = XMPPElement.createElementNS(Retraction.NS, "retracted");
        retracted.setAttribute("id", "msg-2");
        retracted.setAttribute("stamp", "2026-04-12T12:34:56Z");

        const result = Retraction.parseRetractionEl(retracted);
        expect(result.retracted.id).toBe("msg-2");
        expect(result.retracted.stamp).toBeInstanceOf(Date);
    });

    it("createRetractionMessage appends retract element to message", () => {
        const message = Retraction.createRetractionMessage(
            "romeo@example.net",
            "msg-3",
            "chat",
            "This message was retracted",
        );

        expect(message.tagName).toBe("message");
        expect(message.getAttribute("to")).toBe("romeo@example.net");
        expect(message.getAttribute("type")).toBe("chat");
        expect(message.getElementsByTagName("body")[0]?.textContent).toBe("This message was retracted");
        expect(message.getElementsByTagName("retract")[0]?.getAttribute("id")).toBe("msg-3");
    });
});
