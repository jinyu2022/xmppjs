export type MUCUserPres<T = 'destroy' | 'invite' | 'decline'> = {
    item?: MUCItem;
    statuses?: string[];
} & (
    T extends 'destroy' ? { destroy: MUCDestroy } :
    T extends 'invite' ? { invite: MUCInvite, password?: string } :
    T extends 'decline' ? { decline: MUCDecline } :
    never
)

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

export interface MUCItem {
    jid?: string;
    nick?: string;
    affiliation: "none" | "outcast" | "member" | "admin" | "owner";
    role: "none" | "visitor" | "participant" | "moderator";
    actor?: MUCActor;
    reason?: string;
}

export interface MUCActor {
    nick?: string;
    jid?: string;
}