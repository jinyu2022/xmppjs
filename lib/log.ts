import log from 'loglevel';
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

// 保存原始的 methodFactory
const originalMethodFactory = log.methodFactory;

function customMethodFactory(methodName: LogLevel, logLevel: log.LogLevelNumbers, loggerName: string|symbol) {
  // 调用原始的 methodFactory 获取日志方法
  const originalMethod = originalMethodFactory(methodName, logLevel, loggerName);

  return function (...args: any[]): void {
    const now = new Date();
    const timestamp = now.toLocaleTimeString();
    const levelPrefix = `[${methodName.toUpperCase()}]`;
    const namePrefix = loggerName ? `[${String(loggerName)}]` : '';
    const formattedArgs = [`${timestamp} ${levelPrefix}${namePrefix}`, ...args];

    // 只有当日志级别允许时才调用原始的日志方法
    if (log.getLevel() <= logLevel) {
      originalMethod(...formattedArgs);
    }
  };
}

log.methodFactory = customMethodFactory;

const logger = log;
export default logger;