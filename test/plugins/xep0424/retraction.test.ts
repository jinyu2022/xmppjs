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

    it("createRetractionTombstoneEl creates a retracted element", () => {
        const stamp = new Date(2026, 3, 12, 12, 34, 56);
        const retracted = Retraction.createRetractionTombstoneEl("msg-2", stamp);
        expect(retracted.tagName).toBe("retracted");
        expect(retracted.namespaceURI).toBe(Retraction.NS);
        expect(retracted.getAttribute("id")).toBe("msg-2");
        expect(retracted.getAttribute("stamp")).toBe("2026-04-12T12:34:56Z");
    });

    it("parseRetractionEl parses retracted element", () => {
        const retracted = XMPPElement.createElementNS(Retraction.NS, "retracted");
        retracted.setAttribute("id", "msg-2");
        retracted.setAttribute("stamp", "2026-04-12T12:34:56Z");

        const result = Retraction.parseRetractionEl(retracted);
        expect(result.retracted.id).toBe("msg-2");
        expect(result.retracted.stamp).toBeInstanceOf(Date);
        expect(result.retracted.stamp?.getFullYear()).toBe(2026);
        expect(result.retracted.stamp?.getMonth()).toBe(3);
        expect(result.retracted.stamp?.getDate()).toBe(12);
        expect(result.retracted.stamp?.getHours()).toBe(12);
        expect(result.retracted.stamp?.getMinutes()).toBe(34);
        expect(result.retracted.stamp?.getSeconds()).toBe(56);
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
