import pino, { Logger, LoggerOptions } from "pino";
import { PrettyOptions } from "pino-pretty";

// 类型定义
export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

export interface LogFields {
  [key: string]: any;
}

export interface LoggerConfig {
  level: LogLevel;
  prettyPrint?: boolean | PrettyOptions;
  formatTime?: string;
}

// 工具函数
const isNodeJS = () => {
  try {
    return (
      typeof process !== "undefined" &&
      process.versions != null &&
      process.versions.node != null
    );
  } catch {
    return false;
  }
};

const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZoneName: "short",
});

const createLogObject = (obj: unknown): LogFields => {
  const time = timeFormatter.format(new Date());
  if (typeof obj === "string") {
    return { msg: obj, time };
  }
  return { ...(obj as LogFields), time };
};

// Logger类
class LoggerSingleton {
  private static instance: Logger;
  private static config: LoggerConfig = {
    level: "info",
    prettyPrint: true,
    formatTime: "yyyy-MM-dd HH:mm:ss",
  };

  private constructor() {}

  public static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!LoggerSingleton.instance) {
      const finalConfig = { ...LoggerSingleton.config, ...config };
      LoggerSingleton.instance = LoggerSingleton.createLogger(finalConfig);
    }
    return LoggerSingleton.instance;
  }

  private static createLogger(config: LoggerConfig): Logger {
    const { level, prettyPrint } = config;

    const options: LoggerOptions = {
      level,
      base: {},
      formatters: {
        level: (label) => ({ level: label }),
        log: (object) => ({
          ...object,
          time: timeFormatter.format(new Date()),
        }),
      },
    };

    if (isNodeJS()) {
      if (prettyPrint) {
        options.transport = {
          target: "pino-pretty",
          options:
            typeof prettyPrint === "boolean"
              ? {
                  colorize: true,
                  translateTime: config.formatTime,
                  ignore: "pid,hostname",
                }
              : prettyPrint,
        };
      }
    } else {
      const logger = pino(options);
      return {
        ...logger,
        info: (obj: unknown, ...args: any[]) =>
          logger.info(createLogObject(obj), ...args),
        debug: (obj: unknown, ...args: any[]) =>
          logger.debug(createLogObject(obj), ...args),
        warn: (obj: unknown, ...args: any[]) =>
          logger.warn(createLogObject(obj), ...args),
        error: (obj: unknown, ...args: any[]) =>
          logger.error(createLogObject(obj), ...args),
        fatal: (obj: unknown, ...args: any[]) =>
          logger.fatal(createLogObject(obj), ...args),
      } as Logger;
    }

    return pino(options);
  }
}

// 导出默认单例和工厂方法
export const logger = LoggerSingleton.getInstance();
export const getLogger = (config?: Partial<LoggerConfig>): Logger =>
  LoggerSingleton.getInstance(config);

// 使用默认logger
logger.info("Hello World");
