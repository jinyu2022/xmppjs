import { PEP } from "../xep0163/pep";
import { implementation } from "@/shims";
import { JID } from "@/JID";

export interface AvatarMetadata {
    id: string;
    type: string;
    bytes: number;
    width?: number;
    height?: number;
    url?: string;
}
export class Avatar {
    static readonly NS = {
        metadata: "urn:xmpp:avatar:metadata" as const,
        data: "urn:xmpp:avatar:data" as const,
    };

    /** 浏览器环境 */
    private static async browserImageParser(image: File) {
        const base64Data = await new Promise<string>((resolve) => {
            //@ts-expect-error
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(",")[1]);
            reader.readAsDataURL(image);
        });

        const sha1 = await crypto.subtle
            .digest("SHA-1", new TextEncoder().encode(base64Data))
            .then((hash) =>
                Array.from(new Uint8Array(hash))
                    .map((b) => b.toString(16).padStart(2, "0"))
                    .join("")
            );

        const metadata = await new Promise<AvatarMetadata>((resolve) => {
            //@ts-expect-error
            const img = new Image();
            img.onload = () => {
                resolve({
                    id: sha1,
                    type: image.type,
                    bytes: image.size,
                    width: img.width,
                    height: img.height,
                });
            };
            img.src = URL.createObjectURL(image);
        });

        return {
            base64Data,
            metadata,
        };
    }

    private static async nodeImageParser(imagePath: string) {
        // 图片类型映射
        const IMAGE_TYPES = {
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            png: "image/png",
            gif: "image/gif",
            webp: "image/webp",
            svg: "image/svg+xml",
        } as const;
        try {
            const { readFile, stat } = require("fs/promises");
            // 获取文件信息和内容
            const [fileStats, fileBuffer] = await Promise.all([
                stat(imagePath),
                readFile(imagePath),
            ]);

            const sizeOf = require("image-size");
            const dimensions = sizeOf(imagePath);
            // @ts-expect-error
            const mimeType = IMAGE_TYPES[dimensions.type];
            if (!mimeType) {
                throw new Error(`不支持的图片类型: ${dimensions.type}`);
            }

            const base64Data = fileBuffer.toString("base64");
            const sha1 = await crypto.subtle
                .digest("SHA-1", new TextEncoder().encode(base64Data))
                .then((hash) =>
                    Array.from(new Uint8Array(hash))
                        .map((b) => b.toString(16).padStart(2, "0"))
                        .join("")
                );

            return {
                base64Data,
                metadata: {
                    id: sha1,
                    type: mimeType,
                    bytes: fileStats.size,
                    width: dimensions.width,
                    height: dimensions.height,
                },
            };
        } catch (error: any) {
            throw new Error(`解析图片失败: ${error.message}`);
        }
    }

    //TODO: 允许使用http上传头像，并在info中包含url

    /** 构建上传头像与元数据iq，只接受png格式，格式转换不是本模块的职责
     * @param img 图片文件或路径
     * @returns [dataIq, metadataIq]
     */
    static async createDataPublishIq(img: File | string) {
        let base64Data = "";
        let metadata: AvatarMetadata;
        if (
            typeof img === "string" &&
            typeof require !== "undefined" &&
            typeof require("fs") !== "undefined"
        ) {
            const meta = await Avatar.nodeImageParser(
                img
            );
            base64Data = meta.base64Data;
            metadata = meta.metadata;
            //@ts-expect-error
        } else if (img instanceof File && typeof window !== "undefined") {
            const { base64Data: data, metadata: meta } =
                await Avatar.browserImageParser(img);
            base64Data = data;
            metadata = meta;
        } else {
            throw new Error("不支持的图片类型");
        }
        /** @see https://xmpp.org/extensions/xep-0084.html#proto-info */
        if (metadata.type !== "image/png") throw new Error("只支持png格式的图片");

        const publishDoc = implementation.createDocument(null, "publish", null);

        const publishDate = publishDoc.documentElement!;
        publishDate.setAttribute("node", Avatar.NS.data);
        const item = publishDoc.createElement("item");
        item.setAttribute("id", metadata.id);
        const data = publishDoc.createElementNS(Avatar.NS.data, "data");
        data.textContent = base64Data;
        item.appendChild(data);
        publishDate.appendChild(item);

        const publishMetadata = publishDoc.createElement("publish");
        publishMetadata.setAttribute("node", Avatar.NS.metadata);
        const itemMetadata = publishDoc.createElement("item");
        itemMetadata.setAttribute("id", metadata.id);
        const metadataEl = publishDoc.createElementNS(
            Avatar.NS.metadata,
            "metadata"
        );
        const infoEl = publishDoc.createElement("info");
        infoEl.setAttribute("id", metadata.id);
        infoEl.setAttribute("type", metadata.type);
        infoEl.setAttribute("bytes", metadata.bytes.toString());
        infoEl.setAttribute("width", metadata.width!.toString());
        infoEl.setAttribute("height", metadata.height!.toString());
        metadataEl.appendChild(infoEl);
        itemMetadata.appendChild(metadataEl);
        publishMetadata.appendChild(itemMetadata);

        return [
            PEP.createPublishIq(publishDate),
            PEP.createPublishIq(publishMetadata),
        ];
    }
    /**
     * 构造获取头像数据iq
     * @param to 对方jid
     * @param id sha-1值
     */
    static creatRetrieveDataIq(to: string | JID, id: string) {
        return PEP.createRetrieveItemsIq(to, Avatar.NS.data, 1, id);
    }

    static parseMetadataEl(metadata: Element) {
        if (metadata.namespaceURI !== Avatar.NS.metadata)
            throw new Error("不是一个metadata元素");
        const infoEl = metadata.getElementsByTagName("info")[0];
        return {
            metadata: {
                id: infoEl.getAttribute("id")!,
                type: infoEl.getAttribute("type")!,
                bytes: parseInt(infoEl.getAttribute("bytes")!),
                width: infoEl.getAttribute("width")
                    ? parseInt(infoEl.getAttribute("width")!)
                    : undefined,
                height: infoEl.getAttribute("height")
                    ? parseInt(infoEl.getAttribute("height")!)
                    : undefined,
            },
        };
    }
}
