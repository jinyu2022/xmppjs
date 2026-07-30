import { describe, it, expect } from "vitest";
import { PEP } from "../../../lib/plugins/xep0163/pep";
import { XMPPElement } from "../../../lib/ltx/Element";

/**
 * XEP-0163: Personal Eventing Protocol
 * @see https://xmpp.org/extensions/xep-0163.html
 * @version 1.3.0 (2023-06-20)
 *
 * 根据 XEP-0163 规范，PEP 是 Pubsub (XEP-0060) 的一个简化子集，
 * 自动在用户的裸 JID 上创建节点。提供三个核心操作:
 * - createRetrieveItemsIq: 检索项目
 * - createPublishIq: 发布项目
 * - createRetractIq: 撤回项目
 */
describe("PEP", () => {
  describe("createRetrieveItemsIq", () => {
    it("should create a get IQ to retrieve PEP items", () => {
      const iq = PEP.createRetrieveItemsIq(
        "romeo@example.net",
        "urn:xmpp:avatar:metadata"
      );
      expect(iq.getAttribute("type")).toBe("get");
      expect(iq.getAttribute("to")).toBe("romeo@example.net");
    });

    it("should include max attribute when specified", () => {
      const iq = PEP.createRetrieveItemsIq(
        "romeo@example.net",
        "urn:xmpp:avatar:metadata",
        1
      );
      expect(iq.getAttribute("type")).toBe("get");
    });
  });

  describe("createPublishIq", () => {
    it("should create a set IQ to publish PEP items", () => {
      const item = XMPPElement.createElement("item");
      item.setAttribute("id", "test-item");
      const publish = XMPPElement.createElement("publish");
      publish.setAttribute("node", "urn:xmpp:test");
      publish.appendChild(item);
      const iq = PEP.createPublishIq(publish);
      expect(iq.getAttribute("type")).toBe("set");
      const pubEl = iq.getElementsByTagName("publish")[0];
      expect(pubEl).toBeDefined();
    });

    it("should include publish options when provided", () => {
      const item = XMPPElement.createElement("item");
      const publish = XMPPElement.createElement("publish");
      publish.setAttribute("node", "urn:xmpp:test");
      publish.appendChild(item);
      const options = XMPPElement.createElement("publish-options");
      const iq = PEP.createPublishIq(publish, options);
      const opts = iq.getElementsByTagName("publish-options")[0];
      expect(opts).toBeDefined();
    });
  });

  describe("createRetractIq", () => {
    it("should create a set IQ to retract PEP items", () => {
      const iq = PEP.createRetractIq("urn:xmpp:bookmarks:1", "room@conference.example.net");
      expect(iq.getAttribute("type")).toBe("set");
    });

    it("should include notify attribute when specified", () => {
      const iq = PEP.createRetractIq("urn:xmpp:bookmarks:1", "room@conference.example.net", true);
      expect(iq.getAttribute("type")).toBe("set");
    });
  });
});
