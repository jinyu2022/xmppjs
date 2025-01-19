import { Client } from "@/client";
import { it, describe } from "vitest";
import logger from "@/log";
const log = logger.getLogger("test:client");
logger.setLevel("debug");
logger.rebuild();
describe("Client", () => {
    const XMPPClient = new Client("weak@xmpp.jp", "crwin1966", { protocol: 'xmpp' })
    XMPPClient.registerDefaultPlugins()
    XMPPClient.connect()
    it("测试连接", async () => {
        XMPPClient.on("session:start", async () => {
            const roster = await XMPPClient.getRoster()
            // 再获取头像
            for (const item of roster) {
                try{
                    const vcard = await XMPPClient.XEP0084?.getAvatarData(item.jid)
                    item.avatar = vcard?.data
                }catch(e){
                    log.error(e.xmlString)
                }
                
            }

            // 获取书签
            const bookmarks = await XMPPClient.XEP0402?.retrieveBookmarks()
            console.log(bookmarks)
        })
        await new Promise((resolve, reject) => {
            // 延迟4s
            setTimeout(() => {
                resolve(null)
            }, 20000)
        })
    })
}, 30000)