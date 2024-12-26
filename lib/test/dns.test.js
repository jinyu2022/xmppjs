import { resolveXMPPSrv } from "@/dns";
import { it, expect } from "vitest";

it("resolve", async() => {
        
    try {
        const records = await resolveXMPPSrv('xmpp.jp', false);
        const record = records[0];
        console.log("SRV records:", records);
        expect(record.host).toBe("gw.xmpp.jp");
        expect(record.port).toBe(5222);
    } catch (err) {
        console.error('Error querying SRV records:', err);
    }
});