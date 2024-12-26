import { DOMParser } from "@xmldom/xmldom";

const a = new DOMParser().parseFromString(`<stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism><mechanism>SCRAM-SHA-1-PLUS</mechanism><mechanism>SCRAM-SHA-1</mechanism><mechanism>X-OAUTH2</mechanism></mechanisms><register xmlns='http://jabber.org/features/iq-register'/></stream:features>`, 'text/xml');
console.log(a.documentElement);