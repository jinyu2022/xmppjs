import { describe, it, expect } from "vitest";
import MucSelfPing from "@/plugins/xep0410/MucSelfPing";
import { XMPPElement } from "@/ltx/Element";
import Ping from "@/plugins/xep0199/ping";

/**
 * XEP-0410: MUC Self-Ping (Schrödinger's Chat)
 * @see https://xmpp.org/extensions/xep-0410.html
 * @version 1.0.1 (2024-07-08)
 */
describe("MucSelfPing", () => {
  it("createSelfPingIq builds a GET ping iq", () => {
    const to = "room@conference.example.net/nick";
    const iq = MucSelfPing.createSelfPingIq(to);
    expect(iq.getAttribute("type")).toBe("get");
    expect(iq.getAttribute("to")).toBe(to);
    const ping = iq.getElementsByTagName("ping")[0];
    expect(ping).toBeTruthy();
    // createSelfPingIq 委托给 Ping.createSendPingIq，ping 使用 Ping.NS
    expect(ping.namespaceURI).toBe(Ping.NS);
  });

  it("parseSelfPingResponse: result => returns parsed iq object", () => {
    const iq = XMPPElement.createElement("iq");
    iq.setAttribute("type", "result");
    const result = MucSelfPing.parseSelfPingResponse(iq);
    // type="result" 时返回 Iq.parseIq(iqEl).iq
    expect(result).toBeTypeOf("object");
    expect(result.type).toBe("result");
  });

  it("parseSelfPingResponse: error => returns XMPPError", () => {
    const iq = XMPPElement.createElement("iq");
    iq.setAttribute("type", "error");
    const err = XMPPElement.createElement("error");
    const child = XMPPElement.createElement("not-acceptable");
    err.appendChild(child);
    iq.appendChild(err);
    const result = MucSelfPing.parseSelfPingResponse(iq);
    // type="error" 时返回 XMPPError 实例
    expect(result).toBeInstanceOf(Error);
    expect(result.name).toBe("XMPPError");
  });

  it("parseSelfPingResponse: item-not-found returns XMPPError", () => {
    const iq = XMPPElement.createElement("iq");
    iq.setAttribute("type", "error");
    const err = XMPPElement.createElement("error");
    err.appendChild(XMPPElement.createElement("item-not-found"));
    iq.appendChild(err);
    const result = MucSelfPing.parseSelfPingResponse(iq);
    expect(result).toBeInstanceOf(Error);
  });

  it("parseSelfPingResponse: remote-server-not-found returns XMPPError", () => {
    const iq = XMPPElement.createElement("iq");
    iq.setAttribute("type", "error");
    const err = XMPPElement.createElement("error");
    err.appendChild(XMPPElement.createElement("remote-server-not-found"));
    iq.appendChild(err);
    const result = MucSelfPing.parseSelfPingResponse(iq);
    expect(result).toBeInstanceOf(Error);
  });

  it("parseSelfPingResponse: throws on non-iq element", () => {
    const el = XMPPElement.createElement("message");
    expect(() => MucSelfPing.parseSelfPingResponse(el)).toThrow(
      "expected iq element"
    );
  });

  it("hasOptimizationFeature detects disco feature", () => {
    const query = XMPPElement.createElement("query");
    const f = XMPPElement.createElement("feature");
    f.setAttribute("var", MucSelfPing.NS);
    query.appendChild(f);
    expect(MucSelfPing.hasOptimizationFeature(query)).toBe(true);
    const q2 = XMPPElement.createElement("query");
    expect(MucSelfPing.hasOptimizationFeature(q2)).toBe(false);
  });
});
