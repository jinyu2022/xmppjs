import Connection from "@/connection";
import { domParser } from "@/shims";
import { expect, it, describe } from "vitest";
import logger from "@/log";

const log = logger.getLogger("xep0115.connection.test");
describe("测试实体能力", async () => {
    logger.setLevel("debug");
    logger.rebuild();
    const connection = new Connection("leke@suchat.org", "leke2020", {protocol: "xmpp"});
    connection.registerPlugin("RFC6121")
    connection.registerPlugin("XEP0115")
    connection.connect()
    it("测试构建presence", () => {
        connection.send(domParser.parseFromString(`<presence xmlns="jabber:client"><show>dnd</show></presence>`, "text/xml").documentElement);
        connection.XEP0030?.addIdentity("client", "web", "leke", "zh");
    });

    // 等待5s
    await new Promise((resolve) => setTimeout(resolve, 5000));
});