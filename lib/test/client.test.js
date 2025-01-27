import { Client } from "@/client";
import { it, describe } from "vitest";
import logger from "@/log";
const log = logger.getLogger("test:client");
logger.setLevel("info");
logger.rebuild();
describe("Client", () => {
    const XMPPClient = new Client("leke@suchat.org", "leke2020", { protocol: 'xmpp' })
    XMPPClient.registerDefaultPlugins()
    XMPPClient.connect()
    it("测试连接", async () => {
        XMPPClient.on("session:start", async () => {
            const roster = await XMPPClient.getRoster()
            console.log("roster", roster)
            // 再获取头像
            for (const item of roster) {
                console.log("item", item.jid)
                if (item.jid !== "weak@conversations.im") continue
                try{
                    const vcard = await XMPPClient.XEP0084?.getAvatarData(item.jid)
                    item.avatar = vcard?.data
                }catch(e){
                    log.error(e.xmlString)
                }
                console.log("头像", item)
            }

            // 获取书签
            const bookmarks = await XMPPClient.XEP0402?.retrieveBookmarks()
            console.log(bookmarks)
        })
        await new Promise((resolve, reject) => {
            // 延迟4s
            setTimeout(() => {
                resolve(null)
            }, 10000)
        })
    })
}, 30000)