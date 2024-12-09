export function sum(a: number, b: number): number

export class JID {
    constructor(jid:string)
    node: string
    domain: string
    resource: string
    toString(): string
    equals(other: JID): boolean
    isBare(): boolean
    isFull(): boolean
    isBareJID(): boolean
    isFullJID(): boolean
    getBareJID(): JID
    getDomain(): string
    getLocal(): string
    getResource(): string
    setLocal(local: string): void
    setDomain(domain: string): void
    setResource(resource: string): void
    clone(): JID
    static fromString(jidString: string): JID
    static isInstance(val: any): boolean
    static isJID(val: any): boolean
    static fromBareJID(jid: JID): JID
}