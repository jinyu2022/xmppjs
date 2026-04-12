import { describe, it, expect } from "vitest";
import MucSelfPing from "@/plugins/xep0410/MucSelfPing";
import { XMPPElement } from "@/ltx/Element";

describe("MucSelfPing", () => {
  it("createSelfPingIq builds a GET ping iq", () => {
    const to = "room@conference.example.net/nick";
    const iq = MucSelfPing.createSelfPingIq(to);
    expect(iq.getAttribute("type")).toBe("get");
    expect(iq.getAttribute("to")).toBe(to);
    const ping = iq.getElementsByTagName("ping")[0];
    expect(ping).toBeTruthy();
    expect(ping.namespaceURI).toBe(MucSelfPing.NS.PING);
  });

  it("parseSelfPingResponse: result => joined", () => {
    const iq = XMPPElement.createElement("iq");
    iq.setAttribute("type", "result");
    expect(MucSelfPing.parseSelfPingResponse(iq)).toBe("joined");
  });

  it("parseSelfPingResponse: not-acceptable error => not-joined", () => {
    const iq = XMPPElement.createElement("iq");
    iq.setAttribute("type", "error");
    const err = XMPPElement.createElement("error");
    const child = XMPPElement.createElement("not-acceptable");
    err.appendChild(child);
    iq.appendChild(err);
    expect(MucSelfPing.parseSelfPingResponse(iq)).toBe("not-joined");
  });

  it("parseSelfPingResponse: item-not-found => nickname-changed", () => {
    const iq = XMPPElement.createElement("iq");
    iq.setAttribute("type", "error");
    const err = XMPPElement.createElement("error");
    err.appendChild(XMPPElement.createElement("item-not-found"));
    iq.appendChild(err);
    expect(MucSelfPing.parseSelfPingResponse(iq)).toBe("nickname-changed");
  });

  it("parseSelfPingResponse: remote-server-not-found => undecided", () => {
    const iq = XMPPElement.createElement("iq");
    iq.setAttribute("type", "error");
    const err = XMPPElement.createElement("error");
    err.appendChild(XMPPElement.createElement("remote-server-not-found"));
    iq.appendChild(err);
    expect(MucSelfPing.parseSelfPingResponse(iq)).toBe("undecided");
  });

  it("hasOptimizationFeature detects disco feature", () => {
    const query = XMPPElement.createElement("query");
    const f = XMPPElement.createElement("feature");
    f.setAttribute("var", MucSelfPing.NS.DISCO_FEATURE);
    query.appendChild(f);
    expect(MucSelfPing.hasOptimizationFeature(query)).toBe(true);
    const q2 = XMPPElement.createElement("query");
    expect(MucSelfPing.hasOptimizationFeature(q2)).toBe(false);
  });
});
