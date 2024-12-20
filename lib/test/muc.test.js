import { describe, it, expect } from "vitest";
import { JID } from "../JID";
import { MUC } from "./../plugins/xep0045/muc";
import { xmlSerializer } from "../shims";

describe("MUC", () => {

    it("创建正确的加入房间节", () => {
        const room = "test@muc.test.com";
        const nick = "test";
        const message = MUC.createJoinPres(room, nick, {
            'maxchars': 1000,
            'maxstanzas': 10,
            'seconds': 60,
            'password': "password",
        });
        console.log(xmlSerializer.serializeToString(message));
        expect(xmlSerializer.serializeToString(message)).toBe(`<presence to="test@muc.test.com/test" xmlns="jabber:client"><x xmlns="http://jabber.org/protocol/muc"><history maxchars="1000" maxstanzas="10" seconds="60"/><password>password</password></x></presence>`);

    });
    it("创建正确的离开房间节", () => {
        const to = "test@muc.test.com/test";
        const message = MUC.createLeavePres(to, '无聊');
        expect(xmlSerializer.serializeToString(message)).toBe(`<presence to="test@muc.test.com/test" type="unavailable" xmlns="jabber:client"><status>无聊</status></presence>`);
    })
    it("创建正确的设置昵称节", () => {
        const room = "test@muc.test.com";
        const nick = "test";
        const pres = MUC.createSetNickPres(room, nick);
        expect(pres.getAttribute("to")).toBe("test@muc.test.com/test");
    });
    it("创建正确的请求发言节", () => {
        const room = "room@conference.example.com";
        const message = MUC.createRequestVoiceMsg(room);

        const msg = xmlSerializer.serializeToString(message);
        expect(msg).toBe(
            '<message to="room@conference.example.com" xmlns="jabber:client"><x type="submit" xmlns="jabber:x:data"><field var="FORM_TYPE"><value>http://jabber.org/protocol/muc#request</value></field><field type="list-single" var="muc#role" label="Requested role"><value>participant</value></field></x></message>'
        );

    });
});
