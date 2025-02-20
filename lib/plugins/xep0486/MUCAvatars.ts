import { JID } from "@/JID";
import { VCardTemp } from "../xep0054/vcardTemp";
import { Iq } from "@/stanza";
import { Avatar } from "../xep0084/avatar";

export class MUCAvatars {

    /**
     * 构造设置群头像的iq
     * @param to muc jid
     * @param image node下绝对路径，浏览器File对象，空表示删除头像
     * @returns iq Element
     */
    static async createSetAvatarIq(to: string | JID,image?: File | string) {
        // 创建基础IQ结构
        const iqdoc = Iq.createIq("set", to);
        const vCard = iqdoc.createElementNS(VCardTemp.NS, "vCard");
        iqdoc.documentElement!.appendChild(vCard);

        // 如果没有图片，返回空vCard(删除头像)
        // @see https://xmpp.org/extensions/xep-0486.html#example-8
        if (!image){
            return iqdoc.documentElement!;
        }

        const { base64Data, metadata } = await Avatar.imageParser(image);
        
        const type = iqdoc.createElement("TYPE");
        type.textContent = metadata.type;
        const binval = iqdoc.createElement("BINVAL");
        binval.textContent = base64Data;
        
        const photo = iqdoc.createElement("PHOTO");
        photo.appendChild(type);
        photo.appendChild(binval);
        vCard.appendChild(photo);
        return iqdoc.documentElement!;
    }

    /**
     * 构造获取群头像的iq
     * @param to muc jid
     */
    static createGetAvatarIq(to: string | JID) {
        const iq = Iq.createIq("get", to);
        const vCard = iq.createElementNS(VCardTemp.NS, "vCard");
        iq.documentElement!.appendChild(vCard);
        return iq.documentElement!;
    }
}