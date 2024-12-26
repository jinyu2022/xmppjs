
import { PEP } from "../xep0163/pep";
import { implementation } from "@/shims";

interface AvatarMetadata {
    sha1: string;
    type: string;
    bytes: number;
    width: number;
    height: number;
}
export class Avatar {
    static readonly NS = {
        metadata: "urn:xmpp:avatar:metadata" as const,
        data: "urn:xmpp:avatar:data" as const,
    };

    /** 浏览器环境 */
    static async browserImageParser(image: File) {
        const base64Data = await new Promise<string>((resolve) => {
            //@ts-expect-error
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(image);
        });

        const sha1 = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(base64Data))
            .then(hash => Array.from(new Uint8Array(hash))
                .map(b => b.toString(16).padStart(2, '0'))
                .join(''));

        const metadata = await new Promise<AvatarMetadata>((resolve) => {
            //@ts-expect-error
            const img = new Image();
            img.onload = () => {
                resolve({
                    sha1,
                    type: image.type,
                    bytes: image.size,
                    width: img.width,
                    height: img.height
                });
            };
            img.src = URL.createObjectURL(image);
        });

        return {
            base64Data,
            metadata
        };

    }

    static async nodeImageParser(imagePath: string) {
        // 图片类型映射
        const IMAGE_TYPES = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml'
        } as const;
        try {
            const { readFile, stat } = require('fs/promises');
            // 获取文件信息和内容
            const [fileStats, fileBuffer] = await Promise.all([
                stat(imagePath),
                readFile(imagePath)
            ]);

            const sizeOf = require('image-size');
            const dimensions = sizeOf(imagePath);
            // @ts-expect-error
            const mimeType = IMAGE_TYPES[dimensions.type];
            if (!mimeType) {
                throw new Error(`不支持的图片类型: ${dimensions.type}`);
            }

            const base64Data = fileBuffer.toString('base64');
            const sha1 = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(base64Data))
                .then(hash => Array.from(new Uint8Array(hash))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join(''));

            return {
                base64Data,
                metadata: {
                    sha1,
                    type: mimeType,
                    bytes: fileStats.size,
                    width: dimensions.width,
                    height: dimensions.height
                }
            };
        } catch (error: any) {
            throw new Error(`解析图片失败: ${error.message}`);
        }
    }
    /** 构建上传头像与元数据iq
     * @param img 图片文件或路径
     * @returns [dataIq, metadataIq]
     */
    static async createDataPublishIq(img: File | string) {
        let base64Data = '';
        let metadata: AvatarMetadata;
        if (typeof img === 'string' 
            && typeof require !== 'undefined'
            && typeof require('fs') !== 'undefined') {
            const { base64Data: data, metadata: meta } = await Avatar.nodeImageParser(img);
            base64Data = data;
            metadata = meta;
            //@ts-expect-error
        } else if (img instanceof File && typeof window !== 'undefined') {
            const { base64Data: data, metadata: meta } = await Avatar.browserImageParser(img);
            base64Data = data;
            metadata = meta;
        } else {
            throw new Error('不支持的图片类型');
        }

        const publishDoc = implementation.createDocument(null, "publish", null);

        const publishDate = publishDoc.documentElement!;
        publishDate.setAttribute("node", Avatar.NS.data);
        const item = publishDoc.createElement("item");
        item.setAttribute("id", metadata.sha1);
        const data = publishDoc.createElementNS(Avatar.NS.data, "data");
        data.textContent = base64Data;
        item.appendChild(data);
        publishDate.appendChild(item);

        const publishMetadata = publishDoc.createElement("publish");
        publishMetadata.setAttribute("node", Avatar.NS.metadata);
        const itemMetadata = publishDoc.createElement("item");
        itemMetadata.setAttribute("id", metadata.sha1);
        const metadataEl = publishDoc.createElementNS(Avatar.NS.metadata, "metadata");
        const infoEl = publishDoc.createElement("info");
        infoEl.setAttribute("id", metadata.sha1);
        infoEl.setAttribute("type", metadata.type);
        infoEl.setAttribute("bytes", metadata.bytes.toString());
        infoEl.setAttribute("width", metadata.width.toString());
        infoEl.setAttribute("height", metadata.height.toString());
        metadataEl.appendChild(infoEl);
        itemMetadata.appendChild(metadataEl);
        publishMetadata.appendChild(itemMetadata);

        return [PEP.createPublishIq(publishDate), PEP.createPublishIq(publishMetadata)];

    }
}