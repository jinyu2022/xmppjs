// @ts-nocheck

import { Pubsub } from "@/plugins/xep0060/pubsub";
import { Bookmarks } from "@/plugins/xep0402/bookmarks";
import { domParser } from "@/shims";
import { describe, it, expect } from "vitest";
import Connection from "@/connection";
import logger from "@/log";
describe("Bookmarks", () => {
    it("解析pubsub event 通知", () => {
        const pubsub = domParser.parseFromString(`
                <event xmlns='http://jabber.org/protocol/pubsub#event'>
                    <items node='urn:xmpp:bookmarks:1'>
                    <item id='theplay@conference.shakespeare.lit'>
                        <conference xmlns='urn:xmpp:bookmarks:1'
                                    name='The Play&apos;s the Thing'
                                    autojoin='1'>
                        <nick>JC</nick>
                        </conference>
                    </item>
                    </items>
                </event>`, "text/xml").documentElement;
        const eventEl = Pubsub.parseEventEl(pubsub);
        expect(eventEl.event.node).toBe("urn:xmpp:bookmarks:1");
        expect(eventEl.event.item.id).toBe("theplay@conference.shakespeare.lit");
        const { conference } = Bookmarks.pareseConferenceEl(eventEl?.event?.item?.conference);
        expect(conference).toEqual({
            name: "The Play's the Thing",
            autojoin: false,
            nick: "JC",
        });
    })

    it("解析删除书签通知", () => {
        const pubsub = domParser.parseFromString(`
            <event xmlns='http://jabber.org/protocol/pubsub#event'>
                <items node='urn:xmpp:bookmarks:1'>
                    <retract id='theplay@conference.shakespeare.lit'/>
                </items>
            </event>`, "text/xml").documentElement;
        const { event } = Pubsub.parseEventEl(pubsub);
        expect(event.node).toBe("urn:xmpp:bookmarks:1");
        console.log(event);
    })

    it("触发更新事件", async () => {
        const connection = new Connection("test@test.com", "123456");
        connection.registerPlugin("XEP0402")
        connection.initPlugins()
        await new Promise((resolve) => {
            connection.once("bookmark:updata", (data) => {
                expect(data.event?.item.conference).toEqual({
                    name: "The Play's the Thing",
                    autojoin: false,
                    nick: "JC",
                });
                resolve(null);
            })
            connection.onMessage(`<message from='juliet@capulet.lit' to='juliet@capulet.lit/balcony' type='headline' id='unjoined-room1'>
            <event xmlns='http://jabber.org/protocol/pubsub#event'>
              <items node='urn:xmpp:bookmarks:1'>
                <item id='theplay@conference.shakespeare.lit'>
                  <conference xmlns='urn:xmpp:bookmarks:1'
                              name='The Play&apos;s the Thing'>
                    <nick>JC</nick>
                  </conference>
                </item>
              </items>
            </event>
          </message>`)
        })
       
    })

    it("触发删除事件", async () => {
        const connection = new Connection("test@test.com", "123456")
        connection.registerPlugin("XEP0402")
        connection.initPlugins()
        await new Promise((resolve) => {
            connection.once("bookmark:delete", (data) => {
                console.log(data);
                expect(data.event?.retracts).toEqual(["theplay@conference.shakespeare.lit"])
                resolve(null);
            })
            connection.onMessage(`<message from='juliet@capulet.lit' to='juliet@capulet.lit/balcony' type='headline' id='removed-room1'>
                <event xmlns='http://jabber.org/protocol/pubsub#event'>
                    <items node='urn:xmpp:bookmarks:1'>
                    <retract id='theplay@conference.shakespeare.lit'/>
                    </items>
                </event>
                </message>`)
        })
    })
})