/**
 * 已被XEP-0292取代
 */
export class VCardTemp {
    static readonly NS = 'vcard-temp' as const;

}


interface VCard {
    fn: string; // 格式化姓名 (Formatted Name)
    n?: {  // 姓名 (Name) - 可选，因为可能不提供
        family?: string; // 姓 (Family Name)
        given?: string;  // 名 (Given Name)
        middle?: string; // 中间名 (Middle Name)
    };
    nickname?: string; // 昵称
    url?: string;      // 网址
    bday?: string;     // 生日 (ISO 8601 格式: YYYY-MM-DD)
    org?: {           // 组织 (Organization)
        orgname?: string; // 组织名称
        orgunit?: string; // 组织单位
    };
    title?: string;    // 职位
    role?: string;     // 角色
    tels?: Tel[];       // 电话号码列表
    adrs?: Adr[];       // 地址列表
    emails?: Email[];    // 电子邮件地址列表
    jabberid?: string;  // Jabber ID (XMPP 地址)
    desc?: string;     // 描述
}

interface Tel {
    type: ('WORK' | 'HOME' | 'VOICE' | 'FAX' | 'MSG')[];
    number?: string; // 电话号码 - 如果提供了 <NUMBER/> 标签，则为必须
}

interface Adr {
    type: ('WORK' | 'HOME' | 'POSTAL' | 'PARCEL' | 'DOM' | 'INTL')[];
    extadd?: string;   // 扩展地址
    street?: string;   // 街道
    locality?: string; // 城市/地区
    region?: string;   // 州/省
    pcode?: string;    // 邮政编码
    ctry?: string;     // 国家
}

interface Email {
    type: ('INTERNET' | 'PREF' | 'X400')[];
    userid: string;     // 电子邮件地址
}
