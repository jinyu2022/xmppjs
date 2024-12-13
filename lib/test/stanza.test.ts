import { describe, it, expect } from "vitest";
import { XMPPError,ErrorConditions } from "../errors";

describe("XMPP错误", () => {
    const createStanza = (errorCondition: string, errorType: string, errorText: string | null = null) => {
        const parser = new DOMParser();
        const xmlString = `
            <message to="user@example.com" from="server@example.com">
                <error type="${errorType}">
                    <${errorCondition} xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>
                    ${errorText ? `<text>${errorText}</text>` : ""}
                </error>
            </message>
        `;
        return parser.parseFromString(xmlString, "application/xml").documentElement;
    };


    it("如果没有错误节点应该抛出错误", () => {
        const parser = new DOMParser();
        const stanza = parser.parseFromString('<message to="user@example.com" from="server@example.com"/>', "application/xml").documentElement;

        expect(() => new XMPPError(stanza, "Test error message")).toThrow("没有error节点");
    });

    it("如果没有条件节点应该抛出错误", () => {
        const parser = new DOMParser();
        const stanza = parser.parseFromString('<message to="user@example.com" from="server@example.com"><error type="cancel"/></message>', "application/xml").documentElement;

        expect(() => new XMPPError(stanza, "Test error message")).toThrow("没有condition节点");
    });

    it("如果条件未知应该抛出错误", () => {
        const stanza = createStanza("unknown-condition", "cancel");

        expect(() => new XMPPError(stanza, "Test error message")).toThrow("未知的condition");
    });


    it("如果存在错误文本应该正确解析", () => {
        const errorText = "This is an error text";
        const stanza = createStanza(ErrorConditions[0], "cancel", errorText);
        const error = new XMPPError(stanza, "Test error message");

        expect(error.text).toBe(errorText);
    });
});