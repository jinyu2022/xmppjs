/**
 * XMPP 日期/时间格式化工具
 */
export class XMPPDateTime {
    /**
     * 将 Date 对象格式化为 CCYY-MM-DD 格式
     * @param date - 要格式化的 Date 对象
     * @returns 格式化后的日期字符串
     * @throws 如果输入的不是有效的 Date 对象
     */
    static formatDate(date: Date): string {
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            throw new Error("Invalid Date object provided.");
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    /**
     * 将 Date 对象格式化为 CCYY-MM-DDThh:mm:ss[.sss]TZD 格式
     * @param date - 要格式化的 Date 对象
     * @param includeMilliseconds - 是否包含毫秒，默认为 false
     * @param timeZone - 时区定义，'Z' 表示 UTC 或 '+/-hh:mm' 表示偏移
     * @returns 格式化后的日期时间字符串
     * @throws 如果输入的不是有效的 Date 对象或时区无效
     */
    static formatDateTime(
        date: Date,
        includeMilliseconds = false,
        timeZone = "Z"
    ): string {
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            throw new Error("Invalid Date object provided.");
        }

        const formattedDate = this.formatDate(date);
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");
        const milliseconds = includeMilliseconds
            ? `.${String(date.getMilliseconds()).padStart(3, "0")}`
            : "";

        if (timeZone !== "Z") {
            const offsetRegex = /^[+-](?:0\d|1[0-3]):[0-5]\d$/;
            if (!offsetRegex.test(timeZone)) {
                throw new Error(
                    "Invalid time zone format. Use 'Z' for UTC or '+/-hh:mm' for offsets."
                );
            }
        }
        const tzd = timeZone;

        return `${formattedDate}T${hours}:${minutes}:${seconds}${milliseconds}${tzd}`;
    }

    /**
     * 将 Date 对象格式化为 hh:mm:ss[.sss][TZD] 格式
     * @param date - 要格式化的 Date 对象
     * @param includeMilliseconds - 是否包含毫秒
     * @param timeZone - 时区定义，'Z' 表示 UTC 或 '+/-hh:mm' 表示偏移
     * @returns 格式化后的时间字符串
     * @throws 如果输入的不是有效的 Date 对象或时区无效
     */
    static formatTime(
        date: Date,
        includeMilliseconds = false,
        timeZone = "Z"
    ): string {
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            throw new Error("Invalid Date object provided.");
        }

        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");
        const milliseconds = includeMilliseconds
            ? `.${String(date.getMilliseconds()).padStart(3, "0")}`
            : "";

        if (timeZone !== "Z") {
            const offsetRegex = /^[+-](?:0\d|1[0-3]):[0-5]\d$/;
            if (!offsetRegex.test(timeZone)) {
                throw new Error(
                    "Invalid time zone format. Use 'Z' for UTC or '+/-hh:mm' for offsets."
                );
            }
        }
        const tzd = timeZone;
        return `${hours}:${minutes}:${seconds}${milliseconds}${tzd}`;
    }

    /**
     * 将 CCYYMMDDThh:mm:ss 或 CCYY-MM-DDThh:mm:ss[.sss]TZD 格式的字符串解析为 Date 对象
     * @param dateTimeString - 要解析的日期时间字符串
     * @returns 解析成功的 Date 对象
     */
    static parseDateTime(dateTimeString: string): Date | null {
        const legacyRegex = /^(\d{4})(\d{2})(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;
        const standardRegex =
            /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?([Zz]|[+-](?:0\d|1[0-3]):[0-5]\d)?$/;

        let match = legacyRegex.exec(dateTimeString);
        if (match) {
            const [_, year, month, day, hours, minutes, seconds] = match;
            return new Date(
                Date.UTC(
                    Number(year),
                    Number(month) - 1,
                    Number(day),
                    Number(hours),
                    Number(minutes),
                    Number(seconds)
                )
            );
        }

        match = standardRegex.exec(dateTimeString);
        if (match) {
            const [_, year, month, day, hours, minutes, seconds, milliseconds, tzd] =
                match;

            let date = new Date(
                Number(year),
                Number(month) - 1,
                Number(day),
                Number(hours),
                Number(minutes),
                Number(seconds),
                milliseconds ? Number((parseFloat(milliseconds) * 1000).toFixed(0)) : 0
            );

            if (tzd && tzd !== "Z" && tzd !== "z") {
                const offsetSign = tzd.startsWith("+") ? 1 : -1;
                const [offsetHours, offsetMinutes] = tzd
                    .slice(1)
                    .split(":")
                    .map(Number);
                const offset = offsetSign * (offsetHours * 60 + offsetMinutes);
                date = new Date(date.getTime() - offset * 60 * 1000);
            }

            return date;
        }else{
            throw new Error("Invalid date time string provided.");
        }

    }
}

export default XMPPDateTime;
