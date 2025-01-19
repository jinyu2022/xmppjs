import { expect, it } from "vitest";
import XEP0077 from "@/plugins/xep0077";
import { Form } from "@/plugins/xep0004/form";
import { xmlSerializer, implementation } from "@/shims";
it("register", async () => {
    const xep0077 = new XEP0077();
    await xep0077.connectSocket("yax.im", "xmpps");
    const result = await xep0077.getRegistionForm()
    console.log("Registration result:", result);
    const challenge = result.fields.find(fileld => {
        return fileld.var === "challenge"
    })?.values
    console.log("Registration challenge:", challenge);
    const rep = Form.createFormEl({
        type: "submit",
        fields: [
            { type: "hidden", var: "FORM_TYPE", values: [XEP0077.NS] },
            { var: "username", values: ["test2025"] },
            { var: "password", values: ["test2025"] }
        ]
    })
    const iq = implementation.createDocument("jabber:client", "iq");
    const query = iq.createElementNS(XEP0077.NS, "query");
    query.appendChild(rep);
    iq.documentElement?.appendChild(query);
    iq.documentElement?.setAttribute("type", "set");
    iq.documentElement?.setAttribute("id", "reg2");
    console.log(xmlSerializer.serializeToString(iq));
    // try{
    //     await xep0077.register(iq.documentElement)
    // }catch(e){
    //     console.log(e)
    //     e.xmlString
    // }
    expect(result).toBe(true);
}); 