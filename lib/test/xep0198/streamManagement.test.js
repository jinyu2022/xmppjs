import { XEP0198 } from "@/plugins";
import { Connection } from "@/connection";
import { expect, it } from "vitest";
import logger from "loglevel";
const log = logger.getLogger("XEP0198测试");


it("测试XEP0198", async () => {
    logger.setLevel("debug");
    // 必须要重新构建一下，不然等级不会生效
    logger.rebuild();
    const conn = new Connection("leke@suchat.org", "leke2020", { protocol: "xmpp" });
    conn.registerPlugin("RFC6121");
    conn.registerPlugin("XEP0198");
    conn.connect();
    // 模拟断开连接
    setTimeout(() => {
        log.info("连接断开");
        conn.socket.close();
        // conn.socket.emit("session:end")
        // conn.emit("session:end");
    }, 4000);

    // 等待4秒
    await new Promise((resolve) => {
        setTimeout(() => {
            console.log("测试结束");
            resolve(true);
        }, 11000);
    });
}, 15000);