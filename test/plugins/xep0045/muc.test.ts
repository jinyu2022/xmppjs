import { describe, it, expect } from "vitest";
import { MUC, MUCStatusCode, type JoinOptions } from "../../../lib/plugins/xep0045/muc";
import { XMPPElement } from "../../../lib/ltx/Element";
import { Parser } from "../../../lib/ltx/Parser";
import { JID } from "../../../lib/JID";

/**
 * XEP-0045: Multi-User Chat
 * @see https://xmpp.org/extensions/xep-0045.html
 * @version 1.34.0 (2024-07-15)
 *
 * 根据 XEP-0045 规范，多用户聊天（MUC）允许用户加入群聊房间并交换消息。
 * 包括以下核心操作:
 * - 加入/离开房间
 * - 设置昵称
 * - 发送邀请
 * - 设置主题
 * - 管理成员（踢出、封禁、设置角色/身份）
 * - 房间配置
 */
describe("MUC", () => {
  describe("NS", () => {
    it("should have correct namespace constants", () => {
      expect(MUC.NS.BASE).toBe("http://jabber.org/protocol/muc");
      expect(MUC.NS.USER).toBe("http://jabber.org/protocol/muc#user");
      expect(MUC.NS.ADMIN).toBe("http://jabber.org/protocol/muc#admin");
      expect(MUC.NS.OWNER).toBe("http://jabber.org/protocol/muc#owner");
    });
  });

  describe("MUCStatusCode", () => {
    it("should define all standard status codes", () => {
      expect(MUCStatusCode.SelfPresence).toBe("110");
      expect(MUCStatusCode.Created).toBe("201");
      expect(MUCStatusCode.Banned).toBe("301");
      expect(MUCStatusCode.NewNick).toBe("303");
      expect(MUCStatusCode.Kicked).toBe("307");
    });
  });

  describe("ROLE and AFFILIATION", () => {
    it("should define roles in order", () => {
      expect(MUC.ROLE).toEqual(["none", "visitor", "participant", "moderator"]);
    });

    it("should define affiliations in order", () => {
      expect(MUC.AFFILIATION).toEqual([
        "none",
        "outcast",
        "member",
        "admin",
        "owner",
      ]);
    });
  });

  describe("createJoinPres", () => {
    it("should create a presence with room JID and nick", () => {
      const pres = MUC.createJoinPres("room@conference.example.net", "Romeo");
      expect(pres.getAttribute("to")).toBe("room@conference.example.net/Romeo");
      expect(pres.tagName).toBe("presence");
      const xEl = pres.getElementsByTagNameNS(MUC.NS.BASE, "x")[0];
      expect(xEl).toBeDefined();
    });

    it("should include password when specified", () => {
      const pres = MUC.createJoinPres("room@conference.example.net", "Romeo", {
        password: "secret",
      });
      const xEl = pres.getElementsByTagNameNS(MUC.NS.BASE, "x")[0];
      const passwordEl = xEl!.getElementsByTagName("password")[0];
      expect(passwordEl).toBeDefined();
      expect(passwordEl!.textContent).toBe("secret");
    });

    it("should include history options", () => {
      const pres = MUC.createJoinPres(
        "room@conference.example.net",
        "Romeo",
        {
          maxchars: 1000,
          maxstanzas: 50,
          seconds: 300,
          since: new Date("2025-07-18T00:00:00Z"),
        } as JoinOptions
      );
      const xEl = pres.getElementsByTagNameNS(MUC.NS.BASE, "x")[0];
      const history = xEl!.getElementsByTagName("history")[0];
      expect(history).toBeDefined();
      expect(history!.getAttribute("maxchars")).toBe("1000");
      expect(history!.getAttribute("maxstanzas")).toBe("50");
      expect(history!.getAttribute("seconds")).toBe("300");
    });

    it("should accept JID object for room", () => {
      const jid = new JID("room@conference.example.net");
      const pres = MUC.createJoinPres(jid, "Romeo");
      expect(pres.getAttribute("to")).toBe("room@conference.example.net/Romeo");
    });
  });

  describe("createLeavePres", () => {
    it("should create an unavailable presence with reason", () => {
      const pres = MUC.createLeavePres(
        "room@conference.example.net/Romeo",
        "Leaving"
      );
      expect(pres.getAttribute("type")).toBe("unavailable");
      expect(pres.getAttribute("to")).toBe(
        "room@conference.example.net/Romeo"
      );
      const status = pres.getElementsByTagName("status")[0];
      expect(status).toBeDefined();
      expect(status!.textContent).toBe("Leaving");
    });

    it("should create an unavailable presence without reason", () => {
      const pres = MUC.createLeavePres("room@conference.example.net/Romeo");
      expect(pres.getAttribute("type")).toBe("unavailable");
      expect(pres.getElementsByTagName("status").length).toBe(0);
    });
  });

  describe("createSetNickPres", () => {
    it("should create a presence to change nickname", () => {
      const pres = MUC.createSetNickPres(
        "room@conference.example.net",
        "NewNick"
      );
      expect(pres.getAttribute("to")).toBe(
        "room@conference.example.net/NewNick"
      );
      expect(pres.getAttribute("id")).toBeTruthy();
    });
  });

  describe("mediatedinvite", () => {
    it("should create a mediated invitation message", () => {
      const msg = MUC.mediatedinvite(
        "room@conference.example.net",
        "juliet@example.net",
        "Join us!"
      );
      expect(msg.tagName).toBe("message");
      expect(msg.getAttribute("to")).toBe("room@conference.example.net");
      const xEl = msg.getElementsByTagNameNS(MUC.NS.USER, "x")[0];
      expect(xEl).toBeDefined();
      const invite = xEl!.getElementsByTagName("invite")[0];
      expect(invite.getAttribute("to")).toBe("juliet@example.net");
      const reason = invite.getElementsByTagName("reason")[0];
      expect(reason.textContent).toBe("Join us!");
    });
  });

  describe("createRequestVoiceMsg", () => {
    it("should create a voice request message with data form", () => {
      const msg = MUC.createRequestVoiceMsg("room@conference.example.net");
      expect(msg.tagName).toBe("message");
      expect(msg.getAttribute("to")).toBe("room@conference.example.net");
      const xEl = msg.getElementsByTagNameNS("jabber:x:data", "x")[0];
      expect(xEl).toBeDefined();
    });
  });

  describe("createSetSubjectMsg", () => {
    it("should create a message with subject", () => {
      const msg = MUC.createSetSubjectMsg(
        "room@conference.example.net",
        "New Topic"
      );
      expect(msg.tagName).toBe("message");
      expect(msg.getAttribute("to")).toBe("room@conference.example.net");
      const subject = msg.getElementsByTagName("subject")[0];
      expect(subject).toBeDefined();
      expect(subject!.textContent).toBe("New Topic");
    });
  });

  describe("createSetAffiliationIq", () => {
    it("should create IQ to set member affiliation", () => {
      const iq = MUC.createSetAffiliationIq(
        "room@conference.example.net",
        "juliet@example.net",
        "member"
      );
      expect(iq.getAttribute("type")).toBe("set");
      expect(iq.getAttribute("to")).toBe("room@conference.example.net");
      const query = iq.getElementsByTagNameNS(MUC.NS.ADMIN, "query")[0];
      expect(query).toBeDefined();
      const item = query!.getElementsByTagName("item")[0];
      expect(item.getAttribute("jid")).toBe("juliet@example.net");
      expect(item.getAttribute("affiliation")).toBe("member");
    });

    it("should create IQ to ban a user", () => {
      const iq = MUC.createSetAffiliationIq(
        "room@conference.example.net",
        "spammer@example.net",
        "outcast",
        "Spamming"
      );
      const query = iq.getElementsByTagNameNS(MUC.NS.ADMIN, "query")[0];
      const item = query!.getElementsByTagName("item")[0];
      expect(item.getAttribute("affiliation")).toBe("outcast");
      const reason = item.getElementsByTagName("reason")[0];
      expect(reason.textContent).toBe("Spamming");
    });
  });

  describe("createSetRoleIq", () => {
    it("should create IQ to set moderator role", () => {
      const iq = MUC.createSetRoleIq(
        "room@conference.example.net",
        "romeo",
        "moderator"
      );
      const query = iq.getElementsByTagNameNS(MUC.NS.ADMIN, "query")[0];
      const item = query!.getElementsByTagName("item")[0];
      expect(item.getAttribute("nick")).toBe("romeo");
      expect(item.getAttribute("role")).toBe("moderator");
    });

    it("should create IQ to set visitor role with reason", () => {
      const iq = MUC.createSetRoleIq(
        "room@conference.example.net",
        "juliet",
        "visitor",
        "Please listen only"
      );
      const query = iq.getElementsByTagNameNS(MUC.NS.ADMIN, "query")[0];
      const item = query!.getElementsByTagName("item")[0];
      expect(item.getAttribute("role")).toBe("visitor");
      const reason = item.getElementsByTagName("reason")[0];
      expect(reason.textContent).toBe("Please listen only");
    });
  });

  describe("createGetRoomConfigIq / createSetRoomConfigIq", () => {
    it("should create IQ to get room configuration", () => {
      const iq = MUC.createGetRoomConfigIq("room@conference.example.net");
      expect(iq.getAttribute("type")).toBe("get");
      expect(iq.getAttribute("to")).toBe("room@conference.example.net");
      const query = iq.getElementsByTagNameNS(MUC.NS.OWNER, "query")[0];
      expect(query).toBeDefined();
    });
  });

  describe("parsePresUser", () => {
    it("should parse presence with item element", () => {
      const xml = Parser.parse(`
        <x xmlns="http://jabber.org/protocol/muc#user">
          <item affiliation="owner" role="moderator" jid="romeo@example.net"/>
          <status code="110"/>
        </x>
      `);
      const { muc } = MUC.parsePresUser(xml);
      expect(muc.item).toEqual({
        affiliation: "owner",
        role: "moderator",
        jid: "romeo@example.net",
      });
      expect(muc.statuses).toContain("110");
    });

    it("should parse a status-only room configuration notification", () => {
      const xml = Parser.parse(`
        <x xmlns="http://jabber.org/protocol/muc#user">
          <status code="104"/>
        </x>
      `);
      const { muc } = MUC.parsePresUser(xml);
      expect(muc.item).toBeUndefined();
      expect(muc.statuses).toEqual(["104"]);
    });

    it("should parse decline element", () => {
      const xml = Parser.parse(`
        <x xmlns="http://jabber.org/protocol/muc#user">
          <decline to="romeo@example.net" from="juliet@example.net">
            <reason>Busy</reason>
          </decline>
        </x>
      `);
      const { muc } = MUC.parsePresUser(xml);
      if (!("decline" in muc)) {
        throw new Error("Expected a MUC decline payload");
      }
      expect(muc.decline).toEqual({
        to: "romeo@example.net",
        from: "juliet@example.net",
        reason: "Busy",
      });
    });

    it("should parse mediated invitations", () => {
      const xml = Parser.parse(`
        <x xmlns="http://jabber.org/protocol/muc#user">
          <invite from="romeo@example.net">
            <reason>Join us</reason>
            <continue thread="thread-1"/>
          </invite>
          <password>secret</password>
        </x>
      `);
      const { muc } = MUC.parsePresUser(xml);
      if (!("invites" in muc)) {
        throw new Error("Expected a MUC invitation payload");
      }
      expect(muc.invites).toEqual([
        {
          to: undefined,
          from: "romeo@example.net",
          reason: "Join us",
          thread: undefined,
          continue: { thread: "thread-1" },
        },
      ]);
      expect(muc.password).toBe("secret");
    });

    it("should return empty object for non-x tag", () => {
      const el = XMPPElement.createElement("message");
      const result = MUC.parsePresUser(el);
      expect(result.muc).toEqual({});
    });
  });
});
