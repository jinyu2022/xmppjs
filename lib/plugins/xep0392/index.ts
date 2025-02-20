import { Hsluv } from "hsluv";

/**
 * xep-0392: Consistent Color Generation
 * @see https://xmpp.org/extensions/xep-0392.html
 * @version 1.0.0 (2024-03-27)
 */
export class XEP0392 {
    static readonly cache = new Map<string, string>();

    /**
     * 
     * @param s 字符串
     * @returns hex颜色
     */
    static async colorize(s: string) {
        if (XEP0392.cache.has(s)) {
            return XEP0392.cache.get(s)!;
        }

        // 5.1 角度生成
        // 计算 SHA-1 哈希，返回 Buffer 对象
        const hash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s));
        // 将输出视为小端，提取最低有效 16 位（第一个字节是低位，第二个字节是高位）
        const view = new DataView(hash);
        const low16 = view.getUint16(0, true);
        // 归一化到 [0,1] 后映射到 360 度
        const hueAngle = (low16 / 65536) * 360;
        
        // 5.2 RGB 生成
        const hsluv = new Hsluv();
        hsluv.hsluv_h = hueAngle;
        hsluv.hsluv_s = 100;
        hsluv.hsluv_l = 50;
        hsluv.hsluvToHex();
        XEP0392.cache.set(s, hsluv.hex);
        return hsluv.hex;
    }
}