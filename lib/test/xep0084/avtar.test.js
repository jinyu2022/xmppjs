import { Avatar } from "@/plugins/xep0084/avatar";
import { describe, it,expect } from "vitest";

describe("Avatar", () => {
    it("返回图片元数据", async() => {
        const path = await import("path")
        const imgPath = path.join(__dirname, "xmpp.png")
        const avatarInfo = await Avatar.nodeImageParser(imgPath)
        console.log(avatarInfo.metadata)
        expect(avatarInfo.metadata).toEqual({
            sha1: 'e3f3233a60dc8b9ec62ea848152c3fe2a86fdcad',
            type: 'image/png',
            bytes: 11417,
            width: 200,
            height: 200
        })
        // console.log(avatarInfo.base64Data)
    })
});