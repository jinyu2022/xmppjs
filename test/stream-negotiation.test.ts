import { describe, expect, it } from "vitest";
import { Parser, XMPPElement } from "../lib/ltx";
import {
  BIND_NS,
  SASL_NS,
  STREAM_NS,
  SaslClient,
  buildBindRequest,
  collectStreamFeatures,
  getSaslFailureCondition,
  getStreamErrorCondition,
  isStreamError,
  isStreamFeatures,
  parseBindResult,
  parseSaslAttributes,
  selectSaslMechanism,
  utf8ToBase64,
} from "../lib/transport/stream-negotiation";
import { JID } from "../lib/JID";

function parse(xml: string): XMPPElement {
  return Parser.parse(xml);
}

function saslFeatures(...mechanisms: string[]): XMPPElement {
  return parse(
    `<stream:features xmlns:stream="${STREAM_NS}">
      <mechanisms xmlns="${SASL_NS}">
        ${mechanisms.map((mechanism) => `<mechanism>${mechanism}</mechanism>`).join("")}
      </mechanisms>
    </stream:features>`,
  );
}

describe("stream negotiation helpers", () => {
  it("prefers SCRAM-SHA-1", () => {
    expect(selectSaslMechanism(saslFeatures("PLAIN", "SCRAM-SHA-1"))).toBe(
      "SCRAM-SHA-1",
    );
  });

  it("rejects unsupported SASL mechanisms", () => {
    expect(() => selectSaslMechanism(saslFeatures("EXTERNAL"))).toThrow(
      "不受支持的认证机制",
    );
  });

  it("encodes non-ASCII text as UTF-8 Base64", () => {
    const text = "päss";
    const binary = atob(utf8ToBase64(text));
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
    expect(new TextDecoder().decode(bytes)).toBe(text);
  });

  it("parses SASL attributes", () => {
    expect(parseSaslAttributes("e=extra,v=abc123,x=1")).toEqual({
      e: "extra",
      v: "abc123",
      x: "1",
    });
  });

  it("detects stream features and errors", () => {
    const features = parse(
      `<stream:features xmlns:stream="${STREAM_NS}"><bind xmlns="${BIND_NS}"/></stream:features>`,
    );
    const error = parse(
      `<stream:error xmlns:stream="${STREAM_NS}">
        <policy-violation xmlns="urn:ietf:params:xml:ns:xmpp-streams"/>
      </stream:error>`,
    );

    expect(isStreamFeatures(features)).toBe(true);
    expect(isStreamError(error)).toBe(true);
    expect(getStreamErrorCondition(error)).toBe("policy-violation");
  });

  it("collects advertised feature namespaces", () => {
    const features = parse(
      `<stream:features xmlns:stream="${STREAM_NS}">
        <bind xmlns="${BIND_NS}"/>
        <sm xmlns="urn:xmpp:sm:3"/>
      </stream:features>`,
    );

    expect(collectStreamFeatures(features).namespaces).toEqual(
      new Set([BIND_NS, "urn:xmpp:sm:3"]),
    );
  });

  it("reads a SASL failure condition", () => {
    const failure = parse(
      `<failure xmlns="${SASL_NS}"><not-authorized/><text>nope</text></failure>`,
    );
    expect(getSaslFailureCondition(failure)).toBe("not-authorized");
  });
});

describe("SaslClient", () => {
  it("builds a UTF-8 PLAIN authentication request", () => {
    const client = new SaslClient(new JID("用户@example.com/client"), "密码");
    const auth = parse(client.start(saslFeatures("PLAIN")));
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(auth.textContent), (character) =>
        character.charCodeAt(0),
      ),
    );

    expect(client.mechanism).toBe("PLAIN");
    expect(auth.namespaceURI).toBe(SASL_NS);
    expect(auth.getAttribute("mechanism")).toBe("PLAIN");
    expect(decoded).toBe("\0用户\0密码");
  });

  it("accepts PLAIN success", async () => {
    const client = new SaslClient(new JID("user@example.com/client"), "pass");
    client.start(saslFeatures("PLAIN"));

    await expect(
      client.process(parse(`<success xmlns="${SASL_NS}"/>`)),
    ).resolves.toEqual({ type: "success" });
  });

  it("surfaces a PLAIN failure condition", async () => {
    const client = new SaslClient(new JID("user@example.com/client"), "pass");
    client.start(saslFeatures("PLAIN"));

    await expect(
      client.process(
        parse(
          `<failure xmlns="${SASL_NS}"><not-authorized/></failure>`,
        ),
      ),
    ).rejects.toThrow("认证失败: not-authorized");
  });
});

describe("resource binding helpers", () => {
  it("builds an escaped bind request with a unique id", () => {
    const request = buildBindRequest("bad</resource><x/>");
    const iq = parse(request.data);

    expect(iq.getAttribute("id")).toBe(request.id);
    expect(request.id.startsWith("bind-")).toBe(true);
    expect(iq.getAttribute("type")).toBe("set");
    expect(request.data).toContain("&lt;");
    expect(request.data).not.toMatch(/<\/resource><x\/>/);
    expect(iq.getElementsByTagName("bind")[0]?.namespaceURI).toBe(BIND_NS);
  });

  it("accepts a server-rewritten resource", () => {
    const response = parse(
      `<iq type="result" id="bind-x">
        <bind xmlns="${BIND_NS}">
          <jid>user@example.com/server-rewritten</jid>
        </bind>
      </iq>`,
    );

    expect(parseBindResult(response, "user@example.com").toString()).toBe(
      "user@example.com/server-rewritten",
    );
  });

  it("surfaces a bind IQ error", () => {
    const response = parse(
      `<iq type="error" id="bind-x">
        <error type="cancel">
          <conflict xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>
        </error>
      </iq>`,
    );

    expect(() => parseBindResult(response, "user@example.com")).toThrow(
      "资源绑定失败: conflict",
    );
  });

  it("rejects a mismatched bare JID", () => {
    const response = parse(
      `<iq type="result" id="bind-x">
        <bind xmlns="${BIND_NS}"><jid>other@example.com/r</jid></bind>
      </iq>`,
    );

    expect(() => parseBindResult(response, "user@example.com")).toThrow(
      "不一致",
    );
  });
});
