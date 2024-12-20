import { describe, it, expect } from "vitest";
import { domParser } from "../shims";
import { XMPPError,ErrorConditions } from "../errors";

// describe("XMPP错误", () => {
    
//     // @ts-ignore
//     const createStanza = (errorCondition, errorType, errorText = null) => {
//         const xmlString = `
//             <message to="user@example.com" from="server@example.com">
//                 <error type="${errorType}">
//                     <${errorCondition} xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"/>
//                     ${errorText ? `<text>${errorText}</text>` : ""}
//                 </error>
//             </message>
//         `;
//         return domParser.parseFromString(xmlString, "application/xml").documentElement;
//     };

// });