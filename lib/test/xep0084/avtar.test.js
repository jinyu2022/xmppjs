import { Avatar } from "@/plugins/xep0084/avatar";
import { Pubsub } from "@/plugins/xep0060/pubsub";
import { describe, it,expect } from "vitest";

describe("Avatar", () => {
    it("返回图片元数据", async() => {
        const path = await import("path")
        const imgPath = path.join(__dirname, "xmpp.png")
        // @ts-expect-error
        const avatarInfo = await Avatar.nodeImageParser(imgPath)
        // console.log(avatarInfo.metadata)
        expect(avatarInfo.metadata).toEqual({
            id: 'e3f3233a60dc8b9ec62ea848152c3fe2a86fdcad',
            type: 'image/png',
            bytes: 11417,
            width: 200,
            height: 200
        })
        // console.log(avatarInfo.base64Data)
    })

    it("返回两个节", async() => {
        const path = await import("path")
        const imgPath = path.join(__dirname, "xmpp.png")
        const [dataIq, metadataIq] = await Avatar.createDataPublishIq(imgPath)
        expect(dataIq.getElementsByTagNameNS(Pubsub.NS.BASE, "pubsub")).toBeTruthy()
        const item = dataIq.getElementsByTagName("item")[0]
        expect(item.getAttribute("id")).toBe("e3f3233a60dc8b9ec62ea848152c3fe2a86fdcad")
        const metadata = metadataIq.getElementsByTagNameNS(Avatar.NS.metadata, "metadata")[0]
        const info = metadata.getElementsByTagName("info")[0]
        expect(info.getAttribute("id")).toBe("e3f3233a60dc8b9ec62ea848152c3fe2a86fdcad")
        expect(info.getAttribute("type")).toBe("image/png")
        expect(info.getAttribute("bytes")).toBe("11417")
        expect(info.getAttribute("width")).toBe("200")
        expect(info.getAttribute("height")).toBe("200")

    })
});