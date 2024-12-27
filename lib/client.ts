import { EventEmitter } from "events";
import Connection from "./connection";
import { JID } from "./JID";
import { Options } from "./types";
export class Client extends Connection {
  constructor(jid: string, password: string, options: Options) {
    super(jid, password, options);
  }
}
