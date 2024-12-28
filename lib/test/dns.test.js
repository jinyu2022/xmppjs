import { resolveXMPPSrv } from "@/dns";
import { it, expect } from "vitest";
import logger from "@/log";
logger.setLevel("debug");
logger.rebuild()
it("resolve", async () => {
    const records = await resolveXMPPSrv('conversations.im', false);
    const record = records[0];
    console.log("SRV records:", records);
    expect(record.host).toBe("xmpps.conversations.im");
    expect(record.port).toBe(80);
});