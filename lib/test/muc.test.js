import { describe, it, expect } from "vitest";
import { JID } from "../JID";
import { MUC } from "./../plugins/xep0045/muc";
import { xmlSerializer } from "../shims";

describe("MUC", () => {

    it("创建正确的请求发言节", () => {
        const room = "room@conference.example.com";
        const message = MUC.createRequestVoiceMsg(room);

        const msg = xmlSerializer.serializeToString(message);
        expect(msg).toBe(
            '<message to="room@conference.example.com" xmlns="jabber:client"><x type="submit" xmlns="jabber:x:data"><field var="FORM_TYPE"><value>http://jabber.org/protocol/muc#request</value></field><field type="list-single" var="muc#role" label="Requested role"><value>participant</value></field></x></message>'
        );

    });
});
