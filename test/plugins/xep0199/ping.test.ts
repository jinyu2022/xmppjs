import { describe, it, expect } from "vitest";
import Ping from "../../../lib/plugins/xep0199/ping";
import { XMPPElement } from "../../../lib/ltx/Element";

/**
 * XEP-0199: XMPP Ping
 * @see https://xmpp.org/extensions/xep-0199.html
 * @version 2.0.2 (2023-11-29)
 */
describe("Ping", () => {
  describe("createSendPingIq", () => {
    it("should create a GET IQ with ping child element", () => {
      const iq = Ping.createSendPingIq("example.org");
      expect(iq.getAttribute("type")).toBe("get");
      expect(iq.getAttribute("to")).toBe("example.org");
      const pingEl = iq.getElementsByTagName("ping")[0];
      expect(pingEl).toBeDefined();
      expect(pingEl!.namespaceURI).toBe(Ping.NS);
    });
  });

  describe("createPingResultIq", () => {
    it("should create a RESULT IQ with specified id", () => {
      const iq = Ping.createPingResultIq("example.org", "ping-1");
      expect(iq.getAttribute("type")).toBe("result");
      expect(iq.getAttribute("to")).toBe("example.org");
      expect(iq.getAttribute("id")).toBe("ping-1");
    });

    it("should preserve the id for correlation", () => {
      const id = "my-custom-id-123";
      const iq = Ping.createPingResultIq("juliet@example.net", id);
      expect(iq.getAttribute("id")).toBe(id);
    });
  });

  describe("NS constant", () => {
    it("should be urn:xmpp:ping", () => {
      expect(Ping.NS).toBe("urn:xmpp:ping");
    });
  });
});
