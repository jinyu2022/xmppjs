interface MUCUserPresBase {
    item?: MUCItem;
    statuses?: string[];
}

interface MUCUserPresMap {
    presence: MUCUserPresBase;
    destroy: MUCUserPresBase & { destroy: MUCDestroy };
    invite: MUCUserPresBase & { invites: MUCInvite[]; password?: string };
    decline: MUCUserPresBase & { decline: MUCDecline };
}

export type MUCUserPresKind = keyof MUCUserPresMap;

export type MUCUserPres<
    T extends MUCUserPresKind = MUCUserPresKind
> = MUCUserPresMap[T];

export interface MUCDestroy {
    jid?: string;
    password?: string;
    reason?: string;
}

export interface MUCInvite {
    to?: string;
    from?: string;
    reason?: string;
    thread?: string;
    continue?: {
        thread?: string;
    };
}

export interface MUCDecline {
    to?: string;
    from?: string;
    reason?: string;
}

export type MUCAffiliation = "none" | "outcast" | "member" | "admin" | "owner";
export type MUCRole = "none" | "visitor" | "participant" | "moderator";

export interface MUCItem {
    jid?: string;
    nick?: string;
    affiliation: MUCAffiliation;
    role: MUCRole;
    actor?: MUCActor;
    reason?: string;
}

export interface MUCActor {
    nick?: string;
    jid?: string;
}

export interface MUCUser {
    /** 真实jid */
    jid?: string;
    nick: string;
    affiliation: MUCAffiliation;
    role: MUCRole;
}