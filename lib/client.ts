import { EventEmitter } from "events";
import Connection from "./connection";
import { JID } from "./JID";
import { Options } from "./types";
export class Client extends EventEmitter {
  private connection: Connection;
  constructor(jid: string, password: string, options: Options) {
    super();
    this.connection = new Connection(jid, password, options);
  }
}
