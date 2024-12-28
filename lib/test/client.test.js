import { Client } from "@/client";
import { it,describe } from "vitest";
import logger from "@/log";

logger.setLevel("debug");
logger.rebuild();
describe("Client", () => {
    const XMPPClient = new Client("weak@xmpp.jp", "crwin1966", {protocol: "xmpp"})
    XMPPClient.registerPlugin("RFC6121")
    XMPPClient.registerPlugin("XEP0030")
    XMPPClient.registerPlugin('XEP0045')
    XMPPClient.connect()
    XMPPClient.on("message", (data) => {
        logger.debug("接受", data.toString())
    })
    it("测试连接", async() => {
        XMPPClient.on("session:start", async () => {
            await XMPPClient.XEP0045?.join("yecazuna@chat.yax.im", "11111a")
            // const roster = await XMPPClient.getRoster()
            // console.log('ROSTER', roster)
            XMPPClient.sendMsg("yecazuna@chat.yax.im", "hello word，爱来自测试", "groupchat")
        })
        await new Promise((resolve, reject) => {
            // 延迟4s
            setTimeout(() => {
                resolve(null)
            }, 20000)
        })
    })
},30000)