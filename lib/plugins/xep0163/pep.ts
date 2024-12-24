import { Pubsub } from "../xep0060/pubsub";
import { Iq } from "@/stanza";
export class PEP {
    static createPublishIq(publish: Element){
        return Pubsub.createPublishIq(publish);
    }
}